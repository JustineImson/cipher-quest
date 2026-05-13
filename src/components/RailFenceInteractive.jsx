import React, { useState, useMemo, useEffect, useCallback } from "react";
import VirtualKeyboard from "./VirtualKeyboard";

/**
 * RailFenceInteractive – Interactive grid UI for the Rail Fence cipher.
 *
 * Props:
 * @param {'encrypt' | 'decrypt'} mode
 * @param {string} text - The plaintext (encrypt) or ciphertext (decrypt)
 * @param {number} rails - The integer key (e.g., 3)
 * @param {(answer: string) => void} onComplete
 */
export default function RailFenceInteractive({
  mode = "encrypt",
  text = "",
  rails = 3,
  onComplete,
}) {
  const [grid, setGrid] = useState(() =>
    Array.from({ length: rails }, () => Array(text.length).fill(""))
  );
  const [selectedRow, setSelectedRow] = useState(null);
  const [finalAnswer, setFinalAnswer] = useState("");
  const [clickedRows, setClickedRows] = useState([]);

  // Reset state if inputs change
  useEffect(() => {
    setGrid(Array.from({ length: rails }, () => Array(text.length).fill("")));
    setSelectedRow(null);
    setFinalAnswer("");
    setClickedRows([]);
  }, [text, rails, mode]);

  // Calculate active zigzag cells
  const activeCells = useMemo(() => {
    if (rails <= 1) return []; // Should be > 1 to zigzag properly
    const cells = [];
    let r = 0;
    let direction = 1; // 1 for down, -1 for up
    for (let c = 0; c < text.length; c++) {
      cells.push({ r, c });
      r += direction;
      // Change direction at the boundaries
      if (r === rails - 1 || r === 0) {
        direction = -direction;
      }
    }
    return cells;
  }, [rails, text.length]);

  const activeCellsSet = useMemo(() => {
    const set = new Set();
    activeCells.forEach((cell) => set.add(`${cell.r}-${cell.c}`));
    return set;
  }, [activeCells]);

  const isGridFull = useMemo(() => {
    if (activeCells.length === 0) return false;
    return activeCells.every(({ r, c }) => grid[r][c] !== "");
  }, [activeCells, grid]);

  // Keyboard Input
  const handleKeyPress = useCallback(
    (key) => {
      if (mode === "encrypt") {
        setGrid((prev) => {
          for (let i = 0; i < activeCells.length; i++) {
            const { r, c } = activeCells[i];
            if (!prev[r][c]) {
              const next = prev.map((row) => [...row]);
              next[r][c] = key.toUpperCase();
              return next;
            }
          }
          return prev;
        });
      } else if (mode === "decrypt") {
        if (selectedRow === null) return;
        setGrid((prev) => {
          const rowActiveCells = activeCells
            .filter((cell) => cell.r === selectedRow)
            .sort((a, b) => a.c - b.c);

          for (let i = 0; i < rowActiveCells.length; i++) {
            const { r, c } = rowActiveCells[i];
            if (!prev[r][c]) {
              const next = prev.map((row) => [...row]);
              next[r][c] = key.toUpperCase();
              return next;
            }
          }
          return prev;
        });
      }
    },
    [mode, activeCells, selectedRow]
  );

  const handleDelete = useCallback(() => {
    if (mode === "encrypt") {
      if (isGridFull && clickedRows.length > 0) {
        setClickedRows((prev) => {
          const next = prev.slice(0, -1);
          let newFinalAnswer = "";
          for (const r of next) {
            const rowActiveCells = activeCells
              .filter((cell) => cell.r === r)
              .sort((a, b) => a.c - b.c);
            for (let i = 0; i < rowActiveCells.length; i++) {
              newFinalAnswer += grid[r][rowActiveCells[i].c];
            }
          }
          setFinalAnswer(newFinalAnswer);
          return next;
        });
        return;
      }

      setGrid((prev) => {
        for (let i = activeCells.length - 1; i >= 0; i--) {
          const { r, c } = activeCells[i];
          if (prev[r][c]) {
            const next = prev.map((row) => [...row]);
            next[r][c] = "";
            return next;
          }
        }
        return prev;
      });
    } else if (mode === "decrypt") {
      if (selectedRow === null) return;
      setGrid((prev) => {
        const rowActiveCells = activeCells
          .filter((cell) => cell.r === selectedRow)
          .sort((a, b) => a.c - b.c);

        for (let i = rowActiveCells.length - 1; i >= 0; i--) {
          const { r, c } = rowActiveCells[i];
          if (prev[r][c]) {
            const next = prev.map((row) => [...row]);
            next[r][c] = "";
            return next;
          }
        }
        return prev;
      });
    }
  }, [mode, activeCells, selectedRow, isGridFull, clickedRows, grid]);

  const handleRowClick = useCallback(
    (r) => {
      setSelectedRow(r);

      if (mode === "decrypt") return;

      // Encrypt mode: Extract row letters into finalAnswer
      if (isGridFull) {
        if (clickedRows.includes(r)) return;

        let rowString = "";
        const rowActiveCells = activeCells
          .filter((cell) => cell.r === r)
          .sort((a, b) => a.c - b.c);

        for (let i = 0; i < rowActiveCells.length; i++) {
          rowString += grid[r][rowActiveCells[i].c];
        }

        setClickedRows((prev) => [...prev, r]);
        setFinalAnswer((prev) => prev + rowString);
      }
    },
    [mode, isGridFull, clickedRows, activeCells, grid]
  );

  // Win Condition: Encrypt
  useEffect(() => {
    if (
      mode === "encrypt" &&
      clickedRows.length === rails &&
      finalAnswer.length > 0 &&
      rails > 0
    ) {
      onComplete?.(finalAnswer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, clickedRows.length, rails, finalAnswer]);

  // Win Condition: Decrypt
  useEffect(() => {
    if (mode === "decrypt" && isGridFull && text.length > 0) {
      let plaintext = "";
      for (let i = 0; i < activeCells.length; i++) {
        const { r, c } = activeCells[i];
        plaintext += grid[r][c];
      }
      setFinalAnswer(plaintext);
      onComplete?.(plaintext);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, isGridFull, activeCells, grid, text.length]);

  // Cell rendering style helpers
  const getCellClasses = (r, c) => {
    const isActive = activeCellsSet.has(`${r}-${c}`);
    const isFilled = grid[r][c] !== "";
    const isInSelectedRow = selectedRow === r;
    const isDecryptActive = mode === "decrypt" && isInSelectedRow && isActive;

    if (!isActive) {
      return "bg-transparent border-transparent text-transparent pointer-events-none";
    }

    let classes =
      "flex items-center justify-center border rounded-sm font-mono text-lg sm:text-xl uppercase transition-all duration-150 h-10 sm:h-12 ";

    if (isDecryptActive) {
      if (isFilled) {
        classes +=
          "bg-mystery-gold/25 border-mystery-gold text-white shadow-[inset_0_0_12px_rgba(203,161,83,0.15)]";
      } else {
        classes +=
          "bg-mystery-gold/10 border-mystery-gold/80 text-mystery-gold/60 shadow-[inset_0_0_8px_rgba(203,161,83,0.08)] animate-pulse";
      }
    } else if (isInSelectedRow) {
      classes +=
        "bg-mystery-gold/10 border-mystery-gold/70 text-white shadow-[inset_0_0_8px_rgba(203,161,83,0.1)]";
    } else if (isFilled) {
      if (mode === "encrypt" && clickedRows.includes(r)) {
        classes += "bg-mystery-dark/40 border-mystery-gold/20 text-mystery-gold/30"; // dimmed after extraction
      } else {
        classes += "bg-mystery-dark/60 border-mystery-gold/40 text-gray-200";
      }
    } else {
      classes += "bg-mystery-dark/40 border-mystery-gold/20 text-gray-500";
    }

    return classes;
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-4xl mx-auto select-none">
      {/* ── Top: Final Answer Display ── */}
      <div className="w-full max-w-2xl">
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

      {/* ── Middle: The Fence Grid ── */}
      <div className="w-full overflow-x-auto pb-4 custom-scrollbar">
        <div
          className="mx-auto"
          style={{
            display: "grid",
            gridTemplateColumns: `auto repeat(${text.length}, minmax(2rem, 1fr))`,
            gap: "4px",
            minWidth: "fit-content",
          }}
        >
          {Array.from({ length: rails }).map((_, r) => {
            const isRowComplete =
              mode === "decrypt" &&
              activeCells.filter((cell) => cell.r === r).every((cell) => grid[cell.r][cell.c] !== "");

            return (
              <React.Fragment key={`row-${r}`}>
                {/* ── Row Indicator Button ── */}
                <button
                  type="button"
                  onClick={() => handleRowClick(r)}
                  className={`
                    flex items-center justify-center px-3 sm:px-4 mr-2 border rounded-md
                    font-serif font-bold text-sm sm:text-base tracking-widest uppercase
                    transition-all duration-200 cursor-pointer h-10 sm:h-12
                    ${
                      clickedRows.includes(r)
                        ? "bg-mystery-gold/20 border-mystery-gold/40 text-mystery-gold/50 cursor-not-allowed"
                        : selectedRow === r
                        ? "bg-mystery-gold border-mystery-gold text-mystery-dark shadow-[0_0_16px_rgba(203,161,83,0.5)]"
                        : isRowComplete
                        ? "bg-green-900/40 border-green-500/50 text-green-400"
                        : "bg-mystery-dark/80 border-mystery-gold/50 text-mystery-gold hover:bg-mystery-gold/10 hover:border-mystery-gold"
                    }
                  `}
                >
                  Row {r + 1}
                </button>

                {/* ── Row Cells ── */}
                {Array.from({ length: text.length }).map((_, c) => {
                  const isActive = activeCellsSet.has(`${r}-${c}`);
                  return (
                    <div
                      key={`cell-${r}-${c}`}
                      onClick={() => {
                        if (isActive) handleRowClick(r);
                      }}
                      className={getCellClasses(r, c)}
                    >
                      {isActive ? grid[r][c] || "·" : ""}
                    </div>
                  );
                })}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* ── Status Indicator ── */}
      <div className="text-xs font-serif tracking-[0.2em] uppercase text-center h-5">
        {/* Encrypt status */}
        {mode === "encrypt" && !isGridFull ? (
          <span className="text-mystery-gold/60">
            Type the plaintext to fill the zigzag path
          </span>
        ) : mode === "encrypt" && isGridFull && clickedRows.length < rails ? (
          <span className="text-mystery-gold">
            Click row buttons to extract —{" "}
            <span className="font-mono font-bold text-white">
              {rails - clickedRows.length}
            </span>{" "}
            remaining
          </span>
        ) : mode === "decrypt" && selectedRow === null ? (
          <span className="text-mystery-gold/40">
            Select a row to begin decrypting
          </span>
        ) : mode === "decrypt" && selectedRow !== null ? (
          <span className="text-mystery-gold">
            Typing into{" "}
            <span className="font-mono font-bold text-white">
              Row {selectedRow + 1}
            </span>
          </span>
        ) : null}
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
