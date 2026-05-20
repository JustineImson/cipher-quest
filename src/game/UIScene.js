import * as Phaser from 'phaser';
import VirtualJoystick from 'phaser3-rex-plugins/plugins/virtualjoystick.js';

export default class UIScene extends Phaser.Scene {
    constructor() {
        super({ key: 'UIScene' });
    }

    create() {
        this.isMobileOrTablet = window.innerWidth < 1024;

        // --- VIRTUAL JOYSTICK ---
        // Use this.scale which has the actual game dimensions, not camera which may not be ready
        const joyX = 220;
        const joyY = this.scale.height - 220;

        this.joystick = new VirtualJoystick(this, {
            x: joyX,
            y: joyY,
            radius: 80,
            base: this.add.circle(0, 0, 80, 0x888888, 0.5),
            thumb: this.add.circle(0, 0, 40, 0xcccccc, 0.8),
        });

        // Ensure joystick stays fixed on screen and is interactive
        this.joystick.base.setScrollFactor(0).setDepth(1000);
        this.joystick.thumb.setScrollFactor(0).setDepth(1001);
        
        // Make sure joystick captures pointer events
        this.joystick.base.setInteractive({ useHandCursor: false, draggable: false });
        
        this.updateJoystickVisibility();

        // --- ACTION BUTTON ---
        // Position relative to screen edges for better mobile accessibility
        const btnX = this.scale.width - 220;
        const btnY = this.scale.height - 220;

        this.actionButtonContainer = this.add.container(btnX, btnY);
        this.actionButtonContainer.setScrollFactor(0);

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

        // Handle window resizing
        this.scale.on('resize', (gameSize) => {
            this.isMobileOrTablet = window.innerWidth < 1024;
            this.updateJoystickVisibility();

            if (!this.isMobileOrTablet && this.actionButtonContainer) {
                this.actionButtonContainer.setVisible(false);
            }

            // Reposition controls dynamically - keep them in from edges on mobile
            if (this.actionButtonContainer) {
                this.actionButtonContainer.setPosition(gameSize.width - 120, gameSize.height - 120);
            }
            if (this.joystick) {
                this.joystick.x = 120;
                this.joystick.y = gameSize.height - 120;
            }
        });
    }

    updateJoystickVisibility() {
        if (this.joystick) {
            const visible = this.isMobileOrTablet;
            this.joystick.base.setVisible(visible);
            this.joystick.thumb.setVisible(visible);
            this.joystick.enable = visible;
        }
    }

    // Expose methods to show/hide the action button
    showActionButton() {
        if (this.actionButtonContainer && this.isMobileOrTablet) {
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
        if (!this.joystick || !this.joystick.enable) return { up: false, down: false, left: false, right: false };
        return {
            up: this.joystick.up,
            down: this.joystick.down,
            left: this.joystick.left,
            right: this.joystick.right
        };
    }
}
