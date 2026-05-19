import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import admin from 'firebase-admin';
import { selectCipherMethod } from '../src/engine/gameLogic.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Initialize Firebase Admin SDK from base64-encoded service account JSON
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
        const serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString());
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });

        // Socket.IO middleware to verify Firebase ID tokens
        io.use(async (socket, next) => {
            const token = socket.handshake.auth?.token;
            if (!token) return next(new Error('Authentication required'));
            try {
                const decoded = await admin.auth().verifyIdToken(token);
                socket.uid = decoded.uid; // attach uid to socket for use in events
                next();
            } catch (err) {
                console.error('Token verification failed:', err);
                next(new Error('Invalid token'));
            }
        });
    } catch (err) {
        console.error('Failed to initialize Firebase Admin:', err);
    }
} else {
    console.warn('FIREBASE_SERVICE_ACCOUNT not set — socket authentication disabled');
    // Attach null uid for unauthenticated sockets (legacy/dev)
    io.use((socket, next) => { socket.uid = null; next(); });
}

// ─────────────────────────────────────────────────────────────
// Push Notification Helpers (Phase 2A & 2B)
// ─────────────────────────────────────────────────────────────

/**
 * Sends a push notification to a user by their UID.
 * Silently no-ops if admin isn't initialized or user has no token.
 */
async function sendPushToUser(uid, title, body, link = '/') {
  if (!uid || !admin.apps?.length) return;
  try {
    const snap = await admin.firestore().collection('users').doc(uid).get();
    if (!snap.exists) return;
    const token = snap.data().fcmToken;
    if (!token) return;

    await admin.messaging().send({
      token,
      notification: { title, body },
      webpush: { fcmOptions: { link } },
    });
  } catch (err) {
    if (err.code === 'messaging/registration-token-not-registered' ||
        err.code === 'messaging/invalid-registration-token') {
      await admin.firestore().collection('users').doc(uid).update({ fcmToken: null });
    }
    console.error(`Push notification failed for ${uid}:`, err.message);
  }
}

/**
 * Phase 2A — Sends win/loss notifications to both match participants.
 */
async function sendMatchResultNotifications(winnerUid, loserUid) {
  await Promise.all([
    sendPushToUser(winnerUid,
      '🏆 Victory!',
      'You cracked the cipher faster than your opponent. Well done, detective!',
      '/leaderboards'
    ),
    sendPushToUser(loserUid,
      'Match Over',
      'Your opponent was faster this time. Study your weak ciphers and challenge again!',
      '/profile'
    ),
  ]);
}

const words = {
  easy: [
    'Clock', 'Train', 'Steam', 'Gears', 'Brass', 
    'Watch', 'Glass', 'Smoke', 'Valve', 'Metal'
  ],
  medium: [
    'Gaslight', 'Factory', 'Railway', 'Machine', 'Furnace', 
    'Airship', 'Pistons', 'Spanner', 'Chimney', 'Compass'
  ],
  hard: [
    'Phrenology', 'Apparatus', 'Telegraph', 'Locomotive', 'Automaton', 
    'Dirigible', 'Submarine', 'Zeppelin', 'Aeronaut', 'Gramophone'
  ]
};

const rooms = {}; 

const generateRoomCode = () => {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let i = 0; i < 4; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
};

// API route mapping (for single-player Time Attack Mode)
app.get('/api/generate-word', (req, res) => {
  const difficulty = (req.query.difficulty || 'easy').toLowerCase();
  
  const wordList = words[difficulty] || words.easy;
  const randomIndex = Math.floor(Math.random() * wordList.length);
  const selectedWord = wordList[randomIndex];

  res.json({ word: selectedWord, difficulty });
});

