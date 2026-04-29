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
  const [isLegendUnlocked, setIsLegendUnlocked] = useState(false);
  const [finalAnswer, setFinalAnswer] = useState("");
  const [legendError, setLegendError] = useState(false);

  // Reset state if inputs change
  useEffect(() => {
    setLegendGrid(Array(26).fill(""));
    setActiveLegendIndex(0);
    setIsLegendUnlocked(false);
    setFinalAnswer("");
    setLegendError(false);
  }, [text, mode, keyword]);

  // 3. Derived State
  const usedLetters = useMemo(() => {
    const used = new Set();
    // Only disable letters if we are still building the legend
    if (isLegendUnlocked) return used;
    
    for (const letter of legendGrid) {
      if (letter) used.add(letter);
    }
    return used;
  }, [legendGrid, isLegendUnlocked]);

  // 4. Keyboard Input Logic
  const handleKeyPress = useCallback((key) => {
    if (legendError) return; // Block typing during error animation

    if (!isLegendUnlocked) {
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
    } else {
      // Phase B: Typing final answer
      const maxLen = text.replace(/\s/g, "").length;
      if (finalAnswer.length < maxLen) {
        setFinalAnswer((prev) => prev + key.toUpperCase());
      }
    }
  }, [activeLegendIndex, legendGrid, isLegendUnlocked, legendError, finalAnswer, text]);

  const handleDelete = useCallback(() => {
    if (legendError) return;

    if (!isLegendUnlocked) {
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
    } else {
      // Phase B: Deleting final answer
      setFinalAnswer((prev) => prev.slice(0, -1));
    }
  }, [activeLegendIndex, legendGrid, isLegendUnlocked, legendError]);

  // 5. Legend Validation
  useEffect(() => {
    if (isLegendUnlocked || legendError) return;
    
    if (legendGrid.every((cell) => cell !== "")) {
      const isMatch = legendGrid.join("") === targetLegend.join("");
      if (isMatch) {
        setIsLegendUnlocked(true);
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
  }, [legendGrid, targetLegend, isLegendUnlocked, legendError]);

  // 6. Win Condition
  useEffect(() => {
    if (!isLegendUnlocked) return;
    const textNoSpaces = text.replace(/\s/g, "");
    if (finalAnswer.length > 0 && finalAnswer.length === textNoSpaces.length) {
      // Map answer back with original spaces
      let mappedAnswer = "";
      let ansIdx = 0;
      for (let i = 0; i < text.length; i++) {
        if (text[i] === " ") {
          mappedAnswer += " ";
        } else {
          mappedAnswer += finalAnswer[ansIdx] || "";
          ansIdx++;
        }
      }
      onComplete?.(mappedAnswer);
    }
  }, [finalAnswer, text, isLegendUnlocked, onComplete]);

  // Phase 2: Legend UI Layout
  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-5xl mx-auto select-none">
      
      {/* ── Top Section: Target Text ── */}
      <div className="w-full text-center">
        {!isLegendUnlocked && (
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
        
        {/* Phase B: Final Answer Display */}
        {isLegendUnlocked && (
          <div className="mt-6 text-xl md:text-2xl font-mono tracking-[0.2em] uppercase text-mystery-gold break-words max-w-3xl mx-auto px-4 leading-relaxed min-h-[3rem]">
            {finalAnswer || <span className="opacity-50 animate-pulse">_</span>}
          </div>
        )}
      </div>

      {/* ── Middle: The Legend Grid ── */}
      <div className="w-full max-w-5xl overflow-x-auto pb-4 custom-scrollbar">
        <div className="flex flex-row items-center justify-start gap-1 sm:gap-2 p-2 min-w-max mx-auto" style={{ width: "fit-content" }}>
          {STANDARD_ALPHABET.map((char, index) => {
            const isActive = activeLegendIndex === index;
            return (
              <div 
                key={`legend-${index}`} 
                onClick={() => setActiveLegendIndex(index)}
                className={`
                  flex flex-col items-center justify-between p-2 sm:p-3 rounded-lg cursor-pointer transition-all duration-300 min-w-[3rem]
                  ${isActive
                    ? 'bg-mystery-gold/10 border border-mystery-gold shadow-[0_0_15px_rgba(203,161,83,0.3)] scale-105 z-10'
                    : 'bg-black/30 border border-mystery-gold/20 hover:border-mystery-gold/50 hover:bg-mystery-gold/10'
                  }
                `}
              >
                {/* Top Cell (Standard Letter) */}
                <div className="text-lg md:text-xl font-serif text-gray-400 mb-2 font-bold">
                  {char}
                </div>
                
                {/* Bottom Cell (Input) */}
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

      {/* ── Bottom: Virtual Keyboard ── */}
      <VirtualKeyboard
        disabledKeys={usedLetters}
        onKeyPress={handleKeyPress}
        onDelete={handleDelete}
        className="mt-2"
      />
    </div>
  );
}
