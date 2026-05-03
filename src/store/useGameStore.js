import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { auth } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';

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

      // Multiplayer State
      multiplayer: {
        roomId: null,
        connectionStatus: 'disconnected', // 'disconnected', 'connecting', 'connected'
        opponentProgress: 0,
      },

      // Story Mode State
      isStoryPaused: false,
      savedStoryProgress: null, // null means no game in progress

      // Actions
      initializeAuthListener: () => {
        onAuthStateChanged(auth, (user) => {
          if (user) {
            set({ 
              currentUser: { 
                uid: user.uid,
                email: user.email, 
                username: user.displayName || 'Agent', 
                friendCode: user.uid.substring(0, 6).toUpperCase() 
              } 
            });
          } else {
            set({ currentUser: null });
          }
        });
      },
      updateSettings: (newSettings) => 
        set((state) => ({ settings: { ...state.settings, ...newSettings } })),
      setGameState: (newState) => 
        set({ gameState: newState }),
      setMultiplayerState: (newMultiplayerState) => 
        set((state) => ({ 
          multiplayer: { ...state.multiplayer, ...newMultiplayerState } 
        })),

      // Story Mode Actions
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
    }),
    {
      name: 'aegis-game-storage', // Storage key 
      partialize: (state) => ({ 
        settings: state.settings, 
        playerProfile: state.playerProfile,
        savedStoryProgress: state.savedStoryProgress
      }), // Persist settings and story progress
    }
  )
);
