import * as Phaser from 'phaser';
import { bgmController } from '../engine/BGMController';

export default class IntroScene extends Phaser.Scene {
  constructor() {
    super({ key: 'IntroScene' });
  }
  preload() {
    this.load.image('introBg', '/location/introSceneBg.png');
  }

  create() {
    // Silence — no BGM during the intro
    bgmController.stop();

    // Background Image
    const bg = this.add.image(this.cameras.main.centerX, this.cameras.main.centerY, 'introBg');
    const scaleX = this.cameras.main.width / bg.width;
    const scaleY = this.cameras.main.height / bg.height;
    bg.setScale(Math.max(scaleX, scaleY));

    // Scrim for readability
    this.add.rectangle(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      this.cameras.main.width,
      this.cameras.main.height,
      0x000000,
      0.5
    );

    this.monologue = [
      "The rain hadn't stopped for three days.",
      "The city was drowning in its own grime. And I was drowning in unpaid bills.",
      "I was about to pour my last glass of cheap gin when the telegraph machine started clicking.",
      "It was the Chief. Panic in his words. The Mayor's private vault had been breached.",
      "The city's defense blueprints were gone. If I didn't find them by sunrise... there wouldn't be a city left to save."
    ];

    this.currentLineIndex = 0;
    this.currentCharIndex = 0;

    // Text object for typewriter effect
    this.textObject = this.add.text(this.cameras.main.centerX, this.cameras.main.centerY, '', {
      fontFamily: '"Courier New", Courier, monospace',
      fontSize: '24px',
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: this.cameras.main.width * 0.8 }
    }).setOrigin(0.5);

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
      this.finishIntro();
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
            if (this.isTransitioning) return; // Prevent if already skipping

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

  finishIntro() {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    this.time.removeAllEvents();
    if (this.timeEvent) {
      this.timeEvent.remove();
    }

    this.cameras.main.fadeOut(2000, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('OfficeScene');
    });
  }
}
