import React, { useState, useMemo, useEffect, useCallback } from "react";
import VirtualKeyboard from "./VirtualKeyboard";

const STANDARD_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export default function SubstitutionInteractive({
  mode = "encrypt",
  text = "",
  keyword = "",
  onComplete,
}) {
  // 1. Calculate Target Legend
  const targetLegend = useMemo(() => {
    const keyChars = (keyword || "").toUpperCase().split("");
    const uniqueKeyChars = [];
    for (const char of keyChars) {
      if (/^[A-Z]$/.test(char) && !uniqueKeyChars.includes(char)) {
        uniqueKeyChars.push(char);
      }
    }

    const remaining = STANDARD_ALPHABET.filter(
      (char) => !uniqueKeyChars.includes(char)
    );
    return [...uniqueKeyChars, ...remaining];
  }, [keyword]);

  // 2. State Setup
  const [legendGrid, setLegendGrid] = useState(() => Array(26).fill(""));
  const [activeLegendIndex, setActiveLegendIndex] = useState(0);
  const [legendComplete, setLegendComplete] = useState(false);
  const [finalAnswer, setFinalAnswer] = useState("");
  const [legendError, setLegendError] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState(null);

  // Reset state if inputs change
  useEffect(() => {
    setLegendGrid(Array(26).fill(""));
    setActiveLegendIndex(0);
    setLegendComplete(false);
    setFinalAnswer("");
    setLegendError(false);
    setHoveredIndex(null);
  }, [text, mode, keyword]);

  // 3. Derived State
  const usedLetters = useMemo(() => {
    const used = new Set();
    // Only disable letters if we are still building the legend
    if (legendComplete) return used;
    
    for (const letter of legendGrid) {
      if (letter) used.add(letter);
    }
    return used;
  }, [legendGrid, legendComplete]);

  // 4. Keyboard Input Logic for Legend Building
  const handleKeyPress = useCallback((key) => {
    if (legendError || legendComplete) return;

    setLegendGrid((prev) => {
      const next = [...prev];
      next[activeLegendIndex] = key.toUpperCase();
      return next;
    });
    // Auto-advance to next empty box
    let nextIdx = activeLegendIndex + 1;
    while (nextIdx < 26 && legendGrid[nextIdx] !== "") {
      nextIdx++;
    }
    if (nextIdx < 26) setActiveLegendIndex(nextIdx);
  }, [activeLegendIndex, legendGrid, legendComplete, legendError]);

  const handleDelete = useCallback(() => {
    if (legendError || legendComplete) return;

    if (legendGrid[activeLegendIndex] !== "") {
      setLegendGrid((prev) => {
        const next = [...prev];
        next[activeLegendIndex] = "";
        return next;
      });
    } else {
      const prevIdx = activeLegendIndex > 0 ? activeLegendIndex - 1 : 0;
      setActiveLegendIndex(prevIdx);
      setLegendGrid((prev) => {
        const next = [...prev];
        next[prevIdx] = "";
        return next;
      });
    }
  }, [activeLegendIndex, legendGrid, legendComplete, legendError]);

  // 5. Legend Validation
  useEffect(() => {
    if (legendComplete || legendError) return;
    
    if (legendGrid.every((cell) => cell !== "")) {
      const isMatch = legendGrid.join("") === targetLegend.join("");
      if (isMatch) {
        setLegendComplete(true);
      } else {
        setLegendError(true);
        setTimeout(() => {
          setLegendGrid((prev) => {
            const next = [...prev];
            for (let i = 0; i < 26; i++) {
              if (next[i] !== targetLegend[i]) {
                next[i] = "";
              }
            }
            return next;
          });
          
          setActiveLegendIndex((prev) => {
             // Find first empty
             for (let i = 0; i < 26; i++) {
               if (legendGrid[i] !== targetLegend[i]) return i;
             }
             return 0;
          });
          setLegendError(false);
        }, 800);
      }
    }
  }, [legendGrid, targetLegend, legendComplete, legendError]);

  // 6. Handle Final Answer Submit
  const handleFinalAnswerChange = (e) => {
    const raw = e.target.value;
    const sanitized = raw.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    const maxLen = text.replace(/[^a-zA-Z0-9]/g, "").length;
    if (sanitized.length <= maxLen) {
      setFinalAnswer(sanitized);
    }
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (finalAnswer.length > 0) {
      onComplete?.(finalAnswer);
    }
  };

  // 7. Render
  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-5xl mx-auto select-none">
      
      {/* ── Top Section: Target Text ── */}
      <div className="w-full text-center">
        {!legendComplete && (
          <div className="flex flex-col items-center justify-center text-victorian-red/80 font-serif mb-4 animate-pulse">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            <span className="text-sm tracking-wider uppercase">Build the substitution legend to unlock</span>
          </div>
        )}
        <div className="text-2xl md:text-3xl font-mono tracking-[0.2em] uppercase text-gray-200 break-words max-w-3xl mx-auto px-4 leading-relaxed">
          {text}
        </div>
      </div>

      {/* ── Stage 1: Building the Legend ── */}
      {!legendComplete && (
        <>
          <div className="w-full max-w-5xl overflow-x-auto pb-4 custom-scrollbar">
            <div className="flex flex-row items-center justify-start gap-1 sm:gap-2 p-2 min-w-max mx-auto" style={{ width: "fit-content" }}>
              {STANDARD_ALPHABET.map((char, index) => {
                const isActive = activeLegendIndex === index;
                return (
                  <div 
                    key={`legend-build-${index}`} 
                    onClick={() => setActiveLegendIndex(index)}
                    className={`
                      flex flex-col items-center justify-between p-2 sm:p-3 rounded-lg cursor-pointer transition-all duration-300 min-w-[3rem]
                      ${isActive
                        ? 'bg-mystery-gold/10 border border-mystery-gold shadow-[0_0_15px_rgba(203,161,83,0.3)] scale-105 z-10'
                        : 'bg-black/30 border border-mystery-gold/20 hover:border-mystery-gold/50 hover:bg-mystery-gold/10'
                      }
                    `}
                  >
                    {/* Top Cell */}
                    <div className="text-lg md:text-xl font-serif text-gray-400 mb-2 font-bold">
                      {char}
                    </div>
                    
                    {/* Bottom Cell */}
                    <div className={`
                      flex items-center justify-center w-8 h-8 md:w-10 md:h-10 border rounded-md font-mono text-lg uppercase transition-all duration-150
                      ${legendError && legendGrid[index] !== targetLegend[index]
                        ? 'bg-victorian-red/30 border-victorian-red text-victorian-red animate-pulse shadow-[0_0_10px_rgba(88,24,31,0.5)]'
                        : isActive 
                        ? 'bg-mystery-gold/20 border-mystery-gold text-white shadow-[inset_0_0_10px_rgba(203,161,83,0.3)]' 
                        : legendGrid[index] 
                          ? 'bg-black/60 border-mystery-gold/40 text-mystery-gold shadow-[0_0_8px_rgba(203,161,83,0.1)]' 
                          : 'bg-black/40 border-mystery-gold/20 text-transparent'
                      }
                    `}>
                      {legendGrid[index]}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <VirtualKeyboard
            disabledKeys={usedLetters}
            onKeyPress={handleKeyPress}
            onDelete={handleDelete}
            className="mt-2"
          />
        </>
      )}

      {/* ── Stage 2: Dual Alphabet Legend & Input ── */}
      {legendComplete && (
        <div className="w-full flex flex-col items-center animate-[fadeIn_0.5s_ease-out]">
          
          <div className="w-full max-w-5xl overflow-x-auto pb-6 custom-scrollbar">
            <div className="flex flex-row items-center justify-start gap-1 sm:gap-2 p-2 min-w-max mx-auto" style={{ width: "fit-content" }}>
              
              {/* Row Labels */}
              <div className="flex flex-col justify-between py-1 mr-2 sm:mr-4 text-right h-full">
                <div className="text-xs sm:text-sm font-serif text-mystery-gold/70 mt-1 uppercase tracking-widest">Ciphertext</div>
                <div className="text-xs sm:text-sm font-serif text-mystery-gold/70 mb-2 uppercase tracking-widest mt-auto">Plaintext</div>
              </div>

              {STANDARD_ALPHABET.map((char, index) => {
                const isHovered = hoveredIndex === index;
                return (
                  <div 
                    key={`legend-display-${index}`}
                    onMouseEnter={() => setHoveredIndex(index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    onClick={() => setHoveredIndex(isHovered ? null : index)}
                    className={`
                      flex flex-col items-center justify-between p-2 rounded-md transition-all duration-200 cursor-pointer min-w-[2.5rem]
                      ${isHovered ? 'bg-mystery-gold/20 scale-110 shadow-[0_0_12px_rgba(203,161,83,0.4)] z-10' : 'bg-black/40'}
                      border ${isHovered ? 'border-mystery-gold' : 'border-mystery-gold/20'}
                    `}
                  >
                    {/* Ciphertext (Standard A-Z) */}
                    <div className={`text-lg font-serif mb-3 font-bold transition-colors ${isHovered ? 'text-white' : 'text-gray-400'}`}>
                      {char}
                    </div>
                    
                    {/* Plaintext (Target Legend) */}
                    <div className={`
                      flex items-center justify-center w-8 h-8 border rounded-sm font-mono text-lg uppercase transition-all
                      ${isHovered 
                        ? 'bg-mystery-gold text-mystery-dark border-mystery-gold shadow-[0_0_10px_rgba(203,161,83,0.6)]' 
                        : 'bg-black/60 border-mystery-gold/40 text-mystery-gold'
                      }
                    `}>
                      {targetLegend[index]}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Answer Input */}
          <form onSubmit={handleSubmit} className="w-full max-w-md flex flex-col items-center gap-4 mt-4">
            <input
              type="text"
              value={finalAnswer}
              onChange={handleFinalAnswerChange}
              placeholder="ENTER DECODED ANSWER..."
              className="w-full bg-black/60 border border-mystery-gold/50 focus:border-mystery-gold rounded px-4 py-3 outline-none text-2xl font-mono text-center text-white tracking-[0.2em] placeholder:text-mystery-gold/30 placeholder:tracking-widest shadow-[inset_0_0_15px_rgba(0,0,0,0.8)] transition-all focus:shadow-[0_0_15px_rgba(203,161,83,0.2)] uppercase"
              autoComplete="off"
              spellCheck="false"
              autoFocus
            />
            <button
              type="submit"
              disabled={finalAnswer.length === 0}
              className="w-full px-6 py-3 bg-mystery-dark border border-mystery-gold/50 hover:bg-mystery-gold/10 hover:border-mystery-gold text-mystery-gold font-serif tracking-[0.2em] uppercase rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-mystery-dark disabled:hover:border-mystery-gold/50"
            >
              Submit Decryption
            </button>
          </form>

        </div>
      )}

    </div>
  );
}
