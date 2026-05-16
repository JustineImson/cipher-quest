import { onCall } from "firebase-functions/v2/https";
import { onDocumentCreated, onDocumentUpdated, onDocumentWritten } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret } from "firebase-functions/params";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

// Initialize Firebase Admin SDK (uses default credentials in Cloud Functions)
initializeApp();
const db = getFirestore();
const messaging = getMessaging();

const geminiApiKey = defineSecret("GEMINI_API_KEY");

// ─────────────────────────────────────────────────────────────
// SHARED UTILITY — Push Notification Helper
// ─────────────────────────────────────────────────────────────

/**
 * Sends a push notification to a single user.
 * Silently no-ops if the user has no fcmToken (e.g. notifications not enabled).
 * Silently no-ops if the token is invalid (cleans up stale token from Firestore).
 *
 * @param {string} uid - Target user's Firebase UID
 * @param {object} payload - { title, body, data?, link? }
 */
async function sendNotificationToUser(uid, payload) {
  if (!uid || !payload?.title) return;

  try {
    const userSnap = await db.collection('users').doc(uid).get();
    if (!userSnap.exists) return;

    const { fcmToken } = userSnap.data();
    if (!fcmToken) return; // user hasn't enabled notifications

    await messaging.send({
      token: fcmToken,
      notification: {
        title: payload.title,
        body: payload.body || '',
      },
      data: payload.data || {},
      webpush: {
        fcmOptions: {
          link: payload.link || '/',
        },
      },
    });

  } catch (err) {
    // Invalid or expired token — remove it from Firestore so we don't retry
    if (err.code === 'messaging/registration-token-not-registered' ||
        err.code === 'messaging/invalid-registration-token') {
      await db.collection('users').doc(uid).update({ fcmToken: null });
    }
    console.error(`Notification failed for uid ${uid}:`, err.message);
  }
}

// ─────────────────────────────────────────────────────────────
// EXISTING — AI Cipher Puzzle Generator
// ─────────────────────────────────────────────────────────────

const FALLBACK_WORDS = {
  easy: ["MYSTERY", "CIPHER", "SHADOW", "AGENT", "CLUE", "AGENDA", "CRIME", "PROOF"],
  moderate: ["BLACKMAIL", "CONSPIRE", "FRAUDSTER", "INTRIGUE", "SABOTAGE", "ABDUCTION", "POISONER", "TREACHERY"],
  hard: ["ASSASSINATION", "EXTORTIONIST", "MANIPULATION", "PERJURY", "CONSPIRATOR", "SWINDLER", "TREASONOUS", "MASTERY"],
};

function getFallback(difficulty) {
  const diff = (difficulty || "easy").toLowerCase();
  const pool = FALLBACK_WORDS[diff] || FALLBACK_WORDS.easy;
  const word = pool[Math.floor(Math.random() * pool.length)];
  
  let key = "1";
  if (diff === "easy") {
    key = Math.floor(Math.random() * 5 + 1).toString();
  } else if (diff === "moderate" || diff === "medium") {
    if (Math.random() > 0.5) {
      key = Math.floor(Math.random() * 20 + 6).toString(); // 6 to 25
    } else {
      const keys = ["CAT", "DOG", "MAP", "SUN", "HAT", "BOX"];
      key = keys[Math.floor(Math.random() * keys.length)];
    }
  } else if (diff === "hard") {
    const hardKeys = ["MYSTERY", "PHANTOM", "ENIGMA", "WHISPERS", "SHADOWS", "SILENCE"];
    key = hardKeys[Math.floor(Math.random() * hardKeys.length)];
  }

  return { plaintext: word, key, clue: "Fallback: examine the letters carefully." };
}

