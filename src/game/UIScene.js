import * as Phaser from 'phaser';
import VirtualJoystick from 'phaser3-rex-plugins/plugins/virtualjoystick.js';

export default class UIScene extends Phaser.Scene {
    constructor() {
        super({ key: 'UIScene' });
    }

    create() {
        // --- VIRTUAL JOYSTICK ---
        this.joystick = new VirtualJoystick(this, {
            x: 200,
            y: this.cameras.main.height - 200,
            radius: 100,
            base: this.add.circle(0, 0, 100, 0x888888, 0.5),
            thumb: this.add.circle(0, 0, 50, 0xcccccc, 0.8),
        });

        // Ensure joystick base and thumb are drawn on top
        this.joystick.base.setDepth(100);
        this.joystick.thumb.setDepth(101);

        // --- ACTION BUTTON ---
        const btnX = this.cameras.main.width - 200;
        const btnY = this.cameras.main.height - 200;

        this.actionButtonContainer = this.add.container(btnX, btnY);

        const btnGraphics = this.add.circle(0, 0, 40, 0xff0000, 0.6);
        btnGraphics.setStrokeStyle(3, 0xffffff);

        const btnText = this.add.text(0, 0, 'INSPECT', {
            fontSize: '16px',
            fontFamily: 'Arial',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.actionButtonContainer.add([btnGraphics, btnText]);
        this.actionButtonContainer.setDepth(100);
        this.actionButtonContainer.setVisible(false); // Hidden by default

        // Make interactive
        const hitArea = new Phaser.Geom.Circle(0, 0, 40);
        this.actionButtonContainer.setInteractive(hitArea, Phaser.Geom.Circle.Contains);

        this.actionButtonContainer.on('pointerdown', () => {
            // Visual feedback
            btnGraphics.setFillStyle(0xaa0000, 0.8);
            this.events.emit('inspect-pressed');
        });

        this.actionButtonContainer.on('pointerup', () => {
            btnGraphics.setFillStyle(0xff0000, 0.6);
        });

        this.actionButtonContainer.on('pointerout', () => {
            btnGraphics.setFillStyle(0xff0000, 0.6);
        });
    }

    // Expose methods to show/hide the action button
    showActionButton() {
        if (this.actionButtonContainer) {
            this.actionButtonContainer.setVisible(true);
        }
    }

    hideActionButton() {
        if (this.actionButtonContainer) {
            this.actionButtonContainer.setVisible(false);
        }
    }

    // Helper to get joystick state
    getJoystickState() {
        if (!this.joystick) return { up: false, down: false, left: false, right: false };
        return {
            up: this.joystick.up,
            down: this.joystick.down,
            left: this.joystick.left,
            right: this.joystick.right
        };
    }
}
