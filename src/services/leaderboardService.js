import { db } from './firebase';
import {
  collection,
  doc,
  getDoc,
  setDoc,
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
export async function submitTimeAttackScore(uid, username, score, difficulty) {
  if (!uid) return;
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
export async function submitMultiplayerResult(uid, username, wins, losses) {
  if (!uid) return;
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

    if (existingSnap.exists()) {
      await setDoc(entryRef, updates, { merge: true });
    } else {
      await setDoc(entryRef, {
        ...updates,
        wins: wins || 0,
        losses: losses || 0,
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
  return snapshot.docs.map((docSnap, index) => {
    const data = docSnap.data();
    return {
      rank: index + 1,
      name: data.username || 'Unknown',
      score: data.score || 0,
      time: data.difficulty || '-',
      cases: '-',
      badge: index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : null
    };
  });
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
  return snapshot.docs.map((docSnap, index) => {
    const data = docSnap.data();
    const wins = data.wins || 0;
    const losses = data.losses || 0;
    return {
      rank: index + 1,
      name: data.username || 'Unknown',
      score: wins,
      time: `${wins}W / ${losses}L`,
      cases: '-',
      badge: index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : null
    };
  });
}
