import { Routes, Route } from 'react-router-dom';
import MainMenu from './pages/MainMenu';
import DefaultPage from './pages/DefaultPage';
import Settings from './pages/Settings';
import Difficulty from './pages/Difficulty';
import TimeAttackMode from './pages/TimeAttackMode';
import MultiplayerMode from './pages/MultiplayerMode';
import StoryMode from './pages/StoryMode';

function App() {
  return (
    <div className="h-screen w-screen bg-mystery-dark text-gray-200 relative overflow-hidden">
      {/* Dark Victorian thematic background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(0,0,0,0.85)_100%)] pointer-events-none z-0"></div>
      
      {/* Route Container */}
      <div className="relative z-10 h-full w-full">
        <Routes>
          <Route path="/" element={<MainMenu />} />
          <Route path="/tutorial" element={<DefaultPage title="Tutorial" />} />
          <Route path="/story" element={<StoryMode />} />
          <Route path="/timeAttack" element={<TimeAttackMode />} />
          <Route path="/multiplayer" element={<MultiplayerMode />} />
          <Route path="/leaderboards" element={<DefaultPage title="Leaderboards" />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/difficulty" element={<Difficulty />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
