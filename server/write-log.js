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

async function writeTestLog() {
    const db = admin.firestore();
    console.log('Writing test logs to audit_logs...');
    
    await db.collection('audit_logs').add({
        level: 'WARN',
        event: 'ADMIN_TEST_WARN',
        uid: 'test-admin',
        details: { msg: 'This is a test warning log' },
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        userAgent: 'Node.js Check Script'
    });

    await db.collection('audit_logs').add({
        level: 'ERROR',
        event: 'ADMIN_TEST_ERROR',
        uid: 'test-admin',
        details: { msg: 'This is a test error log' },
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        userAgent: 'Node.js Check Script'
    });

    console.log('Successfully wrote test logs!');
    process.exit(0);
}

writeTestLog();
