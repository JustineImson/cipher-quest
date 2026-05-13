import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { auth } from '../services/firebase';
import fallbackPuzzles from '../data/fallbackPuzzles';
import { selectCipherMethod } from '../engine/gameLogic';

export function useMultiplayer(serverUrl = 'http://localhost:3001') {
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

  useEffect(() => {
    let mounted = true;
    let socket = null;

    const init = async () => {
      // Require a logged-in Firebase user before connecting
      if (!auth.currentUser) {
        alert('You must be logged in to play multiplayer');
        return;
      }

      try {
        const token = await auth.currentUser.getIdToken();
        clientUidRef.current = auth.currentUser.uid;

        socket = io(serverUrl, { auth: { token } });
        socketRef.current = socket;

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
            const pool = fallbackPuzzles[diff] || fallbackPuzzles.easy;
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
    };

    init();

    return () => {
      mounted = false;
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [serverUrl]);

  // Actions
  const createRoom = (difficulty) => {
    roomDifficultyRef.current = difficulty || 'easy';
    if (!socketRef.current || !socketRef.current.connected) {
      alert('Not connected to multiplayer server');
      return;
    }
    socketRef.current.emit('create_room', { difficulty });
  };

  const joinRoom = (code) => {
    setRoomCode(code);
    setIsHost(false);
    if (!socketRef.current || !socketRef.current.connected) {
      alert('Not connected to multiplayer server');
      return;
    }
    socketRef.current.emit('join_room', { roomCode: code });
  };

  const startGame = () => {
    if (isHost && roomCode) {
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit('start_game', { roomCode });
      } else {
        // If server not connected, allow local-only play using fallback puzzles
        setMultiplayerState('playing');
        setOpponentScore(0);
        const diff = roomDifficultyRef.current || 'easy';
        const pool = fallbackPuzzles[diff] || fallbackPuzzles.easy;
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
  };

  const submitScore = (score) => {
    if (!socketRef.current || !socketRef.current.connected) {
      // If not connected, handle scoring locally or ignore
      console.warn('submitScore: not connected to server');
      return;
    }
    if (roomCode) {
      socketRef.current.emit('submit_score', { roomCode, score });
    }
  };

  const nextRound = () => {
    if (socketRef.current && socketRef.current.connected && roomCode) {
      socketRef.current.emit('next_round', { roomCode });
      return;
    }

    // Local fallback round when server isn't available
    const diff = roomDifficultyRef.current || 'easy';
    const pool = fallbackPuzzles[diff] || fallbackPuzzles.easy;
    const puzzle = pool[Math.floor(Math.random() * pool.length)];
    const cipher = selectCipherMethod(diff);
    setCurrentWord(puzzle.plaintext);
    setEncryptedWord(cipher.applyCipher(puzzle.plaintext));
    setCipherName(cipher.name);
    setCipherKey(cipher.key);
    setCurrentClue(puzzle.clue || 'Fallback: examine the letters carefully.');
    setIsFallback(true);
  };
  
  const emitTimeout = () => {
    if (!socketRef.current || !socketRef.current.connected) {
      console.warn('emitTimeout: not connected to server');
      return;
    }
    if (roomCode) {
      socketRef.current.emit('timeout', { roomCode });
    }
  };

  const resetLobby = () => {
     setMultiplayerState('lobby');
     setRoomCode('');
     setIsHost(false);
     setOpponentScore(0);
     setCurrentWord('');
     setCipherKey('');
     setCurrentClue('');
     setIsFallback(false);
     setMatchResult(null);
  };

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
    createRoom,
    joinRoom,
    startGame,
    submitScore,
    nextRound,
    resetLobby,
    emitTimeout
  };
}
