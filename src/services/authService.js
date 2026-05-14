import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail, 
  signOut,
  updateProfile
} from "firebase/auth";
import { doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "./firebase";
import { useGameStore } from '../store/useGameStore';

export const loginUser = async (email, password) => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const registerUser = async (email, password, username) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  if (userCredential.user && username) {
    await updateProfile(userCredential.user, { displayName: username });
    
    // Create user document in Firestore
    const uid = userCredential.user.uid;
    const friendCode = await generateUniqueFriendCode(db);
    await setDoc(doc(db, 'users', uid), {
      username: username,
      email: email,
      friendCode: friendCode,
      createdAt: new Date().toISOString(),
      cipherStats: {
        vigenere:     { attempts: 0, solved: 0 },
        railfence:    { attempts: 0, solved: 0 },
        columnar:     { attempts: 0, solved: 0 },
        substitution: { attempts: 0, solved: 0 },
        caesar:       { attempts: 0, solved: 0 }
      }
    });
  }
  return userCredential;
};

// TODO: existing users registered before this change have short 6-char codes — a one-time Cloud Function migration should regenerate their friend codes
/**
 * Generate a unique 8-character friend code (uppercase alphanumeric, excluding ambiguous chars)
 * @param {import('firebase/firestore').Firestore} db - Firestore instance
 * @returns {Promise<string>} unique friend code
 */
async function generateUniqueFriendCode(db) {
  const allowed = '23456789ABCDEFGHJKL MNPQRSTUVWXYZ'.replace(/\s+/g, '');
  const maxAttempts = 5;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // build an 8-char code
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += allowed[Math.floor(Math.random() * allowed.length)];
    }

    // check for collision
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('friendCode', '==', code));
      const snap = await getDocs(q);
      if (snap.empty) {
        return code;
      }
      // else collision — try again
    } catch (err) {
      console.warn('Error checking friendCode uniqueness:', err);
      // continue to retry until attempts exhausted
    }
  }

  throw new Error('Failed to generate unique friend code after multiple attempts');
}

export const resetPassword = async (email) => {
  return sendPasswordResetEmail(auth, email);
};

export const logoutUser = async () => {
  // Attempt to flush any pending progress to the cloud before signing out
  try {
    const syncFn = useGameStore.getState()?.syncProgressToCloud;
    if (typeof syncFn === 'function') {
      await syncFn();
    }
  } catch (err) {
    console.warn('Failed to sync before logout:', err);
  }

  // Clear persisted local state so no stale data lingers
  try {
    localStorage.removeItem('aegis-game-storage');
  } catch { /* private browsing */ }

  return signOut(auth);
};

/**
 * Backfill missing cipherStats fields for existing users.
 * Uses updateDoc with dot-notation keys so it merges into the existing
 * nested map without overwriting data that's already there.
 * @param {string} uid
 */
export async function backfillCipherStats(uid) {
  if (!uid) return;
  try {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) return;

    const stats = snap.data().cipherStats || {};
    const updates = {};

    for (const type of ['vigenere', 'railfence', 'columnar', 'substitution', 'caesar']) {
      if (!stats[type]) {
        updates[`cipherStats.${type}.attempts`] = 0;
        updates[`cipherStats.${type}.solved`] = 0;
      }
    }

    if (Object.keys(updates).length > 0) {
      await updateDoc(userRef, updates);
    }
  } catch (err) {
    console.warn('Failed to backfill cipher stats:', err);
  }
}
