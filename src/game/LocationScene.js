import * as Phaser from 'phaser';
import DialogueController from './DialogueController';
import { gameManager } from './GameManager';
import { bgmController } from '../engine/BGMController';

const arrivalTexts = {
    apartment: "Messy, urban, and completely disorganized. But there's a heavy security setup for a place like this. The culprit was definitely here, and they left in a hurry. I need to see what they missed in their rush.",
    park: "Quiet today. Too quiet. If someone wanted to ditch evidence or stage a fake trail, this dense brush right off the main path is the perfect blind spot.",
    alley: "Dark, damp, and smells like cheap takeout and ozone. If our hacker, Marcus, is operating a shadow-server around here, he's hiding it well behind the trash.",
    beach: "The edge of the city. The tide washes away tracks fast, but fire... fire always leaves a scar in the sand. Let's see what they were trying so desperately to burn."
};

// ══════════════════════════════════════════════════════════════════════════
// EVIDENCE CONFIG — tweak x, y, displayW, displayH to reposition/resize
//   x, y        → position as % of screen (0.0 = left/top, 1.0 = right/bottom)
//   displayW    → display width in pixels
//   displayH    → display height in pixels
// ══════════════════════════════════════════════════════════════════════════
const evidenceConfig = {
    apartment: {
        file: 'log',
        key: 'hasFoundLog',
        x: 0.22,             // horizontal position (% of screen width)
        y: 0.47,            // vertical position (% of screen height)
        displayW: 120,      // display width in px
        displayH: 120,      // display height in px
        dialogue: [
            "A corrupted access log. The ID starts with 'ER'. A hacker like Marcus would have wiped the mainframe completely. A brute like Donovan would have just smashed the hub.",
            "This looks like someone with actual authorization who panicked and aborted a print job. Someone who belongs there."
        ],
        cipherData: {
            ciphertext: "BRAYMIOH MNSKYCH",
            clue: "The log is heavily encrypted by City Hall's firewall.\nSysAdmin: MAYOR (Vigenere)",
            solution: "PRINTOUT ABORTED",
            type: "vigenere",
            keyword: "MAYOR"
        }
    },
    park: {
        file: 'boots',
        key: 'hasFoundBoots',
        x: 0.55,            // horizontal position (% of screen width)
        y: 0.88,            // vertical position (% of screen height)
        displayW: 140,      // display width in px
        displayH: 140,      // display height in px
        dialogue: [
            "Size 14 work boots dumped in the bushes. Obviously meant to point to Donovan. But look at the trail leading away... stilettos? Deep, narrow heel marks.",
            "Donovan wouldn't be caught dead in designer heels, and Marcus doesn't leave his computer chair. Someone much smaller walked in those massive boots, then changed shoes."
        ],
        cipherData: {
            ciphertext: "S M T N C E O L K O R F O L R E",
            clue: "A scrawled note is stuffed inside the boot, written in a zig-zag pattern.\nThe tracks go back and forth... 5 times.",
            solution: "STOLEN FROM LOCKER",
            type: "railfence",
            rails: 5
        }
    },
    alley: {
        file: 'receipt',
        key: 'hasFoundReceipt',
        x: 0.42,            // horizontal position (% of screen width)
        y: 0.92,            // vertical position (% of screen height)
        displayW: 100,      // display width in px
        displayH: 130,      // display height in px
        dialogue: "A receipt for 'The Grease Pit' pizza. But look at the payment method... it's a City Hall Corporate Procurement Credit Card. Why would a government account be paying for pizza delivered to a dark alleyway?",
        cipherData: {
            ciphertext: "O D P E C A O U C S R R R T E A D",
            clue: "Marcus’s paranoid transaction hash. (Columnar Transposition)\nKey: HACKER (Alphabetical order determines the columns)",
            solution: "CORPORATE CARD USED",
            type: "columnar",
            keyword: "HACKER"
        }
    },
    beach: {
        file: 'pen',
        key: 'hasFoundPen',
        x: 0.51,            // horizontal position (% of screen width)
        y: 0.05,            // vertical position (% of screen height)
        displayW: 50,       // display width in px
        displayH: 50,       // display height in px
        dialogue: "A sterling silver fountain pen buried in the ashes. Initials E.R. Expensive. Meticulous. Custom-weighted. This isn't just a writing tool, it's a status symbol. Someone who manages executives at City Hall would carry something exactly like this.",
        cipherData: {
            ciphertext: "AHRDOQFMSQ ARQMDV",
            clue: "Elena's personal, aristocratic cipher.\nA sterling SILVER cipher. (Keyword Mixed Alphabet)",
            solution: "BLUEPRINTS BURNED",
            type: "substitution",
            keyword: "SILVER"
        }
    }
};

export default class LocationScene extends Phaser.Scene {
    constructor() {
        super('LocationScene');
    }

    init(data) {
        this.locationKey = data.locationKey;
    }

