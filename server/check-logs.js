import admin from 'firebase-admin';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString());
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

async function checkLogs() {
    const db = admin.firestore();
    const snap = await db.collection('audit_logs').orderBy('timestamp', 'desc').get();
    console.log(`Found ${snap.docs.length} logs in audit_logs collection.`);
    snap.docs.forEach(doc => {
        console.log(doc.id, '=>', doc.data());
    });
    process.exit(0);
}

checkLogs();
