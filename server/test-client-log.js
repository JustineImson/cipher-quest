import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const firebaseConfig = {
  apiKey: "AIzaSyAW8OoSNkW1egPRVemA6Z6l6GW-kXds3x0",
  authDomain: "detective-game-db.firebaseapp.com",
  projectId: "detective-game-db",
  storageBucket: "detective-game-db.firebasestorage.app",
  messagingSenderId: "906539423387",
  appId: "1:906539423387:web:74b96ac04a02ddb8c4183e"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function testClientWrite() {
    try {
        console.log('Logging in as anonymous...');
        await signInAnonymously(auth);
        console.log('Logged in. Attempting to write audit log via client SDK...');
        
        await addDoc(collection(db, 'audit_logs'), {
            level: 'INFO',
            event: 'CLIENT_SDK_TEST',
            uid: auth.currentUser.uid,
            details: { msg: 'Test from client SDK script' },
            timestamp: serverTimestamp(),
            userAgent: 'Node.js Test Client'
        });
        console.log('Successfully wrote log via Client SDK!');
        process.exit(0);
    } catch (err) {
        console.error('Failed to write via Client SDK:', err.message);
        process.exit(1);
    }
}

testClientWrite();
