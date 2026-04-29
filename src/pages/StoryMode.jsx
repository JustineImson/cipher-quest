import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import PhaserGame from '../components/PhaserGame';

const DifficultyMenu = ({ setDifficulty }) => (
  <div className="flex flex-col items-center justify-center h-full w-full bg-mystery-dark text-gray-200 absolute inset-0 z-50">
    <h1 className="text-4xl font-bold mb-8 text-amber-500 font-serif">Select Difficulty</h1>
    <div className="flex space-x-6">
      <button 
        onClick={() => setDifficulty('Easy')}
        className="px-6 py-3 bg-green-800 hover:bg-green-700 rounded-md text-xl border border-green-500 transition-colors"
      >
        Easy
      </button>
      <button 
        onClick={() => setDifficulty('Normal')}
        className="px-6 py-3 bg-blue-800 hover:bg-blue-700 rounded-md text-xl border border-blue-500 transition-colors"
      >
        Normal
      </button>
      <button 
        onClick={() => setDifficulty('Hard')}
        className="px-6 py-3 bg-red-900 hover:bg-red-800 rounded-md text-xl border border-red-500 transition-colors"
      >
        Hard
      </button>
    </div>
  </div>
);

export default function StoryMode() {
  const location = useLocation();
  const [difficulty, setDifficulty] = useState(location.state?.difficulty || null);

  return <>{difficulty ? <PhaserGame difficulty={difficulty} /> : <DifficultyMenu setDifficulty={setDifficulty} />}</>;
}
