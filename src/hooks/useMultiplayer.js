import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
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
  
  const [matchResult, setMatchResult] = useState(null); // 'win', 'lose', 'draw', null
  const roomDifficultyRef = useRef('easy');

  useEffect(() => {
    // Initialize socket
    socketRef.current = io(serverUrl);

    const socket = socketRef.current;

    // Listeners
    socket.on('room_created', (data) => {
      setRoomCode(data.roomCode);
      setIsHost(true);
      setMultiplayerState('waiting');
      setPlayersCount(1);
    });

    socket.on('player_joined', (data) => {
      setPlayersCount(data.playerCount);
      // If we joined, we also get this, so updating state
      setMultiplayerState('waiting');
    });

    socket.on('game_started', () => {
      setMultiplayerState('playing');
      setOpponentScore(0);
    });

    socket.on('new_word_round', (data) => {
      // If server provides a valid round, use it. Otherwise fall back to local puzzles.
      if (data && data.targetWord) {
        setCurrentWord(data.targetWord);
        setEncryptedWord(data.encryptedWord);
        setCipherName(data.cipherName);
        setCipherKey(data.cipherKey);
      } else {
        // Local fallback — pick a puzzle matching the chosen room difficulty (if any)
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
         setMatchResult(socket.id === data.winnerId ? 'win' : 'lose');
      }
    });

    socket.on('player_left', () => {
      // Opponent disconnected, instantly win if playing
      setMultiplayerState((prev) => {
        if (prev === 'playing') {
           setMatchResult('win'); // Forfeit
           return 'finished';
        } else {
           setPlayersCount(1);
           return prev;
        }
      });
    });

    socket.on('error', (err) => {
      alert(err.message);
    });

    return () => {
      socket.disconnect();
    };
  }, [serverUrl]);

  // Actions
  const createRoom = (difficulty) => {
    roomDifficultyRef.current = difficulty || 'easy';
    socketRef.current.emit('create_room', { difficulty });
  };

  const joinRoom = (code) => {
    setRoomCode(code);
    setIsHost(false);
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
      }
    }
  };

  const submitScore = (score) => {
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
  };
  
  const emitTimeout = () => {
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
