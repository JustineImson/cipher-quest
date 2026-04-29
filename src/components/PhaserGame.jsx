import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as Phaser from 'phaser';
import MainScene from '../game/MainScene';

export default function PhaserGame() {
  const gameRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleNavMenu = () => navigate('/');
    window.addEventListener('nav-main-menu', handleNavMenu);
    const config = {
      type: Phaser.AUTO,
      parent: gameRef.current,
      width: window.innerWidth,
      height: window.innerHeight,
      physics: {
        default: 'matter',
        matter: {
          debug: true, // Useful for testing player collisions and polygons
          gravity: { y: 0 } // Top-down isometric, so no gravity
        }
      },
      scene: [MainScene]
    };

    const game = new Phaser.Game(config);

    const handleResize = () => {
      game.scale.resize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('nav-main-menu', handleNavMenu);
      game.destroy(true);
    };
  }, []);

  return <div ref={gameRef} className="w-full h-full overflow-hidden" />;
}
