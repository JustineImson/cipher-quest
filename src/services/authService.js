import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail, 
  verifyPasswordResetCode,
  confirmPasswordReset,
  signOut,
  updateProfile,
  signInAnonymously
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

    // Update store immediately so Social Intel shows the correct 8-char code
    // before the next onAuthStateChanged doc fetch can potentially race it.
    useGameStore.setState((state) => ({
      currentUser: {
        ...(state.currentUser || {}),
        uid: uid,
        username: username,
        friendCode: friendCode,
        email: email
      }
    }));
  }
  return userCredential;
};

export const loginAnonymously = async () => {
  const userCredential = await signInAnonymously(auth);
  if (userCredential.user) {
    const uid = userCredential.user.uid;
    // Check if doc exists already (if they were already a guest before)
    const docRef = doc(db, 'users', uid);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      const guestName = `Guest-${Math.floor(1000 + Math.random() * 9000)}`;
      await updateProfile(userCredential.user, { displayName: guestName });
      
      const friendCode = await generateUniqueFriendCode(db);
      await setDoc(docRef, {
        username: guestName,
        email: 'Guest Account',
        friendCode: friendCode,
        createdAt: new Date().toISOString(),
        isGuest: true,
        cipherStats: {
          vigenere:     { attempts: 0, solved: 0 },
          railfence:    { attempts: 0, solved: 0 },
          columnar:     { attempts: 0, solved: 0 },
          substitution: { attempts: 0, solved: 0 },
          caesar:       { attempts: 0, solved: 0 }
        }
      });

      // Update store immediately so Social Intel shows the correct 8-char code
      useGameStore.setState((state) => ({
        currentUser: {
          ...(state.currentUser || {}),
          uid: uid,
          username: guestName,
          friendCode: friendCode,
          email: 'Guest Account'
        }
      }));
    }
  }
  return userCredential;
};

/**
 * Backfill missing or legacy (6-char) friend codes for existing users.
 * Runs on login — if the user's Firestore doc has no friendCode or a short one,
 * generates a proper 8-char code and saves it.
 * @param {string} uid
 */
export async function backfillFriendCode(uid) {
  if (!uid) return;
  try {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) return;

    const existing = snap.data().friendCode;
    // Already has a proper 8-char code — nothing to do
    if (existing && existing.length >= 8) return;

    const newCode = await generateUniqueFriendCode(db);
    await updateDoc(userRef, { friendCode: newCode });
    console.log(`[backfill] Upgraded friend code for ${uid}: ${existing || '(none)'} → ${newCode}`);
    return newCode;
  } catch (err) {
    console.warn('Failed to backfill friend code:', err);
  }
}
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

const SERVER_URL = import.meta.env.VITE_SERVER_URL || window.location.origin;

/**
 * Request a 6-digit OTP to be emailed to the user.
 * Called right after a successful Firebase login.
 */
export const sendOtp = async (uid, email) => {
  const res = await fetch(`${SERVER_URL}/auth/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid, email }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to send verification code.');
  return data;
};

/**
 * Verify the OTP the user entered.
 * Resolves on success, throws with a user-facing message on failure.
 */
export const verifyOtp = async (uid, otp) => {
  const res = await fetch(`${SERVER_URL}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid, otp }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Verification failed.');
  return data;
};

export const resetPassword = async (email) => {
  // actionCodeSettings tells Firebase where the reset link should redirect to.
  // This points to the in-app /auth/action route which handles the code.
  const actionCodeSettings = {
    url: `${window.location.origin}/auth/action`,
    handleCodeInApp: true,
  };
  return sendPasswordResetEmail(auth, email, actionCodeSettings);
};

/**
 * Verify the password reset code (oobCode) from the email link.
 * Returns the email associated with the code if valid.
 */
export const verifyResetCode = async (oobCode) => {
  return verifyPasswordResetCode(auth, oobCode);
};

/**
 * Confirm the password reset with the oobCode and the user's new password.
 */
export const confirmNewPassword = async (oobCode, newPassword) => {
  return confirmPasswordReset(auth, oobCode, newPassword);
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
