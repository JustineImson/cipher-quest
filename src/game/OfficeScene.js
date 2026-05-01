import * as Phaser from 'phaser';
import DialogueController from './DialogueController';
import { gameManager, GamePhases } from './GameManager';
import { addDevPanel } from './DevPanel';

const dialogueScript = [
    { speaker: 'System', text: "Last night, the City Hall Vault was breached. The master blueprints for the city's defenses are missing.", sprite: null },
    { speaker: 'Police Chief', text: "Detective, we have a crisis. The Mayor's private safe was emptied last night. We have three suspects, but no hard proof.", sprite: 'police' },
    { speaker: 'Police Chief', text: "Listen closely to their profiles. You are going to need to remember their habits to solve this.", sprite: 'police' },
    { speaker: 'Police Chief', text: "Suspect number one is Donovan, the hired muscle. He's a giant of a man who wears heavy size 14 work boots. He lacks finesse and prefers to kick doors down rather than pick locks.", sprite: 'police' },
    { speaker: 'Police Chief', text: "Suspect number two is Marcus, an underground hacker. He's incredibly messy, constantly eats greasy fast food, and rarely leaves his basement. He does not have employee access to City Hall.", sprite: 'police' },
    { speaker: 'Police Chief', text: "Suspect number three is Elena, the Mayor's Head Secretary. She is meticulous, has master keys to the building, and always wears a very distinct, expensive lavender perfume.", sprite: 'police' },
    { speaker: 'Police Chief', text: "The thief left a trail across the city. I need you to investigate the Apartment, the Alley, the Park, and the Beach. Match the clues to the profiles.", sprite: 'police' },
    { speaker: 'Detective', text: "I've got it memorized, Chief. I'll let the evidence point me to the right suspect.", sprite: 'detective' },
    { speaker: 'System', text: "Explore the city to find 4 pieces of evidence.", sprite: null },
    // Scene Arrival
    { speaker: 'Detective', text: "So this is the Mayor's private sanctum. The safe is wide open, papers scattered everywhere. Whoever did this was looking for something specific—the city blueprints—and they tried a little too hard to make it look like a random smash-and-grab.", sprite: 'detective' }
];

export default class OfficeScene extends Phaser.Scene {
    constructor() {
        super('OfficeScene');
        this.currentLineIndex = 0;
        this.dialogueActive = true;
    }

    preload() {
        this.load.image('bg_office', '/location/office.png');
        this.load.image('dialogueBox', '/dialogueBox.png');
        this.load.image('detective', '/characters/detectiveImg.png');
        this.load.image('police', '/characters/police.png');
        this.load.image('Donovan', '/characters/Donovan.png');
        this.load.image('Elena', '/characters/Elena.png');
        this.load.image('Marcus', '/characters/Marcus.png');
    }

    create() {
        const { width, height } = this.scale;

        // ANIMATION 1: Cinematic Fade-In from black over 2 seconds
        this.cameras.main.fadeIn(2000, 0, 0, 0);

        // Background
        this.bg = this.add.image(width / 2, height / 2, 'bg_office');
        const scaleX = width / this.bg.width;
        const scaleY = height / this.bg.height;
        const scale = Math.max(scaleX, scaleY);
        this.bg.setScale(scale);

        // ANIMATION 2: Subtle Ambient Breathing for the background
        this.tweens.add({
            targets: this.bg,
            scaleX: scale * 1.02, // Zoom in slightly (2%)
            scaleY: scale * 1.02,
            duration: 8000,       // Over 8 seconds
            yoyo: true,           // Zoom back out
            repeat: -1,           // Loop infinitely
            ease: 'Sine.easeInOut'
        });

        this.createUI(width, height);
        this.dialogueController = new DialogueController(this);

        if (gameManager.currentPhase === GamePhases.BRIEFING) {
            // Start Briefing
            this.currentLineIndex = 0;
            this.dialogueActive = true;
            this.showNextLine();
        } else if (gameManager.currentPhase === GamePhases.INTERROGATION) {
            this.startInterrogation(width, height);
        }
    }

    createUI(width, height) {
        // "Go to City Map" Button
        this.leaveBtn = this.add.rectangle(width - 150, 50, 250, 50, 0x111111, 0.8)
            .setStrokeStyle(2, 0xd97706)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => {
                if (!this.dialogueActive) {
                    this.scene.start('MainScene');
                }
            })
            .on('pointerover', () => { if (!this.dialogueActive) this.leaveBtn.setFillStyle(0x333333, 0.9) })
            .on('pointerout', () => { if (!this.dialogueActive) this.leaveBtn.setFillStyle(0x111111, 0.8) })
            .setVisible(false);