export const generateCipherClue = onCall(
  {
    secrets: [geminiApiKey],
    cors: true,
    maxInstances: 10,
  },
  async (request) => {
    const { difficulty, theme } = request.data || {};

    try {
      if (!difficulty || typeof difficulty !== "string") {
        return getFallback(difficulty);
      }

      const apiKey = geminiApiKey.value();
      if (!apiKey) {
        console.error("GEMINI_API_KEY secret is not set");
        return getFallback(difficulty);
      }

      const genAI = new GoogleGenerativeAI(apiKey);

      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: {
          responseMimeType: "application/json",
        },
      });

      let difficultyRules = "";
      switch (difficulty.toLowerCase()) {
        case "easy":
          difficultyRules = "plaintext is exactly 1 word (5-8 letters) and clue is obvious.\n- Key MUST be a simple string number between '1' and '5'.";
          break;
        case "moderate":
        case "medium":
          difficultyRules = "plaintext is 1-2 words (9-14 letters total) and clue is vague.\n- Key MUST be a string number between '6' and '25' OR a very short, common English word (3 to 4 letters, e.g., 'CAT', 'DOG').";
          break;
        case "hard":
          difficultyRules = "plaintext is 2-3 words (15+ letters total) and clue is highly cryptic.\n- Key MUST be a complex English word of 7 or more letters (e.g., 'MYSTERY', 'PHANTOM').";
          break;
        default:
          difficultyRules = "plaintext is 1 word (5-8 letters) and clue is obvious.\n- Key MUST be a simple string number between '1' and '5'.";
      }

      const prompt = `
Generate a puzzle based on the theme: "${theme || "general"}".

Rules for difficulty:
${difficultyRules}

Formatting rules:
- All plaintext and keys must be uppercase with no punctuation (except if the key is a number).
- The key MUST always be returned as a string.
- Return STRICT JSON ONLY in the following format:
{ "plaintext": "...", "key": "...", "clue": "..." }
`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      const parsed = JSON.parse(text);

      if (!parsed.plaintext || !parsed.key || !parsed.clue) {
        return getFallback(difficulty);
      }

      return parsed;
    } catch (error) {
      console.error("Error generating puzzle details:", error);
      return getFallback(difficulty);
    }
  }
);

// ─────────────────────────────────────────────────────────────
// TIER 1 — SOCIAL NOTIFICATIONS (Firestore Triggers)
// ─────────────────────────────────────────────────────────────

/**
 * Phase 1A — Friend Request Received
 * Trigger: New document created in friendships collection with status: 'pending'
 * Recipient: The player whose UID is in receiverId
 */
export const onFriendRequestSent = onDocumentCreated(
  'friendships/{docId}',
  async (event) => {
    const data = event.data?.data();
    if (!data) return;

    // Only fire for pending requests
    if (data.status !== 'pending') return;

    const { senderId, receiverId } = data;
    if (!senderId || !receiverId) return;

    // Get sender's username to personalize the message
    const senderSnap = await db.collection('users').doc(senderId).get();
    const senderUsername = senderSnap.exists ? senderSnap.data().username : 'Someone';

    await sendNotificationToUser(receiverId, {
      title: 'New Friend Request',
      body: `${senderUsername} wants to add you as a friend.`,
      data: { type: 'friend_request', senderId },
      link: '/profile',
    });
  }
);

/**
 * Phase 1B — Friend Request Accepted
 * Trigger: friendships document updated from status: 'pending' to status: 'accepted'
 * Recipient: The original sender (senderId)
 */
export const onFriendRequestAccepted = onDocumentUpdated(
  'friendships/{docId}',
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    if (!before || !after) return;

    // Only fire when status transitions from pending → accepted
    if (before.status !== 'pending' || after.status !== 'accepted') return;

    const { senderId, receiverId } = after;
    if (!senderId || !receiverId) return;

    const receiverSnap = await db.collection('users').doc(receiverId).get();
    const receiverUsername = receiverSnap.exists ? receiverSnap.data().username : 'Someone';

    await sendNotificationToUser(senderId, {
      title: 'Friend Request Accepted',
      body: `${receiverUsername} accepted your friend request!`,
      data: { type: 'friend_accepted', receiverId },
      link: '/profile',
    });
  }
);

/**
 * Phase 1C — Game Invite Received
 * Trigger: New document created in gameInvites collection
 * Recipient: The player whose UID is in receiverId
 * NOTE: socialService.js uses senderId/receiverId (not senderUid/receiverUid)
 */
