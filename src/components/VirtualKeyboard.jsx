import { useEffect, useCallback } from "react";

const ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["Z", "X", "C", "V", "B", "N", "M"],
];

/**
 * VirtualKeyboard – an on-screen QWERTY keyboard for cipher mini-games.
 *
 * Props
 * ─────
 * @param {(letter: string) => void} onKeyPress  – called with the uppercase letter clicked / typed.
 * @param {() => void}               onDelete    – called on Backspace click / key.
 * @param {Set<string>}              [disabledKeys] – optional set of uppercase letters to grey-out.
 * @param {string}                   [className]    – extra classes for the wrapper.
 */
export default function VirtualKeyboard({
  onKeyPress,
  onDelete,
  onEnter,
  disabledKeys = new Set(),
  className = "",
}) {
  /* ── Physical keyboard listener ─────────────────────────────── */
  const handleKeyDown = useCallback(
    (e) => {
      if (e.repeat) return; // ignore held-down repeats

      // Skip if user is typing inside an input / textarea – let it handle natively
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      const key = e.key.toUpperCase();

      if (key === "ENTER") {
        e.preventDefault();
        onEnter?.();
        return;
      }

      if (key === "BACKSPACE") {
        e.preventDefault();
        onDelete?.();
        return;
      }

      if (/^[A-Z]$/.test(key) && !disabledKeys.has(key)) {
        e.preventDefault();
        onKeyPress?.(key);
      }
    },
    [onKeyPress, onDelete, onEnter, disabledKeys]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  /* ── Render ─────────────────────────────────────────────────── */
  return (
    <div
      className={`select-none flex flex-row items-center justify-center gap-2 sm:gap-4 ${className}`}
      aria-label="Virtual Keyboard"
    >
      <div className="flex flex-col items-center gap-1.5 sm:gap-2">
        {ROWS.map((row, rowIdx) => (
          <div key={rowIdx} className="flex gap-1 sm:gap-1.5 justify-center">
            {row.map((letter) => {
              const disabled = disabledKeys.has(letter);
              return (
                <button
                  key={letter}
                  type="button"
                  disabled={disabled}
                  onClick={() => onKeyPress?.(letter)}
                  className={`
                    /* ── sizing ── */
                    w-8 h-10 sm:w-10 sm:h-12 md:w-11 md:h-13
                    text-sm sm:text-base md:text-lg font-serif font-semibold tracking-wider

                    /* ── colours ── */
                    border rounded-md backdrop-blur-sm
                    ${
                      disabled
                        ? "bg-gray-800/40 border-gray-700/50 text-gray-600 cursor-not-allowed"
                        : "bg-mystery-dark/70 border-mystery-gold/60 text-mystery-gold shadow-[0_2px_6px_rgba(0,0,0,0.5)]"
                    }

                    /* ── interaction ── */
                    transition-all duration-150 ease-out
                    ${
                      !disabled &&
                      `hover:bg-mystery-gold/20 hover:border-mystery-gold hover:shadow-[0_0_12px_rgba(203,161,83,0.35)]
                       active:scale-90 active:bg-mystery-gold/30 active:shadow-inner`
                    }
                  `}
                >
                  {letter}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* ── Control keys ── */}
      <div className="flex flex-col justify-center gap-2 sm:gap-3">
        {onEnter && (
          <button
            type="button"
            onClick={() => onEnter()}
            className="
              px-4 h-10 sm:px-5 sm:h-12
              text-xs sm:text-sm font-serif tracking-widest uppercase

              border rounded-md backdrop-blur-sm
              bg-mystery-gold/20 border-mystery-gold/70 text-mystery-gold

              transition-all duration-150 ease-out
              hover:bg-mystery-gold/40 hover:border-mystery-gold hover:shadow-[0_0_12px_rgba(203,161,83,0.5)]
              active:scale-90 active:bg-mystery-gold/50 active:shadow-inner

              flex items-center gap-1.5
            "
          >
            {/* Enter arrow icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4 sm:w-5 sm:h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 10 4 15 9 20" />
              <path d="M20 4v7a4 4 0 0 1-4 4H4" />
            </svg>
            Enter
          </button>
        )}

        <button
          type="button"
          onClick={() => onDelete?.()}
          className="
            px-4 h-10 sm:px-5 sm:h-12
            text-xs sm:text-sm font-serif tracking-widest uppercase

            border rounded-md backdrop-blur-sm
            bg-victorian-red/20 border-victorian-red/70 text-victorian-red

            transition-all duration-150 ease-out
            hover:bg-victorian-red/40 hover:border-victorian-red hover:shadow-[0_0_12px_rgba(88,24,31,0.5)]
            active:scale-90 active:bg-victorian-red/50 active:shadow-inner

            flex items-center gap-1.5
          "
        >
          {/* Backspace arrow icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4 sm:w-5 sm:h-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
            <line x1="18" y1="9" x2="12" y2="15" />
            <line x1="12" y1="9" x2="18" y2="15" />
          </svg>
          Delete
        </button>
      </div>
    </div>
  );
}
