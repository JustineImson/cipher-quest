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
        const NAME_Y = -0.04;  // name text Y as % of box height from center (negative = up)
        const NAME_FONT_SIZE_RATIO = 0.045;     // name font size as % of box height

        const TEXT_X = 0.27;   // dialogue text X as % of box width from left
        const TEXT_Y = 0.02;  // dialogue text Y as % of box height from center
        const TEXT_WIDTH = 0.65;   // text wrap width as % of box width
        const TEXT_FONT_SIZE_RATIO = 0.040;     // dialogue font size as % of box height
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
        const nameFontSize = Math.max(12, boxHeight * NAME_FONT_SIZE_RATIO);

        this.nameText = this.scene.add.text(nameX, nameY, '', {
            fontSize: `${nameFontSize}px`,
            fill: '#4a2c17',
            fontFamily: 'serif',
            fontStyle: 'bold'
        });

        // ─── DIALOGUE TEXT ───────────────────────────────────────────────────
        const textX = boxX - boxWidth / 2 + boxWidth * TEXT_X;
        const textY = boxY + boxHeight * TEXT_Y;
        const textFontSize = Math.max(10, boxHeight * TEXT_FONT_SIZE_RATIO);

        this.dialogueText = this.scene.add.text(textX, textY, '', {
            fontSize: `${textFontSize}px`,
            fill: '#1a1008',
            fontFamily: 'sans-serif',
            wordWrap: { width: boxWidth * TEXT_WIDTH },
            lineSpacing: Math.max(2, boxHeight * 0.01)
        });

        this.container.add([this.dialogueBox, this.speakerSprite, this.nameText, this.dialogueText]);
    }

    playDialogue(spriteKey, speakerName, fullText, onCompleteCallback) {
        this.container.setVisible(true);
        this.onCompleteCallback = onCompleteCallback;
        this.currentFullText = fullText;

        this.nameText.setText(speakerName);
        this.dialogueText.setText(''); // Clear previous text

        if (spriteKey) {
            this.speakerSprite.setTexture(spriteKey);
            this.speakerSprite.setVisible(true);
        } else {
            this.speakerSprite.setVisible(false);
        }

        // --- ANIMATION 4: Typewriter Effect ---
        this.isTyping = true;
        let currentChar = 0;

        // Clear any existing typing timers
        if (this.typingTimer) this.typingTimer.remove();

        // Remove any previous skip listener
        this.scene.input.off('pointerdown', this._skipTypingHandler, this);

        // Create a skip handler that finishes typing on click
        this._skipTypingHandler = () => {
            if (this.isTyping) {
                this.completeTyping();
            }
        };
        this.scene.input.on('pointerdown', this._skipTypingHandler, this);

        this.typingTimer = this.scene.time.addEvent({
            delay: 30, // Speed of typing (30ms per character)
            repeat: fullText.length - 1,
            callback: () => {
                this.dialogueText.text += fullText[currentChar];
                currentChar++;

                // If we reached the end of the text
                if (currentChar === fullText.length) {
                    this.isTyping = false;
                    // Remove the skip listener since typing is done
                    this.scene.input.off('pointerdown', this._skipTypingHandler, this);

                    // Wait a moment, then allow the next line to be clicked
                    this.scene.time.delayedCall(500, () => {
                        // Attach a temporary click listener to advance the dialogue
                        this.scene.input.once('pointerdown', () => {
                            if (this.onCompleteCallback) this.onCompleteCallback();
                        });
                    });
                }
            }
        });
    }

    completeTyping() {
        if (this.typingTimer) {
            this.typingTimer.remove();
        }
        this.isTyping = false;

        // Remove the skip listener
        this.scene.input.off('pointerdown', this._skipTypingHandler, this);

        // Show the full text instantly
        if (this.currentFullText) {
            this.dialogueText.setText(this.currentFullText);
        }

        // Wait a moment, then allow click to advance
        this.scene.time.delayedCall(500, () => {
            this.scene.input.once('pointerdown', () => {
                if (this.onCompleteCallback) this.onCompleteCallback();
            });
        });
    }

    hide() {
        this.container.setVisible(false);
    }
}