export const onGameInviteSent = onDocumentCreated(
  'gameInvites/{docId}',
  async (event) => {
    const data = event.data?.data();
    if (!data) return;

    const { senderId, receiverId } = data;
    if (!senderId || !receiverId) return;

    const senderSnap = await db.collection('users').doc(senderId).get();
    const senderUsername = senderSnap.exists ? senderSnap.data().username : 'Someone';

    await sendNotificationToUser(receiverId, {
      title: 'Multiplayer Invite',
      body: `${senderUsername} is challenging you to a cipher duel!`,
      data: { type: 'game_invite', senderId, inviteId: event.params.docId },
      link: '/multiplayer',
    });
  }
);

/**
 * Phase 1D — Invite Accepted
 * Trigger: gameInvites document updated to status: 'accepted'
 * Recipient: The sender (senderId)
 */
export const onGameInviteAccepted = onDocumentUpdated(
  'gameInvites/{docId}',
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    if (!before || !after) return;

    if (before.status === after.status) return;
    if (after.status !== 'accepted') return;

    const { senderId, receiverId } = after;
    if (!senderId || !receiverId) return;

    const receiverSnap = await db.collection('users').doc(receiverId).get();
    const receiverUsername = receiverSnap.exists ? receiverSnap.data().username : 'Someone';

    await sendNotificationToUser(senderId, {
      title: 'Challenge Accepted!',
      body: `${receiverUsername} accepted your duel invite. Get ready!`,
      data: { type: 'invite_accepted', receiverId },
      link: '/multiplayer',
    });
  }
);

/**
 * Phase 1E — Invite Declined
 * Trigger: gameInvites document updated to status: 'declined'
 * Recipient: The sender (senderId)
 */
export const onGameInviteDeclined = onDocumentUpdated(
  'gameInvites/{docId}',
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    if (!before || !after) return;

    if (before.status === after.status) return;
    if (after.status !== 'declined') return;

    const { senderId, receiverId } = after;
    if (!senderId || !receiverId) return;

    const receiverSnap = await db.collection('users').doc(receiverId).get();
    const receiverUsername = receiverSnap.exists ? receiverSnap.data().username : 'Someone';

    await sendNotificationToUser(senderId, {
      title: 'Invite Declined',
      body: `${receiverUsername} can't make it this time.`,
      data: { type: 'invite_declined', receiverId },
      link: '/profile',
    });
  }
);

// ─────────────────────────────────────────────────────────────
// TIER 2 — LEADERBOARD NOTIFICATIONS (Firestore Triggers)
// ─────────────────────────────────────────────────────────────

/**
 * Phase 2C — New Personal Best
 * Trigger: leaderboards/timeAttack/entries/{uid} updated with a higher score
 * Recipient: The player themselves
 */
export const onPersonalBest = onDocumentUpdated(
  'leaderboards/timeAttack/entries/{uid}',
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    if (!before || !after) return;

    const uid = event.params.uid;

    // Only fire if score genuinely increased
    if ((after.score || 0) <= (before.score || 0)) return;

    await sendNotificationToUser(uid, {
      title: '🎯 New Personal Best!',
      body: `You cracked ${after.score} ciphers in Time Attack. Can you beat it?`,
      data: { type: 'personal_best', score: String(after.score) },
      link: '/leaderboards',
    });
  }
);

/**
 * Phase 2D — Knocked Off Leaderboard
 * Trigger: A new score submission causes a player to drop out of the top 10
 * Recipient: The displaced player
 */
