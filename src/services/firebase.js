import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyAW8OoSNkW1egPRVemA6Z6l6GW-kXds3x0",
  authDomain: "detective-game-db.firebaseapp.com",
  projectId: "detective-game-db",
  storageBucket: "detective-game-db.firebasestorage.app",
  messagingSenderId: "906539423387",
  appId: "1:906539423387:web:74b96ac04a02ddb8c4183e"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);
