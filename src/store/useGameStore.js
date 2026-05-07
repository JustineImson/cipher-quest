import { create } from 'zustand';
import { suspectEvidence } from '../data/StoryEvidence';
import { persist } from 'zustand/middleware';
import { auth, db } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export const useGameStore = create(
  persist(
    (set) => ({
      // Global Settings State
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
      currentDifficulty: 'easy',
      puzzlesSolved: 0,
      showDifficultySplash: false,

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
          } else {
            set({ currentUser: null });
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
      incrementPuzzlesSolved: () => set((state) => {
        const newCount = state.puzzlesSolved + 1;
        let newDifficulty = state.currentDifficulty;
        let newShowSplash = state.showDifficultySplash;

        if (newCount === 3 && state.currentDifficulty === 'easy') {
          newDifficulty = 'moderate';
          newShowSplash = true;
        } else if (newCount === 7 && state.currentDifficulty === 'moderate') {
          newDifficulty = 'hard';
          newShowSplash = true;
        }

        // Auto-dismiss the splash after the animation
        if (newShowSplash && newDifficulty !== state.currentDifficulty) {
          setTimeout(() => {
            useGameStore.getState().setShowDifficultySplash(false);
          }, 1600);
        }

        return {
          puzzlesSolved: newCount,
          currentDifficulty: newDifficulty,
          showDifficultySplash: newShowSplash
        };
      }),
      resetProgression: () => {
        set({ currentDifficulty: 'easy', puzzlesSolved: 0, showDifficultySplash: true });
        setTimeout(() => {
          useGameStore.getState().setShowDifficultySplash(false);
        }, 1600);
      },
      setDifficulty: (level) => set({ currentDifficulty: level }),
      setShowDifficultySplash: (show) => set({ showDifficultySplash: show }),
      toggleDifficultySplash: () => set((state) => ({ showDifficultySplash: !state.showDifficultySplash })),

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
        }
      }),
      saveEvidence: (key, data) => set((state) => {
        if (!state.savedStoryProgress) return state;
        return {
          savedStoryProgress: {
            ...state.savedStoryProgress,
            clues: { ...state.savedStoryProgress.clues, [key]: true },
            cluesList: [...state.savedStoryProgress.cluesList, data]
          }
        };
      }),
      savePhase: (phase) => set((state) => {
        if (!state.savedStoryProgress) return state;
        return {
          savedStoryProgress: { ...state.savedStoryProgress, phase }
        };
      }),
      resetProgress: () => set({ savedStoryProgress: null, isStoryPaused: false }),
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
useGameStore.subscribe(
  (state, prevState) => {
    if (
      state.currentUser?.uid &&
      (
        state.savedStoryProgress !== prevState.savedStoryProgress ||
        state.collectedEvidence !== prevState.collectedEvidence
      )
    ) {
      useGameStore.getState().syncProgressToCloud();
    }
  }
);
