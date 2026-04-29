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

export default function MultiplayerMode() {
  const navigate = useNavigate();
  const { settings } = useGameStore();

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

  // When game starts
  useEffect(() => {
     if (multiplayerState === 'playing') {
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
      const newScore = score + 100;
      setScore(newScore);
      submitScore(newScore); // Broadcast score and check for 500 milestone
      
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
      const newScore = score + 100;
      setScore(newScore);
      submitScore(newScore);

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

  // --- LOBBY STATE ---
  if (multiplayerState === 'lobby') {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full relative z-10 p-6">
         <h1 className="text-4xl text-mystery-gold font-serif mb-8 uppercase tracking-widest drop-shadow-[0_0_8px_rgba(212,175,55,0.5)]">Multiplayer Duel</h1>
         
         <div className="flex flex-col md:flex-row gap-8 w-full max-w-2xl bg-black/40 border border-mystery-gold/30 p-8 rounded backdrop-blur-md shadow-2xl">
            {/* Create Room */}
            <div className="flex-1 flex flex-col items-center border-b md:border-b-0 md:border-r border-mystery-gold/20 pb-8 md:pb-0 md:pr-8">
               <span className="text-gray-300 font-serif mb-4 uppercase tracking-[0.2em]">Host Connection</span>
               <p className="text-sm text-gray-500 mb-6 text-center">Establish a secured line. You will dictate the global cipher difficulty.</p>
               <Button onClick={() => createRoom(settings.difficulty)} className="w-full">Create Room</Button>
            </div>

            {/* Join Room */}
            <div className="flex-1 flex flex-col items-center pt-8 md:pt-0 md:pl-8">
               <span className="text-gray-300 font-serif mb-4 uppercase tracking-[0.2em]">Intercept Line</span>
               <p className="text-sm text-gray-500 mb-6 text-center">Input a 4-letter frequency code to intercept a matching duel.</p>
               
               <div className="flex gap-2 w-full">
                 <input 
                    type="text" 
                    value={joinCodeInput} 
                    onChange={e => setJoinCodeInput(e.target.value.toUpperCase())}
                    maxLength={4}
                    placeholder="CODE"
                    className="flex-1 bg-mystery-dark border border-mystery-gold/50 text-white text-center text-xl tracking-widest p-2 outline-none focus:border-mystery-gold placeholder:text-gray-700 uppercase"
                 />
                 <Button onClick={() => joinCodeInput.length === 4 && joinRoom(joinCodeInput)} variant="primary" disabled={joinCodeInput.length !== 4}>Join</Button>
               </div>
            </div>
         </div>
         <Button onClick={() => navigate('/')} variant="ghost" className="mt-8">Return to Menu</Button>
      </div>
    );
  }

  // --- WAITING ROOM STATE ---
  if (multiplayerState === 'waiting') {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full relative z-10 p-6">
        <div className="bg-black/60 border border-mystery-gold p-10 rounded shadow-xl text-center max-w-md w-full backdrop-blur-md">
           <h2 className="text-xl text-mystery-gold font-serif mb-2 uppercase tracking-widest">Intercept Frequency</h2>
           <div className="text-6xl font-mono text-white tracking-[0.3em] mb-8 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)] bg-mystery-dark/50 py-4 border-y border-mystery-gold/30">
             {roomCode}
           </div>

           {playersCount < 2 ? (
             <div className="flex flex-col items-center animate-pulse">
               <span className="text-gray-400 font-mono text-sm tracking-widest uppercase">Awaiting Adversary...</span>
             </div>
           ) : (
             <div className="flex flex-col items-center">
               <span className="text-green-400 font-mono text-sm tracking-widest uppercase mb-6 flex items-center gap-2">
                 <span className="w-2 h-2 rounded-full bg-green-400"></span> Opponent Connected
               </span>
               {isHost ? (
                  <Button onClick={startGame} className="w-full">Start Duel</Button>
               ) : (
                  <span className="text-mystery-gold font-serif italic text-sm">Waiting for the host to commence...</span>
               )}
             </div>
           )}
        </div>
        <Button onClick={() => { resetLobby(); navigate('/'); }} variant="ghost" className="mt-6 text-xs">Disconnect Session</Button>
      </div>
    );
  }

  // --- FINISHED STATE ---
  if (multiplayerState === 'finished') {
    return (
       <div className="flex flex-col items-center justify-center h-full w-full relative z-10 p-6">
        <div className="bg-black/80 border-2 border-mystery-gold p-8 rounded shadow-2xl text-center max-w-md w-full backdrop-blur-md">
          <h1 className={`text-5xl font-serif mb-4 uppercase tracking-widest drop-shadow-[0_0_15px_currentColor]
             ${matchResult === 'win' ? 'text-green-400' : matchResult === 'lose' ? 'text-red-500' : 'text-mystery-gold'}
          `}>
            {matchResult === 'win' ? 'Victory' : matchResult === 'lose' ? 'Defeated' : 'Stalemate'}
          </h1>

          <div className="flex justify-between items-center my-8 bg-mystery-dark/50 p-4 border border-mystery-gold/30 rounded">
             <div className="flex flex-col items-center">
                <span className="text-xs text-mystery-gold/70 font-mono tracking-widest">YOUR SCORE</span>
                <span className="text-2xl text-white font-mono">{score}</span>
             </div>
             <span className="text-mystery-gold font-serif">VS</span>
             <div className="flex flex-col items-center">
                <span className="text-xs text-mystery-gold/70 font-mono tracking-widest">OPPONENT</span>
                <span className="text-2xl text-white font-mono">{opponentScore}</span>
             </div>
          </div>
          
          <Button onClick={() => { resetLobby(); }} className="w-full">Return to Lobby</Button>
        </div>
      </div>
    );
  }

  // --- PLAYING STATE ---
  return (
    <div className="flex flex-col h-full w-full p-6 max-w-5xl mx-auto relative z-10 transition-all">
      {/* Top bar with Dual Scores */}
      <div className="flex justify-between items-center mb-8 w-full bg-black/50 p-4 border border-mystery-gold/40 rounded backdrop-blur-md shadow-lg">
        <div className="w-1/3 flex flex-col">
          <span className="text-xs font-serif tracking-widest text-green-400/80 uppercase">You</span>
          <span className="text-3xl font-mono text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">{score}</span>
        </div>
        
        <div className={`w-1/3 text-center text-3xl font-mono flex flex-col items-center transition-colors ${timeLeft <= 10 ? 'text-red-500 animate-pulse drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 'text-mystery-gold'}`}>
          <span className="text-[10px] font-serif tracking-[0.2em] text-mystery-gold/60 uppercase">Contingency Sync</span>
          {timeLeft}
        </div>

        <div className="w-1/3 flex flex-col items-end">
          <span className="text-xs font-serif tracking-widest text-red-500/80 uppercase">Opponent</span>
          <span className="text-3xl font-mono text-white opacity-80">{opponentScore}</span>
        </div>
      </div>

      {/* Target Milestone */}
      <div className="w-full text-center mb-4 text-xs font-mono tracking-[0.3em] text-mystery-gold/40">
         RACE TO 500 POINTS
      </div>

      {/* Center Box */}
      <div className="flex-1 flex flex-col items-center justify-center">
        {!encryptedWord ? (
          <LoadingSpinner text="Synchronizing Cryptographs..." />
        ) : (
          <div className="bg-gray-900/60 border border-mystery-gold p-12 py-16 rounded shadow-[0_0_40px_rgba(0,0,0,0.8)] relative max-w-3xl w-full text-center backdrop-blur-md mt-4">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center bg-mystery-dark px-8 py-2 border border-mystery-gold rounded shadow-md pb-3 w-64">
               <span className="text-mystery-gold text-sm tracking-[0.2em] font-serif uppercase border-b border-mystery-gold/30 pb-1 mb-1 w-full text-center">Cipher: {cipherName}</span>
               <span className="text-blue-300 font-mono text-xs tracking-widest uppercase">Intel: {cipherKey}</span>
            </div>
            
            <p className="font-mono text-3xl sm:text-4xl md:text-5xl text-white tracking-[0.3em] font-light break-all selection:bg-mystery-gold/30">
              {isEncryptionMode ? currentWord : encryptedWord}
            </p>
          </div>
        )}
      </div>

      {/* Bottom Input Area */}
      <div className="mt-8 flex flex-col items-center w-full gap-4">
        {isColumnar && (isEncryptionMode ? currentWord : encryptedWord) ? (
          /* ── Columnar Transposition: Interactive Grid ── */
          <>
            <ColumnarInteractive
              key={isEncryptionMode ? currentWord : encryptedWord}
              mode={isEncryptionMode ? "encrypt" : "decrypt"}
              text={isEncryptionMode ? currentWord : encryptedWord}
              keyword={columnarKeyword}
              onComplete={handleInteractiveComplete}
            />
            <div className={`text-sm font-serif tracking-[0.4em] transition-opacity duration-300 ${feedback === 'correct' ? 'text-green-400 opacity-100' : feedback === 'wrong' ? 'text-red-500 opacity-100' : 'opacity-0'}`}>
              {feedback === 'correct' ? '+100 POINTS' : 'PENALTY'}
            </div>
          </>
        ) : isRailFence && (isEncryptionMode ? currentWord : encryptedWord) ? (
          /* ── Rail Fence: Interactive Grid ── */
          <>
            <RailFenceInteractive
              key={isEncryptionMode ? currentWord : encryptedWord}
              mode={isEncryptionMode ? "encrypt" : "decrypt"}
              text={isEncryptionMode ? currentWord : encryptedWord}
              rails={railFenceRails}
              onComplete={handleInteractiveComplete}
            />
            <div className={`text-sm font-serif tracking-[0.4em] transition-opacity duration-300 ${feedback === 'correct' ? 'text-green-400 opacity-100' : feedback === 'wrong' ? 'text-red-500 opacity-100' : 'opacity-0'}`}>
              {feedback === 'correct' ? '+100 POINTS' : 'PENALTY'}
            </div>
          </>
        ) : isVigenere && (isEncryptionMode ? currentWord : encryptedWord) ? (
          /* ── Vigenere: Interactive Grid ── */
          <>
            <VigenereInteractive
              key={isEncryptionMode ? currentWord : encryptedWord}
              mode={isEncryptionMode ? "encrypt" : "decrypt"}
              text={isEncryptionMode ? currentWord : encryptedWord}
              keyword={vigenereKeyword}
              onComplete={handleInteractiveComplete}
            />
            <div className={`text-sm font-serif tracking-[0.4em] transition-opacity duration-300 ${feedback === 'correct' ? 'text-green-400 opacity-100' : feedback === 'wrong' ? 'text-red-500 opacity-100' : 'opacity-0'}`}>
              {feedback === 'correct' ? '+100 POINTS' : 'PENALTY'}
            </div>
          </>
        ) : isSubstitution && (isEncryptionMode ? currentWord : encryptedWord) ? (
          /* ── Substitution: Interactive Grid ── */
          <>
            <SubstitutionInteractive
              key={isEncryptionMode ? currentWord : encryptedWord}
              mode={isEncryptionMode ? "encrypt" : "decrypt"}
              text={isEncryptionMode ? currentWord : encryptedWord}
              keyword={substitutionKeyword}
              onComplete={handleInteractiveComplete}
            />
            <div className={`text-sm font-serif tracking-[0.4em] transition-opacity duration-300 ${feedback === 'correct' ? 'text-green-400 opacity-100' : feedback === 'wrong' ? 'text-red-500 opacity-100' : 'opacity-0'}`}>
              {feedback === 'correct' ? '+100 POINTS' : 'PENALTY'}
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
              disabled={!encryptedWord || multiplayerState !== 'playing'}
              placeholder="DECIPHER THE TRANSMISSION..."
              className={`w-full max-w-xl bg-transparent border-b-2 outline-none text-2xl md:text-3xl font-mono text-center transition-all pb-2 uppercase tracking-widest
                ${feedback === 'correct' ? 'border-green-400 text-green-300 drop-shadow-[0_0_8px_rgba(74,222,128,0.8)]' : 
                  feedback === 'wrong' ? 'border-red-500 text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse' : 
                  'border-mystery-gold/50 text-white focus:border-mystery-gold hover:border-mystery-gold/80 placeholder:text-mystery-gold/20'}`}
              autoComplete="off"
              spellCheck="false"
            />
            
            <div className={`text-sm font-serif tracking-[0.4em] transition-opacity duration-300 ${feedback === 'correct' ? 'text-green-400 opacity-100' : feedback === 'wrong' ? 'text-red-500 opacity-100' : 'opacity-0'}`}>
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
}
