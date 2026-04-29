import { useState, useMemo, useEffect, useCallback } from "react";
import VirtualKeyboard from "./VirtualKeyboard";

/**
 * ColumnarInteractive – Interactive grid UI for the Columnar Transposition cipher.
 *
 * Props
 * ─────
 * @param {'encrypt' | 'decrypt'} mode       – whether the player is encrypting or decrypting.
 * @param {string}                text       – the plaintext (encrypt) or ciphertext (decrypt).
 * @param {string}                keyword    – the keyword that defines column order (e.g. "BOX").
 * @param {(answer: string) => void} onComplete – called with the final assembled string.
 */
export default function ColumnarInteractive({
  mode = "encrypt",
  text = "",
  keyword = "",
  onComplete,
}) {
  /* ── Derived dimensions ──────────────────────────────────────── */
  const cols = keyword.length;
  const rows = Math.ceil(text.length / cols);

  /* ── State ───────────────────────────────────────────────────── */
  const [grid, setGrid] = useState(() =>
    Array.from({ length: rows }, () => Array(cols).fill(""))
  );
  const [selectedCol, setSelectedCol] = useState(null);
  const [finalAnswer, setFinalAnswer] = useState("");
  const [clickedHeaders, setClickedHeaders] = useState([]);

  /* ── Keyword header letters ──────────────────────────────────── */
  const headers = useMemo(() => keyword.toUpperCase().split(""), [keyword]);

  /* ── Derived: is the grid completely filled? ─────────────────── */
  const isGridFull = useMemo(() => {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const linearIdx = r * cols + c;
        if (linearIdx >= text.length) continue; // skip padding cells
        if (!grid[r][c]) return false;
      }
    }
    return true;
  }, [grid, rows, cols, text.length]);

  /* ── Derived: total filled cell count (used by decrypt) ──────── */
  const filledCount = useMemo(() => {
    let count = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid[r][c]) count++;
      }
    }
    return count;
  }, [grid, rows, cols]);

  /* ── Derived: is the selected column full? (decrypt helper) ──── */
  const isSelectedColFull = useMemo(() => {
    if (selectedCol === null) return false;
    for (let r = 0; r < rows; r++) {
      const linearIdx = r * cols + selectedCol;
      if (linearIdx >= text.length) continue;
      if (!grid[r][selectedCol]) return false;
    }
    return true;
  }, [grid, selectedCol, rows, cols, text.length]);

  /* ── Keyboard Input ───────────────────────────────────────────── */
  const handleKeyPress = useCallback(
    (key) => {
      if (mode === "encrypt") {
        // Encrypt: fill left-to-right, row by row
        setGrid((prev) => {
          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              const linearIdx = r * cols + c;
              if (linearIdx >= text.length) continue;
              if (!prev[r][c]) {
                const next = prev.map((row) => [...row]);
                next[r][c] = key.toUpperCase();
                return next;
              }
            }
          }
          return prev;
        });
      } else if (mode === "decrypt") {
        // Decrypt: fill top-to-bottom in the selected column
        if (selectedCol === null) return;
        setGrid((prev) => {
          for (let r = 0; r < rows; r++) {
            const linearIdx = r * cols + selectedCol;
            if (linearIdx >= text.length) continue;
            if (!prev[r][selectedCol]) {
              const next = prev.map((row) => [...row]);
              next[r][selectedCol] = key.toUpperCase();
              return next;
            }
          }
          return prev; // column full – no change
        });
      }
    },
    [mode, rows, cols, text.length, selectedCol]
  );

  /* ── Delete: remove the last filled cell ─────────────────────── */
  const handleDelete = useCallback(() => {
    if (mode === "encrypt") {
      if (isGridFull && clickedHeaders.length > 0) {
        setClickedHeaders((prev) => {
          const next = prev.slice(0, -1);
          let newFinalAnswer = "";
          for (const colIdx of next) {
            for (let r = 0; r < rows; r++) {
              const linearIdx = r * cols + colIdx;
              if (linearIdx < text.length) newFinalAnswer += grid[r][colIdx];
            }
          }
          setFinalAnswer(newFinalAnswer);
          return next;
        });
        return;
      }

      // Encrypt: remove last filled cell (reverse left-to-right order)
      setGrid((prev) => {
        for (let r = rows - 1; r >= 0; r--) {
          for (let c = cols - 1; c >= 0; c--) {
            const linearIdx = r * cols + c;
            if (linearIdx >= text.length) continue;
            if (prev[r][c]) {
              const next = prev.map((row) => [...row]);
              next[r][c] = "";
              return next;
            }
          }
        }
        return prev;
      });
    } else if (mode === "decrypt") {
      // Decrypt: remove last filled cell in the selected column (bottom-up)
      if (selectedCol === null) return;
      setGrid((prev) => {
        for (let r = rows - 1; r >= 0; r--) {
          const linearIdx = r * cols + selectedCol;
          if (linearIdx >= text.length) continue;
          if (prev[r][selectedCol]) {
            const next = prev.map((row) => [...row]);
            next[r][selectedCol] = "";
            return next;
          }
        }
        return prev;
      });
    }
  }, [mode, rows, cols, text.length, selectedCol, isGridFull, clickedHeaders, grid]);

  /* ── Header Click ─────────────────────────────────────────────── */
  const handleHeaderClick = useCallback(
    (colIdx) => {
      setSelectedCol(colIdx);

      if (mode === "decrypt") {
        // Decrypt: just select the column for typing – no extraction
        return;
      }

      // Encrypt: extract column letters into finalAnswer
      if (!isGridFull) return;
      if (clickedHeaders.includes(colIdx)) return;

      let colLetters = "";
      for (let r = 0; r < rows; r++) {
        const linearIdx = r * cols + colIdx;
        if (linearIdx >= text.length) continue;
        colLetters += grid[r][colIdx];
      }

      setClickedHeaders((prev) => [...prev, colIdx]);
      setFinalAnswer((prev) => prev + colLetters);
    },
    [mode, isGridFull, clickedHeaders, rows, cols, text.length, grid]
  );

  /* ── Win Condition: Encrypt ───────────────────────────────────── */
  useEffect(() => {
    if (
      mode === "encrypt" &&
      clickedHeaders.length === cols &&
      cols > 0 &&
      finalAnswer.length > 0
    ) {
      onComplete?.(finalAnswer);
    }
  }, [clickedHeaders, cols, finalAnswer, mode, onComplete]);

  /* ── Win Condition: Decrypt – auto-read grid left-to-right ───── */
  useEffect(() => {
    if (mode !== "decrypt") return;
    if (filledCount !== text.length || text.length === 0) return;

    // Grid is full – read left-to-right, row-by-row
    let plaintext = "";
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const linearIdx = r * cols + c;
        if (linearIdx >= text.length) continue;
        plaintext += grid[r][c];
      }
    }

    const trimmed = plaintext.trimEnd();
    setFinalAnswer(trimmed);
    onComplete?.(trimmed);
  }, [mode, filledCount, text.length, grid, rows, cols, onComplete]);

  /* ── Render ─────────────────────────────────────────────────── */
  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-2xl mx-auto select-none">
      {/* ── Top: Final Answer Display ── */}
      <div className="w-full">
        <span className="block text-[10px] font-serif uppercase tracking-[0.3em] text-mystery-gold/60 mb-1 text-center">
          {mode === "encrypt" ? "Ciphertext Output" : "Plaintext Output"}
        </span>
        <div
          className={`
            w-full min-h-[3.5rem] flex items-center justify-center
            bg-black/50 border rounded-md backdrop-blur-md px-4 py-3
            font-mono text-xl sm:text-2xl tracking-[0.25em] uppercase text-center break-all
            transition-all duration-300
            ${
              finalAnswer.length > 0
                ? "border-mystery-gold text-white shadow-[0_0_20px_rgba(203,161,83,0.15)]"
                : "border-mystery-gold/30 text-mystery-gold/30"
            }
          `}
        >
          {finalAnswer || "—"}
        </div>
      </div>

      {/* ── Middle: The Matrix Grid ── */}
      <div className="w-full overflow-x-auto">
        <div
          className="mx-auto"
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gap: "4px",
            maxWidth: `${cols * 3.5}rem`,
          }}
        >
          {/* ── Header Row (keyword letters) ── */}
          {headers.map((letter, colIdx) => {
            const isClicked = clickedHeaders.includes(colIdx);
            const isSelected = selectedCol === colIdx;
            return (
              <button
                key={`header-${colIdx}`}
                type="button"
                onClick={() => handleHeaderClick(colIdx)}
                className={`
                  flex items-center justify-center
                  h-10 sm:h-12 rounded-t-md
                  font-serif font-bold text-base sm:text-lg tracking-widest uppercase
                  border-x border-t
                  transition-all duration-200 cursor-pointer

                  ${
                    isClicked
                      ? "bg-mystery-gold/20 border-mystery-gold/40 text-mystery-gold/50"
                      : isSelected
                        ? "bg-mystery-gold border-mystery-gold text-mystery-dark shadow-[0_0_16px_rgba(203,161,83,0.5)]"
                        : "bg-mystery-dark/80 border-mystery-gold/50 text-mystery-gold hover:bg-mystery-gold/10 hover:border-mystery-gold"
                  }
                `}
              >
                {letter}
              </button>
            );
          })}

          {/* ── Grid Cells ── */}
          {grid.map((row, rowIdx) =>
            row.map((cell, colIdx) => {
              const isInSelectedCol = selectedCol === colIdx;
              const linearIdx = rowIdx * cols + colIdx;
              const isOutOfBounds = linearIdx >= text.length;
              // In decrypt mode, highlight the active column more strongly
              const isDecryptActive = mode === "decrypt" && isInSelectedCol && !isOutOfBounds;

              return (
                <div
                  key={`cell-${rowIdx}-${colIdx}`}
                  onClick={() => mode === "decrypt" ? handleHeaderClick(colIdx) : setSelectedCol(colIdx)}
                  className={`
                    flex items-center justify-center
                    h-10 sm:h-12 rounded-sm
                    font-mono text-lg sm:text-xl uppercase
                    border transition-all duration-150 cursor-pointer

                    ${
                      isOutOfBounds
                        ? "bg-gray-900/30 border-gray-800/40 text-gray-700"
                        : isDecryptActive
                          ? cell
                            ? "bg-mystery-gold/25 border-mystery-gold text-white shadow-[inset_0_0_12px_rgba(203,161,83,0.15)]"
                            : "bg-mystery-gold/10 border-mystery-gold/80 text-mystery-gold/60 shadow-[inset_0_0_8px_rgba(203,161,83,0.08)] animate-pulse"
                          : isInSelectedCol
                            ? "bg-mystery-gold/10 border-mystery-gold/70 text-white shadow-[inset_0_0_8px_rgba(203,161,83,0.1)]"
                            : cell
                              ? "bg-mystery-dark/60 border-mystery-gold/40 text-gray-200"
                              : "bg-mystery-dark/40 border-mystery-gold/20 text-gray-500"
                    }
                  `}
                >
                  {cell || (isOutOfBounds ? "✕" : "·")}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Status indicator ── */}
      <div className="text-xs font-serif tracking-[0.2em] uppercase text-center h-5">
        {/* ── Encrypt status ── */}
        {mode === "encrypt" && !isGridFull ? (
          <span className="text-mystery-gold/60">
            Type the plaintext into the grid
          </span>
        ) : mode === "encrypt" && isGridFull && clickedHeaders.length < cols ? (
          <span className="text-mystery-gold">
            Click column headers to extract —{" "}
            <span className="font-mono font-bold text-white">
              {cols - clickedHeaders.length}
            </span>{" "}
            remaining
          </span>

        /* ── Decrypt status ── */
        ) : mode === "decrypt" && selectedCol === null ? (
          <span className="text-mystery-gold/40">
            Click a column header to begin filling
          </span>
        ) : mode === "decrypt" && selectedCol !== null && !isSelectedColFull ? (
          <span className="text-mystery-gold">
            Typing into column{" "}
            <span className="font-mono font-bold text-white">
              {headers[selectedCol]}
            </span>{" "}
            — fill top to bottom
          </span>
        ) : mode === "decrypt" && selectedCol !== null && isSelectedColFull ? (
          <span className="text-green-400">
            Column{" "}
            <span className="font-mono font-bold text-white">
              {headers[selectedCol]}
            </span>{" "}
            complete — select another
          </span>

        /* ── Fallback ── */
        ) : selectedCol !== null ? (
          <span className="text-mystery-gold">
            Column{" "}
            <span className="font-mono font-bold text-white">
              {headers[selectedCol]}
            </span>{" "}
            selected
          </span>
        ) : (
          <span className="text-mystery-gold/40">
            Select a column to begin
          </span>
        )}
      </div>

      {/* ── Bottom: Virtual Keyboard ── */}
      <VirtualKeyboard
        onKeyPress={handleKeyPress}
        onDelete={handleDelete}
        className="mt-2"
      />
    </div>
  );
}
