import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Lock, FileText, Clock, Users, BookOpen, Key, Grid, Shuffle, AlignLeft } from 'lucide-react';
import { useSfx } from '../hooks/useSfx';

// ── Content data ─────────────────────────────────────────────────────────────

const INVESTIGATION_STEPS = [
  {
    icon: Search,
    title: 'The Crime Scene',
    tag: 'PHASE-01',
    body: `You begin each case inside an isometric location — a dimly lit office, a rain-soaked alley, an abandoned warehouse. 
Move through the scene and click on objects of interest. Some are decoys; others contain encrypted evidence. 
Your trained eye is your first tool.`,
    tip: 'Tip: Look for objects that seem out of place — a displaced book, an open drawer, a flickering terminal.',
  },
  {
    icon: Lock,
    title: 'The Encryption',
    tag: 'PHASE-02',
    body: `Every piece of evidence has been scrambled by the perpetrator using a classical cipher. 
When you collect a clue, a Decryption Tablet opens. Identify the cipher type from the context clues provided, 
then apply the correct decryption technique to reveal the hidden message.`,
    tip: 'Tip: The cipher type is hinted at by the evidence label — "V-TABLE" means Vigenère, "RAIL-3" means Rail Fence.',
  },
  {
    icon: FileText,
    title: 'The Deduction Board',
    tag: 'PHASE-03',
    body: `Collect four decrypted clues to unlock the Deduction Board — your investigation's nerve centre. 
Here, all evidence is pinned and connected with red string. Review the pattern, identify inconsistencies, 
and build the case against your prime suspect.`,
    tip: 'Tip: Each clue contributes one letter to the suspect\'s code name. Arrange them correctly to proceed.',
  },
  {
    icon: FileText,
    title: 'The Interrogation',
    tag: 'PHASE-04',
    body: `Armed with your evidence, you confront the suspect in the interrogation room. 
Choose your questions wisely — every response from the suspect either confirms or contradicts a piece of your evidence. 
One wrong accusation and the case goes cold.`,
    tip: 'Tip: Cross-reference contradictions with your decrypted clues before making the final accusation.',
  },
];

