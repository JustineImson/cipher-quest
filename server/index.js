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
                    io.to(roomCode).emit('match_over', { winnerUid });
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
        }
    });

    socket.on('disconnect', () => {
        console.log(`Socket disconnected: ${socket.id}`);
        for (const [roomCode, room] of Object.entries(rooms)) {
            const playerIndex = room.players.findIndex(p => p.socketId === socket.id);
            if (playerIndex !== -1) {
                const removed = room.players.splice(playerIndex, 1);
                io.to(roomCode).emit('player_left', { message: 'Opponent disconnected', uid: removed[0]?.uid });
                
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

httpServer.listen(PORT, () => {
  console.log(`Aegis AI Multiplayer Server running on port ${PORT}`);
});
