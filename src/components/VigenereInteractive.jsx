import React, { useState, useMemo, useEffect, useCallback } from "react";
import VirtualKeyboard from "./VirtualKeyboard";

// Math Helpers
export const charToNum = (char) => {
  if (!char || char === " ") return null;
  return char.toUpperCase().charCodeAt(0) - 65;
};

export const numToChar = (num) => {
  if (num === null || num === undefined || Number.isNaN(num)) return " ";
  return String.fromCharCode((((num % 26) + 26) % 26) + 65);
};

export default function VigenereInteractive({
  mode = "encrypt",
  text = "",
  keyword = "",
  onComplete,
}) {
  const [grid, setGrid] = useState(() => Array(text.length).fill(""));
  const [activeCol, setActiveCol] = useState(0);

  // Reset state when input changes
  useEffect(() => {
    setGrid(Array(text.length).fill(""));
    setActiveCol(0);
  }, [text, mode, keyword]);

  // Calculations: Repeat keyword matching text length
  const repeatedKey = useMemo(() => {
    if (!keyword || !text) return "";
    let result = "";
    let keyIdx = 0;
    const upperKey = keyword.toUpperCase();
    
    for (let i = 0; i < text.length; i++) {
      if (text[i] === " ") {
        result += " "; // skipping spaces
      } else {
        result += upperKey[keyIdx % upperKey.length];
        keyIdx++;
      }
    }
    return result;
  }, [text, keyword]);

  // Keyboard Handlers (keeping interaction working while math grid is built)
  const handleKeyPress = useCallback((key) => {
    setGrid((prev) => {
      const next = [...prev];
      next[activeCol] = key.toUpperCase();
      return next;
    });
    
    // Find next valid, empty index
    let nextCol = activeCol + 1;
    while (nextCol < text.length && (text[nextCol] === " " || grid[nextCol] !== "")) {
      nextCol++;
    }
    if (nextCol < text.length) setActiveCol(nextCol);
  }, [activeCol, text, grid]);

  const handleDelete = useCallback(() => {
    if (grid[activeCol] !== "") {
      setGrid((prev) => {
        const next = [...prev];
        next[activeCol] = "";
        return next;
      });
    } else {
      let prevCol = activeCol - 1;
      while (prevCol >= 0 && text[prevCol] === " ") prevCol--;
      if (prevCol >= 0) {
        setActiveCol(prevCol);
        setGrid((prev) => {
          const next = [...prev];
          next[prevCol] = "";
          return next;
        });
      }
    }
  }, [activeCol, text, grid]);

  // Win Condition
  useEffect(() => {
    if (!text || text.length === 0) return;
    let isFull = true;
    for (let i = 0; i < text.length; i++) {
      if (text[i] !== " " && !grid[i]) {
        isFull = false;
        break;
      }
    }
    if (isFull) {
      let finalAnswer = "";
      for (let i = 0; i < text.length; i++) {
        finalAnswer += text[i] === " " ? " " : grid[i];
      }
      onComplete?.(finalAnswer);
    }
  }, [grid, text, onComplete]);

  // Global Keyboard listener for smooth math typing
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Backspace") handleDelete();
      else if (/^[a-zA-Z]$/.test(e.key)) handleKeyPress(e.key);
      else if (e.key === "ArrowLeft") setActiveCol((prev) => Math.max(0, prev - 1));
      else if (e.key === "ArrowRight") setActiveCol((prev) => Math.min(text.length - 1, prev + 1));
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleKeyPress, handleDelete, text.length]);

  return (
    <div className="flex flex-col lg:flex-row items-center lg:items-start justify-center gap-4 lg:gap-8 w-full max-w-6xl mx-auto select-none">
      
      {/* ── Left Side: Visual Alphabet Chart (Desktop) ── */}
      <div className="hidden lg:grid grid-cols-2 gap-1 shrink-0 bg-black/30 p-3 rounded-lg border border-mystery-gold/20 shadow-lg h-fit max-h-[60vh] overflow-y-auto custom-scrollbar">
        <div className="col-span-2 text-center text-xs text-mystery-gold/60 mb-2 font-serif uppercase tracking-widest border-b border-mystery-gold/20 pb-1">Alphabet</div>
        {Array.from({ length: 26 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between border border-mystery-gold/30 bg-black/60 rounded px-2 py-1 min-w-[3.5rem] shadow-[0_0_5px_rgba(0,0,0,0.5)]">
            <span className="text-sm font-serif text-gray-200 mr-2">{String.fromCharCode(65 + i)}</span>
            <span className="text-xs font-mono text-mystery-gold/80">{i}</span>
          </div>
        ))}
      </div>

      {/* ── Right Side: Math Grid & Keyboard ── */}
      <div className="flex flex-col items-center gap-6 w-full max-w-4xl overflow-hidden">
        {/* ── Top Half: Math-Based Vigenère Grid ── */}
        <div className="w-full overflow-x-auto pb-4 mt-2 custom-scrollbar">
        <div className="flex flex-row items-center justify-start gap-2 md:gap-3 p-4 min-w-max mx-auto" style={{ width: "fit-content" }}>
          {text.split("").map((char, index) => {
            const isActive = activeCol === index;
            const isSpace = char === " ";
            
            const charNum = charToNum(char);
            const keyCharNum = charToNum(repeatedKey[index]);

            if (isSpace) {
              return (
                <div key={`space-${index}`} className="flex flex-col items-center justify-center w-6 md:w-8 h-full"></div>
              );
            }

            return (
              <div
                key={`col-${index}`}
                onClick={() => setActiveCol(index)}
                className={`
                  flex flex-col items-center justify-between p-3 rounded-lg cursor-pointer transition-all duration-300 min-w-[3.5rem]
                  ${isActive 
                    ? 'bg-mystery-gold/10 border border-mystery-gold shadow-[0_0_15px_rgba(203,161,83,0.3)] scale-105 z-10' 
                    : 'bg-black/30 border border-mystery-gold/20 hover:border-mystery-gold/50 hover:bg-mystery-gold/10'
                  }
                `}
              >
                {/* Top Cell (Target) */}
                <div className="flex flex-col items-center mb-1 w-full">
                  <span className="text-xl md:text-2xl font-serif text-gray-200">{char.toUpperCase()}</span>
                  <span className="text-xs text-gray-400 font-mono">({charNum})</span>
                </div>

                {/* Operator */}
                <div className="text-mystery-gold/60 text-sm font-bold font-mono my-1">
                   {mode === 'encrypt' ? '+' : '-'}
                </div>

                {/* Middle Cell (Key) */}
                <div className="flex flex-col items-center my-1 w-full">
                  <span className="text-lg md:text-xl font-mono text-mystery-gold font-bold">{repeatedKey[index]}</span>
                  <span className="text-xs text-mystery-gold/70 font-mono">({keyCharNum})</span>
                </div>

                {/* Divider */}
                <hr className="w-3/4 border-t border-mystery-gold/30 my-2" />

                {/* Bottom Cell (Input) */}
                <div className="flex flex-col items-center mt-1">
                  <span className="text-xs text-white/50 font-mono mb-1 h-4">
                     {grid[index] ? `= (${charToNum(grid[index])})` : '?'}
                  </span>
                  <div className={`
                    flex items-center justify-center w-10 h-10 md:w-12 md:h-12 border rounded-md font-mono text-lg md:text-xl uppercase transition-all duration-150
                    ${isActive 
                      ? 'bg-mystery-gold/20 border-mystery-gold text-white shadow-[inset_0_0_10px_rgba(203,161,83,0.3)]' 
                      : grid[index] 
                        ? 'bg-black/60 border-mystery-gold/40 text-gray-200' 
                        : 'bg-black/40 border-mystery-gold/20 text-transparent'
                    }
                  `}>
                    {grid[index]}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

        {/* ── Bottom Half: Virtual Keyboard ── */}
        <div className="flex flex-col items-center w-full mt-2">
          {/* Mobile-only alphabet chart */}
          <div className="lg:hidden flex flex-wrap justify-center gap-1 max-w-[18rem] mb-6">
            {Array.from({ length: 26 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center border border-mystery-gold/30 bg-black/40 rounded p-1 min-w-[2rem] shadow-[0_0_5px_rgba(0,0,0,0.5)]">
                <span className="text-xs font-serif text-gray-200">{String.fromCharCode(65 + i)}</span>
                <span className="text-[9px] font-mono text-mystery-gold/80">{i}</span>
              </div>
            ))}
          </div>

          <VirtualKeyboard
            onKeyPress={handleKeyPress}
            onDelete={handleDelete}
          />
        </div>
      </div>
    </div>
  );
}
