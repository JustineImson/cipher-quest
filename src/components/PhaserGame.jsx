import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as Phaser from 'phaser';
import MainScene from '../game/MainScene';
import OfficeScene from '../game/OfficeScene';
import LocationScene from '../game/LocationScene';
import DeductionBoardScene from '../game/DeductionBoardScene';
import StoryCipherOverlay from './StoryCipherOverlay';
import PauseOverlay from './PauseOverlay';

export default function PhaserGame({ difficulty, startScene }) {
  const gameRef = useRef(null);
  const [activeCipherData, setActiveCipherData] = useState(null);
  const navigate = useNavigate();

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
    const sceneArray = startScene === 'MainScene' 
      ? [MainScene, OfficeScene, LocationScene, DeductionBoardScene] 
      : [OfficeScene, MainScene, LocationScene, DeductionBoardScene];

    const config = {
      type: Phaser.AUTO,
      parent: gameRef.current,
      width: gameRef.current.clientWidth,
      height: gameRef.current.clientHeight,
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
      resizeObserver.disconnect();
      game.destroy(true);
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
    </div>
  );
}
