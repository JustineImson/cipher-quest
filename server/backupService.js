import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKUP_DIR = path.join(__dirname, 'backups');

/**
 * Perform a full backup of critical Firestore collections to local JSON files.
 * @param {import('firebase-admin').firestore.Firestore} db
 */
export async function runAutomatedBackup(db) {
  if (!db) {
    console.warn('[backupService] Database not initialized. Skipping backup.');
    return { success: false, error: 'DB not initialized' };
  }

  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFolder = path.join(BACKUP_DIR, `backup_${timestamp}`);
    fs.mkdirSync(backupFolder);

    const collectionsToBackup = [
      'users',
      'storyProgress',
      'friendships',
      'gameInvites',
      'system'
    ];

    let totalDocs = 0;

    for (const collectionName of collectionsToBackup) {
      const snapshot = await db.collection(collectionName).get();
      const docs = {};
      
      snapshot.forEach(doc => {
        docs[doc.id] = doc.data();
      });

      fs.writeFileSync(
        path.join(backupFolder, `${collectionName}.json`),
        JSON.stringify(docs, null, 2)
      );
      totalDocs += snapshot.size;
    }

    console.log(`[backupService] Successfully backed up ${totalDocs} documents to ${backupFolder}`);
    
    // Cleanup old backups (keep last 7)
    cleanupOldBackups();

    return { success: true, folder: backupFolder, totalDocs };
  } catch (error) {
    console.error('[backupService] Backup failed:', error);
    return { success: false, error: error.message };
  }
}

function cleanupOldBackups() {
  try {
    const files = fs.readdirSync(BACKUP_DIR);
    const backups = files
      .filter(f => f.startsWith('backup_'))
      .map(f => ({
        name: f,
        time: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time); // Newest first

    const MAX_BACKUPS = 7;
    if (backups.length > MAX_BACKUPS) {
      const toDelete = backups.slice(MAX_BACKUPS);
      for (const b of toDelete) {
        fs.rmSync(path.join(BACKUP_DIR, b.name), { recursive: true, force: true });
        console.log(`[backupService] Deleted old backup: ${b.name}`);
      }
    }
  } catch (err) {
    console.error('[backupService] Error cleaning up old backups:', err);
  }
}

/**
 * Start a daily automated backup timer.
 * @param {import('firebase-admin').firestore.Firestore} db
 */
export function startBackupScheduler(db) {
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  
  // Run once immediately on start if no recent backups exist
  try {
    if (!fs.existsSync(BACKUP_DIR) || fs.readdirSync(BACKUP_DIR).length === 0) {
      runAutomatedBackup(db);
    }
  } catch (e) {
    // Ignore error if dir doesn't exist
  }

  // Schedule daily
  setInterval(() => {
    runAutomatedBackup(db);
  }, ONE_DAY_MS);
  
  console.log('[backupService] Automated daily backups scheduled.');
}
