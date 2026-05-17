import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState, useCallback, useRef } from 'react';
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
import { listenToIncomingGameInvites, resolveGameInvite } from './services/socialService';
import { requestFullscreenAndLock } from './utils/orientation';
import RotatePrompt from './components/RotatePrompt';

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const initializeAuthListener = useGameStore((state) => state.initializeAuthListener);
  const isSettingsOpen = useGameStore((state) => state.isSettingsOpen);
  const currentUser = useGameStore((state) => state.currentUser);

  // EDGE-4: Map-based toast state keyed by unique ID (invite ID or timestamp)
  const [activeToasts, setActiveToasts] = useState(new Map());

  // EDGE-3: Mid-game confirmation modal state
  const [confirmModal, setConfirmModal] = useState(null);

  // Track which invite IDs have already been shown as toasts to prevent re-showing
  const shownInviteIds = useRef(new Set());

  useEffect(() => {
    if (initializeAuthListener) {
      initializeAuthListener();
    }
  }, [initializeAuthListener]);

  useEffect(() => {
    const isMobile = window.matchMedia('(max-width: 1024px)').matches;
    if (!isMobile) return;

    // Must be triggered by user gesture — attach to first click/tap
    const handleFirstInteraction = () => {
      requestFullscreenAndLock();
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };

    window.addEventListener('click', handleFirstInteraction);
    window.addEventListener('touchstart', handleFirstInteraction);

    return () => {
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };
  }, []);

  // ─── Toast helpers ─────────────────────────────────────────────────
  const addToast = useCallback((id, toastData) => {
    setActiveToasts(prev => {
      const next = new Map(prev);
      next.set(id, toastData);
      return next;
    });
  }, []);

  const dismissToast = useCallback((id) => {
    setActiveToasts(prev => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  // ─── FCM Foreground listener (non-invite push notifications) ───────
  useEffect(() => {
    try {
      const messaging = getMessaging(app);
      const unsubscribe = onMessage(messaging, (payload) => {
        console.log('Message received in foreground:', payload);
        const title = payload.notification?.title || payload.data?.title;
        const body = payload.notification?.body || payload.data?.body;
        // Skip toast if there's no meaningful content to display
        if (!title && !body) return;
        const id = `fcm-${Date.now()}`;
        addToast(id, { title: title || 'Transmission', body: body || 'A new message has arrived.' });
      });
      return () => unsubscribe();
    } catch (error) {
      console.log('FCM may not be configured properly yet or is unsupported in this browser environment:', error);
    }
  }, [addToast]);

  // ─── Global Firestore listener for incoming game invites ───────────
  useEffect(() => {
    if (!currentUser?.uid) return;

    const unsub = listenToIncomingGameInvites(currentUser.uid, (invites) => {
      invites.forEach((invite) => {
        // Only show toast once per invite
        if (shownInviteIds.current.has(invite.id)) return;
        shownInviteIds.current.add(invite.id);

        // Don't show toast if already on /multiplayer — the SocialOverlay handles it there
        if (location.pathname === '/multiplayer') return;

        addToast(invite.id, {
          title: `${invite.senderUsername} challenges you!`,
          body: 'Accept the cipher duel?',
          inviteId: invite.id,
          roomCode: invite.roomCode,
          isGameInvite: true,
        });
      });
    });

    return () => unsub();
  }, [currentUser?.uid, addToast, location.pathname]);

  // ─── EDGE-3: Mid-game guard — check if player is in an active session ─
  const handleAcceptInvite = useCallback((inviteId, roomCode) => {
    const state = useGameStore.getState();
    const isInTimeAttack = location.pathname === '/timeAttack' && state.gameState === 'playing';
    const isInStory = location.pathname === '/story' && state.savedStoryProgress?.phase &&
      !['COMPLETE', 'RESOLUTION'].includes(state.savedStoryProgress.phase);

    const executeAccept = async () => {
      try {
        await resolveGameInvite(inviteId, 'accepted', currentUser?.uid);
        dismissToast(inviteId);
        navigate('/multiplayer', { state: { joinRoomCode: roomCode } });
      } catch (err) {
        // EDGE-2: Invite may have been canceled by host
        dismissToast(inviteId);
        addToast(`error-${Date.now()}`, {
          title: 'Challenge Expired',
          body: err.message || 'This challenge is no longer available.',
        });
      }
    };

    if (isInTimeAttack || isInStory) {
      // EDGE-3: Show confirmation modal
      setConfirmModal({
        message: isInStory
          ? 'You are in the middle of a story case. Accepting will leave your current investigation. Accept anyway?'
          : 'You are in the middle of a Time Attack run. Accepting will abandon your score. Accept anyway?',
        onConfirm: () => {
          setConfirmModal(null);
          executeAccept();
        },
        onCancel: () => setConfirmModal(null),
      });
    } else {
      executeAccept();
    }
  }, [currentUser?.uid, location.pathname, navigate, dismissToast, addToast]);

  const handleDeclineInvite = useCallback(async (inviteId) => {
    try {
      await resolveGameInvite(inviteId, 'declined', currentUser?.uid);
    } catch (err) {
      console.warn('Failed to decline invite:', err);
    }
    dismissToast(inviteId);
  }, [currentUser?.uid, dismissToast]);

  // ─── BGM routing ──────────────────────────────────────────────────
  useEffect(() => {
    const menuRoutes = ['/', '/tutorial', '/settings', '/difficulty', '/leaderboards', '/profile'];
    if (menuRoutes.includes(location.pathname)) {
      bgmController.play('bgm4');
    }
  }, [location.pathname]);

  // Convert Map to array for rendering
  const toastEntries = Array.from(activeToasts.entries());

  return (
    <div className="h-screen w-screen bg-mystery-dark text-gray-200 relative overflow-hidden">
      <RotatePrompt />
      {/* Dark Victorian thematic background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(0,0,0,0.85)_100%)] pointer-events-none z-0"></div>
      
      {/* Route Container */}
      <div className="relative z-10 h-full w-full">
        {/* EDGE-4: Stacked toasts rendered from Map */}
        {toastEntries.map(([id, toast], index) => (
          <NoirToast
            key={id}
            title={toast.title}
            body={toast.body}
            onClose={() => dismissToast(id)}
            offsetIndex={index}
            actions={toast.isGameInvite ? [
              { label: '✓ Accept', onClick: () => handleAcceptInvite(toast.inviteId, toast.roomCode), variant: 'accept' },
              { label: '✗ Decline', onClick: () => handleDeclineInvite(toast.inviteId), variant: 'decline' },
            ] : []}
          />
        ))}

        {/* EDGE-3: Mid-game confirmation modal */}
        {confirmModal && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="bg-[#1a1208] border border-[#c9a84c]/50 p-8 max-w-md w-full mx-4 shadow-[0_0_40px_rgba(0,0,0,0.9)] font-['Special_Elite']">
              <h3 className="text-[#e8c96a] text-lg tracking-widest uppercase mb-4 font-['Playfair_Display'] border-b border-[#7a6030]/50 pb-3">
                ⚠ Active Case Warning
              </h3>
              <p className="text-[#e8dcc0] text-sm leading-relaxed mb-6 opacity-90">
                {confirmModal.message}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={confirmModal.onConfirm}
                  className="flex-1 py-2.5 bg-[#0a1a0f]/80 border border-[#5a9e6f]/40 text-[#5a9e6f] text-xs tracking-widest uppercase hover:bg-[#5a9e6f] hover:text-[#0e0a04] transition-all"
                >
                  Accept Duel
                </button>
                <button
                  onClick={confirmModal.onCancel}
                  className="flex-1 py-2.5 bg-[#1a0f0f]/80 border border-[#8b1a1a]/40 text-[#8b1a1a] text-xs tracking-widest uppercase hover:bg-[#8b1a1a] hover:text-[#0e0a04] transition-all"
                >
                  Stay on Case
                </button>
              </div>
            </div>
          </div>
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
