import { db } from './firebase';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  increment,
  query,
  orderBy,
  limit,
  getDocs
} from 'firebase/firestore';

/**
 * Submit a Time Attack score.
 * Only writes if the new score is strictly higher than the user's existing entry.
 */
export async function submitTimeAttackScore(uid, username, score, difficulty, cases) {
  if (!uid) {
    console.warn('submitTimeAttackScore skipped — uid is null');
    return;
  }
  try {
    const entryRef = doc(db, 'leaderboards', 'timeAttack', 'entries', uid);
    const existingSnap = await getDoc(entryRef);

    if (existingSnap.exists()) {
      const existing = existingSnap.data();
      if ((existing.score || 0) >= score) {
        return;
      }
    }

    await setDoc(entryRef, {
      uid,
      username: username || 'Anonymous',
      score,
      difficulty: difficulty || 'easy',
      cases: cases || 0,
      createdAt: serverTimestamp()
    });
  } catch (err) {
    console.error('Failed to submit time attack score:', err);
  }
}

/**
 * Submit a multiplayer match result.
 * Upserts the user's document and atomically increments wins or losses.
 */
export async function submitMultiplayerResult(uid, username, wins, losses, casesCracked) {
  if (!uid) {
    console.warn('submitMultiplayerResult skipped — uid is null');
    return;
  }
  try {
    const entryRef = doc(db, 'leaderboards', 'multiplayer', 'entries', uid);
    const existingSnap = await getDoc(entryRef);

    const updates = {
      uid,
      username: username || 'Anonymous',
      updatedAt: serverTimestamp()
    };

    if (wins > 0) updates.wins = increment(wins);
    if (losses > 0) updates.losses = increment(losses);
    if (casesCracked > 0) updates.cases = increment(casesCracked);

    if (existingSnap.exists()) {
      await setDoc(entryRef, updates, { merge: true });
    } else {
      await setDoc(entryRef, {
        ...updates,
        wins: wins || 0,
        losses: losses || 0,
        cases: casesCracked || 0,
        createdAt: serverTimestamp()
      });
    }
  } catch (err) {
    console.error('Failed to submit multiplayer result:', err);
  }
}

/**
 * Fetch top N Time Attack entries ordered by score descending.
 */
export async function fetchTimeAttackLeaderboard(limitCount = 10) {
  const q = query(
    collection(db, 'leaderboards', 'timeAttack', 'entries'),
    orderBy('score', 'desc'),
    limit(limitCount)
  );
  const snapshot = await getDocs(q);
  const rows = await Promise.all(snapshot.docs.map(async (docSnap, index) => {
    const data = docSnap.data();
    let photoURL = null;
    if (data.uid) {
      try {
        const userSnap = await getDoc(doc(db, 'users', data.uid));
        if (userSnap.exists()) photoURL = userSnap.data().photoURL || null;
      } catch (err) { console.warn('Leaderboard: failed to fetch user photo', err); }
    }
    return {
      rank: index + 1,
      name: data.username || 'Unknown',
      photoURL,
      score: data.score || 0,
      time: data.difficulty || '-',
      cases: data.cases !== undefined ? data.cases : '-',
      badge: index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : null
    };
  }));
  return rows;
}

/**
 * Fetch top N Multiplayer entries ordered by wins descending.
 */
export async function fetchMultiplayerLeaderboard(limitCount = 10) {
  const q = query(
    collection(db, 'leaderboards', 'multiplayer', 'entries'),
    orderBy('wins', 'desc'),
    limit(limitCount)
  );
  const snapshot = await getDocs(q);
  const rows = await Promise.all(snapshot.docs.map(async (docSnap, index) => {
    const data = docSnap.data();
    let photoURL = null;
    if (data.uid) {
      try {
        const userSnap = await getDoc(doc(db, 'users', data.uid));
        if (userSnap.exists()) photoURL = userSnap.data().photoURL || null;
      } catch (err) { console.warn('Leaderboard: failed to fetch user photo', err); }
    }
    const wins = data.wins || 0;
    const losses = data.losses || 0;
    return {
      rank: index + 1,
      name: data.username || 'Unknown',
      photoURL,
      score: wins,
      wins: wins,
      losses: losses,
      cases: data.cases !== undefined ? data.cases : '-',
      badge: index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : null
    };
  }));
  return rows;
}

/**
 * Track a cipher attempt for a user.
 * Atomically increments cipherStats.{cipherType}.attempts (always)
 * and cipherStats.{cipherType}.solved (only if success === true).
 * @param {string} uid - The user's Firebase UID
 * @param {'vigenere'|'railfence'|'columnar'|'substitution'|'caesar'} cipherType
 * @param {boolean} success - Whether the attempt was a correct solve
 */
export async function trackCipherAttempt(uid, cipherType, success) {
  if (!uid || !cipherType) return;
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      [`cipherStats.${cipherType}.attempts`]: increment(1),
      ...(success && {
        [`cipherStats.${cipherType}.solved`]: increment(1)
      })
    });
  } catch (err) {
    console.error('Failed to track cipher attempt:', err);
  }
}
