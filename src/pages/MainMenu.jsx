import { useNavigate } from 'react-router-dom';
import { Settings, Trophy, BookOpen, Clock, Users, GraduationCap, User } from 'lucide-react';
import { useState, useEffect } from 'react';
import LoginModal from '../components/ui/LoginModal';
import { useGameStore } from '../store/useGameStore';
import { useSfx } from '../hooks/useSfx';

export default function MainMenu() {
  const navigate = useNavigate();
  const { savedStoryProgress, resetProgress } = useGameStore();
  const { playClick } = useSfx();
  const [visible, setVisible] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const currentUser = useGameStore((state) => state.currentUser);
  
  const isLoggedIn = !!currentUser;

  const handleProfileClick = () => {
    playClick();
    if (isLoggedIn) {
      navigate('/profile');
    } else {
      setShowLoginModal(true);
    }
  };

  const menuItems = [
    { label: 'Tutorial', icon: GraduationCap, path: '/tutorial', tag: 'FILE-00' }
  ];

  if (savedStoryProgress) {
    menuItems.push({ label: 'Continue', icon: BookOpen, action: 'continue', tag: 'FILE-01A' });
    menuItems.push({ label: 'New Game', icon: BookOpen, action: 'newGame', tag: 'FILE-01B' });
  } else {
    menuItems.push({ label: 'Story Mode', icon: BookOpen, action: 'newGame', tag: 'FILE-01' });
  }

  menuItems.push(
    { label: 'Time Attack', icon: Clock, path: '/timeAttack', tag: 'FILE-02' },
    { label: 'Multiplayer', icon: Users, path: '/multiplayer', tag: 'FILE-03' },
    { label: 'Leaderboards', icon: Trophy, path: '/leaderboards', tag: 'FILE-04' }
  );

  const handleMenuClick = (item) => {
    playClick();
    if (item.action === 'newGame') {
      resetProgress();
      navigate('/difficulty', { state: { startScene: 'IntroScene' } });
    } else if (item.action === 'continue') {
      navigate('/story', { state: { difficulty: savedStoryProgress.difficulty, startScene: 'MainScene' } });
    } else {
      navigate(item.path);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=Special+Elite&family=IM+Fell+English:ital@0;1&display=swap');

        :root {
          --gold:       #c9a84c;
          --gold-light: #e8c96a;
          --gold-dim:   #7a6030;
          --ink:        #1a1208;
          --paper:      #2a1e0e;
          --paper-lt:   #3a2c18;
          --red-line:   #8b1a1a;
          --cream:      #e8dcc0;
        }

        .cq-root {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
          font-family: 'Special Elite', monospace;
          cursor: default;
        }

        /* Background */
        .cq-bg {
          position: absolute;
          inset: 0;
          background-image: url(/mainMenuBg.png);
          background-size: cover;
          background-position: center top;
          z-index: 0;
        }

        /* Layered atmosphere overlays */
        .cq-overlay-dark {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to bottom,
            rgba(8,5,2,0.35) 0%,
            rgba(8,5,2,0.15) 30%,
            rgba(8,5,2,0.55) 65%,
            rgba(8,5,2,0.90) 100%
          );
          z-index: 1;
        }

        /* Warm lamplight bloom — center-left where the lamp is */
        .cq-lamp-bloom {
          position: absolute;
          left: 14%;
          top: 42%;
          width: 480px;
          height: 380px;
          background: radial-gradient(ellipse at center, rgba(180,120,30,0.18) 0%, transparent 70%);
          pointer-events: none;
          z-index: 2;
        }

        /* Film grain */
        .cq-grain {
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E");
          opacity: 0.04;
          pointer-events: none;
          z-index: 3;
          mix-blend-mode: screen;
        }

        /* Main layout */
        .cq-layout {
          position: relative;
          z-index: 10;
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
          padding-bottom:17vh;
        }

        /* ── Title ── */
        .cq-title-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 3.5vh;
          opacity: 0;
          transform: translateY(-18px);
          transition: opacity 0.9s ease, transform 0.9s ease;
        }
        .cq-title-wrap.show { opacity: 1; transform: translateY(0); }

        .cq-eyebrow {
          font-family: 'Special Elite', monospace;
          font-size: clamp(9px, 1.1vw, 13px);
          letter-spacing: 0.35em;
          color: var(--gold-dim);
          margin-bottom: 6px;
          text-transform: uppercase;
        }

        .cq-title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(42px, 7vw, 96px);
          font-weight: 900;
          letter-spacing: 0.12em;
          color: var(--gold-light);
          text-transform: uppercase;
          line-height: 1;
          text-shadow:
            0 0 60px rgba(200,160,50,0.35),
            0 2px 4px rgba(0,0,0,0.9),
            0 4px 20px rgba(0,0,0,0.7);
          position: relative;
        }

        /* Decorative rule */
        .cq-rule {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 10px;
          width: clamp(260px, 40vw, 560px);
        }
        .cq-rule-line {
          flex: 1;
          height: 1px;
          background: linear-gradient(to right, transparent, var(--gold-dim), transparent);
        }
        .cq-rule-diamond {
          width: 6px;
          height: 6px;
          background: var(--gold);
          transform: rotate(45deg);
          flex-shrink: 0;
        }

        /* ── Nav panel — cork-board feel ── */
        .cq-nav-panel {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          width: 100%;
          max-width: 480px;
          padding: 0 16px;
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 0.8s ease 0.35s, transform 0.8s ease 0.35s;
        }
        .cq-nav-panel.show { opacity: 1; transform: translateY(0); }

        /* Each nav item looks like a case folder tab */
        .cq-nav-item {
          position: relative;
          width: 100%;
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 13px 20px 13px 18px;
          background: rgba(26, 18, 8, 0.72);
          border: 1px solid rgba(140, 100, 30, 0.35);
          border-left: 3px solid var(--gold-dim);
          cursor: pointer;
          transition: background 0.2s, border-color 0.2s, transform 0.2s;
          backdrop-filter: blur(3px);
          text-decoration: none;
          overflow: hidden;
        }

        /* Red string accent line on hover */
        .cq-nav-item::before {
          content: '';
          position: absolute;
          left: 0; top: 0; bottom: 0;
          width: 3px;
          background: var(--red-line);
          transform: scaleY(0);
          transform-origin: bottom;
          transition: transform 0.25s ease;
        }

        .cq-nav-item:hover::before,
        .cq-nav-item.active::before { transform: scaleY(1); }

        .cq-nav-item:hover,
        .cq-nav-item.active {
          background: rgba(40, 28, 10, 0.88);
          border-color: rgba(200, 160, 50, 0.6);
          transform: translateX(4px);
        }

        .cq-nav-icon {
          color: var(--gold-dim);
          flex-shrink: 0;
          transition: color 0.2s;
        }
        .cq-nav-item:hover .cq-nav-icon,
        .cq-nav-item.active .cq-nav-icon { color: var(--gold-light); }

        .cq-nav-label {
          font-family: 'Special Elite', monospace;
          font-size: clamp(14px, 1.6vw, 18px);
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--cream);
          flex: 1;
          transition: color 0.2s;
        }
        .cq-nav-item:hover .cq-nav-label { color: #fff; }

        .cq-nav-tag {
          font-family: 'Special Elite', monospace;
          font-size: 10px;
          letter-spacing: 0.1em;
          color: var(--gold-dim);
          opacity: 0.7;
        }

        /* Staggered slide-in per item */
        .cq-nav-item { opacity: 0; transform: translateX(-20px); }
        .cq-nav-panel.show .cq-nav-item {
          animation: slideIn 0.45s ease forwards;
        }
        .cq-nav-panel.show .cq-nav-item:nth-child(1) { animation-delay: 0.45s; }
        .cq-nav-panel.show .cq-nav-item:nth-child(2) { animation-delay: 0.55s; }
        .cq-nav-panel.show .cq-nav-item:nth-child(3) { animation-delay: 0.65s; }
        .cq-nav-panel.show .cq-nav-item:nth-child(4) { animation-delay: 0.75s; }
        .cq-nav-panel.show .cq-nav-item:nth-child(5) { animation-delay: 0.85s; }
        .cq-nav-panel.show .cq-nav-item:nth-child(6) { animation-delay: 0.95s; }
        .cq-nav-panel.show .cq-nav-item:nth-child(7) { animation-delay: 1.05s; }
        .cq-nav-panel.show .cq-nav-item:nth-child(8) { animation-delay: 1.15s; }

        @keyframes slideIn {
          to { opacity: 1; transform: translateX(0); }
        }

        /* ── Footer row ── */
        .cq-footer {
          display: flex;
          align-items: center;
          justify-content: space-around;
          width: 100%;
          max-width: 680px;
          padding: 14px 16px 0;
          opacity: 0;
          transition: opacity 0.8s ease 1s;
        }
        .cq-footer.show { opacity: 1; }

        .cq-lore {
          font-family: 'IM Fell English', serif;
          font-style: italic;
          font-size: clamp(10px, 1.1vw, 13px);
          color: var(--gold-dim);
          line-height: 1.6;
          max-width: 220px;
          opacity: 0.85;
        }

        .cq-settings-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 9px 18px;
          background: rgba(26, 18, 8, 0.6);
          border: 1px solid rgba(140, 100, 30, 0.4);
          color: var(--gold);
          font-family: 'Special Elite', monospace;
          font-size: 12px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          cursor: pointer;
          transition: background 0.2s, border-color 0.2s, color 0.2s;
          backdrop-filter: blur(3px);
        }
        .cq-settings-btn:hover {
          background: rgba(50, 35, 12, 0.85);
          border-color: var(--gold);
          color: var(--gold-light);
        }

        .cq-pin {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--red-line);
          box-shadow: 0 0 6px rgba(180, 30, 30, 0.6);
          flex-shrink: 0;
        }

        /* ── Profile Button ── */
        .cq-profile-wrap {
          opacity: 0;
          transition: opacity 1s ease;
        }
        .cq-profile-wrap.show { opacity: 1; }
        
        .cq-profile-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 6px 12px 6px 6px;
          background: rgba(26, 18, 8, 0.7);
          border: 1px solid rgba(200, 160, 50, 0.6);
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;
          backdrop-filter: blur(3px);
        }
        .cq-profile-btn:hover {
          background: rgba(40, 28, 10, 0.9);
          border-color: var(--gold-light);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        }
        
        .cq-profile-icon-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 1px solid var(--gold-dim);
          background: rgba(0,0,0,0.4);
          transition: border-color 0.2s;
        }
        .cq-profile-icon {
          color: var(--gold-dim);
          transition: color 0.2s;
        }
        .cq-profile-btn:hover .cq-profile-icon-wrap { border-color: var(--gold); }
        .cq-profile-btn:hover .cq-profile-icon { color: var(--gold-light); }
        
        .cq-profile-label {
          font-family: 'Special Elite', monospace;
          font-size: 11px;
          letter-spacing: 0.15em;
          color: var(--gold);
          transition: color 0.2s;
        }
        .cq-profile-btn:hover .cq-profile-label {
          color: var(--gold-light);
        }
      `}</style>

      <div className="cq-root">
        {/* Layers */}
        <div className="cq-bg" />
        <div className="cq-overlay-dark" />
        <div className="cq-lamp-bloom" />
        <div className="cq-grain" />

        {/* Content */}
        <div className="cq-layout">

          {/* Top Right Profile Button */}
          <div className={`absolute top-6 right-8 z-50 ${visible ? 'show' : ''} cq-profile-wrap`}>
            <button 
              className="cq-profile-btn"
              onClick={handleProfileClick}
            >
              <div className="cq-profile-icon-wrap">
                <User size={14} className="cq-profile-icon" />
              </div>
              <span className="cq-profile-label">AGENT PROFILE</span>
            </button>
          </div>

          {/* Title */}
          <div className={`cq-title-wrap ${visible ? 'show' : ''}`}>
            <p className="cq-eyebrow">— London, 1888 · Case Dossier —</p>
            <h1 className="cq-title">Cipher Quest</h1>
            <div className="cq-rule">
              <div className="cq-rule-line" />
              <div className="cq-rule-diamond" />
              <div className="cq-rule-line" />
            </div>
          </div>

          {/* Nav */}
          <nav className={`cq-nav-panel ${visible ? 'show' : ''}`}>
            {menuItems.map((item, i) => (
              <button
                key={item.tag}
                className={`cq-nav-item ${hoveredIdx === i ? 'active' : ''}`}
                onClick={() => handleMenuClick(item)}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                <div className="cq-pin" />
                <item.icon size={16} className="cq-nav-icon" />
                <span className="cq-nav-label">{item.label}</span>
                <span className="cq-nav-tag">{item.tag}</span>
              </button>
            ))}
          </nav>

          {/* Footer */}
          <div className={`cq-footer ${visible ? 'show' : ''}`}>
            <p className="cq-lore">
              Intercept the transmissions.<br />
              Decipher the truth before<br />
              time runs out.
            </p>
            <button className="cq-settings-btn" onClick={() => { playClick(); navigate('/settings'); }}>
              <Settings size={13} />
              Settings
            </button>
          </div>

        </div>
      </div>
      
      {showLoginModal && (
        <LoginModal onClose={() => setShowLoginModal(false)} />
      )}
    </>
  );
}