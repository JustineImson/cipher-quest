import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, LogOut } from 'lucide-react';
import { useSfx } from '../hooks/useSfx';
import Button from '../components/ui/Button';
import { useGameStore } from '../store/useGameStore';
import { logoutUser } from '../services/authService';

export default function Profile() {
  const navigate = useNavigate();
  const { playClick } = useSfx();
  const { currentUser } = useGameStore();

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

  return (
    <div className="relative w-full h-full overflow-hidden font-['Special_Elite'] text-[#e8dcc0] cursor-default bg-[#1a1208]">
      {/* Background & Overlays */}
      <div className="absolute inset-0 bg-[url('/mainMenuBg.png')] bg-cover bg-center z-0 opacity-40" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#080502]/80 via-[#080502]/60 to-[#080502]/95 z-10" />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 256 256%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22 opacity=%221%22/%3E%3C/svg%3E')] opacity-[0.04] pointer-events-none mix-blend-screen z-20" />

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
      <div className="relative z-30 w-full max-w-4xl mx-auto mt-12 px-8">
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
                  <p className="text-lg text-[#e8dcc0]">0</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-[#7a6030] tracking-[0.2em]">SECURITY CLEARANCE</p>
                  <p className="text-lg text-[#e8dcc0]">Classified</p>
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
