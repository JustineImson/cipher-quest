import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/useGameStore';
import { ArrowLeft, Volume2, Music, Settings as SettingsIcon, Play } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useSfx } from '../hooks/useSfx';

export default function Settings({ isOverlay, onClose }) {
  const navigate = useNavigate();
  const { settings, updateSettings } = useGameStore();
  const { playClick } = useSfx();
  const [visible, setVisible] = useState(false);

  useEffect(() => { setTimeout(() => setVisible(true), 80); }, []);

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

        .st-root {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
          font-family: 'Special Elite', monospace;
          background: #1a1208;
        }

        .st-bg {
          position: absolute;
          inset: -20px;
          background-image: url(/mainMenuBg.png);
          background-size: cover;
          background-position: center top;
          filter: blur(12px) brightness(0.35) saturate(0.6);
          transform: scale(1.08);
          z-index: 0;
        }

        .st-scrim {
          position: absolute;
          inset: 0;
          background: linear-gradient(170deg, rgba(8,5,2,0.7) 0%, rgba(10,6,2,0.85) 100%);
          z-index: 1;
        }

        .st-bloom {
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

        .st-grain {
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          opacity: 0.035;
          z-index: 3;
          pointer-events: none;
          mix-blend-mode: screen;
        }

        .st-layout {
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
        .st-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 40px;
          opacity: 0;
          transform: translateY(-16px);
          transition: opacity 0.8s ease, transform 0.8s ease;
        }
        .st-header.show { opacity: 1; transform: translateY(0); }

        .st-back {
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
        .st-back:hover { 
          color: var(--gold-light);
          background: rgba(42, 26, 12, 1);
          border-color: var(--gold);
          box-shadow: 0 0 15px rgba(203,161,83,0.4);
        }

        .st-eyebrow {
          font-size: 11px;
          letter-spacing: 0.38em;
          color: var(--gold-dim);
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .st-title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(34px, 5.5vw, 60px);
          font-weight: 900;
          letter-spacing: 0.14em;
          color: var(--gold-light);
          text-transform: uppercase;
          text-shadow: 0 0 40px rgba(200,160,50,0.3), 0 2px 6px rgba(0,0,0,0.9);
          margin-bottom: 4px;
        }

        .st-rule {
          display: flex;
          align-items: center;
          gap: 10px;
          width: clamp(240px, 38vw, 500px);
          margin-top: 10px;
        }
        .st-rule-line { flex: 1; height: 1px; background: linear-gradient(to right, transparent, var(--gold-dim), transparent); }
        .st-rule-diamond { width: 5px; height: 5px; background: var(--gold); transform: rotate(45deg); flex-shrink: 0; }

        /* Card container */
        .st-card {
          background: rgba(18,12,4,0.75);
          border: 1px solid rgba(201,168,76,0.15);
          border-left: 3px solid rgba(201,168,76,0.4);
          padding: 40px 48px;
          width: 100%;
          max-width: 600px;
          display: flex;
          flex-direction: column;
          gap: 32px;
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 0.8s ease 0.2s, transform 0.8s ease 0.2s;
        }
        .st-card.show { opacity: 1; transform: translateY(0); }

        /* Rows */
        .st-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px dashed rgba(201,168,76,0.15);
          padding-bottom: 20px;
        }
        .st-row:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }

        .st-label {
          display: flex;
          align-items: center;
          gap: 12px;
          font-family: 'Special Elite', monospace;
          font-size: 16px;
          letter-spacing: 0.2em;
          color: var(--cream);
          text-transform: uppercase;
        }
        .st-icon {
          color: var(--gold-dim);
        }

        .st-controls {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .st-toggle {
          background: none;
          border: none;
          font-family: 'Special Elite', monospace;
          font-size: 16px;
          letter-spacing: 0.15em;
          cursor: pointer;
          transition: all 0.2s;
          padding: 4px 8px;
        }
        .st-toggle.active {
          color: var(--gold-light);
          text-shadow: 0 0 10px rgba(232,201,106,0.4);
        }
        .st-toggle.inactive {
          color: rgba(255,255,255,0.3);
        }
        .st-toggle:hover:not(.active) {
          color: rgba(255,255,255,0.6);
        }
        
        .st-sep {
          color: var(--gold-dim);
          opacity: 0.5;
        }

        /* Range Slider */
        .st-slider {
          -webkit-appearance: none;
          width: 200px;
          height: 2px;
          background: rgba(201,168,76,0.2);
          outline: none;
        }
        .st-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          background: var(--gold-light);
          cursor: pointer;
          border-radius: 50%;
          box-shadow: 0 0 10px rgba(232,201,106,0.5);
          transition: transform 0.1s;
        }
        .st-slider::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }
        .st-slider::-moz-range-thumb {
          width: 14px;
          height: 14px;
          background: var(--gold-light);
          cursor: pointer;
          border-radius: 50%;
          border: none;
          box-shadow: 0 0 10px rgba(232,201,106,0.5);
        }

        /* Footer */
        .st-footer {
          margin-top: 40px;
          width: 100%;
          max-width: 600px;
          text-align: center;
          opacity: 0;
          transition: opacity 0.8s ease 0.4s;
        }
        .st-footer.show { opacity: 1; }

        .st-lore {
          font-family: 'IM Fell English', serif;
          font-style: italic;
          font-size: 14px;
          color: var(--gold-dim);
          line-height: 1.6;
        }
      `}</style>

      <div className="st-root">
        {!isOverlay && <div className="st-bg" />}
        <div className={`st-scrim ${isOverlay ? 'backdrop-blur-md' : ''}`} />
        <div className="st-bloom" />
        <div className="st-grain" />

        <div className="st-layout">
          <div className={`st-header ${visible ? 'show' : ''}`}>
            {isOverlay ? (
              <button className="st-back" onClick={() => { playClick(); onClose?.(); }}>
                <Play size={12} fill="currentColor" /> Resume Game
              </button>
            ) : (
              <button className="st-back" onClick={() => { playClick(); navigate(-1); }}>
                <ArrowLeft size={12} /> Back to Menu
              </button>
            )}
            <span className="st-eyebrow">— Apparatus Calibration —</span>
            <h1 className="st-title">Settings</h1>
            <div className="st-rule">
              <div className="st-rule-line" />
              <div className="st-rule-diamond" />
              <div className="st-rule-line" />
            </div>
          </div>

          <div className={`st-card ${visible ? 'show' : ''}`}>
            {/* Music */}
            <div className="st-row">
              <div className="st-label">
                <Music size={18} className="st-icon" /> Music
              </div>
              <div className="st-controls">
                <button
                  className={`st-toggle ${settings.musicEnabled ? 'active' : 'inactive'}`}
                  onClick={() => { playClick(); updateSettings({ musicEnabled: true }); }}
                >ON</button>
                <span className="st-sep">/</span>
                <button
                  className={`st-toggle ${!settings.musicEnabled ? 'active' : 'inactive'}`}
                  onClick={() => { playClick(); updateSettings({ musicEnabled: false }); }}
                >OFF</button>
              </div>
            </div>

            {/* Sound FX */}
            <div className="st-row">
              <div className="st-label">
                <Volume2 size={18} className="st-icon" /> Sound FX
              </div>
              <div className="st-controls">
                <button
                  className={`st-toggle ${settings.sfxEnabled ? 'active' : 'inactive'}`}
                  onClick={() => { playClick(); updateSettings({ sfxEnabled: true }); }}
                >ON</button>
                <span className="st-sep">/</span>
                <button
                  className={`st-toggle ${!settings.sfxEnabled ? 'active' : 'inactive'}`}
                  onClick={() => { playClick(); updateSettings({ sfxEnabled: false }); }}
                >OFF</button>
              </div>
            </div>

            {/* Volume */}
            <div className="st-row">
              <div className="st-label">
                <SettingsIcon size={18} className="st-icon" /> Master Volume
              </div>
              <div className="st-controls">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.volume}
                  onChange={(e) => updateSettings({ volume: parseInt(e.target.value) })}
                  className="st-slider"
                />
              </div>
            </div>
          </div>

          <div className={`st-footer ${visible ? 'show' : ''}`}>
            <p className="st-lore">
              Adjust your apparatus cautiously.<br />
              The right frequency may be the key to your survival.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
