import React, { useState, useEffect } from 'react';
import ColumnarInteractive from './ColumnarInteractive';
import RailFenceInteractive from './RailFenceInteractive';
import VigenereInteractive from './VigenereInteractive';
import SubstitutionInteractive from './SubstitutionInteractive';
import Button from './ui/Button';
import { validateAnswer } from '../engine/gameLogic';
import { bgmController } from '../engine/BGMController';
import { useGameStore } from '../store/useGameStore';
import { suspectEvidence } from '../data/StoryEvidence';
import { trackCipherAttempt } from '../services/leaderboardService';

export default function StoryCipherOverlay({ cipherData, onClose, onSolve }) {
  const [feedback, setFeedback] = useState(null); // 'correct' | 'wrong' | null
  const [isClosing, setIsClosing] = useState(false);

  // Parse custom clue display
  const clueLines = cipherData?.clue ? cipherData.clue.split('\n') : [];
  const loreText = clueLines[0] || '';
  const hintText = clueLines[1] || '';

  // Generic handler for all interactive components
  // Play bgm1 while deciphering, return to bgm2 when done
  useEffect(() => {
    bgmController.play('bgm1');
    return () => {
      bgmController.play('bgm2');
    };
  }, []);

  const handleInteractiveComplete = async (answer) => {
    if (isClosing) return;

    // Use our global validateAnswer or a simple string compare
    // We do a simple clean compare to ignore spaces/case
    const cleanStr = (str) => str.replace(/[^a-z0-9]/gi, '').toLowerCase();
    
    const isCorrect = cleanStr(answer) === cleanStr(cipherData.solution);

    const uid = useGameStore.getState().currentUser?.uid;

    if (isCorrect) {
      trackCipherAttempt(uid, cipherData.type, true);
      setFeedback('correct');
      setIsClosing(true);

      // Play success sound if available
      const audio = new Audio('/sounds/success.mp3');
      audio.play().catch(() => {});

      setTimeout(() => {
        onSolve();
      }, 1000);
    } else {
      trackCipherAttempt(uid, cipherData.type, false);
      setFeedback('wrong');
      setTimeout(() => setFeedback(null), 600);
    }
  };

  if (!cipherData) return null;

  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md transition-opacity duration-300 p-8">
      
      {/* Tablet UI Wrapper */}
      <div className="relative w-full h-full max-w-6xl max-h-full bg-[#050505] rounded-3xl sm:rounded-[2.5rem] p-6 border-2 border-gray-600 ring-8 ring-black shadow-[20px_20px_60px_rgba(0,0,0,0.9),inset_0_0_30px_rgba(0,0,0,1)] flex items-center justify-center">
        
        {/* Tablet Details: Camera Hole & Sensors (in the right bezel) */}
        <div className="absolute right-[12px] top-1/2 transform -translate-y-1/2 flex flex-col items-center gap-2 z-50">
          <div className="w-4 h-4 bg-black rounded-full border border-gray-800 shadow-[inset_0_0_6px_rgba(255,255,255,0.2)]"></div>
          <div className="w-1.5 h-1.5 bg-gray-800 rounded-full opacity-60"></div>
        </div>

        {/* Inner Screen */}
        <div className="w-full h-full bg-[#0d0d0d] rounded-xl overflow-hidden relative shadow-[inset_0_0_20px_rgba(0,0,0,1)] border border-gray-800/50 flex flex-col items-center p-8 custom-scrollbar overflow-y-auto">
          
          {/* Top Left Back Button */}
          <div className="absolute top-6 left-6 z-50 shrink-0">
            <Button onClick={onClose} variant="ghost" className="text-gray-400 hover:text-white p-3 border border-gray-700/50 bg-black/30 rounded-md backdrop-blur-sm min-h-[var(--touch-min)]" disabled={isClosing}>
              <span className="flex items-center gap-2 text-base uppercase tracking-widest font-mono">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
                Abort
              </span>
            </Button>
          </div>

          {/* Top Header */}
          <div className="mb-6 mt-8 flex flex-col items-center text-center shrink-0 w-full">
            <h1 className="text-2xl text-mystery-gold font-serif tracking-[0.2em] uppercase mb-4 drop-shadow-[0_0_8px_rgba(212,175,55,0.5)]">
              DECRYPT THE MESSAGE
            </h1>
            
            {(cipherData.type === 'columnar' || cipherData.type === 'railfence') && (
              <div className="bg-black/60 border border-mystery-gold/30 p-4 rounded-md mb-6 shadow-inner w-full max-w-2xl">
                 <span className="text-sm text-mystery-gold/60 uppercase tracking-widest block mb-2">Encrypted Data</span>
                 <span className="font-mono text-lg tracking-[0.2em] text-white break-all">{cipherData.ciphertext}</span>
              </div>
            )}

            {loreText && <p className="text-gray-300 italic font-serif text-base mb-4 max-w-2xl">{loreText}</p>}
            {hintText && <p className="text-blue-400/80 font-mono text-sm tracking-widest bg-blue-900/20 p-4 rounded border border-blue-900/50 mt-4">{hintText}</p>}
          </div>

          {/* Main Interactive Area */}
          <div className="w-full max-w-5xl flex-1 flex flex-col items-center justify-start relative min-h-0 shrink-0">
            
            {cipherData.type === 'columnar' && (
              <ColumnarInteractive
                mode="decrypt"
                text={cipherData.ciphertext}
                keyword={cipherData.keyword}
                onComplete={handleInteractiveComplete}
              />
            )}

            {cipherData.type === 'railfence' && (
              <RailFenceInteractive
                mode="decrypt"
                text={cipherData.ciphertext}
                rails={cipherData.rails}
                onComplete={handleInteractiveComplete}
              />
            )}

            {cipherData.type === 'vigenere' && (
              <VigenereInteractive
                mode="decrypt"
                text={cipherData.ciphertext}
                keyword={cipherData.keyword}
                onComplete={handleInteractiveComplete}
              />
            )}

            {cipherData.type === 'substitution' && (
              <SubstitutionInteractive
                mode="decrypt"
                text={cipherData.ciphertext}
                keyword={cipherData.keyword}
                onComplete={handleInteractiveComplete}
              />
            )}

            {/* Feedback Overlay */}
            <div className={`mt-8 text-2xl font-serif tracking-[0.4em] transition-opacity duration-300 ${
              feedback === 'correct' ? 'text-green-400 opacity-100 drop-shadow-[0_0_8px_rgba(74,222,128,0.8)]' : 
              feedback === 'wrong' ? 'text-red-500 opacity-100 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse' : 
              'opacity-0'
            }`}>
              {feedback === 'correct' ? 'ACCESS GRANTED' : 'ACCESS DENIED'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