const CIPHERS = [
  {
    icon: Key,
    title: 'Vigenère Cipher',
    tag: 'CIPHER-V',
    difficulty: 'MODERATE',
    body: `The Vigenère Cipher uses a repeating keyword to shift each letter of the plaintext by a different amount, making it far harder to crack than a simple Caesar shift.`,
    howItWorks: [
      'Choose a keyword, e.g. KEY.',
      'Repeat the keyword above the message: KEY KEY KEY…',
      'For each letter in the message, shift it forward by the position of the corresponding keyword letter (A=0, B=1, … Z=25).',
      'To decrypt: shift each letter backward by the same keyword letter.',
    ],
    example: {
      label: 'Example',
      plaintext: 'ATTACK',
      keyword: 'KEYKEY',
      ciphertext: 'KXRXOT',
      steps: [
        'A + K(10) = K',
        'T + E(4)  = X',
        'T + Y(24) = R',
        'A + K(10) = K',
        'C + E(4)  = G  → wait, actually O — each shift wraps mod 26',
        'K + Y(24) = I  → adjusted result: KXRXOT',
      ],
    },
    inGame: 'Look for the keyword stamped on the evidence label. Use the Vigenère table on your tablet to decode column by column.',
  },
  {
    icon: AlignLeft,
    title: 'Rail Fence Cipher',
    tag: 'CIPHER-R',
    difficulty: 'BEGINNER',
    body: `The Rail Fence Cipher is a transposition cipher — letters are not substituted, only rearranged. The message is written in a zig-zag pattern across a number of "rails", then read off row by row.`,
    howItWorks: [
      'Decide the number of rails, e.g. 3.',
      'Write the message in a diagonal zig-zag: down 1 rail per letter, then back up.',
      'Read each rail left-to-right: Rail 1, then Rail 2, then Rail 3.',
      'To decrypt: work out where each position falls on each rail, then fill in the letters.',
    ],
    example: {
      label: 'Example  (3 rails, message: WEAREDISCOVERED)',
      rails: [
        'Rail 1:  W . . . E . . . I . . . V . .',
        'Rail 2:  . E . R . D . S . O . E . E .',
        'Rail 3:  . . A . . . C . . . R . . . D',
      ],
      ciphertext: 'WEIVERDSOEEACRД  →  WEIERDSOEEACRD',
    },
    inGame: 'The evidence label shows "RAIL-N" where N is the number of rails. Count the rails and re-draw the zig-zag on your tablet.',
  },
  {
    icon: Grid,
    title: 'Columnar Transposition',
    tag: 'CIPHER-C',
    difficulty: 'ADVANCED',
    body: `Columnar Transposition writes the message into a grid row by row, then reads the columns out in an order determined by the alphabetical ranking of a keyword. The result looks like garbled text with no obvious pattern.`,
    howItWorks: [
      'Write the message across rows of a grid whose width equals the keyword length.',
      'Number each column by the alphabetical rank of its keyword letter (A=1, B=2, …).',
      'Read the columns out in numerical order (smallest rank first).',
      'To decrypt: calculate column lengths, fill columns in keyword order, then read rows.',
    ],
    example: {
      label: 'Example  (keyword: CARGO, message: SENDHELP)',
      grid: [
        'C  A  R  G  O',
        '─  ─  ─  ─  ─',
        'S  E  N  D  H',
        'E  L  P  X  X',
      ],
      columnOrder: 'Column rank: A(1) C(2) G(3) O(4) R(5)',
      ciphertext: 'Read order 1→5:  EL · SE · DX · HX · NP  →  ELSEDXHXNP',
    },
    inGame: 'The keyword is embedded in the evidence. Reconstruct the grid dimensions, rank the keyword letters, and read columns in order.',
  },
  {
    icon: Shuffle,
    title: 'Keyword Mixed Alphabet',
    tag: 'CIPHER-K',
    difficulty: 'ADVANCED',
    body: `A Keyword Mixed Alphabet substitutes each letter using a custom alphabet. The custom alphabet begins with the letters of a keyword (removing duplicates), followed by all remaining unused letters in standard order. Every letter maps 1-to-1 to a unique substitute.`,
    howItWorks: [
      'Take a keyword, e.g. CIPHER. Remove duplicate letters → C I P H E R.',
      'Append remaining unused alphabet letters: A B D F G J K L M N O Q S T U V W X Y Z.',
      'Custom alphabet: C I P H E R A B D F G J K L M N O Q S T U V W X Y Z.',
      'A→C, B→I, C→P, D→H, E→E, F→R, … and so on.',
      'To encrypt: substitute each plaintext letter with its custom-alphabet equivalent.',
      'To decrypt: find the custom-alphabet letter and map it back to the standard position.',
    ],
    example: {
      label: 'Example  (keyword: CIPHER)',
      mapping: 'Standard:  A B C D E F G H I J K L M N O P Q R S T U V W X Y Z',
      custom: 'Custom:    C I P H E R A B D F G J K L M N O Q S T U V W X Y Z',
      plaintext: 'Encrypt CASE → PCQE',
    },
    inGame: 'The keyword is hidden inside the cipher message itself — often the first readable word. Build the custom alphabet on your tablet before substituting.',
  },
];

const MODES = [
  {
    icon: BookOpen,
    title: 'Story Mode',
    tag: 'MODE-01',
    body: `A narrative-driven mystery set in rain-soaked 1888 London. Follow the trail of the Silent Cipher Killer — a phantom who encodes every clue in a different cipher. Interrogate suspects, navigate branching dialogue, and race to prevent the next crime before the clock strikes midnight.`,
    details: ['3 acts · 9 crime scenes', 'Adaptive difficulty', 'Branching interrogation outcomes', 'Unlockable case files & lore'],
  },
  {
    icon: Clock,
    title: 'Time Attack',
    tag: 'MODE-02',
    body: `No narrative. No mercy. A random cipher appears and you have a shrinking timer. Decrypt as many intercepts as possible before time expires. Each correct answer adds bonus seconds; each wrong answer costs them. Scores are posted to the global leaderboard.`,
    details: ['Random cipher rotation', 'Combo multiplier system', 'Global leaderboard ranking', 'Unlocks at 3 Story cases cleared'],
  },
  {
    icon: Users,
    title: 'Multiplayer',
    tag: 'MODE-03',
    body: `Face another investigator head-to-head. Both players receive the same cipher simultaneously. First to decrypt and submit the correct plaintext claims the round. Best of five rounds determines the victor. No hints. No mercy. Only instinct.`,
    details: ['Real-time 1v1 decryption race', 'Shared cipher pool', 'Best-of-5 rounds', 'Ranking points on win'],
  },
];

