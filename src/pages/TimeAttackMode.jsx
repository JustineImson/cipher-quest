import React, { useState, useEffect, useRef } from 'react';
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

export default function TimeAttackMode() {
  const navigate = useNavigate();
  const { settings } = useGameStore();

  // Timer: Grand timer starts at 60
  const { timeLeft, start, addTime } = useTimer(60);

  // Game/Round State
  const [gameState, setGameState] = useState('idle'); // idle, playing, game_over
  const [score, setScore] = useState(0);
  const [ciphersCracked, setCiphersCracked] = useState(0);
  
  const [currentWord, setCurrentWord] = useState('');
  const [encryptedWord, setEncryptedWord] = useState('');
  const [cipherMethod, setCipherMethod] = useState({ name: '' });
  
  const [isLoading, setIsLoading] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [feedback, setFeedback] = useState(null); // 'correct' | 'wrong' | null

  // DevMode State
  const [devModeVisible, setDevModeVisible] = useState(false);

  const inputRef = useRef(null);

  // Game Loop: Fetch Word
  const fetchNewWord = async () => {
    setIsLoading(true);
    setUserInput('');
    setFeedback(null);
    try {
      const res = await fetch(`http://localhost:3001/api/generate-word?difficulty=${settings.difficulty}`);
      if (!res.ok) throw new Error('Network response was not ok');
      const data = await res.json();
      
      const word = data.word;
      setCurrentWord(word);
      
      const cipher = selectCipherMethod(settings.difficulty);
      setCipherMethod(cipher);
      setEncryptedWord(cipher.applyCipher(word));
      
      setIsLoading(false);
      // Auto-focus input when ready
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 0);
    } catch (err) {
      console.error("Fetch error:", err);
      // Fallback for development if backend fails
      const word = "FALLBACK";
      setCurrentWord(word);
      const cipher = selectCipherMethod(settings.difficulty);
      setCipherMethod(cipher);
      setEncryptedWord(cipher.applyCipher(word));
      setIsLoading(false);
       setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 0);
    }
  };

  // Start initialization
  useEffect(() => {
    startGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  const startGame = () => {
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

  // Handle Submission
  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!userInput.trim() || gameState !== 'playing') return;

    const targetWord = cipherMethod.isEncryptionMode ? encryptedWord : currentWord;
    const isCorrect = validateAnswer(userInput, targetWord);
    
    if (isCorrect) {
      // Score System Formula: Correct answer = +100 base points. Time bonus = +(remaining seconds * 2).
      const pointsEarned = 100 + (timeLeft * 2);
      setScore(prev => prev + pointsEarned);
      setCiphersCracked(prev => prev + 1);
      
      // Time Bonus based on difficulty
      const timeBonus = settings.difficulty.toLowerCase() === 'easy' ? 5 : 
                        settings.difficulty.toLowerCase() === 'medium' ? 10 : 15;
      addTime(timeBonus);
      
      setFeedback('correct');
      
      // Briefly show feedback then fetch next
      setTimeout(() => {
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
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  // Virtual keyboard handlers
  const handleVirtualKeyPress = (key) => setUserInput(prev => prev + key);
  const handleVirtualDelete = () => setUserInput(prev => prev.slice(0, -1));

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
  const handleInteractiveComplete = (answer) => {
    if (gameState !== 'playing') return;

    const targetWord = cipherMethod.isEncryptionMode ? encryptedWord : currentWord;
    const isCorrect = validateAnswer(answer, targetWord);

    if (isCorrect) {
      const pointsEarned = 100 + (timeLeft * 2);
      setScore(prev => prev + pointsEarned);
      setCiphersCracked(prev => prev + 1);

      const timeBonus = settings.difficulty.toLowerCase() === 'easy' ? 5 :
                        settings.difficulty.toLowerCase() === 'medium' ? 10 : 15;
      addTime(timeBonus);

      setFeedback('correct');
      setTimeout(() => {
        fetchNewWord();
      }, 800);
    } else {
      setScore(prev => Math.max(0, prev - 50));
      setFeedback('wrong');
      setTimeout(() => setFeedback(null), 600);
    }
  };

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

  // Playing Mode
  return (
    <div className="flex flex-col h-full w-full p-6 max-w-4xl mx-auto relative z-10 transition-all">
      {/* Top bar */}
      <div className="flex justify-between items-center mb-10 w-full bg-black/40 p-4 border border-mystery-gold/30 rounded backdrop-blur-md shadow-lg shadow-black/50">
        <Button onClick={() => navigate('/')} variant="ghost" className="text-sm">Abscind (Menu)</Button>
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
      <div className="flex-1 flex flex-col items-center justify-center">
        {isLoading ? (
          <LoadingSpinner text="Consulting Informants..." />
        ) : (
          <div className="bg-gray-900/60 border border-mystery-gold p-12 py-16 rounded shadow-[0_0_40px_rgba(0,0,0,0.8)] relative max-w-2xl w-full text-center group backdrop-blur-md">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center bg-mystery-dark px-8 py-2 border border-mystery-gold rounded shadow-md pb-3 w-64">
               <span className="text-mystery-gold text-sm tracking-[0.2em] font-serif uppercase border-b border-mystery-gold/30 pb-1 mb-1 w-full text-center">Cipher: {cipherMethod.name}</span>
               <span className="text-blue-300 font-mono text-xs tracking-widest uppercase">Intel: {cipherMethod.key}</span>
            </div>
            
            <p className="font-mono text-4xl sm:text-5xl md:text-6xl text-white tracking-[0.3em] font-light break-all selection:bg-mystery-gold/30 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
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
          onClick={() => setDevModeVisible(!devModeVisible)} 
          className="text-xs text-mystery-gold/30 hover:text-mystery-gold/80 transition-colors mb-2 font-mono"
        >
          {devModeVisible ? '[HIDE_DEV]' : '[DEV_TOOLS]'}
        </button>
        
        {devModeVisible && (
          <div className="bg-black/90 border border-red-900/50 p-4 rounded text-xs flex flex-col gap-3 shadow-2xl backdrop-blur-md w-56 transition-all font-mono">
            <span className="text-red-500 font-bold uppercase tracking-widest border-b border-red-900/50 pb-2 text-center text-[10px]">Developer Access</span>
            
            <button 
              onClick={() => {
                if (inputRef.current) {
                  setUserInput(cipherMethod.isEncryptionMode ? encryptedWord : currentWord);
                  inputRef.current.focus();
                }
              }}
              className="bg-red-900/20 hover:bg-red-900/50 text-red-200/80 py-1.5 rounded transition-colors border border-red-900/30"
            >
              Autofill Answer
            </button>
            <button 
              onClick={fetchNewWord}
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
                  onClick={() => addTime(15)}
                  className="bg-red-900/20 hover:bg-red-900/50 text-red-200/80 py-1 rounded transition-colors flex-1 border border-red-900/30 font-bold"
                >
                  +15s
                </button>
                <button 
                  onClick={() => addTime(-15)}
                  className="bg-red-900/20 hover:bg-red-900/50 text-red-200/80 py-1 rounded transition-colors flex-1 border border-red-900/30 font-bold"
                >
                  -15s
                </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
