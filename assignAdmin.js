// Temporary script to assign admin role to a user
// Usage: node assignAdmin.js <UID>

import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { config } from 'dotenv';

// Load environment variables from root .env file
config();

const TARGET_UID = process.argv[2] || 'PASTE_YOUR_NEW_UID_HERE';

if (TARGET_UID === 'PASTE_YOUR_NEW_UID_HERE') {
  console.error('❌ Error: Please provide a UID as argument or edit the script');
  console.error('Usage: node assignAdmin.js <YOUR_UID>');
  process.exit(1);
}

// Initialize Firebase Admin SDK
if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  console.error('❌ Error: FIREBASE_SERVICE_ACCOUNT not found in .env file');
  process.exit(1);
}

try {
  const serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString());
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });

  console.log(`🔐 Assigning admin role to UID: ${TARGET_UID}...`);

  await admin.auth().setCustomUserClaims(TARGET_UID, { admin: true });

  console.log('✅ Success! Admin role granted.');
  console.log(`   UID: ${TARGET_UID}`);
  console.log(`   Claims: { admin: true }`);
  console.log('\n📋 Next steps:');
  console.log('   1. Sign out and sign back in to refresh your ID token');
  console.log('   2. Navigate to /admin to access the dashboard');

  process.exit(0);
} catch (err) {
  console.error('❌ Error:', err.message);
  process.exit(1);
}
