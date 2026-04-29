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
    <div className="flex flex-col h-full w-full max-w-7xl mx-auto px-6 py-12 relative overflow-y-auto">
      <div className="flex-grow"></div>

      <h1 className="text-5xl md:text-7xl font-serif text-mystery-gold tracking-[0.15em] drop-shadow-md text-center uppercase mb-8">
        Cipher Quest
      </h1>
      
      <div className="w-full h-px bg-mystery-gold opacity-50 mb-16"></div>

      {/* Difficulty Action Buttons (Row layout with all 3 buttons) */}
      <div className="max-w-4xl mx-auto w-full flex flex-col md:flex-row justify-center gap-6 mb-20">
        <Button 
          onClick={() => handleSelectDifficulty('Easy')} 
          className={`flex-1 min-w-[200px] h-[100px] text-3xl font-bold bg-opacity-70 transition-colors ${settings.difficulty === 'Easy' ? 'bg-mystery-gold/90 text-mystery-dark border-mystery-gold drop-shadow-[0_0_15px_rgba(203,161,83,0.5)] scale-105' : 'bg-gray-500/20 text-gray-200 border-gray-500 hover:border-mystery-gold hover:text-mystery-gold'}`}
        >
          Easy
        </Button>
        <Button 
          onClick={() => handleSelectDifficulty('Medium')} 
          className={`flex-1 min-w-[200px] h-[100px] text-3xl font-bold bg-opacity-70 transition-colors ${settings.difficulty === 'Medium' ? 'bg-mystery-gold/90 text-mystery-dark border-mystery-gold drop-shadow-[0_0_15px_rgba(203,161,83,0.5)] scale-105' : 'bg-gray-500/20 text-gray-200 border-gray-500 hover:border-mystery-gold hover:text-mystery-gold'}`}
        >
          Medium
        </Button>
        <Button 
          onClick={() => handleSelectDifficulty('Hard')} 
          className={`flex-1 min-w-[200px] h-[100px] text-3xl font-bold bg-opacity-70 transition-colors ${settings.difficulty === 'Hard' ? 'bg-mystery-gold/90 text-mystery-dark border-mystery-gold drop-shadow-[0_0_15px_rgba(203,161,83,0.5)] scale-105' : 'bg-gray-500/20 text-gray-200 border-gray-500 hover:border-mystery-gold hover:text-mystery-gold'}`}
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
        
        <Button onClick={() => navigate('/settings')} variant="secondary" className="px-8 py-3 text-lg border border-mystery-gold">
          <Settings className="w-6 h-6 mr-2" />
          Settings
        </Button>
      </div>
      
      <div className="flex-grow"></div>
    </div>
  );
}