        this.leaveText = this.add.text(width - 150, 50, 'Go to City Map', {
            fontSize: '22px',
            fill: '#d97706',
            fontFamily: 'serif'
        }).setOrigin(0.5).setVisible(false);
        // Dev teleport panel
        addDevPanel(this);
    }

    showNextLine() {
        if (this.currentLineIndex >= dialogueScript.length) {
            this.endDialogue();
            return;
        }

        const line = dialogueScript[this.currentLineIndex];

        this.dialogueController.playDialogue(
            line.sprite,
            line.speaker,
            line.text,
            () => this.showNextLine()
        );

        this.currentLineIndex++;
    }

    endDialogue() {
        this.dialogueActive = false;
        this.dialogueController.hide();

        // Transition to investigating phase so briefing doesn't replay
        gameManager.setPhase(GamePhases.INVESTIGATING);

        // Show leave button
        this.leaveBtn.setVisible(true);
        this.leaveText.setVisible(true);
    }

    startInterrogation(width, height) {
        this.leaveBtn.setVisible(false);
        this.leaveText.setVisible(false);

        // Prompt
        this.promptText = this.add.text(width / 2, 100, 'Who is the culprit?', {
            fontSize: '48px',
            fill: '#d97706',
            fontFamily: 'serif',
            fontStyle: 'bold',
            backgroundColor: '#000000aa',
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5);

        // Suspects
        const suspects = [
            { key: 'Donovan', x: width / 2 - 600, name: 'Donovan' },
            { key: 'Elena', x: width / 2, name: 'Elena Rostova' },
            { key: 'Marcus', x: width / 2 + 600, name: 'Marcus' }
        ];

        this.suspectImages = [];

        suspects.forEach(s => {
            const img = this.add.image(s.x, height / 2 + 20, s.key).setScale(0.45)
                .setInteractive({ useHandCursor: true })
                .on('pointerover', () => img.setTint(0xaaaaaa))
                .on('pointerout', () => img.clearTint())
                .on('pointerdown', () => this.handleAccusation(s.key));

            this.add.text(s.x, height / 2 + 250, s.name, {
                fontSize: '28px', fill: '#ffffff', fontFamily: 'sans-serif', backgroundColor: '#000000aa', padding: { x: 10, y: 5 }
            }).setOrigin(0.5);

            this.suspectImages.push(img);
        });
    }

    handleAccusation(suspectKey) {
        this.promptText.setVisible(false);
        this.suspectImages.forEach(img => img.setVisible(false));

        if (suspectKey === 'Marcus') {
            this.dialogueController.playDialogue('detective', 'Marcus', "Are you kidding me, Detective? Look at my setup. I crack firewalls from a couch. You think I'm going to physically break into the Mayor's office, steal blueprints, and then use a government corporate credit card to order my own pizza to the scene of the crime? I'm a hacker, not an idiot. You're being played.", () => {
                this.showEndScreen('Game Over - Failed\nThe real culprit escaped.', false);
            });
        } else if (suspectKey === 'Donovan') {
            this.dialogueController.playDialogue('detective', 'Donovan', "Yeah, those are my boots in the park. So what? I reported them stolen from the gym locker room a week ago! You think I'm tip-toeing around City Hall pulling off some high-tech heist? I bend steel for a living, I don't type on keyboards or wear fancy perfume. Go look at my timecards!", () => {
                this.showEndScreen('Game Over - Failed\nThe real culprit escaped.', false);
            });
        } else if (suspectKey === 'Elena') {
            this.dialogueController.playDialogue('detective', 'Elena', "A coincidence. A hacker could have spoofed my ID.", () => {
                this.dialogueController.playDialogue('detective', 'Detective', "Maybe. But a hacker like Marcus wouldn't use your City Hall Procurement Credit Card to order pizza to his own alleyway just to leave the receipt in the trash. You tried to frame him, but you used your own office budget to do it. And the final nail in the coffin. You burned the copied blueprints at the beach to destroy the evidence. But you dropped this. Sterling silver. Engraved with 'E.R.' You were meticulous about everyone else's tracks, Elena, but you forgot to cover your own.", () => {
                    this.showEndScreen('Case Closed - Victory\nElena Rostova Apprehended.', true);
                });
            });
        }
    }

    showEndScreen(text, isVictory) {
        this.dialogueController.hide();
        const { width, height } = this.scale;

        this.add.rectangle(0, 0, width, height, 0x000000, 0.8).setOrigin(0, 0).setDepth(1000);

        this.add.text(width / 2, height / 2 - 50, text, {
            fontSize: '48px',
            fill: isVictory ? '#10b981' : '#ef4444',
            fontFamily: 'serif',
            fontStyle: 'bold',
            align: 'center'
        }).setOrigin(0.5).setDepth(1001);

        const btn = this.add.rectangle(width / 2, height / 2 + 100, 200, 50, 0x333333).setDepth(1001)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => {
                window.location.reload();
            });

        this.add.text(width / 2, height / 2 + 100, 'Restart Game', { fontSize: '24px', fill: '#fff' }).setOrigin(0.5).setDepth(1002);
    }
}
