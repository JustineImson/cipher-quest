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
import { useMultiplayer } from '../hooks/useMultiplayer';
import { bgmController } from '../engine/BGMController';
import { ArrowLeft, Users, Zap, ShieldAlert, Key } from 'lucide-react';
import { useSfx } from '../hooks/useSfx';
import SocialOverlay from '../components/SocialOverlay';
import DifficultySplash from '../components/ui/DifficultySplash';
import { submitMultiplayerResult } from '../services/leaderboardService';

export default function MultiplayerMode() {
  const navigate = useNavigate();
  const { settings, incrementPuzzlesSolved, resetProgression, currentUser } = useGameStore();

  const {
    multiplayerState, roomCode, isHost, playersCount, opponentScore,
    currentWord, encryptedWord, cipherName, cipherKey, matchResult,
    createRoom, joinRoom, startGame, submitScore, nextRound, emitTimeout, resetLobby
  } = useMultiplayer('http://localhost:3001');

  // Shared Game State
  const [score, setScore] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [feedback, setFeedback] = useState(null);

  const [joinCodeInput, setJoinCodeInput] = useState('');
  const inputRef = useRef(null);
  const hasSubmittedRef = useRef(false);
  const { playClick } = useSfx();

  // Timer: 60s cap for the match
  const { timeLeft, start, pause, resume } = useTimer(60);

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
        losses
      );
    }
  }, [multiplayerState, matchResult, currentUser]);

  // When game starts
  useEffect(() => {
    bgmController.play('bgm1');
    if (multiplayerState === 'playing') {
      resetProgression();
      setScore(0);
      setUserInput('');
      setFeedback(null);
      start(60);
    }
  }, [multiplayerState, start]);

  // Auto focus input when cipher changes
  useEffect(() => {
    if (encryptedWord && inputRef.current) {
      inputRef.current.focus();
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

    if (isCorrect) {
      // Points based on difficulty: Easy=100, Moderate=250, Hard=600
      const currentDiff = useGameStore.getState().currentDifficulty.toLowerCase();
      const pointsEarned = currentDiff === 'easy' ? 100 : currentDiff === 'moderate' ? 250 : 600;
      const newScore = score + pointsEarned;
      setScore(newScore);
      submitScore(newScore);
      incrementPuzzlesSolved();

      setFeedback('correct');
      setTimeout(() => {
        setFeedback(null);
        nextRound(); // Request new word from server
      }, 500);
      setUserInput('');
    } else {
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

    if (isCorrect) {
      // Points based on difficulty: Easy=100, Moderate=250, Hard=600
      const currentDiff = useGameStore.getState().currentDifficulty.toLowerCase();
      const pointsEarned = currentDiff === 'easy' ? 100 : currentDiff === 'moderate' ? 250 : 600;
      const newScore = score + pointsEarned;
      setScore(newScore);
      submitScore(newScore);
      incrementPuzzlesSolved();

      setFeedback('correct');
      setTimeout(() => {
        setFeedback(null);
        nextRound();
      }, 500);
      setUserInput('');
    } else {
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
    <div className="flex flex-col h-full w-full max-w-5xl mx-auto relative z-10 transition-all p-2 animate-fade-in">
      {/* Top bar with Dual Scores */}
      <div className="flex justify-between items-center mb-8 w-full bg-[rgba(18,12,4,0.85)] p-4 border border-[rgba(201,168,76,0.3)] shadow-[0_4px_20px_rgba(0,0,0,0.6)]">
        <div className="w-1/3 flex flex-col pl-4">
          <span className="text-[10px] font-mono tracking-[0.2em] text-[#5a9e6f] uppercase mb-1">You</span>
          <span className="text-3xl font-serif text-[var(--cream)] drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]">{score}</span>
        </div>

        <div className={`w-1/3 text-center text-4xl font-serif flex flex-col items-center transition-colors ${timeLeft <= 10 ? 'text-[var(--red)] animate-pulse drop-shadow-[0_0_8px_rgba(139,26,26,0.8)]' : 'text-[var(--gold-light)] drop-shadow-[0_0_5px_rgba(232,201,106,0.4)]'}`}>
          <span className="text-[9px] font-mono tracking-[0.3em] text-[var(--gold-dim)] uppercase mb-1">Time Remaining</span>
          {timeLeft}
        </div>

        <div className="w-1/3 flex flex-col items-end pr-4">
          <span className="text-[10px] font-mono tracking-[0.2em] text-[var(--red)] uppercase mb-1">Opponent</span>
          <span className="text-3xl font-serif text-[#a09070] opacity-90">{opponentScore}</span>
        </div>
      </div>

      <div className="w-full text-center mb-6 text-[10px] font-mono tracking-[0.4em] text-[var(--gold-dim)] opacity-70">
        RACE TO 500 POINTS
      </div>

      {/* Center Box */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-[200px]">
        {!encryptedWord ? (
          <LoadingSpinner text="Synchronizing Cryptographs..." />
        ) : (
          <div className="bg-[rgba(8,5,2,0.8)] border border-[var(--gold-dim)] p-12 py-16 shadow-[0_0_40px_rgba(0,0,0,0.9)] relative max-w-3xl w-full text-center mt-4">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center bg-[#1a1208] px-8 py-2 border border-[var(--gold-dim)] shadow-md pb-3 w-72">
              <span className="text-[var(--gold-light)] text-[11px] tracking-[0.2em] font-mono uppercase border-b border-[rgba(201,168,76,0.2)] pb-2 mb-2 w-full text-center flex justify-center items-center gap-2"><Zap size={12} /> {cipherName}</span>
              <span className="text-[#a09070] font-serif italic text-sm tracking-widest uppercase">Intel: {cipherKey}</span>
            </div>

            <p className="font-serif text-3xl sm:text-4xl md:text-5xl text-[var(--cream)] tracking-[0.2em] font-bold break-all selection:bg-[var(--gold-dim)] selection:text-[#0e0a04] leading-relaxed drop-shadow-md">
              {isEncryptionMode ? currentWord : encryptedWord}
            </p>
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
          position: absolute;
          inset: -20px;
          background-image: url(/mainMenuBg.png);
          background-size: cover;
          background-position: center top;
          filter: blur(14px) brightness(0.25) saturate(0.6);
          transform: scale(1.08);
          z-index: 0;
        }

        .mp-scrim {
          position: absolute;
          inset: 0;
          background: linear-gradient(160deg, rgba(8,5,2,0.8) 0%, rgba(5,3,1,0.95) 100%);
          z-index: 1;
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
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          opacity: 0.04;
          z-index: 3;
          pointer-events: none;
          mix-blend-mode: screen;
        }

        .mp-layout {
          position: relative;
          z-index: 10;
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          padding: 100px 0 20px 20px;
          overflow-y: auto;
        }
      `}</style>

      <div className="mp-root">
        <DifficultySplash />
        <div className="mp-bg" />
        <div className="mp-scrim" />
        <div className="mp-bloom" />
        <div className="mp-grain" />

        <div className="mp-layout flex-1">
          {multiplayerState === 'lobby' && renderLobby()}
          {multiplayerState === 'waiting' && renderWaiting()}
          {multiplayerState === 'finished' && renderFinished()}
          {multiplayerState === 'playing' && renderPlaying()}
        </div>

        <div className="h-full relative z-20 shrink-0">
          <SocialOverlay 
             activeRoomCode={isHost && multiplayerState === 'waiting' ? roomCode : null}
             onAcceptGameInvite={(code) => joinRoom(code)}
          />
        </div>
      </div>
    </>
  );
}
