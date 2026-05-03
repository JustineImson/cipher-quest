import { Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import MainMenu from './pages/MainMenu';
import DefaultPage from './pages/DefaultPage';
import Settings from './pages/Settings';
import Tutorial from './pages/Tutorial';
import Leaderboards from './pages/Leaderboards';
import Difficulty from './pages/Difficulty';
import TimeAttackMode from './pages/TimeAttackMode';
import MultiplayerMode from './pages/MultiplayerMode';
import StoryMode from './pages/StoryMode';
import Profile from './pages/Profile';
import { bgmController } from './engine/BGMController';
import { useGameStore } from './store/useGameStore';

function App() {
  const location = useLocation();
  const initializeAuthListener = useGameStore((state) => state.initializeAuthListener);

  useEffect(() => {
    if (initializeAuthListener) {
      initializeAuthListener();
    }
  }, [initializeAuthListener]);

  useEffect(() => {
    const menuRoutes = ['/', '/tutorial', '/settings', '/difficulty', '/leaderboards', '/profile'];
    if (menuRoutes.includes(location.pathname)) {
      bgmController.play('bgm4');
    }
  }, [location.pathname]);

  return (
    <div className="h-screen w-screen bg-mystery-dark text-gray-200 relative overflow-hidden">
      {/* Dark Victorian thematic background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(0,0,0,0.85)_100%)] pointer-events-none z-0"></div>
      
      {/* Route Container */}
      <div className="relative z-10 h-full w-full">
        <Routes>
          <Route path="/" element={<MainMenu />} />
          <Route path="/tutorial" element={<Tutorial />} />
          <Route path="/story" element={<StoryMode />} />
          <Route path="/timeAttack" element={<TimeAttackMode />} />
          <Route path="/multiplayer" element={<MultiplayerMode />} />
          <Route path="/leaderboards" element={<Leaderboards />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/difficulty" element={<Difficulty />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
