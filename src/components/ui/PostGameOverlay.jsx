import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store/useGameStore';
import { useSfx } from '../../hooks/useSfx';

export default function PostGameOverlay() {
  const showPostGameMenu = useGameStore((s) => s.showPostGameMenu);
  const setShowPostGameMenu = useGameStore((s) => s.setShowPostGameMenu);
  const resetProgress = useGameStore((s) => s.resetProgress);
  const navigate = useNavigate();
  const { playClick } = useSfx();

  if (!showPostGameMenu) return null;

  const handleRestart = () => {
    playClick();
    setShowPostGameMenu(false);
    resetProgress();
    // Dispatch event that PhaserGame listens for to restart the scene
    window.dispatchEvent(new CustomEvent('restartToIntro'));
  };

  const handleMainMenu = () => {
    playClick();
    setShowPostGameMenu(false);
    resetProgress();
    navigate('/');
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Special+Elite&family=Playfair+Display:wght@700;900&display=swap');

        .pgm-overlay {
          position: absolute;
          inset: 0;
          z-index: 300;
          display: flex;
          align-items: center;
          justify-content: center;
          background: radial-gradient(ellipse at center, rgba(10, 6, 2, 0.88) 0%, rgba(0, 0, 0, 0.96) 100%);
          animation: pgm-fadeIn 1.2s ease forwards;
        }

        @keyframes pgm-fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .pgm-panel {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 28px;
          padding: 48px 56px;
          background: rgba(20, 14, 6, 0.85);
          border: 1px solid rgba(200, 160, 50, 0.35);
          border-radius: 4px;
          backdrop-filter: blur(6px);
          box-shadow: 0 0 80px rgba(200, 160, 50, 0.06), 0 8px 32px rgba(0, 0, 0, 0.6);
          animation: pgm-slideUp 0.8s ease 0.4s both;
        }

        @keyframes pgm-slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .pgm-title {
          font-family: 'Playfair Display', serif;
          font-size: 36px;
          font-weight: 900;
          color: #e8c84a;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          text-shadow: 0 0 40px rgba(200, 160, 50, 0.3), 0 2px 4px rgba(0, 0, 0, 0.8);
        }

        .pgm-rule {
          width: 200px;
          height: 1px;
          background: linear-gradient(to right, transparent, rgba(200, 160, 50, 0.5), transparent);
        }

        .pgm-subtitle {
          font-family: 'Special Elite', monospace;
          font-size: 13px;
          color: rgba(200, 160, 50, 0.5);
          letter-spacing: 0.25em;
          text-transform: uppercase;
        }

        .pgm-buttons {
          display: flex;
          flex-direction: column;
          gap: 14px;
          width: 100%;
        }

        .pgm-btn {
          position: relative;
          width: 100%;
          padding: 14px 24px;
          background: rgba(26, 18, 8, 0.72);
          border: 1px solid rgba(140, 100, 30, 0.4);
          border-left: 3px solid #7a6030;
          color: #e8dcc0;
          font-family: 'Special Elite', monospace;
          font-size: 16px;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
        }

        .pgm-btn::before {
          content: '';
          position: absolute;
          left: 0; top: 0; bottom: 0;
          width: 3px;
          background: #8b1a1a;
          transform: scaleY(0);
          transform-origin: bottom;
          transition: transform 0.25s ease;
        }

        .pgm-btn:hover::before {
          transform: scaleY(1);
        }

        .pgm-btn:hover {
          background: rgba(40, 28, 10, 0.88);
          border-color: rgba(200, 160, 50, 0.6);
          color: #fff;
          transform: translateX(4px);
        }

        .pgm-btn-tag {
          float: right;
          font-size: 10px;
          color: rgba(200, 160, 50, 0.4);
          letter-spacing: 0.1em;
        }
      `}</style>

      <div className="pgm-overlay">
        <div className="pgm-panel">
          <span className="pgm-subtitle">— Case Closed —</span>
          <h2 className="pgm-title">Case Complete</h2>
          <div className="pgm-rule" />

          <div className="pgm-buttons">
            <button className="pgm-btn" onClick={handleRestart}>
              Restart Case
              <span className="pgm-btn-tag">NEW FILE</span>
            </button>
            <button className="pgm-btn" onClick={handleMainMenu}>
              Return to Main Menu
              <span className="pgm-btn-tag">EXIT</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
