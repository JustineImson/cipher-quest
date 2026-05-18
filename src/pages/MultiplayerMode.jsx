import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
import { useMultiplayer } from '../hooks/useMultiplayer';
import { bgmController } from '../engine/BGMController';
import { ArrowLeft, Users, Zap, ShieldAlert, Key } from 'lucide-react';
import { useSfx } from '../hooks/useSfx';
import SocialOverlay from '../components/SocialOverlay';
import DifficultySplash from '../components/ui/DifficultySplash';
import { submitMultiplayerResult, trackCipherAttempt } from '../services/leaderboardService';
import { sendGameInvite, cancelPendingInvitesForRoom } from '../services/socialService';

export default function MultiplayerMode() {
  const navigate = useNavigate();
  const location = useLocation();
  const { settings, resetProgression, currentUser, recordCipherAttempt } = useGameStore();

  const {
    multiplayerState, roomCode, isHost, playersCount, opponentScore,
    currentWord, encryptedWord, cipherName, cipherKey, currentClue, isFallback, matchResult,
    createRoom, joinRoom, startGame, submitScore, nextRound, emitTimeout, resetLobby, forfeitMatch
  } = useMultiplayer('http://localhost:3001');

  // Shared Game State
  const [score, setScore] = useState(0);
  const [ciphersCracked, setCiphersCracked] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [isGlitching, setIsGlitching] = useState(false);

  const [joinCodeInput, setJoinCodeInput] = useState('');
  const inputRef = useRef(null);
  const hasSubmittedRef = useRef(false);
  const puzzleStartTimeRef = useRef(null);
  const { playClick } = useSfx();

  // Direct Challenge state
  const [pendingDirectInviteUid, setPendingDirectInviteUid] = useState(null);

  // EDGE-1: Track processed join codes to prevent double-joins
  const processedJoinCodes = useRef(new Set());

  // Timer: 60s cap for the match
  const { timeLeft, start, pause, resume } = useTimer(60);

  // ─── EDGE-1: Reactive location.state watcher for auto-join ────────
  useEffect(() => {
    const code = location.state?.joinRoomCode;
    if (code && multiplayerState === 'lobby' && !processedJoinCodes.current.has(code)) {
      processedJoinCodes.current.add(code);
      joinRoom(code);
      // Clear consumed state to prevent re-trigger on refresh
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, multiplayerState]);

  // ─── Guest Authentication: Auto-login if entering logged out ──────
  useEffect(() => {
    const initGuest = async () => {
      const { auth } = await import('../services/firebase');
      await auth.authStateReady();
      if (!auth.currentUser) {
        const { loginAnonymously } = await import('../services/authService');
        try {
          await loginAnonymously();
        } catch (err) {
          console.warn('Failed to login as guest:', err);
        }
      }
    };
    initGuest();
  }, []);

  // ─── Direct Challenge: Auto-send invite once room is created ──────
  useEffect(() => {
    if (multiplayerState === 'waiting' && roomCode && pendingDirectInviteUid && currentUser?.uid) {
      sendGameInvite(currentUser.uid, pendingDirectInviteUid, roomCode)
        .then(() => console.log('Direct challenge invite sent to', pendingDirectInviteUid))
        .catch((err) => console.warn('Failed to send direct invite:', err))
        .finally(() => setPendingDirectInviteUid(null));
    }
  }, [multiplayerState, roomCode, pendingDirectInviteUid, currentUser?.uid]);

  // ─── EDGE-2: Ghost room cleanup — cancel Firestore invites on unmount/reset ─
  const roomCodeRef = useRef(roomCode);
  const isHostRef = useRef(isHost);
  useEffect(() => { roomCodeRef.current = roomCode; }, [roomCode]);
  useEffect(() => { isHostRef.current = isHost; }, [isHost]);

  useEffect(() => {
    return () => {
      if (roomCodeRef.current && isHostRef.current && currentUser?.uid) {
        cancelPendingInvitesForRoom(currentUser.uid, roomCodeRef.current);
      }
    };
  }, [currentUser?.uid]);

  // ─── Direct Challenge handler (passed to SocialOverlay) ───────────
  const handleDirectChallenge = (friendUid) => {
    playClick();
    setPendingDirectInviteUid(friendUid);
    createRoom(settings.difficulty);
  };

  // Monitor Timer for Match Over
  useEffect(() => {
    if (multiplayerState === 'playing') {
      if (timeLeft === 0) {
        emitTimeout();
      }
    }
  }, [timeLeft, multiplayerState]);

  // Submit multiplayer result to leaderboard when match finishes
  useEffect(() => {
    if (multiplayerState === 'finished' && !hasSubmittedRef.current && currentUser?.uid) {
      hasSubmittedRef.current = true;
      const wins = matchResult === 'win' ? 1 : 0;
      const losses = matchResult === 'lose' ? 1 : 0;
      submitMultiplayerResult(
        currentUser.uid,
        currentUser.username || currentUser.email || 'Anonymous',
        wins,
        losses,
        ciphersCracked
      );
    }
  }, [multiplayerState, matchResult, currentUser, ciphersCracked]);

  // When game starts
  useEffect(() => {
    bgmController.play('bgm1');
    if (multiplayerState === 'playing') {
      const initializeGame = async () => {
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
            console.warn("ML Seeding failed", err);
          }
        }
        resetProgression(startDifficulty);
        setScore(0);
        setCiphersCracked(0);
        setUserInput('');
        setFeedback(null);
        start(60);
      };
      initializeGame();
    }
  }, [multiplayerState, start, currentUser, resetProgression]);

  // Auto focus input when cipher changes
  useEffect(() => {
    if (encryptedWord) {
      setIsGlitching(true);
      puzzleStartTimeRef.current = Date.now();
      setTimeout(() => setIsGlitching(false), 500);
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  }, [encryptedWord]);

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!userInput.trim() || multiplayerState !== 'playing' || !currentWord) return;

    // strict string validation locally
    const sanitize = (str) => str ? str.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() : '';
    const isEncryptionMode = cipherName?.includes('Encrypt');
    const targetWord = isEncryptionMode ? encryptedWord : currentWord;
    const isCorrect = sanitize(userInput) === sanitize(targetWord);

    // Derive normalized cipher type
    const cType = isColumnar ? 'columnar' : isRailFence ? 'railfence' : isVigenere ? 'vigenere' : isSubstitution ? 'substitution' : null;

    if (isCorrect) {
      if (cType) trackCipherAttempt(currentUser?.uid, cType, true);

      const timeTaken = (Date.now() - puzzleStartTimeRef.current) / 1000;
      const currentDiff = useGameStore.getState().currentDifficulty || 'Easy';
      recordCipherAttempt(true, timeTaken, currentDiff);

      // Points based on difficulty: Easy=100, Normal=250, Hard=600
      const currentDiffLower = currentDiff.toLowerCase();
      const pointsEarned = currentDiffLower === 'easy' ? 100 : currentDiffLower === 'normal' ? 250 : 600;
      const newScore = score + pointsEarned;
      setScore(newScore);
      submitScore(newScore);
      setCiphersCracked(prev => prev + 1);

      setFeedback('correct');
      setIsGlitching(true);
      setTimeout(() => {
        setFeedback(null);
        setIsGlitching(false);
        nextRound(); // Request new word from server
      }, 500);
      setUserInput('');
    } else {
      if (cType) trackCipherAttempt(currentUser?.uid, cType, false);

      const timeTaken = (Date.now() - puzzleStartTimeRef.current) / 1000;
      const currentDiff = useGameStore.getState().currentDifficulty || 'Easy';
      recordCipherAttempt(false, timeTaken, currentDiff);

      const newScore = Math.max(0, score - 50);
      setScore(newScore);
      submitScore(newScore);
      setFeedback('wrong');

      setTimeout(() => {
        setFeedback(null);
        if (inputRef.current) inputRef.current.focus();
      }, 600);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit();
  };

  // Virtual keyboard handlers
  const handleVirtualKeyPress = (key) => setUserInput(prev => prev + key);
  const handleVirtualDelete = () => setUserInput(prev => prev.slice(0, -1));

  // Columnar Transposition detection
  const isColumnar = cipherName?.startsWith('Columnar');
  const columnarKeyword = isColumnar
    ? (cipherKey || '').replace(/^Keyword:\s*/i, '').trim()
    : '';

  // Rail Fence detection
  const isRailFence = cipherName?.startsWith('Rail Fence');
  const railFenceRails = isRailFence
    ? parseInt((cipherKey || '').replace(/^Rails:\s*/i, '').trim(), 10) || 3
    : 3;

  // Vigenere detection
  const isVigenere = cipherName?.startsWith('Vigenere');
  const vigenereKeyword = isVigenere
    ? (cipherKey || '').replace(/^Keyword:\s*/i, '').trim()
    : '';

  // Substitution detection
  const isSubstitution = cipherName?.startsWith('Substitution');
  const substitutionKeyword = isSubstitution
    ? (cipherKey || '').replace(/^Keyword:\s*/i, '').trim()
    : '';

  const isEncryptionMode = cipherName?.includes('Encrypt');

  // Handler for Interactive Components completion
  const handleInteractiveComplete = (answer) => {
    if (multiplayerState !== 'playing' || !currentWord) return;

    const sanitize = (str) => str ? str.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() : '';
    const targetWord = isEncryptionMode ? encryptedWord : currentWord;
    const isCorrect = sanitize(answer) === sanitize(targetWord);

    // Derive normalized cipher type
    const cType = isColumnar ? 'columnar' : isRailFence ? 'railfence' : isVigenere ? 'vigenere' : isSubstitution ? 'substitution' : null;

    if (isCorrect) {
      if (cType) trackCipherAttempt(currentUser?.uid, cType, true);

      const timeTaken = (Date.now() - puzzleStartTimeRef.current) / 1000;
      const currentDiff = useGameStore.getState().currentDifficulty || 'Easy';
      recordCipherAttempt(true, timeTaken, currentDiff);

      // Points based on difficulty: Easy=100, Normal=250, Hard=600
      const currentDiffLower = currentDiff.toLowerCase();
      const pointsEarned = currentDiffLower === 'easy' ? 100 : currentDiffLower === 'normal' ? 250 : 600;
      const newScore = score + pointsEarned;
      setScore(newScore);
      submitScore(newScore);
      setCiphersCracked(prev => prev + 1);

      setFeedback('correct');
      setIsGlitching(true);
      setTimeout(() => {
        setFeedback(null);
        setIsGlitching(false);
        nextRound();
      }, 500);
      setUserInput('');
    } else {
      if (cType) trackCipherAttempt(currentUser?.uid, cType, false);

      const timeTaken = (Date.now() - puzzleStartTimeRef.current) / 1000;
      const currentDiff = useGameStore.getState().currentDifficulty || 'Easy';
      recordCipherAttempt(false, timeTaken, currentDiff);

      const newScore = Math.max(0, score - 50);
      setScore(newScore);
      submitScore(newScore);
      setFeedback('wrong');
      setTimeout(() => setFeedback(null), 600);
    }
  };

  // State renderers
  const renderLobby = () => (
    <div className="flex flex-col items-center w-full max-w-3xl mx-auto mt-10 animate-fade-in">
      <div className="mb-10 text-center">
        <span className="text-[10px] tracking-[0.4em] text-[var(--gold-dim)] uppercase mb-2 block">— Secure Connection · CQ Division —</span>
        <h1 className="font-serif text-4xl md:text-5xl font-black text-[var(--gold-light)] tracking-[0.12em] uppercase text-shadow flex items-center justify-center gap-4">
          <Users size={36} className="text-[var(--gold)]" /> Multiplayer Duel
        </h1>
      </div>

      <div className="flex flex-col md:flex-row gap-6 w-full">
        {/* Host Node */}
        <div className="flex-1 bg-[rgba(18,12,4,0.75)] border border-[rgba(201,168,76,0.2)] border-l-[3px] border-l-[var(--red)] p-8 flex flex-col items-center text-center shadow-2xl relative overflow-hidden group hover:bg-[rgba(22,15,5,0.9)] hover:border-[rgba(201,168,76,0.4)] transition-all">
          <ShieldAlert size={28} className="text-[var(--gold-dim)] mb-4 group-hover:text-[var(--gold-light)] transition-colors" />
          <h2 className="font-serif text-xl text-[var(--cream)] uppercase tracking-[0.1em] mb-2">Host Node</h2>
          <p className="font-mono text-xs text-[#a09070] mb-8 leading-relaxed opacity-80">Establish a secured line. You will dictate the global cipher difficulty.</p>
          <div className="mt-auto w-full">
            <button onClick={() => { playClick(); createRoom(settings.difficulty); }} className="w-full py-3 bg-[rgba(201,168,76,0.1)] border border-[var(--gold-dim)] text-[var(--gold-light)] font-mono text-xs tracking-[0.2em] uppercase hover:bg-[var(--gold-dim)] hover:text-[#0e0a04] transition-colors">
              Initialize Session
            </button>
          </div>
        </div>

        {/* Join Node */}
        <div className="flex-1 bg-[rgba(18,12,4,0.75)] border border-[rgba(201,168,76,0.2)] border-l-[3px] border-l-[var(--gold)] p-8 flex flex-col items-center text-center shadow-2xl relative overflow-hidden group hover:bg-[rgba(22,15,5,0.9)] hover:border-[rgba(201,168,76,0.4)] transition-all">
          <Key size={28} className="text-[var(--gold-dim)] mb-4 group-hover:text-[var(--gold-light)] transition-colors" />
          <h2 className="font-serif text-xl text-[var(--cream)] uppercase tracking-[0.1em] mb-2">Intercept Line</h2>
          <p className="font-mono text-xs text-[#a09070] mb-6 leading-relaxed opacity-80">Input a 4-letter frequency code to intercept a matching duel.</p>

          <div className="w-full flex flex-col gap-3 mt-auto">
            <input
              type="text"
              value={joinCodeInput}
              onChange={e => setJoinCodeInput(e.target.value.toUpperCase())}
              maxLength={4}
              placeholder="CODE"
              className="w-full bg-[rgba(8,5,2,0.6)] border border-[var(--gold-dim)] text-[var(--gold-light)] text-center text-xl tracking-[0.5em] p-3 outline-none focus:border-[var(--gold)] placeholder:text-[rgba(201,168,76,0.3)] uppercase font-mono"
            />
            <button
              onClick={() => { playClick(); joinCodeInput.length === 4 && joinRoom(joinCodeInput); }}
              disabled={joinCodeInput.length !== 4}
              className="w-full py-3 bg-[rgba(201,168,76,0.1)] border border-[var(--gold-dim)] text-[var(--gold-light)] font-mono text-xs tracking-[0.2em] uppercase hover:bg-[var(--gold-dim)] hover:text-[#0e0a04] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Connect
            </button>
          </div>
        </div>
      </div>

      <Button onClick={() => { playClick(); navigate('/'); }} className="mt-12 !text-[11px] !py-2 !px-4">
        <ArrowLeft size={14} /> Disconnect & Return
      </Button>
    </div>
  );

  const renderWaiting = () => (
    <div className="flex flex-col items-center w-full max-w-lg mx-auto mt-20 animate-fade-in">
      <div className="bg-[rgba(18,12,4,0.85)] border border-[var(--gold-dim)] p-10 rounded shadow-[0_0_30px_rgba(0,0,0,0.8)] text-center w-full relative">
        {/* Pushpins */}
        <div className="absolute top-3 left-3 w-2 h-2 rounded-full bg-[var(--red)] shadow-[0_0_5px_rgba(139,26,26,0.8)]"></div>
        <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-[var(--red)] shadow-[0_0_5px_rgba(139,26,26,0.8)]"></div>

        <h2 className="text-[10px] text-[var(--gold-dim)] font-mono mb-4 uppercase tracking-[0.3em]">— Intercept Frequency —</h2>
        <div className="text-6xl font-serif text-[var(--cream)] tracking-[0.3em] mb-10 pb-6 border-b border-[rgba(201,168,76,0.2)] drop-shadow-[0_0_10px_rgba(232,201,106,0.3)]">
          {roomCode}
        </div>

        {playersCount < 2 ? (
          <div className="flex flex-col items-center animate-pulse">
            <span className="text-[#a09070] font-mono text-sm tracking-widest uppercase">Awaiting Adversary...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <span className="text-[#5a9e6f] font-mono text-xs tracking-[0.2em] uppercase mb-8 flex items-center gap-2 bg-[rgba(90,158,111,0.1)] px-4 py-2 border border-[#5a9e6f] rounded">
              <span className="w-2 h-2 rounded-full bg-[#5a9e6f] animate-pulse"></span> Opponent Connected
            </span>
            {isHost ? (
              <button onClick={() => { playClick(); startGame(); }} className="w-full py-4 bg-[rgba(201,168,76,0.15)] border border-[var(--gold)] text-[var(--gold-light)] font-mono text-sm tracking-[0.2em] uppercase hover:bg-[var(--gold-light)] hover:text-[#0e0a04] transition-colors shadow-[0_0_15px_rgba(201,168,76,0.2)]">
                Commence Duel
              </button>
            ) : (
              <span className="text-[var(--gold-dim)] font-serif italic text-sm">Waiting for the host to commence...</span>
            )}
          </div>
        )}
      </div>
      <Button onClick={() => { playClick(); resetLobby(); navigate('/'); }} className="mt-8 !text-[10px] !py-2 !px-4">
        Abort Mission
      </Button>
    </div>
  );

  const renderFinished = () => (
    <div className="flex flex-col items-center w-full max-w-lg mx-auto mt-16 animate-fade-in">
      <div className="bg-[rgba(18,12,4,0.9)] border-2 border-[var(--gold)] p-10 rounded shadow-[0_0_50px_rgba(0,0,0,0.9)] text-center w-full relative overflow-hidden">

        <h1 className={`text-5xl font-serif mb-8 uppercase tracking-[0.2em] drop-shadow-[0_0_15px_currentColor]
           ${matchResult === 'win' ? 'text-[#5a9e6f]' : matchResult === 'lose' ? 'text-[var(--red)]' : 'text-[var(--gold-light)]'}
        `}>
          {matchResult === 'win' ? 'Victory' : matchResult === 'lose' ? 'Defeated' : 'Stalemate'}
        </h1>

        <div className="flex justify-between items-stretch mb-10 bg-[rgba(0,0,0,0.6)] border border-[rgba(201,168,76,0.3)]">
          <div className="flex-1 flex flex-col items-center p-6 border-r border-[rgba(201,168,76,0.3)]">
            <span className="text-[9px] text-[var(--gold-dim)] font-mono tracking-[0.2em] mb-2">YOUR SCORE</span>
            <span className="text-4xl text-[var(--cream)] font-serif">{score}</span>
          </div>
          <div className="flex flex-col justify-center px-4 bg-[rgba(201,168,76,0.05)]">
            <span className="text-[var(--gold-dim)] font-serif italic">VS</span>
          </div>
          <div className="flex-1 flex flex-col items-center p-6 border-l border-[rgba(201,168,76,0.3)]">
            <span className="text-[9px] text-[var(--red)] font-mono tracking-[0.2em] mb-2">OPPONENT</span>
            <span className="text-4xl text-[#a09070] font-serif">{opponentScore}</span>
          </div>
        </div>

        <button onClick={() => { playClick(); resetLobby(); }} className="w-full py-4 bg-[rgba(201,168,76,0.1)] border border-[var(--gold-dim)] text-[var(--gold-light)] font-mono text-xs tracking-[0.2em] uppercase hover:bg-[var(--gold-dim)] hover:text-[#0e0a04] transition-colors">
          Return to Hub
        </button>
      </div>
    </div>
  );

  const renderPlaying = () => (
    <div className="flex flex-col w-full max-w-5xl mx-auto relative z-10 transition-all p-4 animate-fade-in">
      <button
        onClick={() => {
          if (window.confirm("Are you sure you want to forfeit? You will lose this match.")) {
            playClick();
            forfeitMatch();
          }
        }}
        className="absolute top-2 right-2 z-50 text-[10px] bg-[rgba(139,26,26,0.15)] text-[var(--red)] border border-[rgba(139,26,26,0.5)] px-4 py-2 hover:bg-[var(--red)] hover:text-[#0e0a04] transition-all uppercase tracking-[0.2em] flex items-center gap-2"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--red)] animate-pulse"></span> Forfeit
      </button>

      {/* Center Box */}
      <div className="flex flex-col items-center relative w-full mb-8 pt-16 mt-2">
        {/* Score & Time & Opponent OVERLAYS */}
        <div className="absolute top-0 left-0 md:left-4 text-2xl font-serif flex flex-col items-start z-20">
          <span className="text-sm uppercase tracking-widest text-[#5a9e6f]/70 font-mono">You</span>
          <span className="text-[var(--cream)] drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]">{score}</span>
        </div>

        <div className={`absolute top-0 left-1/2 -translate-x-1/2 text-4xl font-serif flex flex-col items-center z-20 transition-colors ${timeLeft <= 10 ? 'text-[var(--red)] animate-pulse drop-shadow-[0_0_8px_rgba(139,26,26,0.8)]' : 'text-[var(--gold-light)] drop-shadow-[0_0_5px_rgba(232,201,106,0.4)]'}`}>
          <span className="text-sm font-mono tracking-widest text-[var(--gold-dim)] uppercase">Time</span>
          {timeLeft}
        </div>

        <div className="absolute top-0 right-0 md:right-4 text-2xl font-serif flex flex-col items-end z-20">
          <span className="text-sm uppercase tracking-widest text-[var(--red)]/70 font-mono">Opponent</span>
          <span className="text-[#a09070] opacity-90">{opponentScore}</span>
        </div>
        {!encryptedWord ? (
          <LoadingSpinner text="Synchronizing Cryptographs..." />
        ) : (
          <div className={`bg-[rgba(8,5,2,0.8)] border p-12 py-16 relative max-w-3xl w-full text-center mt-4 transition-all duration-300
            ${feedback === 'wrong' ? 'animate-shake border-[var(--red)] shadow-[0_0_40px_rgba(139,26,26,0.6)]' :
              feedback === 'correct' ? 'border-[#5a9e6f] shadow-[0_0_40px_rgba(90,158,111,0.4)]' :
                'border-[var(--gold-dim)] shadow-[0_0_40px_rgba(0,0,0,0.9)]'}
          `}>

            {/* Feedback Overlays */}
            {feedback === 'correct' && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#5a9e6f]/10 rounded pointer-events-none">
                <span className="text-5xl md:text-6xl font-serif text-[#5a9e6f] opacity-90 drop-shadow-[0_0_20px_rgba(90,158,111,1)] animate-stamp uppercase tracking-widest border-4 border-[#5a9e6f]/80 px-8 py-4 rounded-lg transform -rotate-12 bg-black/40 backdrop-blur-sm">
                  DECRYPTED
                </span>
              </div>
            )}
            {feedback === 'wrong' && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-[var(--red)]/10 rounded pointer-events-none">
                <span className="text-5xl md:text-6xl font-serif text-[var(--red)] opacity-90 drop-shadow-[0_0_20px_rgba(139,26,26,1)] animate-stamp uppercase tracking-widest border-4 border-[var(--red)]/80 px-8 py-4 rounded-lg transform rotate-12 bg-black/40 backdrop-blur-sm">
                  FAILED
                </span>
              </div>
            )}

            <div className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center bg-[#1a1208] px-8 py-2 border shadow-md pb-3 w-72 transition-colors duration-300 ${feedback === 'wrong' ? 'border-[var(--red)]' : feedback === 'correct' ? 'border-[#5a9e6f]' : 'border-[var(--gold-dim)]'}`}>
              <span className={`text-[11px] tracking-[0.2em] font-mono uppercase border-b pb-2 mb-2 w-full text-center flex justify-center items-center gap-2 transition-colors duration-300 ${feedback === 'wrong' ? 'text-[var(--red)] border-[var(--red)]/30' : feedback === 'correct' ? 'text-[#5a9e6f] border-[#5a9e6f]/30' : 'text-[var(--gold-light)] border-[rgba(201,168,76,0.2)]'}`}><Zap size={12} /> {cipherName}</span>
              <span className="text-[#a09070] font-serif italic text-sm tracking-widest uppercase">Intel: {cipherKey}</span>
            </div>

            <p className={`font-serif text-3xl sm:text-4xl md:text-5xl text-[var(--cream)] tracking-[0.2em] font-bold break-all selection:bg-[var(--gold-dim)] selection:text-[#0e0a04] leading-relaxed drop-shadow-md ${isGlitching ? 'animate-glitch' : ''}`}>
              {isEncryptionMode ? currentWord : encryptedWord}
            </p>

            {currentClue && (
              <div className="mt-8 text-[var(--gold-light)] italic font-serif text-lg bg-[rgba(18,12,4,0.6)] px-6 py-3 border border-[var(--gold-dim)] rounded inline-block max-w-[90%] relative">
                <span className="font-mono text-xs text-[#a09070] block mb-1 uppercase tracking-[0.2em] text-center">
                  Intercepted Clue
                  <span className={`ml-2 text-[10px] px-2 py-0.5 rounded border ${isFallback ? 'border-[var(--red)] text-[var(--red)]' : 'border-[#5a9e6f] text-[#5a9e6f]'}`}>
                    {isFallback ? 'SOURCE: FALLBACK' : 'SOURCE: SERVER'}
                  </span>
                </span>
                "{currentClue}"
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Input Area */}
      <div className="mt-8 flex flex-col items-center w-full gap-4 pb-4">
        {isColumnar && (isEncryptionMode ? currentWord : encryptedWord) ? (
          <>
            <ColumnarInteractive mode={isEncryptionMode ? "encrypt" : "decrypt"} text={isEncryptionMode ? currentWord : encryptedWord} keyword={columnarKeyword} onComplete={handleInteractiveComplete} />
            <div className={`text-[11px] font-mono tracking-[0.4em] transition-opacity duration-300 ${feedback === 'correct' ? 'text-[#5a9e6f] opacity-100' : feedback === 'wrong' ? 'text-[var(--red)] opacity-100' : 'opacity-0'}`}>
              {feedback === 'correct' ? '+100 POINTS' : 'PENALTY'}
            </div>
          </>
        ) : isRailFence && (isEncryptionMode ? currentWord : encryptedWord) ? (
          <>
            <RailFenceInteractive mode={isEncryptionMode ? "encrypt" : "decrypt"} text={isEncryptionMode ? currentWord : encryptedWord} rails={railFenceRails} onComplete={handleInteractiveComplete} />
            <div className={`text-[11px] font-mono tracking-[0.4em] transition-opacity duration-300 ${feedback === 'correct' ? 'text-[#5a9e6f] opacity-100' : feedback === 'wrong' ? 'text-[var(--red)] opacity-100' : 'opacity-0'}`}>
              {feedback === 'correct' ? '+100 POINTS' : 'PENALTY'}
            </div>
          </>
        ) : isVigenere && (isEncryptionMode ? currentWord : encryptedWord) ? (
          <>
            <VigenereInteractive mode={isEncryptionMode ? "encrypt" : "decrypt"} text={isEncryptionMode ? currentWord : encryptedWord} keyword={vigenereKeyword} onComplete={handleInteractiveComplete} />
            <div className={`text-[11px] font-mono tracking-[0.4em] transition-opacity duration-300 ${feedback === 'correct' ? 'text-[#5a9e6f] opacity-100' : feedback === 'wrong' ? 'text-[var(--red)] opacity-100' : 'opacity-0'}`}>
              {feedback === 'correct' ? '+100 POINTS' : 'PENALTY'}
            </div>
          </>
        ) : isSubstitution && (isEncryptionMode ? currentWord : encryptedWord) ? (
          <>
            <SubstitutionInteractive mode={isEncryptionMode ? "encrypt" : "decrypt"} text={isEncryptionMode ? currentWord : encryptedWord} keyword={substitutionKeyword} onComplete={handleInteractiveComplete} />
            <div className={`text-[11px] font-mono tracking-[0.4em] transition-opacity duration-300 ${feedback === 'correct' ? 'text-[#5a9e6f] opacity-100' : feedback === 'wrong' ? 'text-[var(--red)] opacity-100' : 'opacity-0'}`}>
              {feedback === 'correct' ? '+100 POINTS' : 'PENALTY'}
            </div>
          </>
        ) : (
          <>
            <input
              ref={inputRef}
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={!encryptedWord || multiplayerState !== 'playing'}
              placeholder="DECIPHER THE TRANSMISSION..."
              className={`w-full max-w-xl bg-[rgba(8,5,2,0.6)] border-b-2 outline-none text-2xl md:text-3xl font-serif text-center transition-all py-3 uppercase tracking-[0.2em]
                ${feedback === 'correct' ? 'border-[#5a9e6f] text-[#5a9e6f] bg-[rgba(90,158,111,0.05)] shadow-[0_4px_15px_rgba(90,158,111,0.2)]' :
                  feedback === 'wrong' ? 'border-[var(--red)] text-[var(--red)] bg-[rgba(139,26,26,0.05)] shadow-[0_4px_15px_rgba(139,26,26,0.3)] animate-pulse' :
                    'border-[var(--gold-dim)] text-[var(--cream)] focus:border-[var(--gold-light)] hover:border-[var(--gold)] placeholder:text-[var(--gold-dim)] placeholder:opacity-30'}`}
              autoComplete="off"
              spellCheck="false"
            />

            <div className={`text-[11px] font-mono tracking-[0.4em] transition-opacity duration-300 mb-2 mt-1 ${feedback === 'correct' ? 'text-[#5a9e6f] opacity-100' : feedback === 'wrong' ? 'text-[var(--red)] opacity-100' : 'opacity-0'}`}>
              {feedback === 'correct' ? '+100 POINTS' : 'PENALTY'}
            </div>

            <VirtualKeyboard
              onKeyPress={handleVirtualKeyPress}
              onDelete={handleVirtualDelete}
              onEnter={handleSubmit}
            />
          </>
        )}
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=Special+Elite&family=IM+Fell+English:ital@0;1&display=swap');

        :root {
          --gold:       #c9a84c;
          --gold-light: #e8c96a;
          --gold-dim:   #7a6030;
          --red:        #8b1a1a;
          --cream:      #e8dcc0;
        }

        .mp-root {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
          font-family: 'Special Elite', monospace;
          background: #0e0a04;
          display: flex;
        }

        .mp-bg {
          background: radial-gradient(circle at 50% 10%, #1a1e26 0%, #0f1115 45%, #050608 100%);
        }

        .mp-scrim {
          background: linear-gradient(to bottom, rgba(15,17,21,0.2) 0%, rgba(5,6,8,0.8) 100%);
        }

        .mp-bloom {
          position: absolute;
          left: 50%;
          top: 30%;
          transform: translate(-50%, -50%);
          width: 700px;
          height: 500px;
          background: radial-gradient(ellipse, rgba(160,105,20,0.12) 0%, transparent 70%);
          z-index: 2;
          pointer-events: none;
        }

        .mp-grain {
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          opacity: 0.04;
          mix-blend-mode: screen;
        }

        .mp-layout {
          position: relative;
          z-index: 10;
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
        }

        .mp-layout-lobby { padding: 100px 0 20px 20px; }
        .mp-layout-playing { padding: 20px; }
      `}</style>

      <div className="mp-root">
        <DifficultySplash />
        
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="mp-bg absolute inset-0 z-0" />
          <div className="mp-scrim absolute inset-0 z-10" />
          <div className="mp-bloom absolute inset-0 z-20" />
          <div className="mp-grain absolute inset-0 z-30" />
        </div>

        <div className={`mp-layout flex-1 bg-black/0 ${multiplayerState === 'playing' ? 'mp-layout-playing' : 'mp-layout-lobby'}`}>
          {multiplayerState === 'lobby' && renderLobby()}
          {multiplayerState === 'waiting' && renderWaiting()}
          {multiplayerState === 'finished' && renderFinished()}
          {multiplayerState === 'playing' && renderPlaying()}
        </div>

        {multiplayerState !== 'playing' && (
          <div className="h-full relative z-20 shrink-0">
            <SocialOverlay
              activeRoomCode={isHost && multiplayerState === 'waiting' ? roomCode : null}
              onAcceptGameInvite={(code) => joinRoom(code)}
              onDirectChallenge={handleDirectChallenge}
              challengingUid={pendingDirectInviteUid}
            />
          </div>
        )}
      </div>
    </>
  );
}