// ── Shared sub-components ─────────────────────────────────────────────────────

function DifficultyPip({ level }) {
  const map = { BEGINNER: { pips: 1, color: '#5a9e6f' }, MODERATE: { pips: 2, color: '#c9a84c' }, ADVANCED: { pips: 3, color: '#8b1a1a' } };
  const { pips, color } = map[level] || map['BEGINNER'];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      {[1, 2, 3].map(i => (
        <span key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: i <= pips ? color : 'rgba(255,255,255,0.12)', display: 'inline-block' }} />
      ))}
      <span style={{ fontFamily: 'Special Elite,monospace', fontSize: 9, letterSpacing: '0.2em', color, marginLeft: 4 }}>{level}</span>
    </span>
  );
}

function Pin() {
  return <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#8b1a1a', boxShadow: '0 0 5px rgba(180,30,30,0.5)', flexShrink: 0, display: 'inline-block' }} />;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Tutorial() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('investigation');
  const [visible, setVisible] = useState(false);
  const [openCipher, setOpenCipher] = useState(null);
  const { playClick } = useSfx();

  useEffect(() => { setTimeout(() => setVisible(true), 80); }, []);

  const tabs = [
    { id: 'investigation', label: 'The Investigation', sub: '4 phases' },
    { id: 'toolkit', label: "Cipher Toolkit", sub: '4 ciphers' },
    { id: 'modes', label: 'Game Modes', sub: '3 modes' },
  ];

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
          --paper:      #1a1208;
          --paper-lt:   #2a1c0c;
          --paper-md:   #221608;
        }

        .tu-root {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
          font-family: 'Special Elite', monospace;
          background: var(--paper);
        }

        /* Blurred bg */
        .tu-bg {
          position: absolute;
          inset: -20px;
          background-image: url(/mainMenuBg.png);
          background-size: cover;
          background-position: center top;
          filter: blur(12px) brightness(0.3) saturate(0.5);
          transform: scale(1.08);
          z-index: 0;
        }

        /* Layered dark scrim */
        .tu-scrim {
          position: absolute;
          inset: 0;
          background: linear-gradient(170deg, rgba(8,5,2,0.7) 0%, rgba(10,6,2,0.85) 100%);
          z-index: 1;
        }

        /* Lamp bloom */
        .tu-bloom {
          position: absolute;
          left: -6%;
          top: 55%;
          width: 500px;
          height: 380px;
          background: radial-gradient(ellipse, rgba(160,105,20,0.1) 0%, transparent 65%);
          z-index: 2;
          pointer-events: none;
        }

        /* Grain */
        .tu-grain {
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          opacity: 0.035;
          z-index: 3;
          pointer-events: none;
          mix-blend-mode: screen;
        }

        /* Layout */
        .tu-layout {
          position: relative;
          z-index: 10;
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          padding: 28px 28px 20px;
          box-sizing: border-box;
          overflow: hidden;
        }

        /* ── Header ── */
        .tu-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 22px;
          padding-bottom: 16px;
          border-bottom: 1px solid rgba(201,168,76,0.2);
          opacity: 0;
          transform: translateY(-14px);
          transition: opacity 0.8s ease, transform 0.8s ease;
          flex-shrink: 0;
        }
        .tu-header.show { opacity: 1; transform: translateY(0); }

        .tu-back {
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
          margin-bottom: 6px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.3);
        }
        .tu-back:hover { 
          color: var(--gold-light);
          background: rgba(42, 26, 12, 1);
          border-color: var(--gold);
          box-shadow: 0 0 15px rgba(203,161,83,0.4);
        }

        .tu-eyebrow {
          font-size: 10px;
          letter-spacing: 0.4em;
          color: var(--gold-dim);
          text-transform: uppercase;
          display: block;
          margin-bottom: 5px;
        }

        .tu-title {
          font-family: 'Playfair Display', serif;
          font-size: 52px;
          font-weight: 900;
          letter-spacing: 0.12em;
          color: var(--gold-light);
          text-transform: uppercase;
          text-shadow: 0 0 30px rgba(200,160,50,0.25), 0 2px 6px rgba(0,0,0,0.9);
          line-height: 1;
        }

        /* ── Body ── */
        .tu-body {
          display: flex;
          gap: 0;
          flex: 1;
          min-height: 0;
          opacity: 0;
          transition: opacity 0.7s ease 0.3s;
        }
        .tu-body.show { opacity: 1; }

        /* ── Sidebar tabs ── */
        .tu-sidebar {
          width: 200px;
          flex-shrink: 0;
          border-right: 1px solid rgba(201,168,76,0.15);
          padding-right: 16px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding-top: 4px;
        }

        .tu-tab {
          text-align: left;
          background: none;
          border: none;
          border-left: 2px solid transparent;
          padding: 12px 14px;
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
        }
        .tu-tab::before {
          content: '';
          position: absolute;
          left: 0; top: 0; bottom: 0;
          width: 2px;
          background: var(--red);
          transform: scaleY(0);
          transform-origin: bottom;
          transition: transform 0.22s ease;
        }
        .tu-tab:hover::before,
        .tu-tab.active::before { transform: scaleY(1); }

        .tu-tab:hover, .tu-tab.active {
          background: rgba(201,168,76,0.06);
        }

        .tu-tab-label {
          font-family: 'Special Elite', monospace;
          font-size: 14px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          display: block;
          transition: color 0.2s;
          color: #8a7a58;
        }
        .tu-tab.active .tu-tab-label,
        .tu-tab:hover .tu-tab-label { color: var(--gold-light); }

        .tu-tab-sub {
          font-size: 9px;
          letter-spacing: 0.15em;
          color: var(--red);
          opacity: 0.7;
          margin-top: 3px;
          display: block;
        }

        /* ── Content pane ── */
        .tu-content {
          flex: 1;
          min-width: 0;
          padding-left: 28px;
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: rgba(201,168,76,0.2) transparent;
        }
        .tu-content::-webkit-scrollbar { width: 4px; }
        .tu-content::-webkit-scrollbar-thumb { background: rgba(201,168,76,0.2); border-radius: 2px; }

        /* ── Cards ── */
        .tu-card {
          background: rgba(18,12,4,0.75);
          border: 1px solid rgba(201,168,76,0.12);
          border-left: 3px solid rgba(201,168,76,0.25);
          padding: 20px 22px;
          margin-bottom: 14px;
          opacity: 0;
          animation: cardIn 0.4s ease forwards;
          transition: border-color 0.2s, background 0.2s;
        }
        .tu-card:hover {
          border-color: rgba(201,168,76,0.3);
          background: rgba(22,15,5,0.85);
        }

        @keyframes cardIn {
          from { opacity:0; transform: translateX(-10px); }
          to   { opacity:1; transform: translateX(0); }
        }

        .tu-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
          flex-wrap: wrap;
          gap: 8px;
        }

        .tu-card-title-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .tu-card-title {
          font-family: 'Playfair Display', serif;
          font-size: 18px;
          font-weight: 700;
          color: var(--cream);
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .tu-card-tag {
          font-size: 9px;
          letter-spacing: 0.22em;
          color: var(--gold-dim);
          opacity: 0.7;
          flex-shrink: 0;
        }

        .tu-card-body {
          font-family: system-ui, -apple-system, sans-serif;
          font-weight: 300;
          font-size: 18px;
          color: #e8dcc0;
          line-height: 1.8;
          margin-bottom: 16px;
          letter-spacing: 0.03em;
        }

        /* Tip / how-it-works blocks */
        .tu-tip {
          background: rgba(139,26,26,0.08);
          border-left: 2px solid rgba(139,26,26,0.4);
          padding: 8px 12px;
          font-size: 11px;
          color: #9a7060;
          letter-spacing: 0.06em;
          font-family: 'Special Elite', monospace;
          margin-top: 10px;
        }

        .tu-steps {
          margin: 10px 0 0;
          padding: 0;
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .tu-steps li {
          display: flex;
          gap: 10px;
          font-family: system-ui, -apple-system, sans-serif;
          font-weight: 300;
          font-size: 15px;
          color: #d8cba0;
          line-height: 1.7;
          letter-spacing: 0.02em;
        }
        .tu-step-num {
          color: var(--gold-dim);
          flex-shrink: 0;
          font-size: 10px;
          margin-top: 2px;
          letter-spacing: 0.1em;
        }

        /* Code / example block */
        .tu-code {
          background: rgba(8,5,2,0.7);
          border: 1px solid rgba(201,168,76,0.1);
          padding: 12px 14px;
          margin-top: 12px;
          font-family: 'Courier New', monospace;
          font-size: 11px;
          color: #7a9a6a;
          line-height: 1.8;
          white-space: pre-wrap;
          word-break: break-word;
        }
        .tu-code-label {
          font-family: 'Special Elite', monospace;
          font-size: 9px;
          letter-spacing: 0.25em;
          color: var(--gold-dim);
          text-transform: uppercase;
          margin-bottom: 8px;
          display: block;
        }

        /* In-game callout */
        .tu-ingame {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          margin-top: 12px;
          padding: 10px 12px;
          background: rgba(201,168,76,0.05);
          border: 1px dashed rgba(201,168,76,0.2);
        }
        .tu-ingame-label {
          font-size: 9px;
          letter-spacing: 0.25em;
          color: var(--gold);
          text-transform: uppercase;
          flex-shrink: 0;
          padding-top: 2px;
        }
        .tu-ingame-text {
          font-family: 'Special Elite', monospace;
          font-size: 11px;
          color: #8a7a58;
          line-height: 1.65;
        }

        /* Expand button for ciphers */
        .tu-expand-btn {
          background: none;
          border: 1px solid rgba(201,168,76,0.2);
          color: var(--gold-dim);
          font-family: 'Special Elite', monospace;
          font-size: 10px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          padding: 5px 12px;
          cursor: pointer;
          margin-top: 10px;
          transition: all 0.2s;
        }
        .tu-expand-btn:hover {
          background: rgba(201,168,76,0.07);
          color: var(--gold-light);
          border-color: var(--gold);
        }

        /* Mode detail pills */
        .tu-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 12px;
        }
        .tu-pill {
          font-family: 'Special Elite', monospace;
          font-size: 10px;
          letter-spacing: 0.15em;
          color: var(--gold-dim);
          border: 1px solid rgba(201,168,76,0.2);
          padding: 4px 10px;
        }

        /* Rail fence diagram */
        .tu-rail {
          font-family: 'Courier New', monospace;
          font-size: 11px;
          color: #6a9a5a;
          line-height: 2;
        }
      `}</style>

      <div className="tu-root">
        <div className="tu-bg" />
        <div className="tu-scrim" />
        <div className="tu-bloom" />
        <div className="tu-grain" />

        <div className="tu-layout">

          {/* Header */}
          <div className={`tu-header ${visible ? 'show' : ''}`}>
            <div>
              <button className="tu-back" onClick={() => navigate('/')}>
                <ArrowLeft size={12} /> Return to Menu
              </button>
              <span className="tu-eyebrow">— Archive Access · CQ Division —</span>
              <h1 className="tu-title">Detective's Manual</h1>
            </div>
          </div>

          {/* Body */}
          <div className={`tu-body ${visible ? 'show' : ''}`}>

            {/* Sidebar */}
            <div className="tu-sidebar">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  className={`tu-tab ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => { if (activeTab !== tab.id) { playClick(); setActiveTab(tab.id); setOpenCipher(null); } }}
                >
                  <span className="tu-tab-label">{tab.label}</span>
                  <span className="tu-tab-sub">{tab.sub}</span>
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="tu-content">

              {/* ── Investigation ── */}
              {activeTab === 'investigation' && INVESTIGATION_STEPS.map((step, i) => (
                <div
                  key={step.tag}
                  className="tu-card"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <div className="tu-card-header">
                    <div className="tu-card-title-row">
                      <Pin />
                      <step.icon size={14} style={{ color: 'var(--gold)', flexShrink: 0 }} />
                      <span className="tu-card-title">{step.title}</span>
                    </div>
                    <span className="tu-card-tag">{step.tag}</span>
                  </div>
                  <p className="tu-card-body">{step.body}</p>
                  <div className="tu-tip">{step.tip}</div>
                </div>
              ))}

              {/* ── Cipher Toolkit ── */}
              {activeTab === 'toolkit' && CIPHERS.map((cipher, i) => {
                const isOpen = openCipher === cipher.tag;
                return (
                  <div
                    key={cipher.tag}
                    className="tu-card"
                    style={{ animationDelay: `${i * 80}ms` }}
                  >
                    <div className="tu-card-header">
                      <div className="tu-card-title-row">
                        <Pin />
                        <cipher.icon size={14} style={{ color: 'var(--gold)', flexShrink: 0 }} />
                        <span className="tu-card-title">{cipher.title}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <DifficultyPip level={cipher.difficulty} />
                        <span className="tu-card-tag">{cipher.tag}</span>
                      </div>
                    </div>

                    <p className="tu-card-body">{cipher.body}</p>

                    {/* How it works */}
                    <div style={{ marginBottom: 4 }}>
                      <span style={{ fontFamily: 'Special Elite,monospace', fontSize: 9, letterSpacing: '0.28em', color: 'var(--gold-dim)', textTransform: 'uppercase' }}>
                        How It Works
                      </span>
                    </div>
                    <ol className="tu-steps">
                      {cipher.howItWorks.map((step, si) => (
                        <li key={si}>
                          <span className="tu-step-num">{String(si + 1).padStart(2, '0')}.</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>

                    {/* Example — toggle */}
                    <button
                      className="tu-expand-btn"
                      onClick={() => { playClick(); setOpenCipher(isOpen ? null : cipher.tag); }}
                    >
                      {isOpen ? '▲ Hide Example' : '▼ Show Example'}
                    </button>

                    {isOpen && (
                      <div style={{ marginTop: 10 }}>
                        {/* Vigenère */}
                        {cipher.tag === 'CIPHER-V' && (
                          <div className="tu-code">
                            <span className="tu-code-label">{cipher.example.label}</span>
                            {`Plaintext:   ${cipher.example.plaintext}\nKeyword:     ${cipher.example.keyword}\nCiphertext:  ${cipher.example.ciphertext}\n\nShift breakdown:\n`}
                            {cipher.example.steps.map((s, si) => `  ${s}\n`).join('')}
                          </div>
                        )}
                        {/* Rail Fence */}
                        {cipher.tag === 'CIPHER-R' && (
                          <div className="tu-code">
                            <span className="tu-code-label">{cipher.example.label}</span>
                            {cipher.example.rails.join('\n')}
                            {`\n\nResult: ${cipher.example.ciphertext}`}
                          </div>
                        )}
                        {/* Columnar */}
                        {cipher.tag === 'CIPHER-C' && (
                          <div className="tu-code">
                            <span className="tu-code-label">{cipher.example.label}</span>
                            {cipher.example.grid.join('\n')}
                            {`\n\n${cipher.example.columnOrder}\nCiphertext: ${cipher.example.ciphertext}`}
                          </div>
                        )}
                        {/* Keyword */}
                        {cipher.tag === 'CIPHER-K' && (
                          <div className="tu-code">
                            <span className="tu-code-label">{cipher.example.label}</span>
                            {`${cipher.example.mapping}\n${cipher.example.custom}\n\n${cipher.example.plaintext}`}
                          </div>
                        )}
                      </div>
                    )}

                    {/* In-game hint */}
                    <div className="tu-ingame">
                      <span className="tu-ingame-label">In-Game</span>
                      <span className="tu-ingame-text">{cipher.inGame}</span>
                    </div>
                  </div>
                );
              })}

              {/* ── Modes ── */}
              {activeTab === 'modes' && MODES.map((mode, i) => (
                <div
                  key={mode.tag}
                  className="tu-card"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <div className="tu-card-header">
                    <div className="tu-card-title-row">
                      <Pin />
                      <mode.icon size={14} style={{ color: 'var(--gold)', flexShrink: 0 }} />
                      <span className="tu-card-title">{mode.title}</span>
                    </div>
                    <span className="tu-card-tag">{mode.tag}</span>
                  </div>
                  <p className="tu-card-body">{mode.body}</p>
                  <div className="tu-pills">
                    {mode.details.map(d => <span key={d} className="tu-pill">{d}</span>)}
                  </div>
                </div>
              ))}

            </div>
          </div>

        </div>
      </div>
    </>
  );
}