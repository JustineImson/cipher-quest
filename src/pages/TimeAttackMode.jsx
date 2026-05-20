import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPlayerInsights } from '../services/mlService';
import { db } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useGameStore } from '../store/useGameStore';
import { useTimer } from '../hooks/useTimer';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Button from '../components/ui/Button';
import VirtualKeyboard from '../components/VirtualKeyboard';
import ColumnarInteractive from '../components/ColumnarInteractive';
import RailFenceInteractive from '../components/RailFenceInteractive';
import VigenereInteractive from '../components/VigenereInteractive';
import SubstitutionInteractive from '../components/SubstitutionInteractive';
import { selectCipherMethod, validateAnswer } from '../engine/gameLogic';
import {
  caesarCipher,
  substitutionCipher,
  vigenereCipher,
  railFenceCipher,
  columnarTranspositionCipher
} from '../engine/cipherAlgorithms';
import { bgmController } from '../engine/BGMController';
import { useSfx } from '../hooks/useSfx';
import { Pause } from 'lucide-react';
import DifficultySplash from '../components/ui/DifficultySplash';
import { generatePuzzleDetails } from '../services/aiGenerator';
import { submitTimeAttackScore, trackCipherAttempt } from '../services/leaderboardService';
import ErrorBoundary from '../components/ErrorBoundary';

const TA_SESSION_KEY = 'cq_ta_session';

/** Reconstruct the live applyCipher function from the serialised name+key */
function rebuildCipherMethod(name, key, isEncryptionMode) {
  if (!name || !key) return null;
  if (name.startsWith('Caesar')) {
    const shift = parseInt(key.replace(/^Shift:\s*/i, ''), 10) || 3;
    return { name, key, applyCipher: (t) => caesarCipher(t, shift), isEncryptionMode: false };
  }
  if (name.startsWith('Substitution')) {
    const kw = key.replace(/^Keyword:\s*/i, '').trim();
    return { name, key, applyCipher: (t) => substitutionCipher(t, kw), isEncryptionMode: !!isEncryptionMode };
  }
  if (name.startsWith('Rail Fence')) {
    const rails = parseInt(key.replace(/^Rails:\s*/i, ''), 10) || 3;
    return { name, key, applyCipher: (t) => railFenceCipher(t, rails), isEncryptionMode: !!isEncryptionMode };
  }
  if (name.startsWith('Vigenere')) {
    const kw = key.replace(/^Keyword:\s*/i, '').trim();
    return { name, key, applyCipher: (t) => vigenereCipher(t, kw), isEncryptionMode: !!isEncryptionMode };
  }
  if (name.startsWith('Columnar')) {
    const kw = key.replace(/^Keyword:\s*/i, '').trim();
    return { name, key, applyCipher: (t) => columnarTranspositionCipher(t, kw), isEncryptionMode: !!isEncryptionMode };
  }
  return null;
}

// Word-length rules per difficulty (pure function — keep outside component)
const isWordLengthValid = (word, difficulty) => {
  const len = (word || '').replace(/[^a-zA-Z]/g, '').length;
  const diff = (difficulty || 'easy').toLowerCase();
  if (diff === 'easy') return len >= 5 && len <= 8;
  if (diff === 'moderate' || diff === 'medium') return len >= 9 && len <= 14;
  if (diff === 'hard') return len >= 15;
  return true;
};

