import * as Phaser from 'phaser';
import { gameManager, GamePhases } from './GameManager';
import { addDevPanel } from './DevPanel';
import { bgmController } from '../engine/BGMController';

export default class DeductionBoardScene extends Phaser.Scene {
    constructor() {
        super('DeductionBoardScene');
    }

    create() {
        const { width, height } = this.scale;

        this.cameras.main.fadeIn(1500, 0, 0, 0);
        
        bgmController.play('bgm3');

        addDevPanel(this);

        // Background
        this.add.rectangle(0, 0, width, height, 0x1a1a1a).setOrigin(0, 0);

        // Title
        this.add.text(width / 2, 100, 'Deduction Board', {
            fontSize: '48px',
            fill: '#d97706',
            fontFamily: 'serif',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Evidence List
        const listText = gameManager.evidenceList.map((ev, i) => `${i+1}. ${ev.name} (found at ${ev.location})`).join('\n');
        
        this.add.text(width / 2, 250, 'Evidence Collected:\n\n' + listText, {
            fontSize: '24px',
            fill: '#ffffff',
            fontFamily: 'sans-serif',
            align: 'center'
        }).setOrigin(0.5);

        // "Ready for Interrogation" Button
        const btnWidth = 350;
        const btnHeight = 60;
        const btn = this.add.rectangle(width / 2, height - 150, btnWidth, btnHeight, 0x111111, 0.8)
            .setStrokeStyle(2, 0xd97706)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => {
                gameManager.setPhase(GamePhases.INTERROGATION);
                this.cameras.main.fadeOut(1500, 0, 0, 0);
                this.cameras.main.once('camerafadeoutcomplete', () => {
                    this.scene.start('OfficeScene');
                });
            })
            .on('pointerover', () => btn.setFillStyle(0x333333, 0.9))
            .on('pointerout', () => btn.setFillStyle(0x111111, 0.8));

        this.add.text(width / 2, height - 150, 'Start Interrogation', {
            fontSize: '26px',
            fill: '#d97706',
            fontFamily: 'serif',
            fontStyle: 'bold'
        }).setOrigin(0.5);
    }
}
