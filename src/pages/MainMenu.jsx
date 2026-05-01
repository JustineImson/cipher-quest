import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import { Settings, Trophy } from 'lucide-react';

export default function MainMenu() {
  const navigate = useNavigate();

  return (
    <div className="h-full w-full relative">
      <div 
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: 'url(/mainMenuBg.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />
      <div className="flex flex-col h-full w-full max-w-7xl mx-auto px-6 py-12 relative z-10 overflow-y-auto">
        
      {/* Spacer for vertical centering */}
      <div className="flex-grow"></div>

      {/* Title section layout per wireframe */}
      <h1 className="text-5xl md:text-7xl font-serif text-mystery-gold tracking-[0.15em] drop-shadow-md text-center uppercase mb-8">
        Cipher Quest
      </h1>

      {/* Top Divider */}
      <div className="w-full h-px bg-mystery-gold opacity-50 mb-12"></div>

      {/* Main Action Buttons (Row layout with all 5 buttons) */}
      <div className="max-w-7xl mx-auto w-full flex flex-wrap justify-center gap-2 mb-16">
        <Button onClick={() => navigate('/tutorial')} className="flex-1 min-w-[140px] h-14 text-sm lg:text-base">
          Tutorial
        </Button>
        <Button onClick={() => navigate('/difficulty')} className="flex-1 min-w-[140px] h-14 text-sm lg:text-base">
          Story Mode
        </Button>
        <Button onClick={() => navigate('/timeAttack')} className="flex-1 min-w-[140px] h-14 text-sm lg:text-base">
          Time Attack
        </Button>
        <Button onClick={() => navigate('/multiplayer')} className="flex-1 min-w-[140px] h-14 text-sm lg:text-base">
          Multiplayer
        </Button>
        <Button onClick={() => navigate('/leaderboards')} className="flex-1 min-w-[140px] h-14 text-sm lg:text-base">
          <Trophy className="w-4 h-4 mr-1" />
          Leaderboards
        </Button>
      </div>

      {/* Bottom Divider */}
      <div className="w-full h-px bg-mystery-gold opacity-50 mb-8"></div>

      {/* Footer Area with Wireframe alignment */}
      <div className="w-full flex flex-col md:flex-row justify-between items-center gap-8 text-center md:text-left">
        
        {/* Adjusted Lore text (substituted literal wireframe text for thematic flair) */}
        <div className="text-gray-400 text-sm max-w-sm italic font-serif leading-relaxed">
          <p>
            London, 1888. Intercept the transmissions. 
            Decipher the truth before time runs unequivocally out.
          </p>
        </div>
        
        {/* Settings Box centered/right layout from wireframe */}
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
