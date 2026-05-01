import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/useGameStore';
import Button from '../components/ui/Button';
import { Settings } from 'lucide-react';

export default function Difficulty() {
  const navigate = useNavigate();
  const { settings, updateSettings } = useGameStore();

  const handleSelectDifficulty = (diff) => {
    updateSettings({ difficulty: diff });
    navigate('/story', { state: { difficulty: diff } });
  };

  return (
    <div className="h-full w-full relative overflow-hidden">
      <div 
        className="absolute inset-0 z-0 blur-sm scale-105"
        style={{
          backgroundImage: 'url(/mainMenuBg.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />
      <div className="flex flex-col h-full w-full max-w-7xl mx-auto px-6 py-12 relative z-10 overflow-y-auto">
        <div className="flex-grow"></div>

      <h1 className="text-5xl md:text-7xl font-serif text-mystery-gold tracking-[0.15em] drop-shadow-md text-center uppercase mb-8">
        Cipher Quest
      </h1>
      
      <div className="w-full h-px bg-mystery-gold opacity-50 mb-16"></div>

      {/* Difficulty Action Buttons (Row layout with all 3 buttons) */}
      <div className="max-w-4xl mx-auto w-full flex flex-col md:flex-row justify-center gap-6 mb-20">
        <Button 
          onClick={() => handleSelectDifficulty('Easy')} 
          isActive={settings.difficulty === 'Easy'}
          className="flex-1 min-w-[200px] h-[100px] text-3xl font-bold"
        >
          Easy
        </Button>
        <Button 
          onClick={() => handleSelectDifficulty('Medium')} 
          isActive={settings.difficulty === 'Medium'}
          className="flex-1 min-w-[200px] h-[100px] text-3xl font-bold"
        >
          Medium
        </Button>
        <Button 
          onClick={() => handleSelectDifficulty('Hard')} 
          isActive={settings.difficulty === 'Hard'}
          className="flex-1 min-w-[200px] h-[100px] text-3xl font-bold"
        >
          Hard
        </Button>
      </div>

      <div className="w-full text-center mt-[-20px] mb-8">
         <button onClick={() => navigate(-1)} className="font-serif tracking-widest text-lg uppercase hover:text-white transition-colors text-mystery-gold">
            Back to Menu
         </button>
      </div>

      <div className="w-full h-px bg-mystery-gold opacity-50 mb-8"></div>

      {/* Footer Area with Wireframe alignment */}
      <div className="w-full flex flex-col md:flex-row justify-between items-center gap-8 text-center md:text-left">
        <div className="text-gray-400 text-sm max-w-md italic font-serif leading-relaxed">
          <p>
            The game waits for your selection. Choose your expertise level 
            and prepare your mind for the intercepts.
          </p>
        </div>
        
        <Button onClick={() => navigate('/settings')} variant="secondary" className="px-6 py-2 text-base">
          <Settings className="w-5 h-5 mr-2 text-[#d4a843]" />
          Settings
        </Button>
      </div>
      
      <div className="flex-grow"></div>
      </div>
    </div>
  );
}
