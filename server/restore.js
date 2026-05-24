import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';
import dotenv from 'dotenv';

// Setup environment and paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Setup Firebase Admin
if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    console.error("❌ ERROR: FIREBASE_SERVICE_ACCOUNT is missing in .env");
    process.exit(1);
}

const serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString());
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

/**
 * Restores a Firestore database from a backup folder
 */
async function restoreBackup(backupFolderName) {
    const backupPath = path.join(__dirname, 'backups', backupFolderName);
    
    if (!fs.existsSync(backupPath)) {
        console.error(`❌ ERROR: Backup folder not found at ${backupPath}`);
        process.exit(1);
    }

    console.log(`\n🔄 Starting recovery from: ${backupFolderName}\n`);

    const files = fs.readdirSync(backupPath).filter(f => f.endsWith('.json'));

    for (const file of files) {
        const collectionName = file.replace('.json', '');
        const filePath = path.join(backupPath, file);
        
        console.log(`📂 Restoring collection: ${collectionName}...`);
        
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const docs = JSON.parse(fileContent);
        
        const docIds = Object.keys(docs);
        if (docIds.length === 0) {
            console.log(`   ↳ Skipped (Empty)`);
            continue;
        }

        // We use batches to write to Firestore efficiently
        let batch = db.batch();
        let operationCount = 0;
        let totalRestored = 0;

        for (const docId of docIds) {
            const docRef = db.collection(collectionName).doc(docId);
            batch.set(docRef, docs[docId]);
            operationCount++;
            totalRestored++;

            // Firestore batches have a limit of 500 operations
            if (operationCount === 500) {
                await batch.commit();
                batch = db.batch();
                operationCount = 0;
            }
        }

        // Commit any remaining documents in the final batch
        if (operationCount > 0) {
            await batch.commit();
        }

        console.log(`   ↳ ✅ Restored ${totalRestored} documents.`);
    }

    console.log(`\n🎉 Recovery complete! Your database has been restored.`);
    process.exit(0);
}

// Check for command line arguments
const targetBackup = process.argv[2];

if (!targetBackup) {
    console.log("⚠️  Usage: node restore.js <backup_folder_name>");
    console.log("Example: node restore.js backup_2026-05-24T11-40-22-356Z");
    console.log("\nAvailable backups:");
    
    const backupsDir = path.join(__dirname, 'backups');
    if (fs.existsSync(backupsDir)) {
        const folders = fs.readdirSync(backupsDir);
        folders.forEach(f => console.log(`  - ${f}`));
    }
    process.exit(1);
}

// Run the restore
restoreBackup(targetBackup);
