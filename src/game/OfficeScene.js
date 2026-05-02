import * as Phaser from 'phaser';
import DialogueController from './DialogueController';
import { gameManager, GamePhases } from './GameManager';
import { addDevPanel } from './DevPanel';
import { bgmController } from '../engine/BGMController';
import { useGameStore } from '../store/useGameStore';
import { createHUD } from './HUD';

const dialogueScript = [
    { speaker: 'System', text: "Last night, the City Hall Vault was breached. The master blueprints for the city's defenses are missing.", sprite: null },
    { speaker: 'Police Chief', text: "Detective, we have a crisis. The Mayor's private safe was emptied last night. We have three suspects, but no hard proof.", sprite: 'police' },
    { speaker: 'Police Chief', text: "Listen closely to their profiles. You are going to need to remember their habits to solve this.", sprite: 'police' },
    { speaker: 'Police Chief', text: "Suspect number one is Donovan, the hired muscle. He's a giant of a man who wears heavy size 14 work boots. He lacks finesse and prefers to kick doors down rather than pick locks.", sprite: 'police', suspectImg: 'Donovan' },
    { speaker: 'Police Chief', text: "Suspect number two is Marcus, an underground hacker. He's incredibly messy, constantly eats greasy fast food, and rarely leaves his basement. He does not have employee access to City Hall.", sprite: 'police', suspectImg: 'Marcus' },
    { speaker: 'Police Chief', text: "Suspect number three is Elena, the Mayor's Head Secretary. She is meticulous, has master keys to the building, and always wears a very distinct, expensive lavender perfume.", sprite: 'police', suspectImg: 'Elena' },
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

        // Featured Suspect Image for Briefing
        this.featuredSuspectImg = this.add.image(width / 2, height / 2 - 80, 'Donovan')
            .setAlpha(0)
            .setScale(0.5)
            .setDepth(30);

        if (gameManager.currentPhase === GamePhases.BRIEFING) {
            bgmController.play('bgm5');
            // Start Briefing
            this.currentLineIndex = 0;
            this.dialogueActive = true;
            this.showNextLine();
        } else if (gameManager.currentPhase === GamePhases.INTERROGATION) {
            bgmController.play('bgm3');
            this.startInterrogation(width, height);
        }
    }

    createUI(width, height) {
        const btnX = 120;
        const btnY = 95;
        const btnW = 200;
        const btnH = 40;

        const btnShadow = this.add.rectangle(btnX + 4, btnY + 4, btnW, btnH, 0x000000, 0.6)
            .setOrigin(0.5).setVisible(false);
        btnShadow.isUI = true;

        // "Go to City Map" Button (Hidden initially)
        this.leaveBtn = this.add.rectangle(btnX, btnY, btnW, btnH, 0x1a1208, 0.95)
            .setStrokeStyle(2, 0x8b6b32)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => {
                if (!this.dialogueActive) {
                    this.tweens.add({
                        targets: [this.leaveBtn, this.innerLine, this.leaveText],
                        scaleX: 0.95, scaleY: 0.95, duration: 50, yoyo: true,
                        onComplete: () => {
                            this.cameras.main.fadeOut(1000, 0, 0, 0);
                            this.cameras.main.once('camerafadeoutcomplete', () => {
                                this.scene.start('MainScene');
                            });
                        }
                    });
                }
            })
            .on('pointerover', () => {
                if (!this.dialogueActive) {
                    this.leaveBtn.setFillStyle(0x2a1e0e, 1);
                    this.tweens.add({ targets: [this.leaveBtn, this.innerLine, this.leaveText], scaleX: 1.05, scaleY: 1.05, duration: 150, ease: 'Sine.easeOut' });
                }
            })
            .on('pointerout', () => {
                if (!this.dialogueActive) {
                    this.leaveBtn.setFillStyle(0x1a1208, 0.95);
                    this.tweens.add({ targets: [this.leaveBtn, this.innerLine, this.leaveText], scaleX: 1, scaleY: 1, duration: 150, ease: 'Sine.easeOut' });
                }
            })
            .setVisible(false);
        this.leaveBtn.isUI = true;

        this.innerLine = this.add.rectangle(btnX, btnY, btnW - 8, btnH - 8, 0x000000, 0)
            .setStrokeStyle(1, 0x8b6b32, 0.3)
            .setOrigin(0.5).setVisible(false);
        this.innerLine.isUI = true;

        this.leaveText = this.add.text(btnX, btnY, '◄ Go to City Map', {
            fontSize: '18px',
            fill: '#d97706',
            fontFamily: 'serif',
            fontStyle: 'bold',
            letterSpacing: 1
        }).setOrigin(0.5).setVisible(false);
        this.leaveText.isUI = true;

        this.leaveElements = [btnShadow, this.leaveBtn, this.innerLine, this.leaveText];

        createHUD(this);

        // Dev teleport panel
        addDevPanel(this);
    }

    showNextLine() {
        if (this.currentLineIndex >= dialogueScript.length) {
            this.endDialogue();
            return;
        }

        const line = dialogueScript[this.currentLineIndex];

        // Handle Featured Suspect Image Fading
        if (line.suspectImg) {
            if (this.featuredSuspectImg.texture.key !== line.suspectImg || this.featuredSuspectImg.alpha === 0) {
                this.tweens.killTweensOf(this.featuredSuspectImg);
                this.featuredSuspectImg.setTexture(line.suspectImg);
                this.featuredSuspectImg.setAlpha(0);
                this.tweens.add({
                    targets: this.featuredSuspectImg,
                    alpha: 1,
                    duration: 600,
                    ease: 'Power2'
                });
            }
        } else {
            this.tweens.killTweensOf(this.featuredSuspectImg);
            this.tweens.add({
                targets: this.featuredSuspectImg,
                alpha: 0,
                duration: 600,
                ease: 'Power2'
            });
        }

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
        this.leaveElements.forEach(el => el.setVisible(true));
    }

    startInterrogation(width, height) {
        this.leaveElements.forEach(el => el.setVisible(false));

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
            this.dialogueController.playDialogue('Marcus', 'Marcus', "Me? Breaking into City Hall? Detective, look at me. I haven't seen the sun in three days.", () => {
                this.dialogueController.playDialogue('Marcus', 'Marcus', "If I wanted those blueprints, I'd have downloaded them through the Mayor's insecure Wi-Fi from my couch.", () => {
                    this.dialogueController.playDialogue('Marcus', 'Marcus', "Someone ordered a pizza to my alley using a government corporate card? That's the sloppiest frame job I've ever seen.", () => {
                        this.dialogueController.playDialogue('Marcus', 'Marcus', "Whoever set this up thinks you're stupid enough to fall for it. And I guess they were right.", () => {
                            this.showEndScreen('Game Over - Failed\\nThe real culprit escaped.', false);
                        });
                    });
                });
            });
        } else if (suspectKey === 'Donovan') {
            this.dialogueController.playDialogue('Donovan', 'Donovan', "You're locking me up over a pair of boots? I reported those stolen from the precinct gym last week!", () => {
                this.dialogueController.playDialogue('Donovan', 'Donovan', "Do I look like a cat burglar to you? I weigh two-hundred and fifty pounds.", () => {
                    this.dialogueController.playDialogue('Donovan', 'Donovan', "If I broke into the vault, I wouldn't pick the lock. I'd take the whole vault door with me.", () => {
                        this.dialogueController.playDialogue('Donovan', 'Donovan', "Someone is playing you, Detective. And while you're standing here, the real thief is getting away.", () => {
                            this.showEndScreen('Game Over - Failed\\nThe real culprit escaped.', false);
                        });
                    });
                });
            });
        } else if (suspectKey === 'Elena') {
            this.dialogueController.playDialogue('Elena', 'Elena', "This is absurd. The system logs showed an unauthorized terminal override. A hacker spoofed my ID.", () => {
                this.dialogueController.playDialogue('detective', 'Detective', "That was the narrative you wanted us to believe. But hackers don't use a City Hall Procurement Card to buy pizza for a stakeout.", () => {
                    this.dialogueController.playDialogue('Elena', 'Elena', "A stolen card! Easily cloned by someone in the underground!", () => {
                        this.dialogueController.playDialogue('detective', 'Detective', "Maybe. But they also wouldn't trudge through the park wearing Donovan's stolen size-14 boots just to leave muddy tracks.", () => {
                            this.dialogueController.playDialogue('detective', 'Detective', "Especially not tracks that smell faintly of expensive lavender perfume.", () => {
                                this.dialogueController.playDialogue('Elena', 'Elena', "...You have no proof. Just circumstantial nonsense.", () => {
                                    this.dialogueController.playDialogue('detective', 'Detective', "I do. You burned the physical blueprints at the beach to ensure there were no digital traces left.", () => {
                                        this.dialogueController.playDialogue('detective', 'Detective', "But in your rush to destroy the evidence, you dropped something in the sand. A sterling silver pen. Engraved with 'E.R.'", () => {
                                            this.dialogueController.playDialogue('Elena', 'Elena', "... I spent months planning this. The encryption, the framing... All ruined by a dropped pen?", () => {
                                                this.dialogueController.playDialogue('detective', 'Detective', "You were meticulous about everyone else's tracks, Elena. You just forgot to cover your own. It's over.", () => {
                                                    this.showEndScreen('Case Closed - Victory\\nElena Rostova Apprehended.', true);
                                                });
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
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

        const btn = this.add.rectangle(width / 2, height / 2 + 80, 200, 50, 0x1a1208).setStrokeStyle(2, 0x8b6b32).setDepth(1001)
            .setInteractive({ useHandCursor: true })
            .on('pointerover', () => btn.setFillStyle(0x2a1e0e))
            .on('pointerout', () => btn.setFillStyle(0x1a1208))
            .on('pointerdown', () => {
                gameManager.reset();
                this.cameras.main.fadeOut(1500, 0, 0, 0);
                this.cameras.main.once('camerafadeoutcomplete', () => {
                    window.location.reload();
                });
            });

        this.add.text(width / 2, height / 2 + 80, 'Restart Game', { fontSize: '24px', fill: '#d97706', fontFamily: 'serif' }).setOrigin(0.5).setDepth(1002);

        const menuBtn = this.add.rectangle(width / 2, height / 2 + 150, 200, 50, 0x1a1208).setStrokeStyle(2, 0x8b6b32).setDepth(1001)
            .setInteractive({ useHandCursor: true })
            .on('pointerover', () => menuBtn.setFillStyle(0x2a1e0e))
            .on('pointerout', () => menuBtn.setFillStyle(0x1a1208))
            .on('pointerdown', () => {
                this.cameras.main.fadeOut(1500, 0, 0, 0);
                this.cameras.main.once('camerafadeoutcomplete', () => {
                    window.dispatchEvent(new Event('returnToMainMenu'));
                });
            });

        this.add.text(width / 2, height / 2 + 150, 'Main Menu', { fontSize: '24px', fill: '#d97706', fontFamily: 'serif' }).setOrigin(0.5).setDepth(1002);
    }
}
