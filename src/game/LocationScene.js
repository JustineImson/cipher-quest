import * as Phaser from 'phaser';
import DialogueController from './DialogueController';
import { gameManager } from './GameManager';

const arrivalTexts = {
    apartment: "Messy, urban, and completely disorganized. But there's a heavy security setup for a place like this. The culprit was definitely here, and they left in a hurry. I need to see what they missed in their rush.",
    park: "Quiet today. Too quiet. If someone wanted to ditch evidence or stage a fake trail, this dense brush right off the main path is the perfect blind spot.",
    alley: "Dark, damp, and smells like cheap takeout and ozone. If our hacker, Marcus, is operating a shadow-server around here, he's hiding it well behind the trash.",
    beach: "The edge of the city. The tide washes away tracks fast, but fire... fire always leaves a scar in the sand. Let's see what they were trying so desperately to burn."
};

const evidenceConfig = {
    apartment: {
        file: 'log',
        key: 'hasFoundLog',
        x: 0.6, y: 0.8, 
        scale: 0.5,
        dialogue: "A corrupted access log. The ID starts with 'ER'. A hacker like Marcus would have wiped the mainframe completely. A brute like Donovan would have just smashed the hub. This looks like someone with actual authorization who panicked and aborted a print job. Someone who belongs there."
    },
    park: {
        file: 'boots',
        key: 'hasFoundBoots',
        x: 0.3, y: 0.7,
        scale: 0.5,
        dialogue: "Size 14 work boots dumped in the bushes. Obviously meant to point to Donovan. But look at the trail leading away... stilettos? Deep, narrow heel marks. Donovan wouldn't be caught dead in designer heels, and Marcus doesn't leave his computer chair. Someone much smaller walked in those massive boots, then changed shoes."
    },
    alley: {
        file: 'receipt',
        key: 'hasFoundReceipt',
        x: 0.7, y: 0.6,
        scale: 0.5,
        dialogue: "A receipt for 'The Grease Pit' pizza. But look at the payment method... it's a City Hall Corporate Procurement Credit Card. Why would a government account be paying for pizza delivered to a dark alleyway?"
    },
    beach: {
        file: 'pen',
        key: 'hasFoundPen',
        x: 0.5, y: 0.8,
        scale: 0.3,
        dialogue: "A sterling silver fountain pen buried in the ashes. Initials E.R. Expensive. Meticulous. Custom-weighted. This isn't just a writing tool, it's a status symbol. Someone who manages executives at City Hall would carry something exactly like this."
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
                this.scene.start('MainScene');
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

        // If evidence was already found, don't show it again
        if (gameManager.evidence[config.key]) return;

        const evidenceSprite = this.add.image(width * config.x, height * config.y, `evidence_${config.file}`);
        evidenceSprite.setScale(config.scale);
        
        // Highlight effect on hover to indicate it's clickable
        evidenceSprite.setInteractive({ useHandCursor: true })
            .on('pointerover', () => {
                evidenceSprite.setTint(0xffff00);
            })
            .on('pointerout', () => {
                evidenceSprite.clearTint();
            })
            .on('pointerdown', () => {
                // Collect evidence
                gameManager.collectEvidence(config.key, { name: config.file, location: this.locationKey });
                
                // Hide/Destroy the sprite
                evidenceSprite.destroy();
                
                // Trigger the dialogue
                this.dialogueController.playDialogue('detective', 'Detective', config.dialogue, () => {
                    this.dialogueController.hide();
                    
                    // Check for endgame trigger
                    if (gameManager.evidence.hasFoundLog && 
                        gameManager.evidence.hasFoundBoots && 
                        gameManager.evidence.hasFoundReceipt && 
                        gameManager.evidence.hasFoundPen) {
                        
                        gameManager.setPhase('DEDUCTION');
                        this.scene.start('DeductionBoardScene');
                    }
                });
            });
    }
}
