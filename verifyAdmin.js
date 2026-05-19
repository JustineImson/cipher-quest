// Script to verify admin claims for a user
import admin from 'firebase-admin';
import { config } from 'dotenv';

config();

const TARGET_UID = process.argv[2];

if (!TARGET_UID) {
  console.error('Usage: node verifyAdmin.js <UID>');
  process.exit(1);
}

try {
  const serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString());
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });

  const user = await admin.auth().getUser(TARGET_UID);
  
  console.log('\n🔍 User Record:');
  console.log('   UID:', user.uid);
  console.log('   Email:', user.email);
  console.log('   Display Name:', user.displayName);
  
  console.log('\n📋 Custom Claims:');
  console.log('   ', JSON.stringify(user.customClaims, null, 2));
  
  if (user.customClaims?.admin === true) {
    console.log('\n✅ Admin claim IS set correctly!');
    console.log('   If the dashboard still redirects, the token may need more time to propagate.');
    console.log('   Try: 1) Clear browser cookies/cache for localhost');
    console.log('        2) Use an incognito window');
    console.log('        3) Wait 2-3 minutes and try again');
  } else {
    console.log('\n❌ Admin claim is NOT set!');
    console.log('   Run: node assignAdmin.js', TARGET_UID);
  }
  
  process.exit(0);
} catch (err) {
  console.error('❌ Error:', err.message);
  process.exit(1);
}
