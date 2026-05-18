import { useNavigate, useLocation } from 'react-router-dom';
import { useGameStore } from '../store/useGameStore';
import { Settings, ArrowLeft } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useSfx } from '../hooks/useSfx';

export default function Difficulty() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { settings, updateSettings, startNewStory } = useGameStore();
  const { playClick } = useSfx();
  const [visible, setVisible] = useState(false);

  useEffect(() => { setTimeout(() => setVisible(true), 80); }, []);

  const handleSelectDifficulty = (diff) => {
    playClick();
    updateSettings({ difficulty: diff });
    startNewStory(diff);
    navigate('/story', { state: { difficulty: diff, startScene: state?.startScene } });
  };

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

        .df-root {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
          font-family: 'Special Elite', monospace;
          background: #1a1208;
        }

        .df-bg {
          position: absolute;
          inset: -20px;
          background-image: url(/mainMenuBg.png);
          background-size: cover;
          background-position: center top;
          filter: blur(12px) brightness(0.35) saturate(0.6);
          transform: scale(1.08);
          z-index: 0;
        }

        .df-scrim {
          position: absolute;
          inset: 0;
          background: linear-gradient(170deg, rgba(8,5,2,0.7) 0%, rgba(10,6,2,0.85) 100%);
          z-index: 1;
        }

        .df-bloom {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          width: 600px;
          height: 500px;
          background: radial-gradient(ellipse, rgba(160,105,20,0.15) 0%, transparent 65%);
          z-index: 2;
          pointer-events: none;
        }

        .df-grain {
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          opacity: 0.035;
          z-index: 3;
          pointer-events: none;
          mix-blend-mode: screen;
        }

        .df-layout {
          position: relative;
          z-index: 10;
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 32px 20px;
        }

        /* Header */
        .df-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 40px;
          opacity: 0;
          transform: translateY(-16px);
          transition: opacity 0.8s ease, transform 0.8s ease;
        }
        .df-header.show { opacity: 1; transform: translateY(0); }

        .df-back {
          align-self: flex-start;
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(30, 18, 8, 0.9);
          border: 1px solid rgba(122, 92, 46, 0.5);
          color: var(--gold-dim);
          font-size: 11px;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          cursor: pointer;
          padding: 8px 16px;
          border-radius: 4px;
          transition: all 0.3s;
          margin-bottom: 24px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.3);
        }
        .df-back:hover { 
          color: var(--gold-light);
          background: rgba(42, 26, 12, 1);
          border-color: var(--gold);
          box-shadow: 0 0 15px rgba(203,161,83,0.4);
        }

        .df-eyebrow {
          font-size: 11px;
          letter-spacing: 0.38em;
          color: var(--gold-dim);
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .df-title {
          font-family: 'Playfair Display', serif;
          font-size: 60px;
          font-weight: 900;
          letter-spacing: 0.14em;
          color: var(--gold-light);
          text-transform: uppercase;
          text-shadow: 0 0 40px rgba(200,160,50,0.3), 0 2px 6px rgba(0,0,0,0.9);
          margin-bottom: 4px;
        }

        .df-rule {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 500px;
          margin-top: 10px;
        }
        .df-rule-line { flex: 1; height: 1px; background: linear-gradient(to right, transparent, var(--gold-dim), transparent); }
        .df-rule-diamond { width: 5px; height: 5px; background: var(--gold); transform: rotate(45deg); flex-shrink: 0; }

        /* Options */
        .df-options {
          display: flex;
          flex-direction: column;
          gap: 16px;
          width: 100%;
          max-width: 400px;
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 0.8s ease 0.2s, transform 0.8s ease 0.2s;
        }
        .df-options.show { opacity: 1; transform: translateY(0); }

        .df-btn {
          position: relative;
          background: rgba(18,12,4,0.75);
          border: 1px solid rgba(201,168,76,0.2);
          border-left: 3px solid rgba(201,168,76,0.4);
          padding: 20px 24px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        .df-btn::before {
          content: '';
          position: absolute;
          left: 0; top: 0; bottom: 0;
          width: 3px;
          background: var(--red);
          transform: scaleY(0);
          transform-origin: bottom;
          transition: transform 0.25s ease;
        }
        .df-btn:hover::before, .df-btn.active::before { transform: scaleY(1); }
        
        .df-btn:hover {
          background: rgba(22,15,5,0.9);
          border-color: rgba(201,168,76,0.5);
          transform: translateX(4px);
        }

        .df-btn-title {
          font-family: 'Special Elite', monospace;
          font-size: 20px;
          letter-spacing: 0.2em;
          color: var(--cream);
          text-transform: uppercase;
          transition: color 0.2s;
          margin-bottom: 6px;
        }
        .df-btn:hover .df-btn-title { color: #fff; }

        .df-btn-desc {
          font-family: 'IM Fell English', serif;
          font-size: 13px;
          color: #a09070;
          font-style: italic;
        }

        /* Footer */
        .df-footer {
          margin-top: 40px;
          width: 100%;
          max-width: 400px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          opacity: 0;
          transition: opacity 0.8s ease 0.5s;
        }
        .df-footer.show { opacity: 1; }

        .df-lore {
          font-family: 'IM Fell English', serif;
          font-style: italic;
          font-size: 12px;
          color: var(--gold-dim);
          line-height: 1.6;
          max-width: 220px;
        }

        .df-settings {
          display: flex;
          align-items: center;
          gap: 8px;
          background: none;
          border: 1px solid rgba(201,168,76,0.3);
          color: var(--gold-dim);
          font-family: 'Special Elite', monospace;
          font-size: 10px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          padding: 8px 12px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .df-settings:hover {
          background: rgba(201,168,76,0.1);
          color: var(--gold-light);
          border-color: var(--gold);
        }
      `}</style>

      <div className="df-root">
        <div className="df-bg" />
        <div className="df-scrim" />
        <div className="df-bloom" />
        <div className="df-grain" />

        <div className="df-layout">
          <div className={`df-header ${visible ? 'show' : ''}`}>
            <button className="df-back" onClick={() => { playClick(); navigate(-1); }}>
              <ArrowLeft size={12} /> Back to Menu
            </button>
            <span className="df-eyebrow">— Investigation Parameters —</span>
            <h1 className="df-title">Clearance Level</h1>
            <div className="df-rule">
              <div className="df-rule-line" />
              <div className="df-rule-diamond" />
              <div className="df-rule-line" />
            </div>
          </div>

          <div className={`df-options ${visible ? 'show' : ''}`}>
            <button
              className={`df-btn ${settings.difficulty === 'Easy' ? 'active' : ''}`}
              onClick={() => handleSelectDifficulty('Easy')}
            >
              <span className="df-btn-title">Beginner</span>
              <span className="df-btn-desc">Shorter ciphers, forgiving deadlines.</span>
            </button>
            <button
              className={`df-btn ${settings.difficulty === 'Medium' ? 'active' : ''}`}
              onClick={() => handleSelectDifficulty('Medium')}
            >
              <span className="df-btn-title">Moderate</span>
              <span className="df-btn-desc">Standard intercepts and timing.</span>
            </button>
            <button
              className={`df-btn ${settings.difficulty === 'Hard' ? 'active' : ''}`}
              onClick={() => handleSelectDifficulty('Hard')}
            >
              <span className="df-btn-title">Advanced</span>
              <span className="df-btn-desc">Complex encryption, minimal room for error.</span>
            </button>
          </div>

          <div className={`df-footer ${visible ? 'show' : ''}`}>
            <p className="df-lore">
              The game waits for your selection.<br />
              Prepare your mind for the intercepts.
            </p>
            <button className="df-settings" onClick={() => { playClick(); navigate('/settings'); }}>
              <Settings size={12} /> Settings
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
