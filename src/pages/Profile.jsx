import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, LogOut, Brain, Target, Shield, BarChart3 } from 'lucide-react';
import { useSfx } from '../hooks/useSfx';
import Button from '../components/ui/Button';
import { useGameStore } from '../store/useGameStore';
import { logoutUser } from '../services/authService';
import { getPlayerInsights } from '../services/mlService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useState, useEffect, useRef } from 'react';

/* ─── Helpers ─────────────────────────────────────────────────────────── */

/** Human-readable cipher names */
const CIPHER_LABELS = {
  vigenere: 'Vigenère',
  railfence: 'Rail Fence',
  columnar: 'Columnar',
  substitution: 'Substitution',
  caesar: 'Caesar',
};

/** Difficulty-encoded value for the ML model */
const DIFFICULTY_ENCODING = { Easy: 0, Medium: 1, Hard: 2 };

/** Bar colours for cipher accuracy chart */
const BAR_COLORS = {
  vigenere: { bg: 'rgba(201,168,76,0.15)', fill: '#c9a84c' },
  railfence: { bg: 'rgba(74,222,128,0.15)', fill: '#4ade80' },
  columnar: { bg: 'rgba(96,165,250,0.15)', fill: '#60a5fa' },
  substitution: { bg: 'rgba(251,146,60,0.15)', fill: '#fb923c' },
  caesar: { bg: 'rgba(167,139,250,0.15)', fill: '#a78bfa' },
};

/* ─── Component ───────────────────────────────────────────────────────── */

