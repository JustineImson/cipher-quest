import React, { useState, useEffect } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { X, FileText, Search } from 'lucide-react';

export default function DeductionBoardOverlay() {
  const { isDeductionBoardOpen, toggleDeductionBoard, collectedEvidence } = useGameStore();
  const [selectedEvidence, setSelectedEvidence] = useState(null);

  useEffect(() => {
    const handleOpenEvidence = (e) => {
      setSelectedEvidence(e.detail);
      useGameStore.getState().setDeductionBoardOpen(true);
    };

    window.addEventListener('openEvidenceNotebook', handleOpenEvidence);
    return () => window.removeEventListener('openEvidenceNotebook', handleOpenEvidence);
  }, []);

  if (!isDeductionBoardOpen) return null;

  return (
    <div className="absolute inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 md:p-8 animate-[fadeIn_0.3s_ease-out]">
      {/* Leather Notebook Background */}
      <div className="relative w-full max-w-5xl h-[85vh] bg-[#2a1c11] rounded-lg shadow-[0_20px_50px_rgba(0,0,0,0.9),inset_0_0_100px_rgba(20,10,5,1)] border-2 border-[#1a100a] flex flex-col md:flex-row overflow-hidden">
        
        {/* Leather texture overlay */}
        <div className="absolute inset-0 opacity-20 pointer-events-none mix-blend-multiply" 
             style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }}>
        </div>

        {/* Notebook Spine (Center fold on desktop, top fold on mobile) */}
        <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-8 -ml-4 bg-gradient-to-r from-[#1a100a] via-[#3a2618] to-[#1a100a] shadow-[inset_0_0_10px_rgba(0,0,0,0.8)] z-10"></div>
        <div className="md:hidden absolute top-[40%] left-0 right-0 h-4 bg-gradient-to-b from-[#1a100a] via-[#3a2618] to-[#1a100a] shadow-[inset_0_0_10px_rgba(0,0,0,0.8)] z-10"></div>

        {/* Left Page (Evidence List) */}
        <div className="flex-1 bg-[#e8dcc0] m-2 md:mr-4 md:my-4 rounded shadow-inner p-6 overflow-y-auto relative z-20 h-full"
             style={{ backgroundImage: 'radial-gradient(#d8ccb0 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
          
          <div className="flex justify-between items-start mb-6 border-b-2 border-[#7a6030] pb-4">
            <div>
              <h2 className="font-serif text-3xl text-[#2a1c11] uppercase tracking-widest font-black drop-shadow-sm">Case File</h2>
              <p className="font-mono text-xs text-[#5a4225] tracking-widest uppercase mt-1">Acquired Intel ({collectedEvidence?.length || 0}/4)</p>
            </div>
            <button 
              onClick={toggleDeductionBoard}
              className="text-[#5a4225] hover:text-[#8b1a1a] transition-colors p-2 bg-[#d8ccb0] rounded-full shadow-sm border border-[#7a6030]/20"
              title="Close Notebook"
            >
              <X size={24} />
            </button>
          </div>

          <div className="flex flex-col gap-4">
            {!collectedEvidence || collectedEvidence.length === 0 ? (
              <p className="font-['IM_Fell_English',serif] text-xl text-[#7a6030]/60 italic text-center mt-10">
                The pages are blank. Uncover evidence to build your case.
              </p>
            ) : (
              collectedEvidence.map((ev) => (
                <button
                  key={ev.id}
                  onClick={() => setSelectedEvidence(ev)}
                  className={`flex items-center gap-4 p-4 text-left border-l-4 transition-all ${
                    selectedEvidence?.id === ev.id 
                      ? 'bg-[#d8ccb0] border-[#8b1a1a] shadow-md scale-[1.02]' 
                      : 'bg-transparent border-[#7a6030] hover:bg-[#d8ccb0]/50 hover:scale-[1.01]'
                  }`}
                >
                  <div className="bg-[#2a1c11] p-2 rounded-full text-[#e8dcc0] shadow-sm">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h3 className="font-serif text-xl text-[#2a1c11] font-bold">{ev.title}</h3>
                    <p className="font-mono text-[10px] text-[#5a4225] tracking-widest uppercase mt-1">Item Ref: {ev.id.toUpperCase()}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right Page (Details Pane) */}
        <div className="flex-1 bg-[#e8dcc0] m-2 md:ml-4 md:my-4 rounded shadow-inner p-8 overflow-y-auto relative z-20 flex flex-col h-full"
             style={{ backgroundImage: 'linear-gradient(rgba(122, 96, 48, 0.1) 1px, transparent 1px)', backgroundSize: '100% 30px', backgroundPositionY: '8px' }}>
          
          {selectedEvidence ? (
            <div className="animate-[fadeIn_0.4s_ease-out] flex-1 flex flex-col">
              <div className="mb-8 flex items-center justify-between border-b border-[#7a6030]/30 pb-4">
                <h2 className="font-['Special_Elite',monospace] text-2xl text-[#1a100a] tracking-widest uppercase border-b-2 border-[#8b1a1a] pb-1 inline-block">
                  {selectedEvidence.title}
                </h2>
                <Search className="text-[#8b1a1a] opacity-50" size={24} />
              </div>

              <div className="mb-8">
                <p className="font-mono text-[10px] text-[#5a4225] tracking-[0.3em] uppercase mb-3 bg-[#d8ccb0] px-2 py-1 inline-block border border-[#7a6030]/20 rounded-sm shadow-sm">
                  Physical Description
                </p>
                <p className="font-serif text-xl text-[#2a1c11] leading-relaxed italic border-l-2 border-[#7a6030]/30 pl-4 mt-2">
                  "{selectedEvidence.description}"
                </p>
              </div>

              <div className="mt-auto pt-8">
                <p className="font-mono text-[10px] text-[#8b1a1a] tracking-[0.3em] uppercase mb-3 flex items-center gap-2 bg-[#8b1a1a]/10 px-2 py-1 inline-block border border-[#8b1a1a]/20 rounded-sm shadow-sm">
                  Internal Deductions
                </p>
                <div className="bg-[#d8ccb0]/40 p-5 rounded-sm border border-[#7a6030]/20 shadow-[inset_0_2px_10px_rgba(0,0,0,0.05)] relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-[#8b1a1a]/50"></div>
                  <p className="font-['Special_Elite',monospace] text-lg text-[#1a100a] leading-loose">
                    {selectedEvidence.suspectHint}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full opacity-30">
              <Search size={64} className="text-[#2a1c11] mb-6" />
              <p className="font-serif text-2xl text-[#2a1c11] text-center tracking-widest uppercase">
                Select an item to review details
              </p>
            </div>
          )}

          {/* Bottom Right Stamp */}
          <div className="absolute bottom-4 right-6 border-4 border-[#8b1a1a] text-[#8b1a1a] p-2 rotate-[-15deg] opacity-60 pointer-events-none drop-shadow-sm mix-blend-multiply">
            <p className="font-mono text-sm tracking-widest font-black uppercase">Classified</p>
          </div>
        </div>

      </div>
    </div>
  );
}
