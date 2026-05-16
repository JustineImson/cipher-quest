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

// Handle generic push events
self.addEventListener('push', (event) => {
  let data = { title: 'Cipher Quest', body: 'New message received.' };

  try {
    data = event.data ? event.data.json() : data;
  } catch {
    data.body = event.data ? event.data.text() : data.body;
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/pwaIcon.png',
      badge: '/pwaIcon.png',
      data: data.data || {}
    })
  );
});

// Route user to the correct page when tapping a notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const routeMap = {
    friend_request:        '/profile',
    friend_accepted:       '/profile',
    game_invite:           '/multiplayer',
    invite_accepted:       '/multiplayer',
    invite_declined:       '/profile',
    personal_best:         '/leaderboards',
    leaderboard_displaced: '/leaderboards',
    story_reminder:        '/',
    friend_beats_score:    '/leaderboards',
  };

  const targetUrl = routeMap[data.type] || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      // If app is already open, focus it and navigate
      for (const client of list) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(targetUrl);
          return;
        }
      }
      // App not open — open it at the right route
      return clients.openWindow(targetUrl);
    })
  );
});
