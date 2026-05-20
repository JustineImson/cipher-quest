import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as Phaser from 'phaser';
import MainScene from '../game/MainScene';
import OfficeScene from '../game/OfficeScene';
import LocationScene from '../game/LocationScene';
import DeductionBoardScene from '../game/DeductionBoardScene';
import IntroScene from '../game/IntroScene';
import EndingScene from '../game/EndingScene';
import UIScene from '../game/UIScene';
import StoryCipherOverlay from './StoryCipherOverlay';
import PauseOverlay from './PauseOverlay';
import DeductionBoardOverlay from './ui/DeductionBoardOverlay';
import PostGameOverlay from './ui/PostGameOverlay';
import { useGameStore } from '../store/useGameStore';
import { useSfx } from '../hooks/useSfx';

export default function PhaserGame({ difficulty, startScene }) {
  const gameRef = useRef(null);
  const gameInstanceRef = useRef(null);
  const [activeCipherData, setActiveCipherData] = useState(null);
  const navigate = useNavigate();
  const { unlockAllEvidence, collectedEvidence, toggleDeductionBoard, isAdmin } = useGameStore();
  const { playClick } = useSfx();
  const [devModeVisible, setDevModeVisible] = useState(false);

  // Listen for the custom event to return to main menu
  useEffect(() => {
    const handleReturnToMenu = () => navigate('/');
    window.addEventListener('returnToMainMenu', handleReturnToMenu);
    return () => window.removeEventListener('returnToMainMenu', handleReturnToMenu);
  }, [navigate]);

  // Listen for the custom event to open the Story Cipher
  useEffect(() => {
    const handleOpenStoryCipher = (e) => {
      setActiveCipherData(e.detail);
    };

    window.addEventListener('openStoryCipher', handleOpenStoryCipher);
    return () => {
      window.removeEventListener('openStoryCipher', handleOpenStoryCipher);
    };
  }, []);

  useEffect(() => {
    const sceneClasses = { IntroScene, MainScene, OfficeScene, LocationScene, DeductionBoardScene, EndingScene, UIScene };
    const StartClass = sceneClasses[startScene] || sceneClasses['MainScene'];
    const sceneArray = [
      StartClass,
      ...Object.values(sceneClasses).filter(c => c !== StartClass)
    ];

    const config = {
      type: Phaser.AUTO,
      parent: gameRef.current,
      scale: {
        mode: Phaser.Scale.NONE,
        width: gameRef.current ? gameRef.current.clientWidth : 1920,
        height: gameRef.current ? gameRef.current.clientHeight : 1080
      },
      physics: {
        default: 'matter',
        matter: {
          debug: false,
          gravity: { y: 0 } // Top-down isometric, so no gravity
        }
      },
      dom: {
        createContainer: true
      },
      scene: sceneArray
    };

    const game = new Phaser.Game(config);
    gameInstanceRef.current = game;

    // Listen for restart event from PostGameOverlay
    const handleRestart = () => {
      if (game) {
        // Stop all running scenes and restart to IntroScene
        game.scene.getScenes(true).forEach((s) => game.scene.stop(s.scene.key));
        // Clear the game registry so per-playthrough flags (visited_, etc.) are reset
        game.registry.destroy();
        game.scene.start('IntroScene');
      }
    };
    window.addEventListener('restartToIntro', handleRestart);

    const handleResize = () => {
      if (gameRef.current && game) {
        game.scale.resize(gameRef.current.clientWidth, gameRef.current.clientHeight);
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    if (gameRef.current) {
      resizeObserver.observe(gameRef.current);
    }

    return () => {
      window.removeEventListener('restartToIntro', handleRestart);
      resizeObserver.disconnect();
      game.destroy(true);
      gameInstanceRef.current = null;
    };
  }, []);

  const handleCloseCipher = () => {
    setActiveCipherData(null);
    window.dispatchEvent(new Event('storyCipherClosed'));
  };

  const handleSolveCipher = () => {
    setActiveCipherData(null);
    window.dispatchEvent(new Event('storyCipherSolved'));
  };

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div ref={gameRef} className="w-full h-full" />
      
      {activeCipherData && (
        <StoryCipherOverlay 
          cipherData={activeCipherData} 
          onClose={handleCloseCipher}
          onSolve={handleSolveCipher}
        />
      )}
      <PauseOverlay />
      <DeductionBoardOverlay />
      <PostGameOverlay />

      {/* DevMode Panel for Story Mode - Admin Only */}
      {isAdmin && (
        <div className="absolute bottom-4 right-4 flex flex-col items-end z-[200]">
          <button
            onClick={() => { playClick(); setDevModeVisible(!devModeVisible); }}
            className="text-xs text-[#c9a84c]/30 hover:text-[#c9a84c]/80 transition-colors mb-2 font-mono drop-shadow-[0_0_2px_rgba(0,0,0,1)] bg-black/50 px-2 py-1 rounded"
          >
            {devModeVisible ? '[HIDE_DEV]' : '[DEV_TOOLS]'}
          </button>

          {devModeVisible && (
            <div className="bg-black/90 border border-red-900/50 p-4 rounded text-xs flex flex-col gap-3 shadow-2xl backdrop-blur-md w-56 transition-all font-mono">
              <span className="text-red-500 font-bold uppercase tracking-widest border-b border-red-900/50 pb-2 text-center text-[10px]">Story Developer</span>
              
              <button
                onClick={() => { 
                  playClick(); 
                  unlockAllEvidence();
                }}
                className="bg-red-900/20 hover:bg-red-900/50 text-red-200/80 py-1.5 min-h-[var(--touch-min)] rounded transition-colors border border-red-900/30"
              >
                Unlock All Evidence
              </button>
              <button
                onClick={() => { playClick(); window.dispatchEvent(new Event('forceDeductionScene')); }}
                className="bg-red-900/20 hover:bg-red-900/50 text-red-200/80 py-1.5 min-h-[var(--touch-min)] rounded transition-colors border border-red-900/30"
              >
                Force Open Board
              </button>
              
              <div className="py-2 border-t border-red-900/50 text-center mt-1">
                <span className="text-red-500/50 text-[10px] block mb-1">EVIDENCE COUNT:</span>
                <span className="text-white font-bold tracking-widest">{collectedEvidence?.length || 0}/4</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
