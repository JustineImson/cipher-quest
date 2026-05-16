import { Routes, Route, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
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
import NoirToast from './components/NoirToast';
import { getMessaging, onMessage } from 'firebase/messaging';
import { app } from './services/firebase';

function App() {
  const location = useLocation();
  const initializeAuthListener = useGameStore((state) => state.initializeAuthListener);
  const isSettingsOpen = useGameStore((state) => state.isSettingsOpen);
  const [toastPayload, setToastPayload] = useState(null);

  useEffect(() => {
    if (initializeAuthListener) {
      initializeAuthListener();
    }
  }, [initializeAuthListener]);

  // Foreground FCM listener
  useEffect(() => {
    try {
      const messaging = getMessaging(app);
      const unsubscribe = onMessage(messaging, (payload) => {
        console.log('Message received in foreground:', payload);
        setToastPayload(payload);
      });
      return () => unsubscribe();
    } catch (error) {
      console.log('FCM may not be configured properly yet or is unsupported in this browser environment:', error);
    }
  }, []);

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
        {toastPayload && (
          <NoirToast
            title={toastPayload.notification?.title}
            body={toastPayload.notification?.body}
            onClose={() => setToastPayload(null)}
            duration={6000}
          />
        )}
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
          <Route path="/profile/:uid" element={<Profile />} />
        </Routes>
        
        {isSettingsOpen && (
          <div className="absolute inset-0 z-[9999]">
            <Settings isOverlay onClose={() => useGameStore.setState({ isSettingsOpen: false, isStoryPaused: false })} />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