    preload() {
        this.load.image(`bg_${this.locationKey}`, `/location/${this.locationKey}.png`);
        this.load.image('dialogueBox', '/dialogueBox.png');
        this.load.image('detective', '/characters/detectiveImg.png');

        const evidence = evidenceConfig[this.locationKey];
        if (evidence) {
            this.load.image(`evidence_${evidence.file}`, `/evidence/${evidence.file}.png`);
        }
    }

    create() {
        const { width, height } = this.scale;

        // ANIMATION: Crime Scene Flash + Fade
        this.cameras.main.flash(1000, 255, 255, 255);
        this.cameras.main.fadeIn(1500, 0, 0, 0);

        bgmController.play('bgm2');

        const bg = this.add.image(width / 2, height / 2, `bg_${this.locationKey}`);
        const scaleX = width / bg.width;
        const scaleY = height / bg.height;
        const scale = Math.max(scaleX, scaleY);
        bg.setScale(scale);

        // UI Container
        const uiContainer = this.add.container(0, 0).setDepth(100);

        const returnBtn = this.add.rectangle(150, 50, 200, 50, 0x111111, 0.8)
            .setStrokeStyle(2, 0xd97706)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => {
                this.input.enabled = false;
                this.cameras.main.fadeOut(1200, 0, 0, 0);
                this.cameras.main.once('camerafadeoutcomplete', () => {
                    this.scene.start('MainScene', { fromLocation: this.locationKey });
                });
            })
            .on('pointerover', () => returnBtn.setFillStyle(0x333333, 0.9))
            .on('pointerout', () => returnBtn.setFillStyle(0x111111, 0.8));

        const returnText = this.add.text(150, 50, 'Return to Map', {
            fontSize: '20px',
            fill: '#d97706',
            fontFamily: 'serif'
        }).setOrigin(0.5);

        uiContainer.add([returnBtn, returnText]);

        this.dialogueController = new DialogueController(this);

        this.placeEvidence(width, height);

        // Arrival Voiceover (only trigger on first visit)
        const visitedKey = `visited_${this.locationKey}`;
        if (!this.registry.get(visitedKey)) {
            this.registry.set(visitedKey, true);
            const voText = arrivalTexts[this.locationKey];
            if (voText) {
                this.dialogueController.playDialogue('detective', 'Detective', voText, () => {
                    this.dialogueController.hide();
                });
            }
        }
    }

    placeEvidence(width, height) {
        const config = evidenceConfig[this.locationKey];
        if (!config) return;

        const evidenceSprite = this.add.image(width * config.x, height * config.y, `evidence_${config.file}`);
        evidenceSprite.setDisplaySize(config.displayW, config.displayH);

        // Highlight effect on hover to indicate it's clickable
        evidenceSprite.setInteractive({ useHandCursor: true })
            .on('pointerover', () => {
                evidenceSprite.setTint(0xffff00);
            })
            .on('pointerout', () => {
                evidenceSprite.clearTint();
            })
            .on('pointerdown', () => {
                // Pause this scene and trigger the React StoryCipherOverlay
                this.scene.pause();
                
                const handleCipherSolved = () => {
                    cleanup();
                    if (this.scene.isPaused()) this.scene.resume();

                    // Collect evidence
                    gameManager.collectEvidence(config.key, { name: config.file, location: this.locationKey });

                    // Hide/Destroy the sprite
                    evidenceSprite.destroy();

                    // Trigger the dialogue
                    const lines = Array.isArray(config.dialogue) ? config.dialogue : [config.dialogue];
                    let lineIndex = 0;

                    const showNext = () => {
                        if (lineIndex < lines.length) {
                            this.dialogueController.playDialogue('detective', 'Detective', lines[lineIndex], () => {
                                lineIndex++;
                                showNext();
                            });
                        } else {
                            this.dialogueController.hide();

                            // Check for endgame trigger
                            if (gameManager.evidence.hasFoundLog &&
                                gameManager.evidence.hasFoundBoots &&
                                gameManager.evidence.hasFoundReceipt &&
                                gameManager.evidence.hasFoundPen) {

                                gameManager.setPhase('DEDUCTION');
                                this.cameras.main.fadeOut(2000, 0, 0, 0);
                                this.cameras.main.once('camerafadeoutcomplete', () => {
                                    this.scene.start('DeductionBoardScene');
                                });
                            }
                        }
                    };
                    showNext();
                };

                const handleCipherClosed = () => {
                    cleanup();
                    if (this.scene.isPaused()) this.scene.resume();
                };

                const cleanup = () => {
                    window.removeEventListener('storyCipherSolved', handleCipherSolved);
                    window.removeEventListener('storyCipherClosed', handleCipherClosed);
                };

                window.addEventListener('storyCipherSolved', handleCipherSolved);
                window.addEventListener('storyCipherClosed', handleCipherClosed);

                window.dispatchEvent(new CustomEvent('openStoryCipher', { detail: config.cipherData }));
            });
    }
}
