import { create } from 'zustand';
import { suspectEvidence } from '../data/StoryEvidence';
import { persist } from 'zustand/middleware';
import { auth, db } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { backfillCipherStats } from '../services/authService';

export const useGameStore = create(
  persist(
    (set) => ({
      // Global Settings State
      isSettingsOpen: false,
      settings: {
        volume: 50, // Master volume (0-100)
        musicEnabled: true,
        sfxEnabled: true,
        difficulty: 'Medium', // Easy, Medium, Hard
      },
      playerProfile: {
        username: 'Investigator',
      },

      // Auth State
      currentUser: null,

      // Game Lifecycle State: 'idle', 'playing', 'paused', 'game_over'
      gameState: 'idle',

      // Time Attack State
      currentDifficulty: 'Easy',
      rollingAttempts: [],
      difficultyCooldown: 0,
      showDifficultySplash: false,
      difficultyChangeReason: null,

      // Multiplayer State
      multiplayer: {
        roomId: null,
        connectionStatus: 'disconnected', // 'disconnected', 'connecting', 'connected'
        opponentProgress: 0,
      },

      // Story Mode State
      isStoryPaused: false,
      savedStoryProgress: null, // null means no game in progress
      collectedEvidence: [],
      isDeductionBoardOpen: false,
      showPostGameMenu: false,

      // Actions
      initializeAuthListener: () => {
        onAuthStateChanged(auth, async (user) => {
          if (user) {
            // Verify the account still exists on the server (catches
            // accounts deleted from Firebase Console while a cached
            // token is still valid locally).
            try {
              await user.reload();
            } catch (err) {
              // auth/user-not-found or auth/user-disabled → force sign-out
              console.warn('Auth reload failed (account may be deleted):', err);
              await auth.signOut();
              return; // onAuthStateChanged will fire again with null
            }

            const userData = {
              uid: user.uid,
              email: user.email,
              username: user.displayName || 'Agent',
              friendCode: user.uid.substring(0, 6).toUpperCase()
            };
            set({ currentUser: userData });

            // Load cloud save on login
            try {
              const saveRef = doc(db, 'storyProgress', user.uid);
              const saveSnap = await getDoc(saveRef);
              if (saveSnap.exists()) {
                const cloudData = saveSnap.data();
                set({
                  savedStoryProgress: cloudData.savedStoryProgress || null,
                  collectedEvidence: cloudData.collectedEvidence || []
                });
              }
            } catch (err) {
              console.warn('Failed to load cloud save:', err);
            }

            // Ensure this user has all cipher stat fields (adds caesar for older accounts)
            backfillCipherStats(user.uid);
          } else {
            // User logged out or account was deleted — clear ALL local state
            set({
              currentUser: null,
              savedStoryProgress: null,
              collectedEvidence: [],
            });

            // Clear persisted Zustand state from localStorage so stale
            // data doesn't survive across sessions
            try {
              localStorage.removeItem('aegis-game-storage');
            } catch { /* private browsing / storage disabled */ }
          }
        });
      },

      // Sync story progress to Firestore
      syncProgressToCloud: async () => {
        const state = useGameStore.getState();
        if (!state.currentUser?.uid) return;
        try {
          const saveRef = doc(db, 'storyProgress', state.currentUser.uid);
          await setDoc(saveRef, {
            savedStoryProgress: state.savedStoryProgress,
            collectedEvidence: state.collectedEvidence,
            updatedAt: Date.now()
          }, { merge: true });
        } catch (err) {
          console.warn('Failed to sync progress to cloud:', err);
        }
      },
      updateSettings: (newSettings) =>
        set((state) => ({ settings: { ...state.settings, ...newSettings } })),
      setGameState: (newState) =>
        set({ gameState: newState }),

      // Time Attack Progression Actions
      recordCipherAttempt: (isCorrect, timeTaken, currentDifficulty) => set((state) => {
        const maxTime = 60; // seconds, assumed max per puzzle
        const clampedTime = Math.min(timeTaken, maxTime);

        const speedBonus = isCorrect
          ? 0.4 + (0.6 * ((maxTime - clampedTime) / maxTime)) // correct: 0.4–1.0
          : 0.0;                                               // wrong: 0.0

        const multipliers = { Easy: 1.0, Normal: 1.4, Hard: 1.8 };
        const difficultyMultiplier = multipliers[currentDifficulty] ?? 1.0;

        const rawScore = speedBonus * difficultyMultiplier;
        
        // Divide by the current difficulty's own multiplier so a perfect
        // Easy answer normalizes to 1.0 and promotion thresholds are reachable.
        const normalizedScore = Math.min(rawScore / difficultyMultiplier, 1.0);

        const updatedWindow = [...state.rollingAttempts, normalizedScore].slice(-5);
        const rollingAvg = updatedWindow.reduce((a, b) => a + b, 0) / updatedWindow.length;

        if (state.difficultyCooldown > 0) {
          return { 
            rollingAttempts: updatedWindow, 
            difficultyCooldown: state.difficultyCooldown - 1 
          };
        }

        let newDifficulty = currentDifficulty;

        if (currentDifficulty === 'Easy'   && rollingAvg >= 0.70) newDifficulty = 'Normal';
        if (currentDifficulty === 'Normal' && rollingAvg >= 0.75) newDifficulty = 'Hard';
        if (currentDifficulty === 'Hard'   && rollingAvg <= 0.45) newDifficulty = 'Normal'; // raised from 0.40
        if (currentDifficulty === 'Normal' && rollingAvg <= 0.35) newDifficulty = 'Easy';

        const didChange = newDifficulty !== currentDifficulty;

        const resolveSplashMessage = (from, to) => {
          if (from === 'Easy'   && to === 'Normal') return 'Promoted — excellent performance';
          if (from === 'Normal' && to === 'Hard')   return 'Promoted — outstanding accuracy';
          if (from === 'Normal' && to === 'Easy')   return 'Adjusted — take your time';
          if (from === 'Hard'   && to === 'Normal') return 'Adjusted — keep practicing';
          return '';
        };

        return {
          rollingAttempts: updatedWindow,
          currentDifficulty: newDifficulty,
          difficultyCooldown: didChange ? 2 : 0,
          showDifficultySplash: didChange,
          difficultyChangeReason: didChange ? resolveSplashMessage(currentDifficulty, newDifficulty) : null,
        };
      }),
      resetProgression: (startDifficulty = 'Easy') => {
        set({ 
          currentDifficulty: startDifficulty, 
          rollingAttempts: [], 
          difficultyCooldown: 0,
          showDifficultySplash: false,
          difficultyChangeReason: null
        });
      },
      setDifficulty: (level) => set({ currentDifficulty: level }),
      setShowDifficultySplash: (show, reason = null) => set({ showDifficultySplash: show, difficultyChangeReason: reason }),

      setMultiplayerState: (newMultiplayerState) =>
        set((state) => ({
          multiplayer: { ...state.multiplayer, ...newMultiplayerState }
        })),

      // Story Mode Actions
      toggleDeductionBoard: () => set((state) => ({ isDeductionBoardOpen: !state.isDeductionBoardOpen })),
      setDeductionBoardOpen: (isOpen) => set({ isDeductionBoardOpen: isOpen }),
      unlockNextEvidence: () => set((state) => {
        const currentLen = state.collectedEvidence.length;
        if (currentLen < suspectEvidence.length) {
          const nextItem = suspectEvidence[currentLen];
          return { collectedEvidence: [...state.collectedEvidence, nextItem] };
        }
        return state;
      }),
      togglePause: () => set((state) => ({ isStoryPaused: !state.isStoryPaused })),
      startNewStory: (difficulty) => set({
        savedStoryProgress: {
          difficulty,
          phase: 'BRIEFING',
          clues: {
            hasFoundLog: false,
            hasFoundBoots: false,
            hasFoundReceipt: false,
            hasFoundPen: false
          },
          cluesList: []
        },
        collectedEvidence: []
      }),
      saveEvidence: (key, data) => set((state) => {
        if (!state.savedStoryProgress) return state;

        const existingList = state.savedStoryProgress.cluesList || [];
        // Avoid duplicates by id when possible
        const alreadyExists = data && data.id ? existingList.some(item => item.id === data.id) : false;
        const newCluesList = alreadyExists ? existingList : [...existingList, data];

        return {
          savedStoryProgress: {
            ...state.savedStoryProgress,
            clues: { ...state.savedStoryProgress.clues, [key]: true },
            cluesList: newCluesList
          }
        };
      }),
      savePhase: (phase) => set((state) => {
        if (!state.savedStoryProgress) return state;
        return {
          savedStoryProgress: { ...state.savedStoryProgress, phase }
        };
      }),
      resetProgress: () => set({ savedStoryProgress: null, isStoryPaused: false, collectedEvidence: [] }),
      setShowPostGameMenu: (show) => set({ showPostGameMenu: show }),
    }),
    {
      name: 'aegis-game-storage', // Storage key 
      partialize: (state) => ({
        settings: state.settings,
        playerProfile: state.playerProfile,
        savedStoryProgress: state.savedStoryProgress,
        collectedEvidence: state.collectedEvidence
      }), // Persist settings and story progress
    }
  )
);

// Auto-sync story progress to cloud whenever it changes
// Debounce helper defined outside the store creator so it isn't recreated
function debounce(fn, wait) {
  let timeout = null;
  return (...args) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      timeout = null;
      try {
        fn(...args);
      } catch (e) {
        console.warn('Debounced function error:', e);
      }
    }, wait);
  };
}

// Debounced wrapper around syncProgressToCloud (2500ms)
const debouncedSync = debounce(() => useGameStore.getState().syncProgressToCloud(), 2500);

useGameStore.subscribe(
  (state, prevState) => {
    // Only run sync when a user is logged in
    if (!useGameStore.getState().currentUser) return;

    if (
      state.savedStoryProgress !== prevState.savedStoryProgress ||
      state.collectedEvidence !== prevState.collectedEvidence
    ) {
      debouncedSync();
    }
  }
);
