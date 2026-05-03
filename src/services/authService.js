import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail, 
  signOut,
  updateProfile
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

export const loginUser = async (email, password) => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const registerUser = async (email, password, username) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  if (userCredential.user && username) {
    await updateProfile(userCredential.user, { displayName: username });
    
    // Create user document in Firestore
    const uid = userCredential.user.uid;
    const friendCode = uid.substring(0, 6).toUpperCase();
    await setDoc(doc(db, 'users', uid), {
      username: username,
      email: email,
      friendCode: friendCode,
      createdAt: new Date().toISOString()
    });
  }
  return userCredential;
};

export const resetPassword = async (email) => {
  return sendPasswordResetEmail(auth, email);
};

export const logoutUser = async () => {
  return signOut(auth);
};