export default function Profile() {
  const navigate = useNavigate();
  const { playClick } = useSfx();
  const { currentUser } = useGameStore();

  const [casesSolved, setCasesSolved] = useState(0);
  const [clearance, setClearance] = useState('Classified');

  // ML state
  const [mlInsights, setMlInsights] = useState(null);
  const [mlLoading, setMlLoading] = useState(false);
  const [playerStats, setPlayerStats] = useState(null);

  // Prevent double-fetch
  const fetchedMlRef = useRef(false);

  /* ── Firestore profile fetch ─────────────────────────────────────── */
  useEffect(() => {
    if (!currentUser?.uid) return;

    const fetchProfile = async () => {
      try {
        // Story progress
        const storySnap = await getDoc(doc(db, 'storyProgress', currentUser.uid));
        let evidenceCount = 0;
        let difficulty = 'Classified';
        let storyCompleted = 0;

        if (storySnap.exists()) {
          const data = storySnap.data();
          const evidence = data.collectedEvidence || data.savedStoryProgress?.cluesList || [];
          evidenceCount = evidence.length;
          const diff = data.savedStoryProgress?.difficulty;
          if (diff) difficulty = diff;
          // Consider story complete if phase is DEDUCTION or beyond
          const phase = data.savedStoryProgress?.phase;
          if (phase === 'DEDUCTION' || phase === 'COMPLETE' || phase === 'RESOLUTION') {
            storyCompleted = 1;
          }
        }
        setCasesSolved(evidenceCount);
        setClearance(difficulty);

        // Time-attack leaderboard entry
        let bestTaScore = 0;
        try {
          const taSnap = await getDoc(
            doc(db, 'leaderboards', 'timeAttack', 'entries', currentUser.uid)
          );
          if (taSnap.exists()) bestTaScore = taSnap.data().score || 0;
        } catch (err) { console.warn('Profile: failed to read TA leaderboard entry:', err); }

        // Multiplayer wins / losses
        let wins = 0;
        let losses = 0;
        try {
          const mpSnap = await getDoc(
            doc(db, 'leaderboards', 'multiplayer', 'entries', currentUser.uid)
          );
          if (mpSnap.exists()) {
            wins = mpSnap.data().wins || 0;
            losses = mpSnap.data().losses || 0;
          }
        } catch (err) { console.warn('Profile: failed to read MP leaderboard entry:', err); }
        const winRate = wins + losses > 0 ? parseFloat((wins / (wins + losses)).toFixed(2)) : 0;

        // Cipher stats (per-cipher attempts/solved → accuracy 0-1)
        let cipherStats = {};
        try {
          const userSnap = await getDoc(doc(db, 'users', currentUser.uid));
          if (userSnap.exists()) cipherStats = userSnap.data().cipherStats || {};
        } catch (err) { console.warn('Profile: failed to read cipher stats:', err); }

        const cipherAccuracy = (type) => {
          const s = cipherStats[type];
          if (!s || !s.attempts) return 0;
          return parseFloat((s.solved / s.attempts).toFixed(2));
        };

        const stats = {
          puzzles_solved: evidenceCount,
          best_ta_score: bestTaScore,
          win_rate: winRate,
          difficulty_encoded: DIFFICULTY_ENCODING[difficulty] ?? 1,
          story_completed: storyCompleted,
          vigenere_accuracy: cipherAccuracy('vigenere'),
          railfence_accuracy: cipherAccuracy('railfence'),
          columnar_accuracy: cipherAccuracy('columnar'),
          substitution_accuracy: cipherAccuracy('substitution'),
          caesar_accuracy: cipherAccuracy('caesar'),
        };

        setPlayerStats(stats);
      } catch (err) {
        console.error('Failed to load profile data:', err);
      }
    };

    fetchProfile();
  }, [currentUser]);

  /* ── ML insights fetch (runs once playerStats is ready) ──────────── */
  useEffect(() => {
    if (!playerStats || fetchedMlRef.current) return;
    fetchedMlRef.current = true;

    const fetchInsights = async () => {
      setMlLoading(true);
      const result = await getPlayerInsights(playerStats);
      setMlInsights(result);
      setMlLoading(false);
    };

    fetchInsights();
  }, [playerStats]);

  /* ── Actions ─────────────────────────────────────────────────────── */
  const handleLogout = async () => {
    playClick();
    try {
      await logoutUser();
      navigate('/');
    } catch (err) {
      console.error('Logout failed', err);
    }
  };

  const handleBack = () => {
    playClick();
    navigate('/');
  };

  /* ── Access-denied / loading state ───────────────────────────────── */
  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full bg-[#1a1208] text-[#8b1a1a] font-['Special_Elite']">
        <div className="absolute inset-0 bg-[url('/mainMenuBg.png')] bg-cover bg-center z-0 opacity-20" />
        <p className="z-10 text-2xl tracking-widest uppercase animate-pulse">Access Denied / Loading Profile...</p>
        <Button 
          onClick={handleBack}
          className="mt-8 z-10 !text-xs !py-2 !px-6"
        >
          Return
        </Button>
      </div>
    );
  }

  /* ── Render ──────────────────────────────────────────────────────── */
  return (
    <div className="relative w-full h-full overflow-auto font-['Special_Elite'] text-[#e8dcc0] cursor-default bg-[#1a1208]">
      {/* Background & Overlays */}
      <div className="fixed inset-0 bg-[url('/mainMenuBg.png')] bg-cover bg-center z-0 opacity-40" />
      <div className="fixed inset-0 bg-gradient-to-b from-[#080502]/80 via-[#080502]/60 to-[#080502]/95 z-10" />
      <div className="fixed inset-0 bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 256 256%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22 opacity=%221%22/%3E%3C/svg%3E')] opacity-[0.04] pointer-events-none mix-blend-screen z-20" />

      {/* Top Bar Navigation */}
      <div className="relative z-30 flex items-center justify-between px-8 py-6 border-b border-[#7a6030]/30 bg-[#0a0703]/60 backdrop-blur-sm">
        <Button
          onClick={handleBack}
          className="!text-xs !py-2 !px-4"
        >
          <ArrowLeft size={14} />
          Return to Menu
        </Button>

        <div className="flex flex-col items-end">
          <h2 className="font-['Playfair_Display'] text-2xl text-[#e8c96a] tracking-widest font-bold">AGENT PROFILE</h2>
          <span className="text-[10px] text-[#7a6030] tracking-[0.3em] uppercase">Confidential Dossier</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-30 w-full max-w-4xl mx-auto mt-12 px-8 pb-16">
        <div className="bg-[#1a1208]/80 border border-[#c9a84c]/30 backdrop-blur-md p-8 relative">
          {/* Decorative Corner Lines */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t border-l border-[#c9a84c] -translate-x-1 -translate-y-1" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t border-r border-[#c9a84c] translate-x-1 -translate-y-1" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b border-l border-[#c9a84c] -translate-x-1 translate-y-1" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b border-r border-[#c9a84c] translate-x-1 translate-y-1" />

          <div className="flex flex-col md:flex-row gap-12">
            {/* Left: Avatar/Icon */}
            <div className="flex flex-col items-center gap-4">
              <div className="w-32 h-32 border border-[#7a6030] bg-[#2a1e0e] flex items-center justify-center relative overflow-hidden">
                <User size={64} className="text-[#c9a84c] opacity-80" />
                {/* Scanline effect */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#c9a84c]/10 to-transparent h-[200%] animate-[scan_4s_linear_infinite]" />
              </div>
              <div className="text-center">
                <p className="text-[10px] text-[#7a6030] tracking-[0.2em] mb-1">ID STATUS</p>
                <div className="px-3 py-1 bg-green-900/20 border border-green-700/50 text-green-500 text-[10px] tracking-widest">VERIFIED</div>
              </div>
            </div>

            {/* Right: Info */}
            <div className="flex-1 flex flex-col gap-8">
              <div>
                <h3 className="font-['Playfair_Display'] text-3xl text-[#e8c96a] mb-2">{currentUser.username || 'Agent'}</h3>
                <div className="flex items-center gap-3">
                  <div className="h-px w-12 bg-[#7a6030]" />
                  <span className="text-[#c9a84c] text-xs tracking-[0.2em]">OPERATIVE TIER I</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-[10px] text-[#7a6030] tracking-[0.2em]">REGISTERED EMAIL</p>
                  <p className="text-lg text-[#e8dcc0] truncate" title={currentUser.email}>{currentUser.email}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-[#7a6030] tracking-[0.2em]">FRIEND CODE</p>
                  <p className="text-lg text-[#e8dcc0]">{currentUser.friendCode || 'Pending...'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-[#7a6030] tracking-[0.2em]">CASES SOLVED</p>
                  <p className="text-lg text-[#e8dcc0]">{casesSolved}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-[#7a6030] tracking-[0.2em]">SECURITY CLEARANCE</p>
                  <p className="text-lg text-[#e8dcc0]">{clearance}</p>
                </div>
              </div>

              <div className="pt-6 border-t border-[#7a6030]/30 flex justify-end">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-6 py-3 border border-[#8b1a1a]/50 text-[#8b1a1a] hover:bg-[#8b1a1a]/10 hover:border-[#8b1a1a] transition-all group"
                >
                  <LogOut size={16} className="group-hover:-translate-x-1 transition-transform" />
                  <span className="text-xs tracking-[0.2em] uppercase">Revoke Access (Logout)</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── ML Insights Section ──────────────────────────────────── */}
        {mlLoading && (
          <div className="mt-8 space-y-4">
            <div className="flex items-center gap-3 mb-6">
              <Brain size={18} className="text-[#c9a84c]" />
              <h3 className="font-['Playfair_Display'] text-xl text-[#e8c96a] tracking-widest">INTELLIGENCE ANALYSIS</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-[#1a1208]/80 border border-[#7a6030]/20 p-6 animate-pulse">
                  <div className="h-3 w-24 bg-[#7a6030]/30 rounded mb-4" />
                  <div className="h-6 w-32 bg-[#7a6030]/20 rounded mb-2" />
                  <div className="h-3 w-20 bg-[#7a6030]/10 rounded" />
                </div>
              ))}
            </div>
            <div className="bg-[#1a1208]/80 border border-[#7a6030]/20 p-6 animate-pulse">
              <div className="h-3 w-40 bg-[#7a6030]/30 rounded mb-6" />
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="mb-4 last:mb-0">
                  <div className="h-3 w-24 bg-[#7a6030]/20 rounded mb-2" />
                  <div className="h-5 w-full bg-[#7a6030]/10 rounded" />
                </div>
              ))}
            </div>
          </div>
        )}

        {mlInsights && !mlLoading && (
          <div className="mt-8 space-y-4">
            {/* Section header */}
            <div className="flex items-center gap-3 mb-6">
              <Brain size={18} className="text-[#c9a84c]" />
              <h3 className="font-['Playfair_Display'] text-xl text-[#e8c96a] tracking-widest">INTELLIGENCE ANALYSIS</h3>
              <div className="flex-1 h-px bg-gradient-to-r from-[#7a6030]/50 to-transparent" />
            </div>

            {/* Three insight cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Skill Classification */}
              <div className="bg-[#1a1208]/80 border border-[#c9a84c]/20 p-6 relative overflow-hidden group hover:border-[#c9a84c]/50 transition-all duration-300">
                <div className="absolute top-0 right-0 w-20 h-20 bg-[#c9a84c]/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-[#c9a84c]/10 transition-all" />
                <div className="flex items-center gap-2 mb-3">
                  <Shield size={14} className="text-[#c9a84c]" />
                  <p className="text-[10px] text-[#7a6030] tracking-[0.2em]">SKILL CLASSIFICATION</p>
                </div>
                <p className="text-2xl font-['Playfair_Display'] text-[#e8c96a] capitalize mb-1">
                  {mlInsights.skill_tier}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 h-1.5 bg-[#7a6030]/20 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000 ease-out"
                      style={{
                        width: `${Math.round(mlInsights.confidence * 100)}%`,
                        background: 'linear-gradient(90deg, #c9a84c, #e8c96a)',
                      }}
                    />
                  </div>
                  <span className="text-xs text-[#c9a84c] font-mono">{Math.round(mlInsights.confidence * 100)}%</span>
                </div>
                <p className="text-[9px] text-[#7a6030]/60 mt-1 tracking-wider">CONFIDENCE</p>
              </div>

              {/* Recommended Difficulty */}
              <div className="bg-[#1a1208]/80 border border-[#4ade80]/20 p-6 relative overflow-hidden group hover:border-[#4ade80]/50 transition-all duration-300">
                <div className="absolute top-0 right-0 w-20 h-20 bg-[#4ade80]/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-[#4ade80]/10 transition-all" />
                <div className="flex items-center gap-2 mb-3">
                  <Target size={14} className="text-[#4ade80]" />
                  <p className="text-[10px] text-[#7a6030] tracking-[0.2em]">RECOMMENDED DIFFICULTY</p>
                </div>
                <p className="text-2xl font-['Playfair_Display'] text-[#4ade80] mb-1">
                  {mlInsights.recommended_difficulty}
                </p>
                <p className="text-[10px] text-[#7a6030]/60 mt-2 tracking-wider leading-relaxed">
                  OPTIMAL CHALLENGE LEVEL
                </p>
              </div>

              {/* Weakest Cipher */}
              <div className="bg-[#1a1208]/80 border border-[#fb923c]/20 p-6 relative overflow-hidden group hover:border-[#fb923c]/50 transition-all duration-300">
                <div className="absolute top-0 right-0 w-20 h-20 bg-[#fb923c]/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-[#fb923c]/10 transition-all" />
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 size={14} className="text-[#fb923c]" />
                  <p className="text-[10px] text-[#7a6030] tracking-[0.2em]">WEAKEST CIPHER</p>
                </div>
                <p className="text-2xl font-['Playfair_Display'] text-[#fb923c] mb-1">
                  {CIPHER_LABELS[mlInsights.weakest_cipher] || mlInsights.weakest_cipher}
                </p>
                <p className="text-[10px] text-[#7a6030]/60 mt-2 tracking-wider leading-relaxed">
                  FOCUS TRAINING HERE
                </p>
              </div>
            </div>

            {/* Cipher Accuracy Bar Chart */}
            {playerStats && (
              <div className="bg-[#1a1208]/80 border border-[#c9a84c]/20 p-6">
                <div className="flex items-center gap-2 mb-6">
                  <BarChart3 size={14} className="text-[#c9a84c]" />
                  <p className="text-[10px] text-[#7a6030] tracking-[0.2em]">CIPHER PROFICIENCY BREAKDOWN</p>
                </div>
                <div className="space-y-4">
                  {Object.entries({
                    vigenere: playerStats.vigenere_accuracy,
                    railfence: playerStats.railfence_accuracy,
                    columnar: playerStats.columnar_accuracy,
                    substitution: playerStats.substitution_accuracy,
                    caesar: playerStats.caesar_accuracy,
                  }).map(([cipher, accuracy]) => {
                    const pct = Math.round(accuracy * 100);
                    const colors = BAR_COLORS[cipher];
                    const isWeakest = cipher === mlInsights.weakest_cipher;
                    return (
                      <div key={cipher} className="group">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span
                              className="text-xs tracking-wider"
                              style={{ color: colors.fill }}
                            >
                              {CIPHER_LABELS[cipher]}
                            </span>
                            {isWeakest && (
                              <span className="text-[8px] px-1.5 py-0.5 bg-[#fb923c]/10 border border-[#fb923c]/30 text-[#fb923c] tracking-widest">
                                WEAK
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-mono" style={{ color: colors.fill }}>
                            {pct}%
                          </span>
                        </div>
                        <div
                          className="h-3 rounded-sm overflow-hidden relative"
                          style={{ backgroundColor: colors.bg }}
                        >
                          <div
                            className="h-full rounded-sm transition-all duration-1000 ease-out relative"
                            style={{
                              width: `${Math.max(pct, 2)}%`,
                              backgroundColor: colors.fill,
                              opacity: isWeakest ? 0.6 : 0.85,
                            }}
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/10" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(50%); }
        }
      `}</style>
    </div>
  );
}