export const onLeaderboardDisplaced = onDocumentWritten(
  'leaderboards/timeAttack/entries/{uid}',
  async () => {
    // Fetch top 11 to detect who just fell off top 10
    const snap = await db
      .collection('leaderboards/timeAttack/entries')
      .orderBy('score', 'desc')
      .limit(11)
      .get();

    const entries = snap.docs.map(d => ({ uid: d.id, ...d.data() }));

    // The 11th entry (index 10) just got displaced from top 10
    if (entries.length === 11) {
      const displaced = entries[10];
      await sendNotificationToUser(displaced.uid, {
        title: 'Knocked Off the Board',
        body: 'Someone just pushed you out of the top 10. Fight back, detective!',
        data: { type: 'leaderboard_displaced' },
        link: '/leaderboards',
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────
// TIER 3 — ENGAGEMENT NOTIFICATIONS (Scheduled Functions)
// ─────────────────────────────────────────────────────────────

/**
 * Phase 3A — Story Mode Reminder
 * Trigger: Runs daily at 9:00 AM Philippine time (UTC+8)
 * Recipient: Players inactive for 3+ days with incomplete stories
 */
export const storyModeReminder = onSchedule(
  {
    schedule: '0 1 * * *', // 1:00 AM UTC = 9:00 AM PHT
    timeZone: 'Asia/Manila',
  },
  async () => {
    const threeDaysAgo = Date.now() - (3 * 24 * 60 * 60 * 1000);

    // Find users who haven't logged in for 3+ days
    const usersSnap = await db
      .collection('users')
      .where('lastLoginAt', '<=', threeDaysAgo)
      .where('fcmToken', '!=', null)
      .get();

    const promises = usersSnap.docs.map(async (userDoc) => {
      const uid = userDoc.id;

      // Check if story is incomplete
      const progressSnap = await db.collection('storyProgress').doc(uid).get();
      if (!progressSnap.exists) return;

      const progress = progressSnap.data();
      const evidenceCount = progress.collectedEvidence?.length || 0;
      if (evidenceCount >= 4) return; // story complete, skip

      await sendNotificationToUser(uid, {
        title: '🔍 The Case Goes Cold...',
        body: `You still have ${4 - evidenceCount} clue(s) left to find. Come back and crack the case!`,
        data: { type: 'story_reminder' },
        link: '/',
      });
    });

    await Promise.all(promises);
    console.log(`Story reminders checked for ${usersSnap.size} users.`);
  }
);

/**
 * Phase 3B — Friend Beats Your Score
 * Trigger: A player submits a Time Attack score that exceeds a friend's existing score
 * Recipient: Friends whose score is now lower
 */
export const onFriendBeatsScore = onDocumentUpdated(
  'leaderboards/timeAttack/entries/{uid}',
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    if (!before || !after) return;

    const newScore = after.score || 0;
    const oldScore = before.score || 0;
    const scorerUid = event.params.uid;

    if (newScore <= oldScore) return; // not a new best

    // Get scorer's username
    const scorerSnap = await db.collection('users').doc(scorerUid).get();
    const scorerUsername = scorerSnap.exists ? scorerSnap.data().username : 'A friend';

    // Find all accepted friendships involving this player
    const [sentSnap, receivedSnap] = await Promise.all([
      db.collection('friendships')
        .where('senderId', '==', scorerUid)
        .where('status', '==', 'accepted').get(),
      db.collection('friendships')
        .where('receiverId', '==', scorerUid)
        .where('status', '==', 'accepted').get(),
    ]);

    const friendUids = [
      ...sentSnap.docs.map(d => d.data().receiverId),
      ...receivedSnap.docs.map(d => d.data().senderId),
    ];

    // Notify friends whose score is now lower
    const notifyPromises = friendUids.map(async (friendUid) => {
      const friendScoreSnap = await db
        .collection('leaderboards/timeAttack/entries').doc(friendUid).get();
      const friendScore = friendScoreSnap.exists
        ? (friendScoreSnap.data().score || 0) : 0;

      if (newScore <= friendScore) return; // scorer didn't beat this friend

      await sendNotificationToUser(friendUid, {
        title: "📊 You've Been Overtaken!",
        body: `${scorerUsername} just scored ${newScore} in Time Attack — beating your ${friendScore}. Reclaim your rank!`,
        data: { type: 'friend_beats_score', scorerUid },
        link: '/leaderboards',
      });
    });

    await Promise.all(notifyPromises);
  }
);
