import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import PhaserGame from '../components/PhaserGame';
import { useGameStore } from '../store/useGameStore';

const DifficultyMenu = ({ setDifficulty }) => {
  const startNewStory = useGameStore((s) => s.startNewStory);

  const handleSelect = (diff) => {
    startNewStory(diff);
    setDifficulty(diff);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full w-full bg-mystery-dark text-gray-200 absolute inset-0 z-50">
      <h1 className="text-4xl font-bold mb-8 text-amber-500 font-serif">Select Difficulty</h1>
      <div className="flex space-x-6">
        <button
          onClick={() => handleSelect('Easy')}
          className="px-6 py-3 bg-green-800 hover:bg-green-700 rounded-md text-xl border border-green-500 transition-colors"
        >
          Easy
        </button>
        <button
          onClick={() => handleSelect('Normal')}
          className="px-6 py-3 bg-blue-800 hover:bg-blue-700 rounded-md text-xl border border-blue-500 transition-colors"
        >
          Normal
        </button>
        <button
          onClick={() => handleSelect('Hard')}
          className="px-6 py-3 bg-red-900 hover:bg-red-800 rounded-md text-xl border border-red-500 transition-colors"
        >
          Hard
        </button>
      </div>
    </div>
  );
};

export default function StoryMode() {
  const location = useLocation();
  const saved = useGameStore((s) => s.savedStoryProgress);

  // Try to synchronously read persisted store from localStorage so a hard reload
  // can resume immediately (zustand persistence hydrates slightly later).
  let persistedSaved = null;
  try {
    const raw = localStorage.getItem('aegis-game-storage');
    if (raw) {
      const parsed = JSON.parse(raw);
      // the persisted shape may be either the partial state or nested under `state`
      persistedSaved = parsed.savedStoryProgress || (parsed.state && parsed.state.savedStoryProgress) || parsed;
    }
  } catch (e) {
    // ignore parse errors
  }

  const startSceneFromLocation = location.state?.startScene;
  const initialDifficulty = location.state?.difficulty || (persistedSaved && persistedSaved.difficulty) || null;
  
  const hasFinishedIntro = localStorage.getItem('hasFinishedIntro') === 'true';
  const currentScene = localStorage.getItem('currentScene');
  
  const initialStartScene = startSceneFromLocation || (hasFinishedIntro && currentScene ? currentScene : (persistedSaved ? 'MainScene' : 'IntroScene'));

  const [difficulty, setDifficulty] = useState(initialDifficulty);
  const [startScene, setStartScene] = useState(initialStartScene);

  useEffect(() => {
    // If the store hydrates after mount and we didn't already set difficulty/startScene
    // from the persisted localStorage above, apply the store's values.
    if (!startSceneFromLocation && saved) {
      if (!difficulty && saved.difficulty) setDifficulty(saved.difficulty);
      const currentScene = localStorage.getItem('currentScene');
      const hasFinishedIntro = localStorage.getItem('hasFinishedIntro') === 'true';
      setStartScene(hasFinishedIntro && currentScene ? currentScene : 'MainScene');
    }
  }, [saved, startSceneFromLocation]);

  return <>{difficulty ? <PhaserGame difficulty={difficulty} startScene={startScene} /> : <DifficultyMenu setDifficulty={setDifficulty} />}</>;
}
