import * as Phaser from 'phaser';
import DialogueController from './DialogueController';
import { gameManager, GamePhases } from './GameManager';
import { addDevPanel } from './DevPanel';
import { bgmController } from '../engine/BGMController';
import { useGameStore } from '../store/useGameStore';

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
        // Reset dialogue state on every create() so restarts replay properly
        // (the constructor only runs once; Phaser reuses the scene instance).
        this.currentLineIndex = 0;
        this.dialogueActive = true;

        localStorage.setItem('currentScene', this.scene.key);
        localStorage.setItem('hasFinishedIntro', 'true');
        
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
        // ─── PAUSE BUTTON ────────────────────────────────────────────────
        const pauseX = width - 40;
        const pauseY = 40;
        const radius = 24;

        const pShadow = this.add.circle(pauseX + 4, pauseY + 4, radius, 0x000000, 0.6)
            .setScrollFactor(0).setDepth(19999);
        pShadow.isUI = true;

        const pauseBtn = this.add.circle(pauseX, pauseY, radius, 0x1a1208, 0.95)
            .setStrokeStyle(2, 0x8b6b32)
            .setInteractive({ useHandCursor: true })
            .setScrollFactor(0).setDepth(20000);
        pauseBtn.isUI = true;

        const pInner = this.add.circle(pauseX, pauseY, radius - 4, 0x000000, 0)
            .setStrokeStyle(1, 0x8b6b32, 0.4)
            .setScrollFactor(0).setDepth(20000);
        pInner.isUI = true;

        const bar1 = this.add.rectangle(pauseX - 5, pauseY, 6, 16, 0xd97706)
            .setScrollFactor(0).setDepth(20000);
        bar1.isUI = true;

        const bar2 = this.add.rectangle(pauseX + 5, pauseY, 6, 16, 0xd97706)
            .setScrollFactor(0).setDepth(20000);
        bar2.isUI = true;

        pauseBtn.on('pointerdown', () => {
            this.tweens.add({
                targets: [pauseBtn, pInner, bar1, bar2],
                scale: 0.9,
                duration: 50,
                yoyo: true,
                onComplete: () => {
                    useGameStore.getState().togglePause();
                    this.scene.pause();
                }
            });
        });

        pauseBtn.on('pointerover', () => {
            pauseBtn.setFillStyle(0x2a1e0e, 1);
            bar1.setFillStyle(0xffd700);
            bar2.setFillStyle(0xffd700);
            this.tweens.add({ targets: [bar1, bar2], scaleY: 1.2, duration: 150, ease: 'Sine.easeOut' });
        });

        pauseBtn.on('pointerout', () => {
            pauseBtn.setFillStyle(0x1a1208, 0.95);
            bar1.setFillStyle(0xd97706);
            bar2.setFillStyle(0xd97706);
            this.tweens.add({ targets: [bar1, bar2], scaleY: 1, duration: 150, ease: 'Sine.easeOut' });
        });

        // Sync unpause from the React PauseOverlay
        const unsubscribe = useGameStore.subscribe((state, prevState) => {
            if (prevState.isStoryPaused && !state.isStoryPaused) {
                if (this.scene.isPaused()) this.scene.resume();
            }
        });
        this.events.once('shutdown', () => unsubscribe());

        // Dev teleport panel
        addDevPanel(this);

        const handleForceDeduction = () => {
            if (this.scene.isActive('OfficeScene')) {
                this.cameras.main.fadeOut(500, 0, 0, 0);
                this.cameras.main.once('camerafadeoutcomplete', () => {
                    this.scene.start('DeductionBoardScene');
                });
            }
        };
        window.addEventListener('forceDeductionScene', handleForceDeduction);
        this.events.on('shutdown', () => {
            window.removeEventListener('forceDeductionScene', handleForceDeduction);
        });
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

        // Auto-redirect to city map after a short pause
        this.time.delayedCall(500, () => {
            this.cameras.main.fadeOut(1500, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                this.scene.start('MainScene');
            });
        });
    }

    startInterrogation(width, height) {
        // Dramatic dark overlay to focus on the choice
        this.interrogationScrim = this.add.rectangle(0, 0, width, height, 0x000000, 0)
            .setOrigin(0, 0).setDepth(50);
            
        this.tweens.add({ targets: this.interrogationScrim, alpha: 0.85, duration: 1000 });

        this.promptElements = [];
        
        // Prompt Container Box
        const boxWidth = 740;
        const boxHeight = 160;
        const boxY = 125;
        
        // Box Shadow
        const boxShadow = this.add.rectangle(width / 2 + 10, boxY + 12, boxWidth, boxHeight, 0x000000, 0.7)
            .setOrigin(0.5).setDepth(51).setAlpha(0);
        this.promptElements.push(boxShadow);
            
        // Box Background
        const promptBox = this.add.rectangle(width / 2, boxY, boxWidth, boxHeight, 0x1a1208, 0.95)
            .setOrigin(0.5).setStrokeStyle(2, 0x3a2c18).setDepth(51).setAlpha(0);
        this.promptElements.push(promptBox);
        
        // Decorative Accents (Corners + Divider Line)
        const accentGraphics = this.add.graphics().setDepth(51).setAlpha(0);
        accentGraphics.lineStyle(2, 0xc9a84c, 0.9);
        
        const offset = 8;
        const hw = boxWidth / 2 - offset;
        const hh = boxHeight / 2 - offset;
        const cx = width / 2;
        const cornerLen = 16;
        
        // Top-Left Corner
        accentGraphics.strokeLineShape(new Phaser.Geom.Line(cx - hw, boxY - hh + cornerLen, cx - hw, boxY - hh));
        accentGraphics.strokeLineShape(new Phaser.Geom.Line(cx - hw, boxY - hh, cx - hw + cornerLen, boxY - hh));
        // Top-Right Corner
        accentGraphics.strokeLineShape(new Phaser.Geom.Line(cx + hw - cornerLen, boxY - hh, cx + hw, boxY - hh));
        accentGraphics.strokeLineShape(new Phaser.Geom.Line(cx + hw, boxY - hh, cx + hw, boxY - hh + cornerLen));
        // Bottom-Left Corner
        accentGraphics.strokeLineShape(new Phaser.Geom.Line(cx - hw, boxY + hh - cornerLen, cx - hw, boxY + hh));
        accentGraphics.strokeLineShape(new Phaser.Geom.Line(cx - hw, boxY + hh, cx - hw + cornerLen, boxY + hh));
        // Bottom-Right Corner
        accentGraphics.strokeLineShape(new Phaser.Geom.Line(cx + hw - cornerLen, boxY + hh, cx + hw, boxY + hh));
        accentGraphics.strokeLineShape(new Phaser.Geom.Line(cx + hw, boxY + hh, cx + hw, boxY + hh - cornerLen));
        
        // Center Divider Line
        accentGraphics.lineStyle(1, 0xc9a84c, 0.5);
        accentGraphics.strokeLineShape(new Phaser.Geom.Line(width/2 - 280, boxY + 5, width/2 + 280, boxY + 5));
        
        this.promptElements.push(accentGraphics);

        // Prompt Title
        this.promptText = this.add.text(width / 2, boxY - 35, 'WHO IS THE CULPRIT?', {
            fontSize: '48px',
            fill: '#e8c96a',
            fontFamily: '"Playfair Display", serif',
            fontStyle: 'bold',
            letterSpacing: 4,
            shadow: { offsetX: 2, offsetY: 4, color: '#000000', blur: 6, fill: true }
        }).setOrigin(0.5).setDepth(51).setAlpha(0);
        this.promptElements.push(this.promptText);
        
        // Subtext
        const subText = this.add.text(width / 2, boxY + 40, 'Select a suspect to make your final accusation.', {
            fontSize: '18px',
            fill: '#a39274',
            fontFamily: '"Courier New", monospace',
            letterSpacing: 2
        }).setOrigin(0.5).setDepth(51).setAlpha(0);
        this.promptElements.push(subText);

        this.tweens.add({ targets: this.promptElements, alpha: 1, y: '+=15', duration: 1200, ease: 'Power2' });

        // Dynamic Spacing based on width to prevent overlap on smaller screens
        const spacing = Math.min(width * 0.28, 450);

        // Suspects
        const suspects = [
            { key: 'Donovan', x: width / 2 - spacing, name: 'Donovan' },
            { key: 'Elena', x: width / 2, name: 'Elena Rostova' },
            { key: 'Marcus', x: width / 2 + spacing, name: 'Marcus' }
        ];

        this.suspectGroups = [];

        suspects.forEach((s, index) => {
            const group = this.add.container(s.x, height / 2 + 80).setDepth(51).setAlpha(0);
            
            // Drop shadow
            const shadow = this.add.rectangle(12, 18, 300, 420, 0x000000, 0.7);
            
            // Frame background (Dossier style)
            const frame = this.add.rectangle(0, 0, 300, 420, 0x1a1208, 1)
                .setStrokeStyle(2, 0x3a2c18)
                .setInteractive({ useHandCursor: true });
                
            // Suspect Image (scaled down to fit frame)
            const img = this.add.image(0, -30, s.key).setScale(0.38);
            
            // Name Label Background
            const labelBg = this.add.rectangle(0, 160, 300, 60, 0x0a0703, 0.85);
            
            // Name Text
            const nameText = this.add.text(0, 160, s.name.toUpperCase(), {
                fontSize: '22px', 
                fill: '#c9a84c', 
                fontFamily: '"Special Elite", monospace',
                letterSpacing: 2
            }).setOrigin(0.5);

            group.add([shadow, frame, img, labelBg, nameText]);
            
            // Hover Animations
            frame.on('pointerover', () => {
                frame.setStrokeStyle(3, 0xc9a84c);
                img.setTint(0xffeeba);
                nameText.setColor('#ffffff');
                this.tweens.add({
                    targets: group,
                    y: height / 2 + 65,
                    scaleX: 1.04,
                    scaleY: 1.04,
                    duration: 200,
                    ease: 'Power2'
                });
            });
            
            frame.on('pointerout', () => {
                frame.setStrokeStyle(2, 0x3a2c18);
                img.clearTint();
                nameText.setColor('#c9a84c');
                this.tweens.add({
                    targets: group,
                    y: height / 2 + 80,
                    scaleX: 1,
                    scaleY: 1,
                    duration: 200,
                    ease: 'Power2'
                });
            });
            
            frame.on('pointerdown', () => this.handleAccusation(s.key));

            this.suspectGroups.push(group);
            
            // Staggered entry animation
            this.tweens.add({
                targets: group,
                alpha: 1,
                duration: 800,
                delay: 500 + (index * 250),
                ease: 'Power2'
            });
        });
    }

    handleAccusation(suspectKey) {
        if (this.interrogationScrim) this.interrogationScrim.setVisible(false);
        this.promptElements.forEach(el => el.setVisible(false));
        this.suspectGroups.forEach(g => g.setVisible(false));

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

        this.cameras.main.fadeOut(2000, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('EndingScene', { isWin: isVictory });
        });
    }
}
