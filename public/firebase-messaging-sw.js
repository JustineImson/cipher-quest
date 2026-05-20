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

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// ─── Theme constants ───────────────────────────────────────────────────────
const ICON   = '/pwaIcon.png';
const BADGE  = '/pwaIcon.png';
// Gold pulse: short-long-short (Victorian morse feel)
const VIBRATE = [80, 60, 80, 60, 200];

// ─── Per-type notification config ─────────────────────────────────────────
const TYPE_CONFIG = {
  friend_request: {
    title:   '— New Intelligence Contact —',
    body:    (d) => `${d.senderName || 'An operative'} wishes to join your network.`,
    actions: [
      { action: 'view',    title: '✦ View Dossier' },
    ],
    route:   '/profile',
    tag:     'friend-request',
  },
  friend_accepted: {
    title:   '— Alliance Confirmed —',
    body:    (d) => `${d.senderName || 'An operative'} accepted your contact request.`,
    actions: [
      { action: 'view',    title: '✦ View Profile' },
    ],
    route:   '/profile',
    tag:     'friend-accepted',
  },
  game_invite: {
    title:   '— Cipher Duel Incoming —',
    body:    (d) => `${d.senderName || 'An agent'} challenges you to a cipher battle.`,
    actions: [
      { action: 'accept',  title: '⚔ Accept Duel' },
      { action: 'decline', title: '✕ Decline'     },
    ],
    route:   '/multiplayer',
    tag:     'game-invite',
  },
  direct_challenge: {
    title:   '— Cipher Duel Incoming —',
    body:    (d) => `${d.senderName || 'An agent'} challenges you to a cipher battle.`,
    actions: [
      { action: 'accept',  title: '⚔ Accept Duel' },
      { action: 'decline', title: '✕ Decline'     },
    ],
    route:   '/multiplayer',
    tag:     'game-invite',
  },
  invite_accepted: {
    title:   '— Duel Accepted —',
    body:    (d) => `${d.senderName || 'Your opponent'} is ready. Proceed to the arena.`,
    actions: [
      { action: 'view', title: '⚔ Enter Arena' },
    ],
    route:   '/multiplayer',
    tag:     'invite-accepted',
  },
  invite_declined: {
    title:   '— Challenge Refused —',
    body:    (d) => `${d.senderName || 'The operative'} declined your cipher duel.`,
    actions: [],
    route:   '/profile',
    tag:     'invite-declined',
  },
  personal_best: {
    title:   '— New Record Logged —',
    body:    (d) => d.body || 'You have set a new personal best score. Well done, detective.',
    actions: [
      { action: 'view', title: '✦ View Records' },
    ],
    route:   '/leaderboards',
    tag:     'personal-best',
  },
  leaderboard_displaced: {
    title:   '— Rank Under Threat —',
    body:    (d) => d.body || 'A rival agent has surpassed your position on the board.',
    actions: [
      { action: 'view', title: '✦ Inspect Board' },
    ],
    route:   '/leaderboards',
    tag:     'leaderboard',
  },
  friend_beats_score: {
    title:   '— Rival Scores Higher —',
    body:    (d) => d.body || 'A contact in your network has beaten your score.',
    actions: [
      { action: 'view', title: '✦ Inspect Board' },
    ],
    route:   '/leaderboards',
    tag:     'leaderboard',
  },
  match_win: {
    title:   '— Victory Recorded —',
    body:    (d) => d.body || 'You have prevailed in the cipher arena. Outstanding work.',
    actions: [],
    route:   '/leaderboards',
    tag:     'match-result',
  },
  match_loss: {
    title:   '— Defeat Noted —',
    body:    (d) => d.body || 'You were bested this round. Study the ciphers and return.',
    actions: [],
    route:   '/leaderboards',
    tag:     'match-result',
  },
};

/** Build the full showNotification options for a given FCM payload */
function buildNotificationOptions(payload) {
  const data   = payload.data   || {};
  const notif  = payload.notification || {};
  const type   = data.type || '';
  const config = TYPE_CONFIG[type];

  const title = config
    ? config.title
    : (notif.title || '— Cipher Quest —');

  const body = config
    ? (typeof config.body === 'function' ? config.body(data) : config.body)
    : (notif.body || data.body || 'A new transmission has arrived.');

  const actions = config?.actions || [];
  const tag     = config?.tag     || 'cq-general';
  const route   = config?.route   || data.link || '/';

  return {
    title,
    options: {
      body,
      icon:    ICON,
      badge:   BADGE,
      vibrate: VIBRATE,
      tag,
      renotify: true,
      requireInteraction: ['game_invite', 'direct_challenge', 'friend_request'].includes(type),
      actions,
      data: { ...data, route },
      // Silent timestamp in the notification drawer so newest appears first
      timestamp: Date.now(),
    },
  };
}

// ─── Background message handler ───────────────────────────────────────────
messaging.onBackgroundMessage((payload) => {
  const { title, options } = buildNotificationOptions(payload);
  self.registration.showNotification(title, options);
});

// ─── Notification click handler ───────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data    = event.notification.data || {};
  const action  = event.action;
  const route   = data.route || '/';

  // Action-specific overrides
  let targetUrl = route;
  if (action === 'accept' && data.roomCode) {
    targetUrl = `/multiplayer?join=${data.roomCode}`;
  } else if (action === 'decline') {
    // Just close — no navigation needed
    return;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(targetUrl);
          return;
        }
      }
      return clients.openWindow(targetUrl);
    })
  );
});
