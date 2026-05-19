import * as Phaser from 'phaser';
import { bgmController } from '../engine/BGMController';

export default class IntroScene extends Phaser.Scene {
  constructor() {
    super({ key: 'IntroScene' });
  }
  preload() {
    this.load.video('introBg', '/location/introSceneVid.mp4');
  }

  create() {
    // Silence — no BGM during the intro
    bgmController.stop();

    const { width, height } = this.scale;

    // Background Video
    this.bg = this.add.video(width / 2, height, 'introBg').setOrigin(0.5, 1);
    this.bg.setMute(true);
    this.bg.play(true); // loop the video

    // Helper to compute cover-fit scale from the native video dimensions.
    const fitVideo = (vw, vh) => {
      if (!this.bg || vw <= 0 || vh <= 0) return;
      const sx = width / vw;
      const sy = height / vh;
      this.bg.setScale(Math.max(sx, sy));
    };

    // In Phaser 4 the Video texture is created asynchronously via
    // requestVideoFrame. The 'created' event fires once with the native
    // video dimensions — this is the only reliable moment to compute scale.
    this.bg.once('created', (_vid, vw, vh) => {
      fitVideo(vw, vh);
    });

    // Also try immediately in case the texture was already created (fast cache hit)
    if (this.bg.video && this.bg.video.videoWidth > 0) {
      fitVideo(this.bg.video.videoWidth, this.bg.video.videoHeight);
    }

    // Scrim for readability
    this.scrim = this.add.rectangle(
      width / 2,
      height / 2,
      width,
      height,
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
    this.textObject = this.add.text(width / 2, height / 2, '', {
      fontFamily: '"Courier New", Courier, monospace',
      fontSize: '24px',
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: width * 0.8 }
    }).setOrigin(0.5);

    // Handle dynamic window resizing (which often happens immediately after create)
    this.scale.on('resize', this.handleResize, this);
    this.events.on('shutdown', () => {
      this.scale.off('resize', this.handleResize, this);
    });

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

  handleResize(gameSize) {
    const { width, height } = gameSize;

    if (this.bg) {
      this.bg.setPosition(width / 2, height);
      const vid = this.bg.video;
      if (vid && vid.videoWidth > 0 && vid.videoHeight > 0) {
        const scaleX = width / vid.videoWidth;
        const scaleY = height / vid.videoHeight;
        this.bg.setScale(Math.max(scaleX, scaleY));
      }
    }

    if (this.scrim) {
      this.scrim.setPosition(width / 2, height / 2);
      this.scrim.setSize(width, height);
    }

    if (this.textObject) {
      this.textObject.setPosition(width / 2, height / 2);
      this.textObject.setStyle({ wordWrap: { width: width * 0.8 } });
    }
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
