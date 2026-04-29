import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
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
            hostId: socket.id,
            difficulty: difficulty,
            players: [{ id: socket.id, score: 0 }],
            status: 'waiting'
        };
        socket.join(roomCode);
        socket.emit('room_created', { roomCode });
    });

    socket.on('join_room', ({ roomCode }) => {
        const room = rooms[roomCode];
        if (room && room.status === 'waiting') {
            if (room.players.length < 2) {
                room.players.push({ id: socket.id, score: 0 });
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
        if (room && room.hostId === socket.id) {
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
            const playerIndex = room.players.findIndex(p => p.id === socket.id);
            if (playerIndex !== -1) {
                room.players[playerIndex].score = score;
                socket.to(roomCode).emit('opponent_score_update', { score });
                
                // Winning limit check natively on backend
                if (score >= 500) {
                    room.status = 'finished';
                    io.to(roomCode).emit('match_over', { winnerId: socket.id });
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
            
            let winnerId = null;
            if (p2 && p1.score !== p2.score) {
                 winnerId = p1.score > p2.score ? p1.id : p2.id;
            } else if (!p2) {
                 winnerId = p1.id;
            }

            io.to(roomCode).emit('match_over', { winnerId, isDraw: p1.score === (p2?.score || 0) });
        }
    });

    socket.on('disconnect', () => {
        console.log(`Socket disconnected: ${socket.id}`);
        for (const [roomCode, room] of Object.entries(rooms)) {
            const playerIndex = room.players.findIndex(p => p.id === socket.id);
            if (playerIndex !== -1) {
                room.players.splice(playerIndex, 1);
                io.to(roomCode).emit('player_left', { message: 'Opponent disconnected' });
                
                if (room.players.length === 0) {
                    delete rooms[roomCode];
                } else if (room.hostId === socket.id && room.players.length > 0) {
                    room.hostId = room.players[0].id; // Reassign host
                }
            }
        }
    });
});

httpServer.listen(PORT, () => {
  console.log(`Aegis AI Multiplayer Server running on port ${PORT}`);
});
