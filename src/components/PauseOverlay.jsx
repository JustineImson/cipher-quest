import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/useGameStore';
import { Play, Settings, LogOut } from 'lucide-react';
import { useSfx } from '../hooks/useSfx';

export default function PauseOverlay() {
  const navigate = useNavigate();
  const { isStoryPaused, togglePause } = useGameStore();
  const { playClick } = useSfx();

  if (!isStoryPaused) return null;

  const handleContinue = () => {
    playClick();
    // Sets isStoryPaused to false, which the Phaser scenes are listening to
    useGameStore.setState({ isStoryPaused: false });
  };

  const handleSettings = () => {
    playClick();
    useGameStore.setState({ isSettingsOpen: true });
  };

  const handleExit = () => {
    playClick();
    useGameStore.setState({ isStoryPaused: false });
    navigate('/');
  };

  return (
    <div className="absolute inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-[#1a1208] border border-mystery-gold/30 p-8 flex flex-col items-center gap-6 min-w-[300px] shadow-[0_0_40px_rgba(0,0,0,0.9)] border-l-4 border-l-[#8b1a1a]">
        <h2 className="font-serif text-3xl text-[#e8c96a] uppercase tracking-widest drop-shadow-md mb-4">Paused</h2>

        <button
          onClick={handleContinue}
          className="w-full flex items-center gap-4 px-6 py-3 bg-[#2a1e0e] hover:bg-[#3a2c18] border border-[#7a6030]/50 text-[#e8dcc0] transition-colors font-mono tracking-widest uppercase text-sm"
        >
          <Play size={16} className="text-[#c9a84c]" /> Continue
        </button>

        <button
          onClick={handleSettings}
          className="w-full flex items-center gap-4 px-6 py-3 bg-[#2a1e0e] hover:bg-[#3a2c18] border border-[#7a6030]/50 text-[#e8dcc0] transition-colors font-mono tracking-widest uppercase text-sm"
        >
          <Settings size={16} className="text-[#c9a84c]" /> Settings
        </button>

        <button
          onClick={handleExit}
          className="w-full flex items-center gap-4 px-6 py-3 bg-[#2a1e0e] hover:bg-[#3a2c18] border border-[#7a6030]/50 text-[#e8dcc0] transition-colors font-mono tracking-widest uppercase text-sm"
        >
          <LogOut size={16} className="text-[#8b1a1a]" /> Exit to Menu
        </button>
      </div>
    </div>
  );
}
