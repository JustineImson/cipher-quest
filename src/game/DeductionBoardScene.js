import * as Phaser from 'phaser';
import { gameManager, GamePhases } from './GameManager';
import { addDevPanel } from './DevPanel';
import { bgmController } from '../engine/BGMController';
import { useGameStore } from '../store/useGameStore';

export default class DeductionBoardScene extends Phaser.Scene {
    constructor() {
        super('DeductionBoardScene');
    }

    create() {
        const { width, height } = this.scale;

        this.cameras.main.fadeIn(2000, 0, 0, 0);
        bgmController.play('bgm3');
        addDevPanel(this);

        // ── Background ──────────────────────────────────────────────────
        // Deep charcoal base
        this.add.rectangle(0, 0, width, height, 0x0d0d0d).setOrigin(0, 0);

        // Subtle cork-board texture via tiled rects (warm brown grain)
        for (let row = 0; row < height; row += 6) {
            const alpha = Phaser.Math.FloatBetween(0.015, 0.045);
            const shade = Phaser.Math.Between(0x1a1208, 0x2a1e10);
            this.add.rectangle(0, row, width, 3, shade, alpha).setOrigin(0, 0);
        }

        // Vignette – four gradient rectangles darkening edges
        const vigSize = Math.max(width, height) * 0.55;
        [
            { x: 0, y: 0, w: vigSize * 0.6, h: height },
            { x: width, y: 0, w: vigSize * 0.6, h: height },
            { x: 0, y: 0, w: width, h: vigSize * 0.4 },
            { x: 0, y: height, w: width, h: vigSize * 0.4 },
        ].forEach(({ x, y, w, h }) => {
            this.add.rectangle(x, y, w, h, 0x000000, 0.55).setOrigin(
                x === width ? 1 : 0,
                y === height ? 1 : 0
            );
        });

        // Faint diagonal scratch lines for aged-paper feel
        const gfx = this.add.graphics();
        gfx.lineStyle(1, 0xffffff, 0.03);
        for (let i = -height; i < width + height; i += 28) {
            gfx.strokeLineShape(new Phaser.Geom.Line(i, 0, i + height, height));
        }

        // ── Hanging string line (top decoration) ────────────────────────
        const stringGfx = this.add.graphics();
        stringGfx.lineStyle(2, 0x8b6914, 0.6);
        stringGfx.strokeLineShape(new Phaser.Geom.Line(60, 58, width - 60, 58));

        // Pushpin dots along the string
        [0.12, 0.3, 0.5, 0.7, 0.88].forEach(t => {
            const px = 60 + (width - 120) * t;
            this.add.circle(px, 58, 6, 0xc0392b, 1).setDepth(2);
            this.add.circle(px, 58, 3, 0xff6b6b, 1).setDepth(3);
        });

        // ── Title block ─────────────────────────────────────────────────
        // Stamped "CLASSIFIED" watermark
        this.add.text(width / 2, height / 2 - 20, 'CLASSIFIED', {
            fontSize: '130px',
            fontFamily: '"Courier New", monospace',
            color: '#c0392b',
            alpha: 0.06,
            fontStyle: 'bold',
        }).setOrigin(0.5).setAlpha(0.055).setAngle(-18);

        // Case label above title
        this.add.text(width / 2, 88, '— CASE FILE —', {
            fontSize: '13px',
            fontFamily: '"Courier New", monospace',
            color: '#8b6914',
            letterSpacing: 6,
        }).setOrigin(0.5);

        // Main title
        const titleText = this.add.text(width / 2, 130, 'DEDUCTION BOARD', {
            fontSize: '54px',
            fontFamily: '"Georgia", serif',
            color: '#e8c84a',
            fontStyle: 'bold',
            shadow: { offsetX: 3, offsetY: 3, color: '#000000', blur: 8, fill: true },
        }).setOrigin(0.5).setAlpha(0);

        // Subtitle
        const subtitleText = this.add.text(width / 2, 180, 'Evidence compiled by the investigator', {
            fontSize: '15px',
            fontFamily: '"Courier New", monospace',
            color: '#7a6a4a',
            letterSpacing: 2,
        }).setOrigin(0.5).setAlpha(0);

        // Decorative rule under title
        const ruleGfx = this.add.graphics().setAlpha(0);
        ruleGfx.lineStyle(1, 0xe8c84a, 0.5);
        ruleGfx.strokeLineShape(new Phaser.Geom.Line(width / 2 - 220, 200, width / 2 + 220, 200));
        ruleGfx.lineStyle(1, 0xe8c84a, 0.2);
        ruleGfx.strokeLineShape(new Phaser.Geom.Line(width / 2 - 180, 205, width / 2 + 180, 205));

        // Fade-in title elements
        this.tweens.add({ targets: [titleText, subtitleText, ruleGfx], alpha: 1, duration: 1200, delay: 400, ease: 'Sine.easeOut' });

        // ── Evidence cards ───────────────────────────────────────────────
        const evidence = useGameStore.getState().savedStoryProgress?.cluesList || [];
        const cardW = 320;
        const cardH = 90;
        const cols = Math.min(evidence.length, 2);
        const rows = Math.ceil(evidence.length / cols);
        const gapX = 36;
        const gapY = 22;
        const boardW = cols * cardW + (cols - 1) * gapX;
        const boardH = rows * cardH + (rows - 1) * gapY;
        const startX = (width - boardW) / 2;
        const startY = 230;

        evidence.forEach((ev, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const cx = startX + col * (cardW + gapX);
            const cy = startY + row * (cardH + gapY);
            const delay = 600 + i * 120;

            // Card shadow
            this.add.rectangle(cx + 5, cy + 5, cardW, cardH, 0x000000, 0.5)
                .setOrigin(0, 0).setAlpha(0)
                .setData('fadeDelay', delay);

            // Card background – aged paper tone
            const card = this.add.rectangle(cx, cy, cardW, cardH, 0x1c150a, 0.92)
                .setOrigin(0, 0)
                .setStrokeStyle(1, 0x5a4010, 1)
                .setAlpha(0)
                .setInteractive({ useHandCursor: true });

            card.on('pointerover', () => {
                card.setFillStyle(0x2a1e08, 0.95);
            });
            card.on('pointerout', () => {
                card.setFillStyle(0x1c150a, 0.92);
            });
            card.on('pointerdown', () => {
                window.dispatchEvent(new CustomEvent('openEvidenceNotebook', { detail: ev }));
            });

            // Accent left bar
            this.add.rectangle(cx, cy, 5, cardH, 0xe8c84a, 1)
                .setOrigin(0, 0).setAlpha(0)
                .setData('fadeDelay', delay);

            // Evidence number badge
            const badgeX = cx + 24;
            const badgeY = cy + cardH / 2;
            this.add.circle(badgeX, badgeY, 16, 0xe8c84a).setAlpha(0).setData('fadeDelay', delay);
            this.add.text(badgeX, badgeY, `${i + 1}`, {
                fontSize: '14px',
                fontFamily: '"Courier New", monospace',
                color: '#0d0d0d',
                fontStyle: 'bold',
            }).setOrigin(0.5).setAlpha(0).setData('fadeDelay', delay);

            // Evidence name
            this.add.text(cx + 52, cy + 18, ev.title, {
                fontSize: '18px',
                fontFamily: '"Georgia", serif',
                color: '#e8dcc0',
                fontStyle: 'bold',
                wordWrap: { width: cardW - 60 },
            }).setOrigin(0, 0).setAlpha(0).setData('fadeDelay', delay);

            // Location label
            this.add.text(cx + 52, cy + 52, `\u{1F4CC}  Item Ref: ${ev.id?.toUpperCase() || ''}`, {
                fontSize: '12px',
                fontFamily: '"Courier New", monospace',
                color: '#8b7a50',
                letterSpacing: 1,
            }).setOrigin(0, 0).setAlpha(0).setData('fadeDelay', delay);

            // Fade + slide-in per card
            const cardObjs = this.children.list.filter(obj => obj.getData && obj.getData('fadeDelay') === delay);
            [card, ...cardObjs].forEach(obj => {
                const origY = obj.y;
                obj.y += 20;
                this.tweens.add({
                    targets: obj,
                    alpha: 1,
                    y: origY,
                    duration: 500,
                    delay,
                    ease: 'Cubic.easeOut',
                });
            });
        });

        // ── Summary footer bar ──────────────────────────────────────────
        const footerY = startY + boardH + 36;

        const summaryBg = this.add.rectangle(width / 2, footerY, boardW, 44, 0x0d0d0d, 0.7)
            .setStrokeStyle(1, 0x3a2e10)
            .setAlpha(0);

        const summaryText = this.add.text(width / 2, footerY, `${evidence.length} piece${evidence.length !== 1 ? 's' : ''} of evidence logged`, {
            fontSize: '14px',
            fontFamily: '"Courier New", monospace',
            color: '#6a5a30',
            letterSpacing: 2,
        }).setOrigin(0.5).setAlpha(0);

        this.tweens.add({
            targets: [summaryBg, summaryText],
            alpha: 1,
            duration: 700,
            delay: 600 + evidence.length * 120 + 200,
            ease: 'Sine.easeOut',
        });

        // ── Interrogation button ─────────────────────────────────────────
        const btnY = height - 90;
        const btnW = 380;
        const btnH = 62;
        const btnDelay = 600 + evidence.length * 120 + 400;

        // Outer glow ring
        const glowRing = this.add.rectangle(width / 2, btnY, btnW + 12, btnH + 12, 0xe8c84a, 0)
            .setStrokeStyle(2, 0xe8c84a, 0.25)
            .setAlpha(0);

        // Button bg
        const btn = this.add.rectangle(width / 2, btnY, btnW, btnH, 0x0d0d0d, 1)
            .setStrokeStyle(2, 0xe8c84a, 1)
            .setInteractive({ useHandCursor: true })
            .setAlpha(0);

        // Button label
        const btnLabel = this.add.text(width / 2, btnY, 'BEGIN INTERROGATION', {
            fontSize: '22px',
            fontFamily: '"Georgia", serif',
            color: '#e8c84a',
            fontStyle: 'bold',
            letterSpacing: 3,
            shadow: { offsetX: 0, offsetY: 0, color: '#e8c84a', blur: 12, fill: false },
        }).setOrigin(0.5).setAlpha(0);

        // Arrow decoration
        const arrowText = this.add.text(width / 2 + btnW / 2 - 36, btnY, '›', {
            fontSize: '28px',
            fontFamily: '"Georgia", serif',
            color: '#e8c84a',
        }).setOrigin(0.5).setAlpha(0);

        // Fade in button
        this.tweens.add({
            targets: [glowRing, btn, btnLabel, arrowText],
            alpha: 1,
            duration: 700,
            delay: btnDelay,
            ease: 'Sine.easeOut',
        });

        // Pulsing glow tween
        this.tweens.add({
            targets: glowRing,
            scaleX: 1.04,
            scaleY: 1.04,
            alpha: { from: 0.4, to: 0.9 },
            duration: 1400,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
            delay: btnDelay + 800,
        });

        // Arrow bounce
        this.tweens.add({
            targets: arrowText,
            x: arrowText.x + 6,
            duration: 700,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
            delay: btnDelay + 800,
        });

        // Hover states
        btn.on('pointerover', () => {
            btn.setFillStyle(0x2a1e08, 1);
            btnLabel.setColor('#ffd966');
            this.tweens.add({ targets: btn, scaleX: 1.03, scaleY: 1.03, duration: 120, ease: 'Sine.easeOut' });
        });
        btn.on('pointerout', () => {
            btn.setFillStyle(0x0d0d0d, 1);
            btnLabel.setColor('#e8c84a');
            this.tweens.add({ targets: btn, scaleX: 1, scaleY: 1, duration: 120, ease: 'Sine.easeOut' });
        });

        // Click — flash then transition
        btn.on('pointerdown', () => {
            this.cameras.main.flash(300, 255, 255, 200);
            this.time.delayedCall(300, () => {
                gameManager.setPhase(GamePhases.INTERROGATION);
                this.cameras.main.fadeOut(1500, 0, 0, 0);
                this.cameras.main.once('camerafadeoutcomplete', () => {
                    this.scene.start('OfficeScene');
                });
            });
        });

        // ── Typewriter case number (bottom-right watermark) ──────────────
        this.add.text(width - 24, height - 24, 'CASE #0041', {
            fontSize: '11px',
            fontFamily: '"Courier New", monospace',
            color: '#3a2e10',
            letterSpacing: 3,
        }).setOrigin(1, 1);

        // ── Flickering film-grain overlay ────────────────────────────────
        const grainGfx = this.add.graphics().setDepth(999).setBlendMode(Phaser.BlendModes.SCREEN);
        this.time.addEvent({
            delay: 80,
            loop: true,
            callback: () => {
                grainGfx.clear();
                for (let g = 0; g < 60; g++) {
                    const gx = Phaser.Math.Between(0, width);
                    const gy = Phaser.Math.Between(0, height);
                    const gs = Phaser.Math.Between(1, 3);
                    const ga = Phaser.Math.FloatBetween(0.02, 0.1);
                    grainGfx.fillStyle(0xffffff, ga);
                    grainGfx.fillRect(gx, gy, gs, gs);
                }
            },
        });
    }
}