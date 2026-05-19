import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { auth } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import fallbackPuzzles from '../data/fallbackPuzzles';
import { selectCipherMethod } from '../engine/gameLogic';

/** Flatten cipher-keyed fallback data and filter by difficulty */
function getFallbackPool(difficulty) {
  const diff = (difficulty || 'easy').toLowerCase();
  const norm = diff === 'medium' ? 'moderate' : diff;
  const all = Object.values(fallbackPuzzles).flat();
  const pool = all.filter((p) => p.difficulty === norm);
  return pool.length > 0 ? pool : all;
}

export function useMultiplayer(serverUrl = import.meta.env.VITE_SERVER_URL || `http://${window.location.hostname}:3001`) {
  const socketRef = useRef(null);

  const [multiplayerState, setMultiplayerState] = useState('lobby'); // lobby, waiting, playing, finished
  const [roomCode, setRoomCode] = useState('');
  const [isHost, setIsHost] = useState(false);

  const [playersCount, setPlayersCount] = useState(1);
  const [opponentScore, setOpponentScore] = useState(0);

  // Game data from server
  const [currentWord, setCurrentWord] = useState('');
  const [encryptedWord, setEncryptedWord] = useState('');
  const [cipherName, setCipherName] = useState('');
  const [cipherKey, setCipherKey] = useState('');
  const [currentClue, setCurrentClue] = useState('');
  const [isFallback, setIsFallback] = useState(false);

  const [matchResult, setMatchResult] = useState(null); // 'win', 'lose', 'draw', null
  const roomDifficultyRef = useRef('easy');
  const clientUidRef = useRef(null);

  // Track socket connection state explicitly
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Prevent duplicate socket creation
  const creatingSocketRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    let socket = null;
    let reconnectTimer = null;
    let reconnectAttempts = 0;
    const MAX_RECONNECT_ATTEMPTS = 5;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        if (socketRef.current) {
          socketRef.current.disconnect();
          socketRef.current = null;
        }
        setIsConnected(false);
        setIsConnecting(false);
        if (reconnectTimer) clearTimeout(reconnectTimer);
        return;
      }

      if (!mounted) return;
      if (creatingSocketRef.current) return; // Prevent duplicate creation

      // Clean up existing socket before creating new one
      if (socketRef.current) {
        console.log('[Multiplayer] Cleaning up existing socket before creating new one');
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }

      creatingSocketRef.current = true;
      setIsConnecting(true);

      try {
        const token = await user.getIdToken(true); // Force fresh token
        clientUidRef.current = user.uid;

        console.log('[Multiplayer] Creating new socket connection...');
        socket = io(serverUrl, {
          auth: { token },
          reconnection: true,
          reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          timeout: 10000,
          transports: ['websocket', 'polling'] // Try websocket first, fallback to polling
        });
        socketRef.current = socket;

        socket.on('connect', () => {
          console.log('[Multiplayer] Socket connected:', socket.id);
          reconnectAttempts = 0;
          setIsConnected(true);
          setIsConnecting(false);
          setConnectionError(null);
        });

        socket.on('disconnect', (reason) => {
          console.warn('[Multiplayer] Socket disconnected:', reason);
          setIsConnected(false);

          // Auto-reconnect on unexpected disconnects (not manual disconnect)
          if (reason === 'transport error' || reason === 'ping timeout') {
            if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS && mounted) {
              reconnectAttempts++;
              const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 5000);
              console.log(`[Multiplayer] Will attempt reconnect ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} in ${delay}ms`);
              reconnectTimer = setTimeout(() => {
                if (mounted && socketRef.current === socket) {
                  console.log('[Multiplayer] Attempting reconnect...');
                  socket.connect();
                }
              }, delay);
            }
          }
        });

        socket.on('connect_error', (err) => {
          console.warn('[Multiplayer] Socket connection error:', err.message);
          setConnectionError(err.message);
          setIsConnected(false);
          setIsConnecting(false);
        });

        // Listeners
        socket.on('room_created', (data) => {
          setRoomCode(data.roomCode);
          setIsHost(true);
          setMultiplayerState('waiting');
          setPlayersCount(1);
        });

        socket.on('player_joined', (data) => {
          setPlayersCount(data.playerCount);
          setMultiplayerState('waiting');
        });

        socket.on('game_started', () => {
          setMultiplayerState('playing');
          setOpponentScore(0);
        });

        socket.on('new_word_round', (data) => {
          if (data && data.targetWord) {
            setCurrentWord(data.targetWord);
            setEncryptedWord(data.encryptedWord);
            setCipherName(data.cipherName);
            setCipherKey(data.cipherKey);
            setCurrentClue(data.clue || 'Intercepted communication fragment.');
            setIsFallback(false);
          } else {
            const diff = roomDifficultyRef.current || 'easy';
            const pool = getFallbackPool(diff);
            const puzzle = pool[Math.floor(Math.random() * pool.length)];
            const cipher = selectCipherMethod(diff);
            const plaintext = puzzle.plaintext;
            const encrypted = cipher.applyCipher(plaintext);
            setCurrentWord(plaintext);
            setEncryptedWord(encrypted);
            setCipherName(cipher.name);
            setCipherKey(cipher.key);
            setCurrentClue(puzzle.clue || 'Fallback: examine the letters carefully.');
            setIsFallback(true);
          }
        });

        socket.on('opponent_score_update', (data) => {
          setOpponentScore(data.score);
        });

        socket.on('match_over', (data) => {
          setMultiplayerState('finished');
          if (data.isDraw) {
            setMatchResult('draw');
          } else {
            const winnerUid = data.winnerUid || data.winnerId;
            setMatchResult(clientUidRef.current && winnerUid === clientUidRef.current ? 'win' : 'lose');
          }
        });

        socket.on('player_left', () => {
          setMultiplayerState((prev) => {
            if (prev === 'playing') {
              setMatchResult('win');
              return 'finished';
            } else {
              setPlayersCount(1);
              return prev;
            }
          });
        });

        socket.on('error', (err) => {
          alert(err.message || 'Multiplayer error');
        });
      } catch (err) {
        console.error('Failed to initialize multiplayer socket:', err);
      }
    });

    return () => {
      mounted = false;
      creatingSocketRef.current = false;
      unsubscribe();
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setIsConnected(false);
      setIsConnecting(false);
    };
  }, [serverUrl]);

  /**
   * Wait for the socket to be connected, polling every 200ms up to `timeoutMs`.
   * Returns true if connected, false if timed out.
   */
  const waitForConnection = useCallback(async (timeoutMs = 3000) => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (socketRef.current?.connected) return true;
      await new Promise((r) => setTimeout(r, 200));
    }
    return !!socketRef.current?.connected;
  }, []);

  const createRoom = useCallback(async (difficulty) => {
    roomDifficultyRef.current = difficulty || 'easy';

    // Wait for auth and socket to be ready (up to 5 seconds)
    if (!socketRef.current) {
      const authWaitStart = Date.now();
      while (!socketRef.current && Date.now() - authWaitStart < 5000) {
        await new Promise((r) => setTimeout(r, 100));
      }
    }

    // If the socket exists but is still connecting, wait briefly
    if (socketRef.current && !socketRef.current.connected) {
      const ok = await waitForConnection(5000);
      if (!ok) {
        alert('Not connected to multiplayer server. Please check your connection and try again.');
        return false;
      }
    }

    if (!socketRef.current || !socketRef.current.connected) {
      alert('Not connected to multiplayer server. Please check your connection and try again.');
      return false;
    }
    socketRef.current.emit('create_room', { difficulty });
    return true;
  }, [waitForConnection]);

  const joinRoom = useCallback(async (code) => {
    setRoomCode(code);
    setIsHost(false);

    // Wait for auth and socket to be ready (up to 5 seconds)
    if (!socketRef.current) {
      const authWaitStart = Date.now();
      while (!socketRef.current && Date.now() - authWaitStart < 5000) {
        await new Promise((r) => setTimeout(r, 100));
      }
    }

    // If the socket exists but is still connecting, wait briefly
    if (socketRef.current && !socketRef.current.connected) {
      const ok = await waitForConnection(5000);
      if (!ok) {
        alert('Not connected to multiplayer server. Please check your connection and try again.');
        return;
      }
    }

    if (!socketRef.current || !socketRef.current.connected) {
      alert('Not connected to multiplayer server. Please check your connection and try again.');
      return;
    }
    socketRef.current.emit('join_room', { roomCode: code });
  }, [waitForConnection]);

  const startGame = useCallback(() => {
    if (isHost && roomCode) {
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit('start_game', { roomCode });
      } else {
        // If server not connected, allow local-only play using fallback puzzles
        setMultiplayerState('playing');
        setOpponentScore(0);
        const diff = roomDifficultyRef.current || 'easy';
        const pool = getFallbackPool(diff);
        const puzzle = pool[Math.floor(Math.random() * pool.length)];
        const cipher = selectCipherMethod(diff);
        setCurrentWord(puzzle.plaintext);
        setEncryptedWord(cipher.applyCipher(puzzle.plaintext));
        setCipherName(cipher.name);
        setCipherKey(cipher.key);
        setCurrentClue(puzzle.clue || 'Fallback: examine the letters carefully.');
        setIsFallback(true);
      }
    }
  }, [isHost, roomCode]);

  const submitScore = useCallback((score) => {
    if (!socketRef.current || !socketRef.current.connected) {
      console.warn('submitScore: not connected to server');
      return;
    }
    if (roomCode) {
      socketRef.current.emit('submit_score', { roomCode, score });
    }
  }, [roomCode]);

  const nextRound = useCallback(() => {
    if (socketRef.current && socketRef.current.connected && roomCode) {
      socketRef.current.emit('next_round', { roomCode });
      return;
    }

    // Local fallback round when server isn't available
    const diff = roomDifficultyRef.current || 'easy';
    const pool = getFallbackPool(diff);
    const puzzle = pool[Math.floor(Math.random() * pool.length)];
    const cipher = selectCipherMethod(diff);
    setCurrentWord(puzzle.plaintext);
    setEncryptedWord(cipher.applyCipher(puzzle.plaintext));
    setCipherName(cipher.name);
    setCipherKey(cipher.key);
    setCurrentClue(puzzle.clue || 'Fallback: examine the letters carefully.');
    setIsFallback(true);
  }, [roomCode]);

  const emitTimeout = useCallback(() => {
    if (!socketRef.current || !socketRef.current.connected) {
      console.warn('emitTimeout: not connected to server');
      return;
    }
    if (roomCode) {
      socketRef.current.emit('timeout', { roomCode });
    }
  }, [roomCode]);

  const forfeitMatch = useCallback(() => {
    if (!socketRef.current || !socketRef.current.connected) {
      console.warn('forfeitMatch: not connected to server');
      return;
    }
    if (roomCode) {
      socketRef.current.emit('forfeit_match', { roomCode });
    }
  }, [roomCode]);

  const resetLobby = useCallback(() => {
    setMultiplayerState('lobby');
    setRoomCode('');
    setIsHost(false);
    setOpponentScore(0);
    setCurrentWord('');
    setCipherKey('');
    setCurrentClue('');
    setIsFallback(false);
    setMatchResult(null);
  }, []);

  return {
    multiplayerState,
    roomCode,
    isHost,
    playersCount,
    opponentScore,
    currentWord,
    encryptedWord,
    cipherName,
    cipherKey,
    currentClue,
    isFallback,
    matchResult,
    isConnected,
    isConnecting,
    connectionError,
    createRoom,
    joinRoom,
    startGame,
    submitScore,
    nextRound,
    resetLobby,
    emitTimeout,
    forfeitMatch
  };
}

