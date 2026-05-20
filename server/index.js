import { fileURLToPath } from 'url';
import { dirname, resolve, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../.env') });

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import admin from 'firebase-admin';
import nodemailer from 'nodemailer';
import { selectCipherMethod } from '../src/engine/gameLogic.js';

const app = express();
const PORT = process.env.PORT || 3001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || '*';

app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_ORIGIN,
    methods: ["GET", "POST"]
  }
});

// Serve the built React frontend (populated by `npm run build`)
const distPath = resolve(__dirname, '../dist');
app.use(express.static(distPath));

// Initialize Firebase Admin SDK from base64-encoded service account JSON
let db = null;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
        const serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString());
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        db = admin.firestore();

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
// Email Helper
// ─────────────────────────────────────────────────────────────

let _transporter = null;
function getTransporter() {
    if (_transporter) return _transporter;
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;
    if (!user || !pass) {
        console.warn('EMAIL_USER / EMAIL_PASS not set — email sending disabled');
        return null;
    }
    _transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass }
    });
    return _transporter;
}

async function sendEmail({ to, subject, html }) {
    const transporter = getTransporter();
    if (!transporter) return;
    try {
        await transporter.sendMail({
            from: `"Cipher Quest" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            html
        });
        console.log(`Email sent to ${to}: ${subject}`);
    } catch (err) {
        console.error(`Email failed to ${to}:`, err.message);
    }
}

// ─────────────────────────────────────────────────────────────
// Admin Middleware & Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Middleware to verify admin custom claim from Firebase ID token
 */
async function verifyAdminMiddleware(req, res, next) {
    if (!admin.apps?.length) {
        return res.status(503).json({ error: 'Admin service unavailable' });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.split('Bearer ')[1];
    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        if (!decodedToken.admin) {
            return res.status(403).json({ error: 'Forbidden: Admin access required' });
        }
        req.adminUid = decodedToken.uid;
        next();
    } catch (err) {
        console.error('Admin token verification failed:', err.message);
        return res.status(401).json({ error: 'Invalid token' });
    }
}

/**
 * Check if bootstrap has already been used
 */
async function isBootstrapUsed() {
    if (!db) return true;
    try {
        const doc = await db.collection('system').doc('adminBootstrap').get();
        return doc.exists && doc.data().used === true;
    } catch (err) {
        console.error('Error checking bootstrap status:', err);
        return true;
    }
}

/**
 * Mark bootstrap as used
 */
async function markBootstrapUsed() {
    if (!db) return;
    try {
        await db.collection('system').doc('adminBootstrap').set({ used: true, usedAt: new Date().toISOString() });
    } catch (err) {
        console.error('Error marking bootstrap used:', err);
    }
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

// ─────────────────────────────────────────────────────────────
// Admin Routes (Protected by verifyAdminMiddleware)
// ─────────────────────────────────────────────────────────────

/**
 * POST /admin/bootstrap — Create the first admin (one-time use)
 * Body: { uid, secret }
 * Checks secret against ADMIN_BOOTSTRAP_SECRET env var
 */
app.post('/admin/bootstrap', async (req, res) => {
    const { uid, secret } = req.body;

    if (!uid || !secret) {
        return res.status(400).json({ error: 'Missing uid or secret' });
    }

    const expectedSecret = process.env.ADMIN_BOOTSTRAP_SECRET;
    if (!expectedSecret) {
        return res.status(503).json({ error: 'Bootstrap not configured' });
    }

    if (secret !== expectedSecret) {
        return res.status(403).json({ error: 'Invalid bootstrap secret' });
    }

    if (await isBootstrapUsed()) {
        return res.status(403).json({ error: 'Bootstrap already used' });
    }

    try {
        await admin.auth().setCustomUserClaims(uid, { admin: true });
        await markBootstrapUsed();
        res.status(200).json({ success: true, message: 'Admin role granted' });
    } catch (err) {
        console.error('Bootstrap error:', err);
        res.status(500).json({ error: 'Failed to set admin claim' });
    }
});

/**
 * POST /admin/ban-user — Disable a user account
 */
app.post('/admin/ban-user', verifyAdminMiddleware, async (req, res) => {
    const { uid } = req.body;
    if (!uid) return res.status(400).json({ error: 'Missing uid' });

    try {
        const userRecord = await admin.auth().getUser(uid);
        await admin.auth().updateUser(uid, { disabled: true });

        if (userRecord.email) {
            sendEmail({
                to: userRecord.email,
                subject: 'Your Cipher Quest account has been suspended',
                html: `
                    <div style="font-family:monospace;background:#0a0a0f;color:#e8dcc0;padding:32px;max-width:520px;margin:auto;border:1px solid #7a6030">
                        <h2 style="color:#c9a84c;letter-spacing:0.2em;text-transform:uppercase">Account Suspended</h2>
                        <p>Your <strong>Cipher Quest</strong> account (<code>${userRecord.email}</code>) has been <strong style="color:#c96a6a">suspended</strong> by an administrator.</p>
                        <p style="color:#7a6030">If you believe this is a mistake, please contact support.</p>
                        <hr style="border-color:#7a6030;margin:24px 0">
                        <p style="font-size:11px;color:#7a6030">This is an automated notice. Do not reply to this email.</p>
                    </div>
                `
            });
        }

        res.status(200).json({ success: true, message: 'User banned' });
    } catch (err) {
        console.error('Ban user error:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /admin/unban-user — Re-enable a user account
 */
app.post('/admin/unban-user', verifyAdminMiddleware, async (req, res) => {
    const { uid } = req.body;
    if (!uid) return res.status(400).json({ error: 'Missing uid' });

    try {
        const userRecord = await admin.auth().getUser(uid);
        await admin.auth().updateUser(uid, { disabled: false });

        if (userRecord.email) {
            sendEmail({
                to: userRecord.email,
                subject: 'Your Cipher Quest account has been reinstated',
                html: `
                    <div style="font-family:monospace;background:#0a0a0f;color:#e8dcc0;padding:32px;max-width:520px;margin:auto;border:1px solid #7a6030">
                        <h2 style="color:#c9a84c;letter-spacing:0.2em;text-transform:uppercase">Account Reinstated</h2>
                        <p>Your <strong>Cipher Quest</strong> account (<code>${userRecord.email}</code>) has been <strong style="color:#5a9e6f">reinstated</strong>. You may now log in again.</p>
                        <p style="color:#7a6030">Welcome back, detective.</p>
                        <hr style="border-color:#7a6030;margin:24px 0">
                        <p style="font-size:11px;color:#7a6030">This is an automated notice. Do not reply to this email.</p>
                    </div>
                `
            });
        }

        res.status(200).json({ success: true, message: 'User unbanned' });
    } catch (err) {
        console.error('Unban user error:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /admin/force-logout — Revoke all refresh tokens for a user
 */
app.post('/admin/force-logout', verifyAdminMiddleware, async (req, res) => {
    const { uid } = req.body;
    if (!uid) return res.status(400).json({ error: 'Missing uid' });

    try {
        await admin.auth().revokeRefreshTokens(uid);
        res.status(200).json({ success: true, message: 'Tokens revoked' });
    } catch (err) {
        console.error('Force logout error:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /admin/reset-password — Generate password reset link or directly set password
 */
app.post('/admin/reset-password', verifyAdminMiddleware, async (req, res) => {
    const { uid, email, newPassword, sendEmail } = req.body;
    if (!uid && !email) return res.status(400).json({ error: 'Missing uid or email' });

    try {
        if (sendEmail && email) {
            const link = await admin.auth().generatePasswordResetLink(email);
            res.status(200).json({ success: true, resetLink: link, message: 'Password reset email generated' });
        } else if (newPassword && uid) {
            await admin.auth().updateUser(uid, { password: newPassword });
            res.status(200).json({ success: true, message: 'Password updated' });
        } else {
            return res.status(400).json({ error: 'Specify sendEmail:true with email, or newPassword with uid' });
        }
    } catch (err) {
        console.error('Reset password error:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /admin/delete-user — Delete user with cascading data cleanup
 */
app.post('/admin/delete-user', verifyAdminMiddleware, async (req, res) => {
    const { uid } = req.body;
    if (!uid) return res.status(400).json({ error: 'Missing uid' });

    try {
        const batch = admin.firestore().batch();

        // Delete user documents
        batch.delete(admin.firestore().collection('users').doc(uid));
        batch.delete(admin.firestore().collection('storyProgress').doc(uid));
        batch.delete(admin.firestore().collection('leaderboards').doc('timeAttack').collection('entries').doc(uid));
        batch.delete(admin.firestore().collection('leaderboards').doc('multiplayer').collection('entries').doc(uid));

        // Delete friendships (both directions)
        const sentFriendships = await admin.firestore().collection('friendships')
            .where('senderId', '==', uid).get();
        const receivedFriendships = await admin.firestore().collection('friendships')
            .where('receiverId', '==', uid).get();
        [...sentFriendships.docs, ...receivedFriendships.docs]
            .forEach(doc => batch.delete(doc.ref));

        // Delete game invites
        const sentInvites = await admin.firestore().collection('gameInvites')
            .where('senderId', '==', uid).get();
        const receivedInvites = await admin.firestore().collection('gameInvites')
            .where('receiverId', '==', uid).get();
        [...sentInvites.docs, ...receivedInvites.docs]
            .forEach(doc => batch.delete(doc.ref));

        await batch.commit();
        await admin.auth().deleteUser(uid);

        res.status(200).json({ success: true, message: 'User and data deleted' });
    } catch (err) {
        console.error('Delete user error:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /admin/rooms — Get all active multiplayer rooms
 */
app.get('/admin/rooms', verifyAdminMiddleware, (req, res) => {
    const roomList = Object.entries(rooms).map(([code, room]) => ({
        roomCode: code,
        hostUid: room.hostUid,
        difficulty: room.difficulty,
        status: room.status,
        playerCount: room.players.length,
        players: room.players.map(p => ({ uid: p.uid, score: p.score }))
    }));
    res.status(200).json({ rooms: roomList });
});

/**
 * POST /admin/close-room — Force close a multiplayer room
 */
app.post('/admin/close-room', verifyAdminMiddleware, (req, res) => {
    const { roomCode } = req.body;
    if (!roomCode) return res.status(400).json({ error: 'Missing roomCode' });

    const room = rooms[roomCode];
    if (!room) return res.status(404).json({ error: 'Room not found' });

    io.to(roomCode).emit('room_closed_by_admin', { message: 'Room closed by administrator' });

    // Disconnect all sockets in the room
    const sockets = io.sockets.adapter.rooms.get(roomCode);
    if (sockets) {
        sockets.forEach(socketId => {
            const socket = io.sockets.sockets.get(socketId);
            if (socket) socket.leave(roomCode);
        });
    }

    delete rooms[roomCode];
    res.status(200).json({ success: true, message: 'Room closed' });
});

/**
 * POST /admin/set-announcement — Persist announcement to Firestore AND broadcast push
 */
app.post('/admin/set-announcement', verifyAdminMiddleware, async (req, res) => {
    const { text, title, body, link = '/' } = req.body;
    if (!text) return res.status(400).json({ error: 'Missing announcement text' });

    try {
        // 1. Persist to Firestore using Admin SDK (bypasses client security rules)
        await admin.firestore().collection('system').doc('announcements').collection('items').add({
            text,
            createdAt: Date.now(),
            createdBy: req.adminUid
        });

        // 2. Broadcast push notification to all users with FCM tokens
        const pushTitle = title || '📢 New Announcement';
        const pushBody = body || text;

        const allUsers = await admin.firestore().collection('users')
            .where('fcmToken', '!=', null).get();
        const tokens = allUsers.docs.map(d => d.data().fcmToken).filter(Boolean);

        let sent = 0;
        let failed = 0;

        if (tokens.length > 0) {
            const batchSize = 500;
            for (let i = 0; i < tokens.length; i += batchSize) {
                const batch = tokens.slice(i, i + batchSize);
                const response = await admin.messaging().sendEachForMulticast({
                    tokens: batch,
                    notification: { title: pushTitle, body: pushBody },
                    webpush: { fcmOptions: { link } }
                });
                sent += response.successCount;
                failed += response.failureCount;
            }
        }

        res.status(200).json({ success: true, sent, failed, total: tokens.length });
    } catch (err) {
        console.error('Set-announcement error:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /admin/broadcast — Send global push notification to all users
 */
app.post('/admin/broadcast', verifyAdminMiddleware, async (req, res) => {
    const { title, body, link = '/' } = req.body;
    if (!title || !body) return res.status(400).json({ error: 'Missing title or body' });

    try {
        const allUsers = await admin.firestore().collection('users')
            .where('fcmToken', '!=', null).get();
        const tokens = allUsers.docs
            .map(d => d.data().fcmToken)
            .filter(Boolean);

        if (tokens.length === 0) {
            return res.status(200).json({ success: true, sent: 0, message: 'No tokens found' });
        }

        // Send in batches of 500 (FCM limit)
        const batchSize = 500;
        let successCount = 0;
        let failureCount = 0;

        for (let i = 0; i < tokens.length; i += batchSize) {
            const batch = tokens.slice(i, i + batchSize);
            const response = await admin.messaging().sendEachForMulticast({
                tokens: batch,
                notification: { title, body },
                webpush: { fcmOptions: { link } }
            });
            successCount += response.successCount;
            failureCount += response.failureCount;
        }

        res.status(200).json({
            success: true,
            sent: successCount,
            failed: failureCount,
            total: tokens.length
        });
    } catch (err) {
        console.error('Broadcast error:', err);
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

// ─────────────────────────────────────────────────────────────
// ML API Proxy — forwards /ml/* to the local Flask service
// so mobile clients (PWA) can reach it through this server
// ─────────────────────────────────────────────────────────────
const ML_API_URL = process.env.ML_API_URL || 'http://127.0.0.1:5000';

app.get('/ml/health', async (_req, res) => {
  try {
    const response = await fetch(`${ML_API_URL}/health`);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(503).json({ status: 'unavailable', error: err.message });
  }
});

app.post('/ml/predict', async (req, res) => {
  try {
    const response = await fetch(`${ML_API_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(503).json({ error: err.message });
  }
});

// SPA fallback — any non-API route returns index.html so React Router works
app.get('*', (_req, res) => {
  res.sendFile(join(distPath, 'index.html'));
});

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Aegis AI Multiplayer Server running on port ${PORT} (0.0.0.0)`);
});