// ─────────────────────────────────────────────────────────────
// POST /notify — Client-triggered push notification endpoint
// ─────────────────────────────────────────────────────────────
app.post('/notify', async (req, res) => {
  // Guard: Admin SDK must be initialized
  if (!admin.apps?.length) {
    return res.status(503).json({ error: 'Notification service unavailable' });
  }

  const { targetUid, title, body, type, link } = req.body;

  // Validate — only accept known notification types
  const allowedTypes = [
    'friend_request', 'friend_accepted',
    'game_invite', 'invite_accepted', 'invite_declined',
    'direct_challenge',
    'personal_best', 'leaderboard_displaced', 'friend_beats_score'
  ];
  if (!allowedTypes.includes(type)) {
    return res.status(400).json({ error: 'Invalid notification type' });
  }
  if (!targetUid || !title) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const userSnap = await admin.firestore()
      .collection('users').doc(targetUid).get();
    if (!userSnap.exists) return res.status(404).json({ error: 'User not found' });

    const { fcmToken } = userSnap.data();
    if (!fcmToken) return res.status(200).json({ skipped: 'No token' });

    await admin.messaging().send({
      token: fcmToken,
      notification: { title, body },
      data: { type, link: link || '/' },
      webpush: { fcmOptions: { link: link || '/' } },
    });

    res.status(200).json({ success: true });
  } catch (err) {
    if (err.code === 'messaging/registration-token-not-registered' ||
        err.code === 'messaging/invalid-registration-token') {
      await admin.firestore()
        .collection('users').doc(targetUid).update({ fcmToken: null });
      return res.status(200).json({ skipped: 'Stale token cleaned' });
    }
    console.error('POST /notify error:', err.message);
    res.status(500).json({ error: err.message });
  }
});
io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on('create_room', ({ difficulty }) => {
        const roomCode = generateRoomCode();
        rooms[roomCode] = {
            hostSocketId: socket.id,
            hostUid: socket.uid,
            difficulty: difficulty,
            players: [{ socketId: socket.id, uid: socket.uid, score: 0 }],
            status: 'waiting'
        };
        socket.join(roomCode);
        socket.emit('room_created', { roomCode });
    });

    socket.on('join_room', ({ roomCode }) => {
        const room = rooms[roomCode];
        if (room && room.status === 'waiting') {
            if (room.players.length < 2) {
                room.players.push({ socketId: socket.id, uid: socket.uid, score: 0 });
                socket.join(roomCode);
                io.to(roomCode).emit('player_joined', { playerCount: room.players.length });
            } else {
                socket.emit('error', { message: 'Room is full' });
            }
        } else {
            socket.emit('error', { message: 'Invalid or active room' });
        }
    });

    const generateAndEmitWord = (roomCode, difficulty) => {
        try {
            const diff = (difficulty || 'easy').toLowerCase();
            const wordList = words[diff] || words.easy;
            const randomIndex = Math.floor(Math.random() * wordList.length);
            const targetWord = wordList[randomIndex].toUpperCase();

            const cipherMethod = selectCipherMethod(diff);
            const encryptedWord = cipherMethod.applyCipher(targetWord);

            io.to(roomCode).emit('new_word_round', {
                targetWord,
                encryptedWord,
                cipherName: cipherMethod.name,
                cipherKey: cipherMethod.key
            });
        } catch (error) {
            console.error("Fatal encryption error:", error);
            io.to(roomCode).emit('error', { message: "Server encryption failure: " + error.message });
        }
    };

    socket.on('start_game', ({ roomCode }) => {
        const room = rooms[roomCode];
        // Always verify host by authenticated uid when available
        if (room && ((room.hostUid && room.hostUid === socket.uid) || (room.hostSocketId && room.hostSocketId === socket.id))) {
            room.status = 'playing';
            io.to(roomCode).emit('game_started');
            
            // Server dictates identical cryptographics 
            setTimeout(() => {
                generateAndEmitWord(roomCode, room.difficulty);
            }, 1000); // Slight delay for UI transition
        }
    });

    socket.on('next_round', ({ roomCode }) => {
      const room = rooms[roomCode];
      if (room && room.status === 'playing') {
          generateAndEmitWord(roomCode, room.difficulty);
      }
    });

    socket.on('submit_score', ({ roomCode, score }) => {
        const room = rooms[roomCode];
        if (room && room.status === 'playing') {
            const playerIndex = room.players.findIndex(p => p.socketId === socket.id);
            if (playerIndex !== -1) {
                // Always use socket.uid/server-side identity — never trust client-supplied uid
                room.players[playerIndex].score = score;
                socket.to(roomCode).emit('opponent_score_update', { score });
                
                // Winning limit check natively on backend
                if (score >= 500) {
                    room.status = 'finished';
                    const winnerUid = room.players[playerIndex].uid;
                    const loserUid = room.players.find((_, i) => i !== playerIndex)?.uid;
                    io.to(roomCode).emit('match_over', { winnerUid });
                    // Phase 2A — Push notifications for match result
                    sendMatchResultNotifications(winnerUid, loserUid);
                }
            }
        }
    });

    socket.on('timeout', ({ roomCode }) => {
        // Evaluate scores when timer hits 0
        const room = rooms[roomCode];
        if (room && room.status === 'playing') {
            room.status = 'finished';
            
            const p1 = room.players[0];
            const p2 = room.players[1];
            
            let winnerUid = null;
            if (p2 && p1.score !== p2.score) {
                 winnerUid = p1.score > p2.score ? p1.uid : p2.uid;
            } else if (!p2) {
                 winnerUid = p1.uid;
            }

            io.to(roomCode).emit('match_over', { winnerUid, isDraw: p1.score === (p2?.score || 0) });
            // Phase 2A — Push notifications for timeout-based match result
            if (winnerUid) {
              const loserUid = winnerUid === p1.uid ? p2?.uid : p1.uid;
              sendMatchResultNotifications(winnerUid, loserUid);
            }
        }
    });

    socket.on('forfeit_match', ({ roomCode }) => {
        const room = rooms[roomCode];
        if (room && room.status === 'playing') {
            room.status = 'finished';
            const forfeitingPlayerIndex = room.players.findIndex(p => p.socketId === socket.id);
            if (forfeitingPlayerIndex !== -1) {
                const p1 = room.players[0];
                const p2 = room.players[1];
                
                const loserUid = room.players[forfeitingPlayerIndex].uid;
                let winnerUid = null;
                
                if (p2) {
                     winnerUid = forfeitingPlayerIndex === 0 ? p2.uid : p1.uid;
                }

                io.to(roomCode).emit('match_over', { winnerUid, isForfeit: true });
                if (winnerUid) {
                    sendPushToUser(winnerUid,
                        '🏆 Victory by Forfeit!',
                        'Your opponent fled the battle. You win by default!',
                        '/leaderboards'
                    );
                    sendPushToUser(loserUid,
                        'Match Forfeited',
                        'You abandoned the match. Your opponent claims victory.',
                        '/profile'
                    );
                }
            }
        }
    });

    socket.on('disconnect', () => {
        console.log(`Socket disconnected: ${socket.id}`);
        for (const [roomCode, room] of Object.entries(rooms)) {
            const playerIndex = room.players.findIndex(p => p.socketId === socket.id);
            if (playerIndex !== -1) {
                const removed = room.players.splice(playerIndex, 1);
                io.to(roomCode).emit('player_left', { message: 'Opponent disconnected', uid: removed[0]?.uid });

                // Phase 2B — Notify remaining player if match was in progress
                if (room.status === 'playing' && room.players.length > 0) {
                  const remainingUid = room.players[0].uid;
                  sendPushToUser(remainingUid,
                    'Opponent Disconnected',
                    'Your opponent left the match. You win by default!',
                    '/multiplayer'
                  );
                }
                
                if (room.players.length === 0) {
                    delete rooms[roomCode];
                } else if (room.hostSocketId === socket.id && room.players.length > 0) {
                    room.hostSocketId = room.players[0].socketId; // Reassign host (socket)
                    room.hostUid = room.players[0].uid; // Reassign host uid
                }
            }
        }
    });
});

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Aegis AI Multiplayer Server running on port ${PORT} (0.0.0.0)`);
});
