export default class DialogueController {
    constructor(scene) {
        this.scene = scene;
        this.isTyping = false;
        this.typingTimer = null;
        this.onCompleteCallback = null;
        this.createUI();
    }

    createUI() {
        const { width, height } = this.scene.scale;

        this.container = this.scene.add.container(0, 0).setDepth(100).setVisible(false);

        // ══════════════════════════════════════════════════════════════════════
        // EASY-ADJUST OFFSETS — tweak these values to reposition everything
        // ══════════════════════════════════════════════════════════════════════
        const BOX_WIDTH_PERCENT = 0.92;   // box width as % of screen width
        const BOX_HEIGHT_RATIO = 0.50;   // box height as ratio of box width
        const BOX_Y_DIVISOR = 3;      // controls vertical anchor (higher = higher on screen)
        const BOX_Y_PADDING = 10;     // px gap from bottom of screen

        const PORTRAIT_SIZE = 0.11;   // portrait size as % of box width
        const PORTRAIT_X = 0.163;  // portrait X as % of box width from left
        const PORTRAIT_Y = 0.115;  // portrait Y as % of box height from center

        const NAME_X = 0.27;   // name text X as % of box width from left
        const NAME_Y = -0.03;  // name text Y as % of box height from center (negative = up)
        const NAME_FONT_SIZE = 40;     // name font size in px

        const TEXT_X = 0.27;   // dialogue text X as % of box width from left
        const TEXT_Y = 0.04;  // dialogue text Y as % of box height from center
        const TEXT_WIDTH = 0.55;   // text wrap width as % of box width
        const TEXT_FONT_SIZE = 35;     // dialogue font size in px
        // ══════════════════════════════════════════════════════════════════════

        // ─── DIALOGUE BOX ────────────────────────────────────────────────────
        const boxWidth = width * BOX_WIDTH_PERCENT;
        const boxHeight = boxWidth * BOX_HEIGHT_RATIO;
        const boxX = width / 2;
        const boxY = height - boxHeight / BOX_Y_DIVISOR - BOX_Y_PADDING;

        this.boxWidth = boxWidth;
        this.boxHeight = boxHeight;
        this.boxX = boxX;
        this.boxY = boxY;

        this.dialogueBox = this.scene.add.image(boxX, boxY, 'dialogueBox');
        this.dialogueBox.setDisplaySize(boxWidth, boxHeight);

        // ─── CHARACTER ICON (inside the brown portrait slot) ─────────────────
        const portraitSize = boxWidth * PORTRAIT_SIZE;
        const portraitX = boxX - boxWidth / 2 + boxWidth * PORTRAIT_X;
        const portraitY = boxY + boxHeight * PORTRAIT_Y;

        this.speakerSprite = this.scene.add.image(portraitX, portraitY, 'detective')
            .setOrigin(0.5, 0.5)
            .setDisplaySize(portraitSize, portraitSize)
            .setVisible(false);

        // ─── NAME TEXT ───────────────────────────────────────────────────────
        const nameX = boxX - boxWidth / 2 + boxWidth * NAME_X;
        const nameY = boxY + boxHeight * NAME_Y;

        this.nameText = this.scene.add.text(nameX, nameY, '', {
            fontSize: `${NAME_FONT_SIZE}px`,
            fill: '#4a2c17',
            fontFamily: 'serif',
            fontStyle: 'bold'
        });

        // ─── DIALOGUE TEXT ───────────────────────────────────────────────────
        const textX = boxX - boxWidth / 2 + boxWidth * TEXT_X;
        const textY = boxY + boxHeight * TEXT_Y;

        this.dialogueText = this.scene.add.text(textX, textY, '', {
            fontSize: `${TEXT_FONT_SIZE}px`,
            fill: '#1a1008',
            fontFamily: 'sans-serif',
            wordWrap: { width: boxWidth * TEXT_WIDTH },
            lineSpacing: 8
        });

        this.container.add([this.dialogueBox, this.speakerSprite, this.nameText, this.dialogueText]);

        // Input handler to speed up typing or advance
        this.scene.input.on('pointerdown', () => {
            if (!this.container.visible) return;

            if (this.isTyping) {
                // Complete text instantly
                this.completeTyping();
            } else if (this.onCompleteCallback) {
                // Call callback to advance
                this.onCompleteCallback();
            }
        });
    }

    playDialogue(characterImage, name, text, onComplete) {
        this.container.setVisible(true);
        this.onCompleteCallback = onComplete;

        this.nameText.setText(name);
        this.fullText = text;
        this.dialogueText.setText('');

        if (characterImage) {
            this.speakerSprite.setTexture(characterImage);
            this.speakerSprite.setVisible(true);
        } else {
            this.speakerSprite.setVisible(false);
        }

        this.startTyping();
    }

    startTyping() {
        this.isTyping = true;
        let currentCharIndex = 0;

        if (this.typingTimer) {
            this.typingTimer.remove();
        }

        this.typingTimer = this.scene.time.addEvent({
            delay: 30, // typing speed
            callback: () => {
                currentCharIndex++;
                this.dialogueText.setText(this.fullText.substring(0, currentCharIndex));

                if (currentCharIndex >= this.fullText.length) {
                    this.completeTyping();
                }
            },
            repeat: this.fullText.length - 1
        });
    }

    completeTyping() {
        if (this.typingTimer) {
            this.typingTimer.remove();
        }
        this.isTyping = false;
        this.dialogueText.setText(this.fullText);
    }

    hide() {
        this.container.setVisible(false);
    }
}
