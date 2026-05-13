importScripts('https://www.gstatic.com/firebasejs/10.12.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.1/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyAW8OoSNkW1egPRVemA6Z6l6GW-kXds3x0",
  authDomain: "detective-game-db.firebaseapp.com",
  projectId: "detective-game-db",
  storageBucket: "detective-game-db.firebasestorage.app",
  messagingSenderId: "906539423387",
  appId: "1:906539423387:web:74b96ac04a02ddb8c4183e"
};

// Initialize Firebase App
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  const notificationTitle = payload.notification?.title || 'Cipher Quest Update';
  const notificationOptions = {
    body: payload.notification?.body || 'A new transmission has arrived.',
    icon: '/pwaIcon.png',
    badge: '/pwaIcon.png', // Optional, good for mobile
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
