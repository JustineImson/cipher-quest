import React from 'react';
import { useGameStore } from '../../store/useGameStore';

export default function DifficultySplash() {
  const { showDifficultySplash, currentDifficulty } = useGameStore();

  if (!showDifficultySplash) return null;

  const diffConfig = {
    easy: { label: 'EASY', accent: '#4ade80', subtext: 'Initiate Protocol', glow: 'rgba(74, 222, 128, 0.4)' },
    moderate: { label: 'MODERATE', accent: '#e8c96a', subtext: 'Escalation Detected', glow: 'rgba(232, 201, 106, 0.4)' },
    hard: { label: 'HARD', accent: '#ef4444', subtext: 'Critical Threat Level', glow: 'rgba(239, 68, 68, 0.4)' }
  };

  const config = diffConfig[currentDifficulty] || diffConfig.easy;

  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center pointer-events-none overflow-hidden">
      <style>{`
        @keyframes splashIn {
          0% { opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes stampSlam {
          0% { opacity: 0; transform: scale(2.5) rotate(-8deg); }
          15% { opacity: 1; transform: scale(1) rotate(-3deg); }
          20% { transform: scale(1.04) rotate(-3deg); }
          25% { transform: scale(1) rotate(-3deg); }
          80% { opacity: 1; transform: scale(1) rotate(-3deg); }
          100% { opacity: 0; transform: scale(0.96) rotate(-3deg); }
        }
        @keyframes dashExpand {
          0% { width: 0; opacity: 0; }
          25% { width: 100%; opacity: 0.6; }
          80% { width: 100%; opacity: 0.6; }
          100% { width: 0; opacity: 0; }
        }
        @keyframes fadeLabel {
          0% { opacity: 0; transform: translateY(6px); }
          25% { opacity: 0.7; transform: translateY(0); }
          80% { opacity: 0.7; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-4px); }
        }
      `}</style>

      {/* Dim overlay */}
      <div
        className="absolute inset-0 bg-black/70"
        style={{ animation: 'splashIn 1.6s ease-out forwards' }}
      />

      {/* Content */}
      <div className="relative flex flex-col items-center">
        {/* Top dashed line */}
        <div className="flex justify-center mb-4">
          <div
            className="h-[1px]"
            style={{
              background: `linear-gradient(to right, transparent, ${config.accent}, transparent)`,
              animation: 'dashExpand 1.6s ease-out forwards'
            }}
          />
        </div>

        {/* Subtext above */}
        <span
          className="text-[11px] tracking-[0.5em] uppercase font-mono mb-3"
          style={{
            color: config.accent,
            animation: 'fadeLabel 1.6s ease-out forwards',
            textShadow: `0 0 8px ${config.glow}`
          }}
        >
          {config.subtext}
        </span>

        {/* Main stamp text */}
        <h1
          className="text-7xl md:text-9xl font-black uppercase tracking-[0.2em] font-serif leading-none select-none"
          style={{
            color: config.accent,
            animation: 'stampSlam 1.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            textShadow: `0 0 30px ${config.glow}, 0 0 60px ${config.glow}, 0 4px 8px rgba(0,0,0,0.8)`,
            WebkitTextStroke: `1px ${config.accent}`,
            paddingLeft: '0.2em'
          }}
        >
          {config.label}
        </h1>

        {/* Bottom dashed line */}
        <div className="flex justify-center mt-4">
          <div
            className="h-[1px]"
            style={{
              background: `linear-gradient(to right, transparent, ${config.accent}, transparent)`,
              animation: 'dashExpand 1.6s ease-out 0.05s forwards'
            }}
          />
        </div>
      </div>
    </div>
  );
}
