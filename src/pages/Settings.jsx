import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/useGameStore';
import Button from '../components/ui/Button';

export default function Settings() {
  const navigate = useNavigate();
  const { settings, updateSettings } = useGameStore();

  return (
    <div className="flex flex-col h-full w-full max-w-7xl mx-auto px-6 py-12 relative overflow-y-auto">
      <div className="flex-grow"></div>

      {/* Title */}
      <h1 className="text-5xl md:text-7xl font-serif text-mystery-gold tracking-[0.15em] drop-shadow-md text-center uppercase mb-8">
        Cipher Quest
      </h1>
      <div className="w-full h-px bg-mystery-gold opacity-50 mb-16"></div>

      {/* Settings Controls */}
      <div className="max-w-xl mx-auto w-full flex flex-col items-center gap-12 mb-16">
        
        {/* MUSIC TOGGLE */}
        <div className="flex flex-col sm:flex-row items-center justify-center w-full gap-4 text-3xl font-serif uppercase tracking-[0.15em] text-mystery-gold">
          <span className="sm:mr-4">Music</span>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => updateSettings({ musicEnabled: true })}
              className={`transition-all duration-300 ${settings.musicEnabled ? 'text-gray-100 font-bold drop-shadow-[0_0_8px_rgba(255,255,255,0.7)]' : 'text-gray-500 opacity-60'}`}
            >
              ON
            </button>
            <span className="text-gray-600 opacity-50 text-xl font-light">/</span>
            <button 
              onClick={() => updateSettings({ musicEnabled: false })}
              className={`transition-all duration-300 ${!settings.musicEnabled ? 'text-gray-100 font-bold drop-shadow-[0_0_8px_rgba(255,255,255,0.7)]' : 'text-gray-500 opacity-60'}`}
            >
              OFF
            </button>
          </div>
        </div>

        {/* SOUND FX TOGGLE */}
        <div className="flex flex-col sm:flex-row items-center justify-center w-full gap-4 text-3xl font-serif uppercase tracking-[0.15em] text-mystery-gold">
          <span className="sm:mr-4">Sound FX</span>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => updateSettings({ sfxEnabled: true })}
              className={`transition-all duration-300 ${settings.sfxEnabled ? 'text-gray-100 font-bold drop-shadow-[0_0_8px_rgba(255,255,255,0.7)]' : 'text-gray-500 opacity-60'}`}
            >
              ON
            </button>
            <span className="text-gray-600 opacity-50 text-xl font-light">/</span>
            <button 
              onClick={() => updateSettings({ sfxEnabled: false })}
              className={`transition-all duration-300 ${!settings.sfxEnabled ? 'text-gray-100 font-bold drop-shadow-[0_0_8px_rgba(255,255,255,0.7)]' : 'text-gray-500 opacity-60'}`}
            >
              OFF
            </button>
          </div>
        </div>

        {/* VOLUME SLIDER */}
        <div className="flex flex-col items-center gap-4 mt-8 w-full">
          <span className="text-sm font-serif uppercase tracking-[0.2em] text-mystery-gold opacity-80">Master Volume</span>
          <input 
            type="range" 
            min="0" 
            max="100" 
            value={settings.volume} 
            onChange={(e) => updateSettings({ volume: parseInt(e.target.value) })}
            className="w-full max-w-sm h-1 bg-mystery-dark border rounded-full border-mystery-gold/50 outline-none hover:border-mystery-gold transition-colors styled-slider"
          />
        </div>

        {/* BACK BUTTON */}
        <div className="mt-8">
          <button 
            onClick={() => navigate(-1)} 
            className="font-serif tracking-widest text-2xl uppercase hover:text-white transition-colors text-mystery-gold"
          >
            Back
          </button>
        </div>

      </div>

      <div className="w-full h-px bg-mystery-gold opacity-50 mb-8"></div>

      <div className="w-full flex justify-center items-center text-center">
        <div className="text-gray-400 text-sm max-w-sm italic font-serif leading-relaxed">
          <p>
            Adjust your apparatus cautiously. 
            The right frequency may be the key to your survival.
          </p>
        </div>
      </div>
      
      <div className="flex-grow"></div>
    </div>
  );
}
