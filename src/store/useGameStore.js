import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
      
      // Game Lifecycle State: 'idle', 'playing', 'paused', 'game_over'
      gameState: 'idle',

      // Multiplayer State
      multiplayer: {
        roomId: null,
        connectionStatus: 'disconnected', // 'disconnected', 'connecting', 'connected'
        opponentProgress: 0,
      },

      // Actions
      updateSettings: (newSettings) => 
        set((state) => ({ settings: { ...state.settings, ...newSettings } })),
      setGameState: (newState) => 
        set({ gameState: newState }),
      setMultiplayerState: (newMultiplayerState) => 
        set((state) => ({ 
          multiplayer: { ...state.multiplayer, ...newMultiplayerState } 
        })),
    }),
    {
      name: 'aegis-game-storage', // Storage key 
      partialize: (state) => ({ 
        settings: state.settings, 
        playerProfile: state.playerProfile 
      }), // Persist only global settings
    }
  )
);
