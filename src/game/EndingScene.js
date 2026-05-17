import * as Phaser from 'phaser';
import { useGameStore } from '../store/useGameStore';

export default class EndingScene extends Phaser.Scene {
  constructor() {
    super({ key: 'EndingScene' });
  }

  init(data) {
    this.isWin = !!data.isWin;
  }

  preload() {
    this.load.image('goodEndingBg', '/location/goodEnding.png');
    this.load.image('badEndingBg', '/location/badEnding.png');
  }

  create() {
    this.cameras.main.setBackgroundColor('#000000');

    const bgKey = this.isWin ? 'goodEndingBg' : 'badEndingBg';
    const bg = this.add.image(this.cameras.main.centerX, this.cameras.main.centerY, bgKey);
    
    // Safely scale the image, avoiding Infinity if it fails to load
    const bgW = bg.width || 1;
    const bgH = bg.height || 1;
    const scaleX = this.cameras.main.width / bgW;
    const scaleY = this.cameras.main.height / bgH;
    bg.setScale(Math.max(scaleX, scaleY));
    bg.setDepth(0);

    // Scrim for readability
    this.add.rectangle(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      this.cameras.main.width,
      this.cameras.main.height,
      0x000000,
      0.5
    ).setDepth(1);

    const goodEndingText = [
      "The cuffs clicked shut.",
      "The blueprints were safe, and the Mayor's secrets remained buried.",
      "It wasn't a clean job, but in this city, nothing ever is.",
      "Maybe now I can finally afford that gin."
    ];

    const badEndingText = [
      "I was too late.",
      "By the time I pieced it together, the vault was empty.",
      "The city's defenses are compromised. And my reputation is ash.",
      "Just another rainy night in a doomed city."
    ];

    this.monologue = this.isWin ? goodEndingText : badEndingText;

    this.currentLineIndex = 0;
    this.currentCharIndex = 0;

    // Text object for typewriter effect
    this.textObject = this.add.text(this.cameras.main.centerX, this.cameras.main.centerY, '', {
      fontFamily: '"Courier New", Courier, monospace',
      fontSize: '24px',
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: this.cameras.main.width * 0.8 }
    }).setOrigin(0.5).setDepth(2);

    // Fade in camera
    this.cameras.main.fadeIn(1000, 0, 0, 0);

    // Skip controls
    this.input.keyboard.on('keydown-SPACE', this.skipOrNext, this);
    this.input.on('pointerdown', this.skipOrNext, this);

    this.timeEvent = null;
    this.isTransitioning = false;

    // Start typing after a short delay
    this.time.delayedCall(1000, this.typeNextLine, [], this);
  }

  typeNextLine() {
    if (this.currentLineIndex >= this.monologue.length) {
      this.finishEnding();
      return;
    }

    this.textObject.setAlpha(1);
    this.textObject.setText('');
    this.currentCharIndex = 0;

    const currentLine = this.monologue[this.currentLineIndex];

    this.timeEvent = this.time.addEvent({
      delay: 50,
      callback: () => {
        this.currentCharIndex++;
        this.textObject.setText(currentLine.substring(0, this.currentCharIndex));

        if (this.currentCharIndex >= currentLine.length) {
          // Finished typing the line
          this.timeEvent.remove();
          this.timeEvent = null;

          // Wait 3 seconds, then fade out text
          this.time.delayedCall(3000, () => {
            if (this.isTransitioning) return;

            this.tweens.add({
              targets: this.textObject,
              alpha: 0,
              duration: 1000,
              onComplete: () => {
                if (this.isTransitioning) return;
                this.currentLineIndex++;
                this.typeNextLine();
              }
            });
          }, [], this);
        }
      },
      callbackScope: this,
      loop: true
    });
  }

  skipOrNext() {
    if (this.isTransitioning) return;

    if (this.timeEvent) {
      // If currently typing, skip to the end of the line
      this.timeEvent.remove();
      this.timeEvent = null;
      this.textObject.setText(this.monologue[this.currentLineIndex]);

      this.time.removeAllEvents();

      this.time.delayedCall(3000, () => {
        if (this.isTransitioning) return;
        this.tweens.add({
          targets: this.textObject,
          alpha: 0,
          duration: 1000,
          onComplete: () => {
            if (this.isTransitioning) return;
            this.currentLineIndex++;
            this.typeNextLine();
          }
        });
      }, [], this);
    } else {
      // If text is fully shown, skip to the next line immediately
      this.time.removeAllEvents();
      this.tweens.killAll();
      this.currentLineIndex++;
      this.typeNextLine();
    }
  }

  finishEnding() {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    this.time.removeAllEvents();
    if (this.timeEvent) {
      this.timeEvent.remove();
    }

    this.cameras.main.fadeOut(2000, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      // Show the post-game overlay via Zustand instead of transitioning to another scene
      // Force-flush cloud save before showing post-game menu (fire and forget so UI isn't blocked)
      try {
        useGameStore.getState().syncProgressToCloud();
      } catch (err) {
        console.warn('Failed to sync progress at ending:', err);
      }
      useGameStore.getState().setShowPostGameMenu(true);
    });
  }
}
