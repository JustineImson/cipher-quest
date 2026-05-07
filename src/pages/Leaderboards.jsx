import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Trophy, ArrowLeft, Medal, Star } from 'lucide-react';
import { useSfx } from '../hooks/useSfx';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { fetchTimeAttackLeaderboard, fetchMultiplayerLeaderboard } from '../services/leaderboardService';

// ── Tabs ─────────────────────────────────────────────────────────────────────
const TABS = ['Time Attack', 'Multiplayer'];

const BADGE_STYLES = {
  gold: { color: '#e8c96a', glow: 'rgba(232,201,106,0.5)', label: '1ST' },
  silver: { color: '#c0c8d8', glow: 'rgba(192,200,216,0.4)', label: '2ND' },
  bronze: { color: '#c87941', glow: 'rgba(200,121,65,0.4)', label: '3RD' },
};

export default function Leaderboards() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Time Attack');
  const [visible, setVisible] = useState(false);
  const [animKey, setAnimKey] = useState(0);
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { playClick } = useSfx();

  useEffect(() => { setTimeout(() => setVisible(true), 80); }, []);

  // Fetch leaderboard data from Firestore on mount and when tab changes
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    const fetchData = async () => {
      try {
        const data = activeTab === 'Time Attack'
          ? await fetchTimeAttackLeaderboard(10)
          : await fetchMultiplayerLeaderboard(10);
        if (!cancelled) {
          setRows(data);
        }
      } catch (err) {
        console.error('Failed to fetch leaderboard:', err);
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, [activeTab]);

  const switchTab = (tab) => {
    if (tab === activeTab) return;
    playClick();
    setActiveTab(tab);
    setAnimKey(k => k + 1);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Special+Elite&family=IM+Fell+English:ital@0;1&display=swap');

        :root {
          --gold:       #c9a84c;
          --gold-light: #e8c96a;
          --gold-dim:   #7a6030;
          --ink:        #0e0a04;
          --paper:      #1c1308;
          --paper-lt:   #2e2010;
          --red-line:   #8b1a1a;
          --cream:      #e8dcc0;
          --silver:     #c0c8d8;
          --bronze:     #c87941;
        }

        .lb-root {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
          font-family: 'Special Elite', monospace;
        }

        /* ── Blurred background ── */
        .lb-bg {
          position: absolute;
          inset: -20px;
          background-image: url(/mainMenuBg.png);
          background-size: cover;
          background-position: center top;
          filter: blur(10px) brightness(0.45) saturate(0.7);
          z-index: 0;
          transform: scale(1.08);
        }

        /* Dark scrim for readability */
        .lb-scrim {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            160deg,
            rgba(8,5,2,0.60) 0%,
            rgba(10,6,2,0.75) 60%,
            rgba(5,3,1,0.92) 100%
          );
          z-index: 1;
        }

        /* Warm lamp glow echo */
        .lb-bloom {
          position: absolute;
          left: -8%;
          top: 50%;
          width: 520px;
          height: 400px;
          background: radial-gradient(ellipse, rgba(170,110,20,0.12) 0%, transparent 65%);
          z-index: 2;
          pointer-events: none;
        }

        /* Film grain */
        .lb-grain {
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          opacity: 0.035;
          z-index: 3;
          pointer-events: none;
          mix-blend-mode: screen;
        }

        /* ── Layout ── */
        .lb-layout {
          position: relative;
          z-index: 10;
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 32px 20px 24px;
          overflow-y: auto;
          box-sizing: border-box;
        }

        /* ── Header ── */
        .lb-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
          max-width: 720px;
          margin-bottom: 28px;
          opacity: 0;
          transform: translateY(-16px);
          transition: opacity 0.8s ease, transform 0.8s ease;
        }
        .lb-header.show { opacity: 1; transform: translateY(0); }

        .lb-back {
          align-self: flex-start;
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(30, 18, 8, 0.9);
          border: 1px solid rgba(122, 92, 46, 0.5);
          color: var(--gold-dim);
          font-family: 'Special Elite', monospace;
          font-size: 11px;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          cursor: pointer;
          padding: 8px 16px;
          border-radius: 4px;
          transition: all 0.3s;
          margin-bottom: 20px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.3);
        }
        .lb-back:hover { 
          color: var(--gold-light);
          background: rgba(42, 26, 12, 1);
          border-color: var(--gold);
          box-shadow: 0 0 15px rgba(203,161,83,0.4);
        }

        .lb-eyebrow {
          font-size: 11px;
          letter-spacing: 0.38em;
          color: var(--gold-dim);
          text-transform: uppercase;
          margin-bottom: 6px;
        }

        .lb-title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(34px, 5.5vw, 64px);
          font-weight: 900;
          letter-spacing: 0.14em;
          color: var(--gold-light);
          text-transform: uppercase;
          text-shadow:
            0 0 40px rgba(200,160,50,0.3),
            0 2px 6px rgba(0,0,0,0.9);
          margin-bottom: 4px;
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .lb-rule {
          display: flex;
          align-items: center;
          gap: 10px;
          width: clamp(240px, 38vw, 500px);
          margin-top: 10px;
        }
        .lb-rule-line {
          flex: 1;
          height: 1px;
          background: linear-gradient(to right, transparent, var(--gold-dim), transparent);
        }
        .lb-rule-diamond {
          width: 5px; height: 5px;
          background: var(--gold);
          transform: rotate(45deg);
          flex-shrink: 0;
        }

        /* ── Tabs ── */
        .lb-tabs {
          display: flex;
          gap: 0;
          width: 100%;
          max-width: 720px;
          margin-bottom: 20px;
          border-bottom: 1px solid rgba(140,100,30,0.3);
          opacity: 0;
          transition: opacity 0.7s ease 0.3s;
        }
        .lb-tabs.show { opacity: 1; }

        .lb-tab {
          flex: 1;
          padding: 10px 6px;
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          color: var(--gold-dim);
          font-family: 'Special Elite', monospace;
          font-size: clamp(10px, 1.3vw, 13px);
          letter-spacing: 0.2em;
          text-transform: uppercase;
          cursor: pointer;
          transition: color 0.2s, border-color 0.2s, background 0.2s;
          margin-bottom: -1px;
        }
        .lb-tab:hover { color: var(--cream); }
        .lb-tab.active {
          color: var(--gold-light);
          border-bottom-color: var(--gold);
          background: rgba(200,160,50,0.04);
        }

        /* ── Table ── */
        .lb-table {
          width: 100%;
          max-width: 720px;
          border-collapse: collapse;
          opacity: 0;
          transition: opacity 0.5s ease 0.1s;
        }
        .lb-table.show { opacity: 1; }

        .lb-thead th {
          font-family: 'Special Elite', monospace;
          font-size: 10px;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          color: var(--gold-dim);
          text-align: left;
          padding: 0 12px 10px;
          border-bottom: 1px solid rgba(140,100,30,0.25);
        }
        .lb-thead th.center { text-align: center; }

        .lb-row {
          border-bottom: 1px solid rgba(255,255,255,0.04);
          transition: background 0.18s;
          opacity: 0;
          animation: rowIn 0.4s ease forwards;
        }
        .lb-row:hover { background: rgba(200,160,50,0.05); }

        @keyframes rowIn {
          from { opacity: 0; transform: translateX(-12px); }
          to   { opacity: 1; transform: translateX(0); }
        }

        .lb-row td {
          padding: 13px 12px;
          vertical-align: middle;
        }

        /* Rank cell */
        .lb-rank {
          font-family: 'Playfair Display', serif;
          font-weight: 700;
          font-size: 18px;
          color: var(--gold-dim);
          width: 42px;
          text-align: center;
        }
        .lb-rank.medal { color: transparent; }

        .lb-medal-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          font-family: 'Special Elite', monospace;
          font-size: 9px;
          letter-spacing: 0.05em;
          font-weight: 700;
        }

        /* Name cell */
        .lb-name-cell { display: flex; align-items: center; gap: 10px; }
        .lb-pin {
          width: 7px; height: 7px;
          border-radius: 50%;
          background: var(--red-line);
          flex-shrink: 0;
          box-shadow: 0 0 5px rgba(180,30,30,0.5);
        }
        .lb-name {
          font-family: 'IM Fell English', serif;
          font-size: clamp(13px, 1.5vw, 16px);
          color: var(--cream);
          letter-spacing: 0.04em;
        }
        .lb-row:hover .lb-name { color: #fff; }

        /* Score cell */
        .lb-score {
          font-family: 'Special Elite', monospace;
          font-size: clamp(13px, 1.4vw, 15px);
          color: var(--gold);
          letter-spacing: 0.08em;
          text-align: right;
        }

        /* Time / Cases */
        .lb-meta {
          font-family: 'Special Elite', monospace;
          font-size: 12px;
          color: var(--gold-dim);
          text-align: center;
          letter-spacing: 0.06em;
        }

        /* ── Footer ── */
        .lb-footer {
          margin-top: 28px;
          width: 100%;
          max-width: 720px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          opacity: 0;
          transition: opacity 0.8s ease 0.8s;
        }
        .lb-footer.show { opacity: 1; }

        .lb-footer-lore {
          font-family: 'IM Fell English', serif;
          font-style: italic;
          font-size: 12px;
          color: var(--gold-dim);
          line-height: 1.65;
          opacity: 0.8;
        }

        .lb-stamp {
          font-family: 'Special Elite', monospace;
          font-size: 10px;
          letter-spacing: 0.3em;
          color: rgba(139,26,26,0.5);
          text-transform: uppercase;
          border: 1px solid rgba(139,26,26,0.35);
          padding: 5px 10px;
          transform: rotate(-2deg);
        }

        /* Top-3 row highlight */
        .lb-row.top1 { background: rgba(232,201,106,0.04); }
        .lb-row.top2 { background: rgba(192,200,216,0.03); }
        .lb-row.top3 { background: rgba(200,121,65,0.03); }
        
        /* Empty State */
        .lb-empty-state {
          text-align: center;
          padding: 40px;
          font-family: 'Special Elite', monospace;
          color: var(--gold-dim);
          letter-spacing: 0.1em;
          text-transform: uppercase;
          font-size: 14px;
        }
      `}</style>

      <div className="lb-root">
        <div className="lb-bg" />
        <div className="lb-scrim" />
        <div className="lb-bloom" />
        <div className="lb-grain" />

        <div className="lb-layout">

          {/* Header */}
          <div className={`lb-header ${visible ? 'show' : ''}`}>
            <button className="lb-back" onClick={() => { playClick(); navigate(-1); }}>
              <ArrowLeft size={13} /> Back to Menu
            </button>
            <p className="lb-eyebrow">— Hall of Distinction —</p>
            <h1 className="lb-title">
              <Trophy size={clampIcon()} strokeWidth={1.5} style={{ color: 'var(--gold)', flexShrink: 0 }} />
              Leaderboards
            </h1>
            <div className="lb-rule">
              <div className="lb-rule-line" />
              <div className="lb-rule-diamond" />
              <div className="lb-rule-line" />
            </div>
          </div>

          {/* Tabs */}
          <div className={`lb-tabs ${visible ? 'show' : ''}`}>
            {TABS.map(tab => (
              <button
                key={tab}
                className={`lb-tab ${activeTab === tab ? 'active' : ''}`}
                onClick={() => switchTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Table */}
          <table className={`lb-table ${visible ? 'show' : ''}`} key={animKey}>
            <thead className="lb-thead">
              <tr>
                <th className="center" style={{ width: 52 }}>#</th>
                <th>Detective</th>
                <th style={{ textAlign: 'right' }}>Score</th>
                <th className="center">Best Time</th>
                <th className="center">Cases</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="5">
                    <div className="lb-empty-state">
                      <LoadingSpinner text="Accessing Archives..." />
                    </div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan="5">
                    <div className="lb-empty-state">
                      No records found. Be the first to make the board.
                    </div>
                  </td>
                </tr>
              ) : rows.map((row, i) => {
                const badge = row.badge ? BADGE_STYLES[row.badge] : null;
                const rowClass = row.rank === 1 ? 'top1' : row.rank === 2 ? 'top2' : row.rank === 3 ? 'top3' : '';
                return (
                  <tr
                    key={row.rank}
                    className={`lb-row ${rowClass}`}
                    style={{ animationDelay: `${i * 70}ms` }}
                  >
                    {/* Rank / Medal */}
                    <td className={`lb-rank ${badge ? 'medal' : ''}`}>
                      {badge ? (
                        <span
                          className="lb-medal-icon"
                          style={{
                            background: badge.color,
                            color: '#0e0a04',
                            boxShadow: `0 0 10px ${badge.glow}`,
                          }}
                        >
                          {badge.label}
                        </span>
                      ) : row.rank}
                    </td>
                    {/* Name */}
                    <td>
                      <div className="lb-name-cell">
                        <div className="lb-pin" />
                        <span className="lb-name">{row.name}</span>
                      </div>
                    </td>
                    {/* Score */}
                    <td className="lb-score">{row.score.toLocaleString()}</td>
                    {/* Time */}
                    <td className="lb-meta">{row.time}</td>
                    {/* Cases */}
                    <td className="lb-meta">{row.cases}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Footer */}
          <div className={`lb-footer ${visible ? 'show' : ''}`}>
            <p className="lb-footer-lore">
              Only the sharpest minds<br />
              make it into the record.
            </p>
            <div className="lb-stamp">Classified · CQ Division</div>
          </div>

        </div>
      </div>
    </>
  );
}

// Helper — avoids JSX limitation with clamp inside props
function clampIcon() {
  if (typeof window === 'undefined') return 36;
  return Math.max(28, Math.min(44, window.innerWidth * 0.04));
}
