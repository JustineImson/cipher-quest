import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { bgmController } from '../engine/BGMController';
import { useSfx } from '../hooks/useSfx';
import { Pause } from 'lucide-react';
import DifficultySplash from '../components/ui/DifficultySplash';
import { generatePuzzleDetails } from '../services/aiGenerator';
import { submitTimeAttackScore } from '../services/leaderboardService';
import ErrorBoundary from '../components/ErrorBoundary';

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
  const { settings, incrementPuzzlesSolved, resetProgression, currentDifficulty, puzzlesSolved, setDifficulty, currentUser } = useGameStore();

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

  const [isLoading, setIsLoading] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [feedback, setFeedback] = useState(null); // 'correct' | 'wrong' | null

  // DevMode State
  const [devModeVisible, setDevModeVisible] = useState(false);
  const [isGlitching, setIsGlitching] = useState(false);

  const inputRef = useRef(null);
  const hasSubmittedRef = useRef(false);
  const { playClick } = useSfx();

  // Game Loop: Fetch Word
  const fetchNewWord = useCallback(async (attempt = 1) => {
    setIsLoading(true);
    setUserInput('');
    setFeedback(null);

    const activeDiff = useGameStore.getState().currentDifficulty || 'easy';

    try {
      const data = await generatePuzzleDetails(activeDiff, 'victorian noir detective');
      const word = data?.plaintext;

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

      setIsLoading(false);
      setIsGlitching(true);
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
      } catch (fallbackErr) {
        console.error('Fallback cipher failed:', fallbackErr);
        setCipherMethod({ name: 'Caesar Shift', key: 'Shift: 3', applyCipher: (t) => t, isEncryptionMode: false });
        setEncryptedWord(fallbackWord);
      }
      setIsLoading(false);
      setIsGlitching(true);
      setTimeout(() => setIsGlitching(false), 500);
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 0);
    }
  }, []);

  // Start initialization
  useEffect(() => {
    bgmController.play('bgm1');
    startGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  const startGame = () => {
    hasSubmittedRef.current = false;
    resetProgression();
    setScore(0);
    setCiphersCracked(0);
    setGameState('playing');
    start(60);
    fetchNewWord();
  };

  // Monitor Timer for Game Over
  useEffect(() => {
    if (gameState === 'playing' && timeLeft === 0) {
      setGameState('game_over');
    }
  }, [timeLeft, gameState]);

  // Submit score to leaderboard on game over
  useEffect(() => {
    if (gameState === 'game_over' && !hasSubmittedRef.current && currentUser?.uid) {
      hasSubmittedRef.current = true;
      submitTimeAttackScore(
        currentUser.uid,
        currentUser.username || currentUser.email || 'Anonymous',
        score,
        currentDifficulty,
        ciphersCracked
      );
    }
  }, [gameState, currentUser, score, currentDifficulty, ciphersCracked]);

  // Handle Submission
  const handleSubmit = useCallback((e) => {
    if (e) e.preventDefault();
    if (!userInput.trim() || gameState !== 'playing') return;

    const targetWord = cipherMethod.isEncryptionMode ? encryptedWord : currentWord;
    const isCorrect = validateAnswer(userInput, targetWord);

    if (isCorrect) {
      // Points based on difficulty: Easy=100, Moderate=250, Hard=600
      const currentDiff = (useGameStore.getState().currentDifficulty || 'easy').toLowerCase();
      const pointsEarned = currentDiff === 'easy' ? 100 : currentDiff === 'moderate' ? 250 : 600;
      setScore(prev => prev + pointsEarned);
      setCiphersCracked(prev => prev + 1);
      incrementPuzzlesSolved();

      // Time increment: Easy=15s, Moderate=30s, Hard=1min
      const timeBonus = currentDiff === 'easy' ? 15 : currentDiff === 'moderate' ? 30 : 60;
      addTime(timeBonus);

      setFeedback('correct');
      setIsGlitching(true);

      // Briefly show feedback then fetch next
      setTimeout(() => {
        setIsGlitching(false);
        fetchNewWord();
      }, 800);
    } else {
      setScore(prev => Math.max(0, prev - 50)); // Penalty
      setFeedback('wrong');

      setTimeout(() => {
        setFeedback(null);
        if (inputRef.current) inputRef.current.focus();
      }, 600);
    }
  }, [userInput, gameState, cipherMethod, encryptedWord, currentWord, addTime, incrementPuzzlesSolved, fetchNewWord]);

  const handlePause = useCallback(() => {
    if (gameState !== 'playing') return;
    playClick();
    setIsPaused(true);
    pause();
  }, [gameState, playClick, pause]);

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

  // Handler for Interactive Components completion (Columnar, Rail Fence)
  const handleInteractiveComplete = useCallback((answer) => {
    if (gameState !== 'playing') return;

    const targetWord = cipherMethod.isEncryptionMode ? encryptedWord : currentWord;
    const isCorrect = validateAnswer(answer, targetWord);

    if (isCorrect) {
      // Points based on difficulty: Easy=100, Moderate=250, Hard=600
      const currentDiff = (useGameStore.getState().currentDifficulty || 'easy').toLowerCase();
      const pointsEarned = currentDiff === 'easy' ? 100 : currentDiff === 'moderate' ? 250 : 600;
      setScore(prev => prev + pointsEarned);
      setCiphersCracked(prev => prev + 1);
      incrementPuzzlesSolved();

      // Time increment: Easy=15s, Moderate=30s, Hard=1min
      const timeBonus = currentDiff === 'easy' ? 15 : currentDiff === 'moderate' ? 30 : 60;
      addTime(timeBonus);

      setFeedback('correct');
      setIsGlitching(true);
      setTimeout(() => {
        setIsGlitching(false);
        fetchNewWord();
      }, 800);
    } else {
      setScore(prev => Math.max(0, prev - 50));
      setFeedback('wrong');
      setTimeout(() => setFeedback(null), 600);
    }
  }, [gameState, cipherMethod, encryptedWord, currentWord, addTime, incrementPuzzlesSolved, fetchNewWord]);

  // UI Renders
  if (gameState === 'game_over') {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full relative z-10 p-6">
        <div className="bg-black/60 border border-mystery-gold p-8 rounded shadow-xl text-center max-w-md w-full backdrop-blur-sm">
          <h1 className="text-4xl text-mystery-gold font-serif mb-4 uppercase tracking-widest drop-shadow-[0_0_8px_rgba(212,175,55,0.5)]">Time's Up!</h1>
          <p className="text-xl mb-2 text-gray-300 font-serif">Final Score: <span className="font-bold text-white text-3xl font-sans">{score}</span></p>
          <p className="text-lg mb-8 text-gray-400 font-serif">Ciphers Cracked: <span className="text-white font-semibold">{ciphersCracked}</span></p>

          <div className="flex flex-col gap-4">
            <Button onClick={startGame} className="w-full">Play Again</Button>
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
            <Button onClick={() => { playClick(); navigate('/settings'); }} variant="ghost" className="w-full text-[#7a6030] hover:text-[#c9a84c] border border-transparent hover:border-[#7a6030]/50">Mission Settings</Button>
            <Button onClick={() => { playClick(); navigate('/'); }} variant="ghost" className="w-full text-[#8b1a1a] hover:text-red-400 border border-transparent hover:border-[#8b1a1a]/50">Abort to Hub</Button>
          </div>
        </div>
      </div>
    );
  }

  // Playing Mode
  return (
    <div className="flex flex-col h-full w-full relative z-10 transition-all overflow-y-auto">
      <div className="max-w-4xl mx-auto w-full p-6">
        <DifficultySplash />
        {/* Fixed Top Right Pause Button */}
        <button
          onClick={handlePause}
          className="fixed top-10 right-20 z-50 text-mystery-gold/70 hover:text-mystery-gold transition-colors p-4 bg-black/80 border-2 border-mystery-gold/50 hover:border-mystery-gold rounded-full shadow-[0_0_25px_rgba(0,0,0,0.9)] group backdrop-blur-md"
          title="Pause Operation"
        >
          <Pause size={36} className="group-hover:scale-110 transition-transform" />
        </button>

        {/* Top bar */}
        <div className="flex justify-between items-center mb-10 w-full bg-black/40 p-4 border border-mystery-gold/30 rounded backdrop-blur-md shadow-lg shadow-black/50 mt-4 md:mt-0">
          <Button onClick={() => navigate('/')} className="text-sm">Abscind (Menu)</Button>
          <div className="text-2xl font-serif text-mystery-gold flex flex-col items-center">
            <span className="text-sm uppercase tracking-widest text-mystery-gold/70">Score</span>
            <span className="drop-shadow-[0_0_5px_rgba(212,175,55,0.8)]">{score}</span>
          </div>
          <div className={`text-4xl font-mono flex flex-col items-end transition-colors ${timeLeft <= 10 ? 'text-red-500 animate-pulse drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 'text-mystery-gold shadow-black drop-shadow-[0_0_5px_rgba(212,175,55,0.5)]'}`}>
            <span className="text-sm font-serif tracking-widest text-mystery-gold/70 uppercase">Time</span>
            {timeLeft}
          </div>
        </div>

        {/* Center Box */}
        <div className="flex-1 flex flex-col items-center justify-center relative w-full">
          {isLoading ? (
            <LoadingSpinner text="Consulting Informants..." />
          ) : (
            <div className={`bg-gray-900/60 border p-12 py-16 rounded relative max-w-2xl w-full text-center group backdrop-blur-md transition-all duration-300
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
            </div>
          )}
        </div>

        {/* Bottom Input Area */}
        <div className="mt-8 flex flex-col items-center w-full gap-4">
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
                className={`w-full max-w-lg bg-transparent border-b-2 outline-none text-3xl font-mono text-center transition-all pb-2 uppercase tracking-widest
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

        {/* DevMode Panel */}
        <div className="fixed bottom-4 right-4 flex flex-col items-end z-50">
          <button
            onClick={() => { playClick(); setDevModeVisible(!devModeVisible); }}
            className="text-xs text-mystery-gold/30 hover:text-mystery-gold/80 transition-colors mb-2 font-mono"
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
                  <span className="text-red-500/70">Solves:</span>
                  <span className="text-red-300 font-bold">{puzzlesSolved}</span>
                </div>
                <button
                  onClick={() => { playClick(); incrementPuzzlesSolved(); }}
                  className="mt-1 bg-red-900/20 hover:bg-red-900/50 text-red-200/80 py-1 rounded transition-colors border border-red-900/30"
                >
                  Force +1 Solve
                </button>
              </div>

              {/* Force Difficulty */}
              <div className="flex gap-1 w-full border-b border-red-900/50 pb-2">
                <button onClick={() => { playClick(); setDifficulty('easy'); fetchNewWord(); }} className="bg-red-900/20 hover:bg-red-900/50 text-red-200/80 py-1 rounded transition-colors flex-1 border border-red-900/30 text-[9px]">EZ</button>
                <button onClick={() => { playClick(); setDifficulty('moderate'); fetchNewWord(); }} className="bg-red-900/20 hover:bg-red-900/50 text-red-200/80 py-1 rounded transition-colors flex-1 border border-red-900/30 text-[9px]">MOD</button>
                <button onClick={() => { playClick(); setDifficulty('hard'); fetchNewWord(); }} className="bg-red-900/20 hover:bg-red-900/50 text-red-200/80 py-1 rounded transition-colors flex-1 border border-red-900/30 text-[9px]">HRD</button>
              </div>

              <button
                onClick={() => {
                  playClick();
                  const correctAnswer = cipherMethod.isEncryptionMode ? encryptedWord : currentWord;
                  // For interactive cipher components, call completion handler directly.
                  // For text input, populate the field and focus it.
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
        </div>

      </div>
    </div>
  );
}

export default function TimeAttackModeWrapped() {
  return (
    <ErrorBoundary>
      <TimeAttackMode />
    </ErrorBoundary>
  );
}