function TimeAttackMode() {
  const navigate = useNavigate();
  const { settings, resetProgression, currentDifficulty, setDifficulty, currentUser, rollingAttempts, recordCipherAttempt, isAdmin } = useGameStore();

  // Timer: Grand timer starts at 60
  const { timeLeft, start, addTime, pause, resume } = useTimer(60);

  // Game/Round State
  const [gameState, setGameState] = useState('idle'); // idle, playing, game_over
  const [isPaused, setIsPaused] = useState(false);
  const [score, setScore] = useState(0);
  const [ciphersCracked, setCiphersCracked] = useState(0);

  const [currentWord, setCurrentWord] = useState('');
  const [encryptedWord, setEncryptedWord] = useState('');
  const [cipherMethod, setCipherMethod] = useState({ name: '', isEncryptionMode: false, applyCipher: (t) => t });
  const [currentClue, setCurrentClue] = useState('');
  const [isFallback, setIsFallback] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [feedback, setFeedback] = useState(null); // 'correct' | 'wrong' | null

  // DevMode State
  const [devModeVisible, setDevModeVisible] = useState(false);
  const [isGlitching, setIsGlitching] = useState(false);

  const inputRef = useRef(null);
  const hasSubmittedRef = useRef(false);
  const puzzleStartTimeRef = useRef(null);
  const isFirstPuzzleRef = useRef(false);
  const { playClick } = useSfx();

  // Game Loop: Fetch Word
  const fetchNewWord = useCallback(async (attempt = 1) => {
    setIsLoading(true);
    setUserInput('');
    setFeedback(null);
    setCurrentClue('');
    setIsFallback(false);
    pause(); // Pause timer while fetching

    const activeDiff = useGameStore.getState().currentDifficulty || 'easy';

    try {
      const data = await generatePuzzleDetails(activeDiff, 'victorian noir detective');
      const word = data?.plaintext;
      const clue = data?.clue;
      const fallbackFlag = data?.isFallback || false;

      if (!word || typeof word !== 'string') {
        throw new Error('Invalid word returned from generator');
      }

      const cleanWord = word.toUpperCase().replace(/[^A-Z]/g, '');

      // Retry up to 3 times if word length doesn't match difficulty
      if (!isWordLengthValid(cleanWord, activeDiff) && attempt < 3) {
        return fetchNewWord(attempt + 1);
      }

      setCurrentWord(cleanWord);

      const cipher = selectCipherMethod(activeDiff);
      if (!cipher || typeof cipher.applyCipher !== 'function') {
        throw new Error('Invalid cipher method selected');
      }
      setCipherMethod(cipher);
      setEncryptedWord(cipher.applyCipher(cleanWord));
      setCurrentClue(clue || 'No intel available.');
      setIsFallback(fallbackFlag);

      setIsLoading(false);
      setIsGlitching(true);
      if (isFirstPuzzleRef.current) {
        isFirstPuzzleRef.current = false;
        start(60); // Start the timer only when the first puzzle is ready
      } else {
        resume();
      }
      puzzleStartTimeRef.current = Date.now();
      setTimeout(() => setIsGlitching(false), 500);
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 0);
    } catch (err) {
      console.error('Fetch error:', err);
      // Defensive fallback: always reset to a safe state
      const fallbackWord = 'FALLBACK';
      setCurrentWord(fallbackWord);
      try {
        const cipher = selectCipherMethod(activeDiff);
        setCipherMethod(cipher || { name: 'Caesar Shift', key: 'Shift: 3', applyCipher: (t) => t, isEncryptionMode: false });
        setEncryptedWord((cipher?.applyCipher || ((t) => t))(fallbackWord));
        setCurrentClue('Fallback: examine the letters carefully.');
        setIsFallback(true);
      } catch (fallbackErr) {
        console.error('Fallback cipher failed:', fallbackErr);
        setCipherMethod({ name: 'Caesar Shift', key: 'Shift: 3', applyCipher: (t) => t, isEncryptionMode: false });
        setEncryptedWord(fallbackWord);
        setCurrentClue('Fallback: examine the letters carefully.');
        setIsFallback(true);
      }
      setIsLoading(false);
      setIsGlitching(true);
      if (isFirstPuzzleRef.current) {
        isFirstPuzzleRef.current = false;
        start(60);
      } else {
        resume();
      }
      puzzleStartTimeRef.current = Date.now();
      setTimeout(() => setIsGlitching(false), 500);
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 0);
    }
  }, [pause, resume, start]);

  // Start initialization — restore saved session or run ML seeding
  useEffect(() => {
    bgmController.play('bgm1');

    // Try to restore a saved in-progress session
    try {
      const raw = localStorage.getItem(TA_SESSION_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        // Only restore if there is meaningful time left
        if (s && s.timeLeft > 0 && s.currentWord && s.cipherName) {
          const restoredCipher = rebuildCipherMethod(s.cipherName, s.cipherKey, s.isEncryptionMode);
          if (restoredCipher) {
            setScore(s.score || 0);
            setCiphersCracked(s.ciphersCracked || 0);
            setCurrentWord(s.currentWord);
            setEncryptedWord(s.encryptedWord);
            setCipherMethod(restoredCipher);
            setCurrentClue(s.currentClue || '');
            setGameState('playing');
            if (s.difficulty) setDifficulty(s.difficulty);
            hasSubmittedRef.current = false;
            isFirstPuzzleRef.current = false;
            // Start the timer from the saved time remaining
            start(s.timeLeft);
            puzzleStartTimeRef.current = Date.now();
            return; // Skip ML seeding + startGame
          }
        }
      }
    } catch (_) {
      localStorage.removeItem(TA_SESSION_KEY);
    }

    (async () => {
      let startDifficulty = 'Easy';
      if (currentUser?.uid) {
        try {
          const userRef = doc(db, 'users', currentUser.uid);
          const userSnap = await getDoc(userRef);
          const userData = userSnap.exists() ? userSnap.data() : {};

          const taRef = doc(db, 'leaderboards', 'timeAttack', 'entries', currentUser.uid);
          const taSnap = await getDoc(taRef);
          const best_ta_score = taSnap.exists() ? taSnap.data().score : 0;

          const cStats = userData.cipherStats || {};
          const getAcc = (c) => cStats[c] && cStats[c].attempts > 0 ? cStats[c].solved / cStats[c].attempts : 0;

          const playerStats = {
            puzzles_solved: Object.values(cStats).reduce((sum, c) => sum + (c.solved || 0), 0),
            best_ta_score,
            win_rate: 0,
            difficulty_encoded: 1,
            story_completed: 0,
            vigenere_accuracy: getAcc('vigenere'),
            railfence_accuracy: getAcc('railfence'),
            columnar_accuracy: getAcc('columnar'),
            substitution_accuracy: getAcc('substitution'),
            caesar_accuracy: getAcc('caesar')
          };

          const mlResult = await Promise.race([
            getPlayerInsights(playerStats),
            new Promise(resolve => setTimeout(() => resolve(null), 3000))
          ]);

          const seedMap = { beginner: 'Easy', intermediate: 'Normal', advanced: 'Hard' };
          startDifficulty = seedMap[mlResult?.skill_tier] ?? 'Easy';
        } catch (err) {
          console.warn('ML Seeding failed', err);
        }
      }
      startGame(startDifficulty);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  // Persist active session to localStorage so a refresh can resume
  useEffect(() => {
    if (gameState !== 'playing' || !currentWord || !cipherMethod.name) return;
    try {
      localStorage.setItem(TA_SESSION_KEY, JSON.stringify({
        score,
        ciphersCracked,
        timeLeft,
        currentWord,
        encryptedWord,
        cipherName: cipherMethod.name,
        cipherKey: cipherMethod.key,
        isEncryptionMode: cipherMethod.isEncryptionMode || false,
        currentClue,
        difficulty: currentDifficulty,
      }));
    } catch (_) {}
  }, [gameState, score, ciphersCracked, timeLeft, currentWord, encryptedWord, cipherMethod, currentClue, currentDifficulty]);

  const startGame = (seedDifficulty = 'Easy') => {
    localStorage.removeItem(TA_SESSION_KEY); // Clear any previous session
    hasSubmittedRef.current = false;
    isFirstPuzzleRef.current = true; // Signal fetchNewWord to call start() instead of resume()
    setScore(0);
    setCiphersCracked(0);
    setGameState('playing');
    resetProgression(seedDifficulty);
    fetchNewWord(); // Timer starts inside fetchNewWord once the first puzzle is ready
  };

  // Monitor Timer for Game Over
  useEffect(() => {
    if (gameState === 'playing' && timeLeft === 0) {
      setGameState('game_over');
    }
  }, [timeLeft, gameState]);

  // Submit score to leaderboard on game over
  useEffect(() => {
    if (gameState === 'game_over') {
      localStorage.removeItem(TA_SESSION_KEY); // Session is done
      if (!hasSubmittedRef.current && currentUser?.uid) {
        hasSubmittedRef.current = true;
        submitTimeAttackScore(
          currentUser.uid,
          currentUser.username || currentUser.email || 'Anonymous',
          score,
          currentDifficulty,
          ciphersCracked
        );
      }
    }
  }, [gameState, currentUser, score, currentDifficulty, ciphersCracked]);

  // Handle Submission
  const handleSubmit = useCallback((e) => {
    if (e) e.preventDefault();
    if (!userInput.trim() || gameState !== 'playing') return;

    const targetWord = cipherMethod.isEncryptionMode ? encryptedWord : currentWord;
    const isCorrect = validateAnswer(userInput, targetWord);

    // Track cipher attempt for ML accuracy data
    const uid = currentUser?.uid;
    const cName = cipherMethod.name || '';
    const cType = cName.startsWith('Columnar') ? 'columnar'
      : cName.startsWith('Rail Fence') ? 'railfence'
        : cName.startsWith('Vigenere') ? 'vigenere'
          : cName.startsWith('Substitution') ? 'substitution'
            : cName.startsWith('Caesar') ? 'caesar'
              : null;

    if (isCorrect) {
      if (cType) trackCipherAttempt(uid, cType, true);

      const timeTaken = (Date.now() - puzzleStartTimeRef.current) / 1000;
      const currentDiff = (useGameStore.getState().currentDifficulty || 'Easy');
      recordCipherAttempt(true, timeTaken, currentDiff);

      // Points based on difficulty: Easy=100, Normal=250, Hard=600
      const currentDiffLower = currentDiff.toLowerCase();
      const pointsEarned = currentDiffLower === 'easy' ? 100 : currentDiffLower === 'normal' ? 250 : 600;
      setScore(prev => prev + pointsEarned);
      setCiphersCracked(prev => prev + 1);

      // Time increment: Easy=+60s, Normal=+80s, Hard=+100s
      const timeBonus = currentDiffLower === 'easy' ? 60 : currentDiffLower === 'normal' ? 80 : 100;
      addTime(timeBonus);

      setFeedback('correct');
      setIsGlitching(true);

      // Briefly show feedback then fetch next
      setTimeout(() => {
        setIsGlitching(false);
        fetchNewWord();
      }, 800);
    } else {
      if (cType) trackCipherAttempt(uid, cType, false);

      const timeTaken = (Date.now() - puzzleStartTimeRef.current) / 1000;
      const currentDiff = (useGameStore.getState().currentDifficulty || 'Easy');
      recordCipherAttempt(false, timeTaken, currentDiff);

      setScore(prev => Math.max(0, prev - 50)); // Penalty
      setFeedback('wrong');

      setTimeout(() => {
        setFeedback(null);
        if (inputRef.current) inputRef.current.focus();
      }, 600);
    }
  }, [userInput, gameState, cipherMethod, encryptedWord, currentWord, addTime, recordCipherAttempt, fetchNewWord, currentUser]);

  const handlePause = useCallback(() => {
    if (gameState !== 'playing' || isLoading) return;
    playClick();
    setIsPaused(true);
    pause();
  }, [gameState, isLoading, playClick, pause]);

  const handleResume = useCallback(() => {
    playClick();
    setIsPaused(false);
    resume();
  }, [playClick, resume]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      handleSubmit();
    } else if (e.key === 'Escape' && gameState === 'playing') {
      if (isPaused) {
        handleResume();
      } else {
        handlePause();
      }
    }
  }, [handleSubmit, gameState, isPaused, handleResume, handlePause]);

  // Virtual keyboard handlers
  const handleVirtualKeyPress = useCallback((key) => setUserInput(prev => prev + key), []);
  const handleVirtualDelete = useCallback(() => setUserInput(prev => prev.slice(0, -1)), []);

  // Columnar Transposition detection
  const isColumnar = cipherMethod.name?.startsWith('Columnar');
  const columnarKeyword = isColumnar
    ? (cipherMethod.key || '').replace(/^Keyword:\s*/i, '').trim()
    : '';

  // Rail Fence detection
  const isRailFence = cipherMethod.name?.startsWith('Rail Fence');
  const railFenceRails = isRailFence
    ? parseInt((cipherMethod.key || '').replace(/^Rails:\s*/i, '').trim(), 10) || 3
    : 3;

  // Vigenere detection
  const isVigenere = cipherMethod.name?.startsWith('Vigenere');
  const vigenereKeyword = isVigenere
    ? (cipherMethod.key || '').replace(/^Keyword:\s*/i, '').trim()
    : '';

  // Substitution detection
  const isSubstitution = cipherMethod.name?.startsWith('Substitution');
  const substitutionKeyword = isSubstitution
    ? (cipherMethod.key || '').replace(/^Keyword:\s*/i, '').trim()
    : '';

  // Caesar detection
  const isCaesar = cipherMethod.name?.startsWith('Caesar');

  // Handler for Interactive Components completion (Columnar, Rail Fence)
  const handleInteractiveComplete = useCallback((answer) => {
    if (gameState !== 'playing') return;

    const targetWord = cipherMethod.isEncryptionMode ? encryptedWord : currentWord;
    const isCorrect = validateAnswer(answer, targetWord);

    // Derive normalized cipher type from cipherMethod.name
    const uid = currentUser?.uid;
    const cType = isColumnar ? 'columnar' : isRailFence ? 'railfence' : isVigenere ? 'vigenere' : isSubstitution ? 'substitution' : isCaesar ? 'caesar' : null;

    if (isCorrect) {
      if (cType) trackCipherAttempt(uid, cType, true);

      const timeTaken = (Date.now() - puzzleStartTimeRef.current) / 1000;
      const currentDiff = (useGameStore.getState().currentDifficulty || 'Easy');
      recordCipherAttempt(true, timeTaken, currentDiff);

      // Points based on difficulty: Easy=100, Normal=250, Hard=600
      const currentDiffLower = currentDiff.toLowerCase();
      const pointsEarned = currentDiffLower === 'easy' ? 100 : currentDiffLower === 'normal' ? 250 : 600;
      setScore(prev => prev + pointsEarned);
      setCiphersCracked(prev => prev + 1);

      // Time increment: Easy=+60s, Normal=+80s, Hard=+100s
      const timeBonus = currentDiffLower === 'easy' ? 60 : currentDiffLower === 'normal' ? 80 : 100;
      addTime(timeBonus);

      setFeedback('correct');
      setIsGlitching(true);
      setTimeout(() => {
        setIsGlitching(false);
        fetchNewWord();
      }, 800);
    } else {
      if (cType) trackCipherAttempt(uid, cType, false);

      const timeTaken = (Date.now() - puzzleStartTimeRef.current) / 1000;
      const currentDiff = (useGameStore.getState().currentDifficulty || 'Easy');
      recordCipherAttempt(false, timeTaken, currentDiff);

      setScore(prev => Math.max(0, prev - 50));
      setFeedback('wrong');
      setTimeout(() => setFeedback(null), 600);
    }
  }, [gameState, cipherMethod, encryptedWord, currentWord, addTime, recordCipherAttempt, fetchNewWord, currentUser, isColumnar, isRailFence, isVigenere, isSubstitution, isCaesar]);

  // UI Renders
  if (gameState === 'game_over') {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full relative z-10 p-6">
        <div className="bg-black/60 border border-mystery-gold p-8 rounded shadow-xl text-center max-w-md w-full backdrop-blur-sm">
          <h1 className="text-4xl text-mystery-gold font-serif mb-4 uppercase tracking-widest drop-shadow-[0_0_8px_rgba(212,175,55,0.5)]">Time's Up!</h1>
          <p className="text-xl mb-2 text-gray-300 font-serif">Final Score: <span className="font-bold text-white text-3xl font-sans">{score}</span></p>
          <p className="text-lg mb-8 text-gray-400 font-serif">Ciphers Cracked: <span className="text-white font-semibold">{ciphersCracked}</span></p>

          <div className="flex flex-col gap-4">
            <Button onClick={() => startGame('Easy')} className="w-full">Play Again</Button>
            <Button onClick={() => navigate('/')} variant="ghost" className="w-full">Main Menu</Button>
          </div>
        </div>
      </div>
    );
  }

  // Pause Overlay
  if (isPaused) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center z-50 p-6 bg-black/80 backdrop-blur-md animate-[fadeIn_0.3s_ease-out]">
        <div className="bg-[#1a1208]/95 border border-[#c9a84c] p-10 rounded shadow-[0_0_50px_rgba(0,0,0,1)] text-center max-w-md w-full relative overflow-hidden animate-[scaleIn_0.3s_ease-out]">
          <h1 className="text-4xl text-[#e8c96a] font-['Playfair_Display'] mb-8 uppercase tracking-widest drop-shadow-[0_0_10px_rgba(201,168,76,0.5)]">Operation Paused</h1>

          <div className="flex flex-col gap-5">
            <Button onClick={handleResume} className="w-full">Continue Operation</Button>
            <Button onClick={() => { playClick(); useGameStore.setState({ isSettingsOpen: true }); }} variant="ghost" className="w-full text-[#7a6030] hover:text-[#c9a84c] border border-transparent hover:border-[#7a6030]/50">Mission Settings</Button>
            <Button onClick={() => { playClick(); navigate('/'); }} variant="ghost" className="w-full text-[#8b1a1a] hover:text-red-400 border border-transparent hover:border-[#8b1a1a]/50">Abort to Hub</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        .ta-bg {
          background: radial-gradient(circle at 50% 10%, #1a1e26 0%, #0f1115 45%, #050608 100%);
        }
        .ta-scrim {
          background: linear-gradient(to bottom, rgba(15,17,21,0.2) 0%, rgba(5,6,8,0.8) 100%);
        }
        .ta-grain {
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          opacity: 0.05;
          mix-blend-mode: screen;
        }
      `}</style>
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="ta-bg absolute inset-0 z-0" />
        <div className="ta-scrim absolute inset-0 z-10 pointer-events-none" />
        <div className="ta-grain absolute inset-0 z-20 pointer-events-none" />
      </div>
      <div className="flex flex-col h-full w-full relative z-10 transition-all overflow-y-auto bg-black/0">

        {/* Absolute Top Right Pause Button */}
        <button
          onClick={handlePause}
          disabled={isLoading}
          className={`absolute top-6 right-6 md:top-8 md:right-8 z-50 transition-colors p-4 border-2 rounded-full shadow-[0_0_25px_rgba(0,0,0,0.9)] backdrop-blur-md ${isLoading ? 'text-gray-500 bg-black/40 border-gray-600 cursor-not-allowed opacity-50' : 'text-mystery-gold/70 hover:text-mystery-gold bg-black/80 border-mystery-gold/50 hover:border-mystery-gold group'}`}
          title="Pause Operation"
        >
          <Pause size={36} className={isLoading ? '' : 'group-hover:scale-110 transition-transform'} />
        </button>

        <div className="max-w-4xl mx-auto w-full p-4 relative z-10 flex flex-col">
          <DifficultySplash />


          {/* Center Box */}
          <div className="flex flex-col items-center relative w-full mb-8 pt-16 mt-2">
            {/* Score & Time OVERLAYS */}
            <div className="absolute top-0 left-0 md:left-4 text-2xl font-serif text-mystery-gold flex flex-col items-start z-20">
              <span className="text-sm uppercase tracking-widest text-mystery-gold/70">Score</span>
              <span className="drop-shadow-[0_0_5px_rgba(212,175,55,0.8)]">{score}</span>
            </div>
            <div className={`absolute top-0 right-0 md:right-4 text-4xl font-mono flex flex-col items-end z-20 transition-colors ${timeLeft <= 10 ? 'text-red-500 animate-pulse drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 'text-mystery-gold shadow-black drop-shadow-[0_0_5px_rgba(212,175,55,0.5)]'}`}>
              <span className="text-sm font-serif tracking-widest text-mystery-gold/70 uppercase">Time</span>
              {timeLeft}
            </div>
            {isLoading ? (
              <LoadingSpinner text="Consulting Informants..." />
            ) : (
              <div className={`bg-[#0a0a0f]/80 border p-12 py-16 rounded relative max-w-2xl w-full text-center group backdrop-blur-md transition-all duration-300
                ${feedback === 'wrong' ? 'animate-shake border-red-500 shadow-[0_0_40px_rgba(239,68,68,0.6)]' :
                  feedback === 'correct' ? 'border-green-400 shadow-[0_0_40px_rgba(74,222,128,0.4)]' :
                    'border-mystery-gold shadow-[0_0_40px_rgba(0,0,0,0.8)]'}
              `}>

                {/* Feedback Overlays */}
                {feedback === 'correct' && (
                  <div className="absolute inset-0 z-50 flex items-center justify-center bg-green-500/10 rounded pointer-events-none">
                    <span className="text-5xl md:text-6xl font-serif text-green-400 opacity-90 drop-shadow-[0_0_20px_rgba(74,222,128,1)] animate-stamp uppercase tracking-widest border-4 border-green-400/80 px-8 py-4 rounded-lg transform -rotate-12 bg-black/40 backdrop-blur-sm">
                      DECRYPTED
                    </span>
                  </div>
                )}
                {feedback === 'wrong' && (
                  <div className="absolute inset-0 z-50 flex items-center justify-center bg-red-500/10 rounded pointer-events-none">
                    <span className="text-5xl md:text-6xl font-serif text-red-500 opacity-90 drop-shadow-[0_0_20px_rgba(239,68,68,1)] animate-stamp uppercase tracking-widest border-4 border-red-500/80 px-8 py-4 rounded-lg transform rotate-12 bg-black/40 backdrop-blur-sm">
                      FAILED
                    </span>
                  </div>
                )}

                <div className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center bg-mystery-dark px-8 py-2 border rounded shadow-md pb-3 w-64 transition-colors duration-300 ${feedback === 'wrong' ? 'border-red-500' : feedback === 'correct' ? 'border-green-400' : 'border-mystery-gold'}`}>
                  <span className={`text-sm tracking-[0.2em] font-serif uppercase border-b pb-1 mb-1 w-full text-center transition-colors duration-300 ${feedback === 'wrong' ? 'text-red-500 border-red-500/30' : feedback === 'correct' ? 'text-green-400 border-green-400/30' : 'text-mystery-gold border-mystery-gold/30'}`}>Cipher: {cipherMethod.name}</span>
                  <span className="text-blue-300 font-mono text-xs tracking-widest uppercase">Intel: {cipherMethod.key}</span>
                </div>

                <p className={`font-mono text-4xl sm:text-5xl md:text-6xl text-white tracking-[0.3em] font-light break-all selection:bg-mystery-gold/30 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] ${isGlitching ? 'animate-glitch' : ''}`}>
                  {cipherMethod.isEncryptionMode ? currentWord : encryptedWord}
                </p>

                {currentClue && (
                  <div className="mt-8 text-mystery-gold/90 italic font-serif text-lg bg-black/60 px-6 py-3 border border-mystery-gold/30 rounded inline-block max-w-[90%] relative">
                    <span className="font-mono text-xs text-mystery-gold/50 block mb-1 uppercase tracking-widest text-center">
                      Intercepted Clue
                    </span>
                    "{currentClue}"
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom Input Area */}
          <div className="mt-auto flex flex-col items-center w-full gap-4">
            {isColumnar && (cipherMethod.isEncryptionMode ? currentWord : encryptedWord) ? (
              /* ── Columnar Transposition: Interactive Grid ── */
              <>
                <ColumnarInteractive
                  key={cipherMethod.isEncryptionMode ? currentWord : encryptedWord}
                  mode={cipherMethod.isEncryptionMode ? "encrypt" : "decrypt"}
                  text={cipherMethod.isEncryptionMode ? currentWord : encryptedWord}
                  keyword={columnarKeyword}
                  onComplete={handleInteractiveComplete}
                />
                {/* Feedback overlay for columnar */}
                <div className={`text-sm font-serif tracking-[0.4em] transition-opacity duration-300 ${feedback === 'correct' ? 'text-green-400 opacity-100' : feedback === 'wrong' ? 'text-red-500 opacity-100' : 'opacity-0'}`}>
                  {feedback === 'correct' ? 'EXCELLENT' : 'INCORRECT'}
                </div>
              </>
            ) : isRailFence && (cipherMethod.isEncryptionMode ? currentWord : encryptedWord) ? (
              /* ── Rail Fence: Interactive Grid ── */
              <>
                <RailFenceInteractive
                  key={cipherMethod.isEncryptionMode ? currentWord : encryptedWord}
                  mode={cipherMethod.isEncryptionMode ? "encrypt" : "decrypt"}
                  text={cipherMethod.isEncryptionMode ? currentWord : encryptedWord}
                  rails={railFenceRails}
                  onComplete={handleInteractiveComplete}
                />
                {/* Feedback overlay for rail fence */}
                <div className={`text-sm font-serif tracking-[0.4em] transition-opacity duration-300 ${feedback === 'correct' ? 'text-green-400 opacity-100' : feedback === 'wrong' ? 'text-red-500 opacity-100' : 'opacity-0'}`}>
                  {feedback === 'correct' ? 'EXCELLENT' : 'INCORRECT'}
                </div>
              </>
            ) : isVigenere && (cipherMethod.isEncryptionMode ? currentWord : encryptedWord) ? (
              /* ── Vigenere: Interactive Grid ── */
              <>
                <VigenereInteractive
                  key={cipherMethod.isEncryptionMode ? currentWord : encryptedWord}
                  mode={cipherMethod.isEncryptionMode ? "encrypt" : "decrypt"}
                  text={cipherMethod.isEncryptionMode ? currentWord : encryptedWord}
                  keyword={vigenereKeyword}
                  onComplete={handleInteractiveComplete}
                />
                <div className={`text-sm font-serif tracking-[0.4em] transition-opacity duration-300 ${feedback === 'correct' ? 'text-green-400 opacity-100' : feedback === 'wrong' ? 'text-red-500 opacity-100' : 'opacity-0'}`}>
                  {feedback === 'correct' ? 'EXCELLENT' : 'INCORRECT'}
                </div>
              </>
            ) : isSubstitution && (cipherMethod.isEncryptionMode ? currentWord : encryptedWord) ? (
              /* ── Substitution: Interactive Grid ── */
              <>
                <SubstitutionInteractive
                  key={cipherMethod.isEncryptionMode ? currentWord : encryptedWord}
                  mode={cipherMethod.isEncryptionMode ? "encrypt" : "decrypt"}
                  text={cipherMethod.isEncryptionMode ? currentWord : encryptedWord}
                  keyword={substitutionKeyword}
                  onComplete={handleInteractiveComplete}
                />
                <div className={`text-sm font-serif tracking-[0.4em] transition-opacity duration-300 ${feedback === 'correct' ? 'text-green-400 opacity-100' : feedback === 'wrong' ? 'text-red-500 opacity-100' : 'opacity-0'}`}>
                  {feedback === 'correct' ? 'EXCELLENT' : 'INCORRECT'}
                </div>
              </>
            ) : (
              /* ── Standard ciphers: Text Input + Virtual Keyboard ── */
              <>
                <input
                  ref={inputRef}
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isLoading || gameState !== 'playing'}
                  placeholder="DECIPHER THE TEXT..."
                  className={`w-full max-w-lg bg-black/40 backdrop-blur-sm border-b-2 outline-none text-3xl font-mono text-center transition-all pt-4 pb-2 px-4 rounded-t uppercase tracking-widest shadow-inner
                  ${feedback === 'correct' ? 'border-green-400 text-green-300 drop-shadow-[0_0_8px_rgba(74,222,128,0.8)]' :
                      feedback === 'wrong' ? 'border-red-500 text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse' :
                        'border-mystery-gold/50 text-white focus:border-mystery-gold hover:border-mystery-gold/80 placeholder:text-mystery-gold/20'}`}
                  autoComplete="off"
                  spellCheck="false"
                />

                {/* Subtle effect for feedback */}
                <div className={`text-sm font-serif tracking-[0.4em] transition-opacity duration-300 ${feedback === 'correct' ? 'text-green-400 opacity-100' : feedback === 'wrong' ? 'text-red-500 opacity-100' : 'opacity-0'}`}>
                  {feedback === 'correct' ? 'EXCELLENT' : 'INCORRECT'}
                </div>

                {/* Virtual Keyboard */}
                <VirtualKeyboard
                  onKeyPress={handleVirtualKeyPress}
                  onDelete={handleVirtualDelete}
                  onEnter={handleSubmit}
                />
              </>
            )}
          </div>

          {/* DevMode Panel — admin only */}
          {isAdmin && <div className="fixed bottom-4 right-4 flex flex-col items-end z-50">
            <button
              onClick={() => { playClick(); setDevModeVisible(!devModeVisible); }}
              className="text-xs text-mystery-gold/30 hover:text-mystery-gold/80 transition-colors mb-2 font-mono bg-black/40 px-2 py-1 rounded"
            >
              {devModeVisible ? '[HIDE_DEV]' : '[DEV_TOOLS]'}
            </button>

            {devModeVisible && (
              <div className="bg-black/90 border border-red-900/50 p-4 rounded text-xs flex flex-col gap-3 shadow-2xl backdrop-blur-md w-64 transition-all font-mono">
                <span className="text-red-500 font-bold uppercase tracking-widest border-b border-red-900/50 pb-2 text-center text-[10px]">Developer Access</span>

                {/* Progression Status */}
                <div className="py-2 border-b border-red-900/50 flex flex-col gap-1">
                  <div className="flex justify-between">
                    <span className="text-red-500/70">Diff:</span>
                    <span className="text-red-300 uppercase font-bold">{currentDifficulty}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-red-500/70">Rolling Avg:</span>
                    <span className="text-red-300 font-bold">
                      {rollingAttempts?.length ? (rollingAttempts.reduce((a, b) => a + b, 0) / rollingAttempts.length).toFixed(2) : '0.00'}
                    </span>
                  </div>
                  <button
                    onClick={() => { playClick(); recordCipherAttempt(true, 5, currentDifficulty); }}
                    className="mt-1 bg-red-900/20 hover:bg-red-900/50 text-red-200/80 py-1 rounded transition-colors border border-red-900/30"
                  >
                    Force +1 Solve
                  </button>
                </div>

                {/* Force Difficulty */}
                <div className="flex gap-1 w-full border-b border-red-900/50 pb-2">
                  <button onClick={() => { playClick(); setDifficulty('Easy'); fetchNewWord(); }} className="bg-red-900/20 hover:bg-red-900/50 text-red-200/80 py-1 rounded transition-colors flex-1 border border-red-900/30 text-[9px]">EZ</button>
                  <button onClick={() => { playClick(); setDifficulty('Normal'); fetchNewWord(); }} className="bg-red-900/20 hover:bg-red-900/50 text-red-200/80 py-1 rounded transition-colors flex-1 border border-red-900/30 text-[9px]">NRM</button>
                  <button onClick={() => { playClick(); setDifficulty('Hard'); fetchNewWord(); }} className="bg-red-900/20 hover:bg-red-900/50 text-red-200/80 py-1 rounded transition-colors flex-1 border border-red-900/30 text-[9px]">HRD</button>
                </div>

                <button
                  onClick={() => {
                    playClick();
                    const correctAnswer = cipherMethod.isEncryptionMode ? encryptedWord : currentWord;
                    if (isColumnar || isRailFence || isVigenere || isSubstitution) {
                      handleInteractiveComplete(correctAnswer);
                    } else if (inputRef.current) {
                      setUserInput(correctAnswer);
                      inputRef.current.focus();
                    }
                  }}
                  className="bg-red-900/20 hover:bg-red-900/50 text-red-200/80 py-1.5 rounded transition-colors border border-red-900/30"
                >
                  Autofill Answer
                </button>
                <button
                  onClick={() => { playClick(); fetchNewWord(); }}
                  className="bg-red-900/20 hover:bg-red-900/50 text-red-200/80 py-1.5 rounded transition-colors border border-red-900/30"
                >
                  Skip Puzzle
                </button>
                <div className="py-2 border-t border-b border-red-900/50 text-center">
                  <span className="text-red-500/50 text-[10px] block mb-1">RAW TARGET:</span>
                  <span className="text-white font-bold tracking-widest">{cipherMethod.isEncryptionMode ? encryptedWord : currentWord}</span>
                </div>
                <div className="flex gap-2 w-full">
                  <button
                    onClick={() => { playClick(); addTime(15); }}
                    className="bg-red-900/20 hover:bg-red-900/50 text-red-200/80 py-1 rounded transition-colors flex-1 border border-red-900/30 font-bold"
                  >
                    +15s
                  </button>
                  <button
                    onClick={() => { playClick(); addTime(-15); }}
                    className="bg-red-900/20 hover:bg-red-900/50 text-red-200/80 py-1 rounded transition-colors flex-1 border border-red-900/30 font-bold"
                  >
                    -15s
                  </button>
                </div>
              </div>
            )}
          </div>}
        </div>
      </div>
    </>
  );
}

export default function TimeAttackModeWrapped() {
  return (
    <ErrorBoundary>
      <TimeAttackMode />
    </ErrorBoundary>
  );
}
