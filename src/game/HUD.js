import { useGameStore } from '../store/useGameStore';

export function createHUD(scene) {
    const width = scene.scale.width;
    
    // ─── EVIDENCE NOTEBOOK TAB ───────────────────────────────────────────────────
    const tabW = 220;
    const tabH = 46;
    const tabX = (width / 2) - (tabW / 2);
    const tabY = 0; // Stick to top edge

    // Shadow
    const shadow = scene.add.rectangle(tabX + 4, tabY, tabW, tabH + 4, 0x000000, 0.6)
        .setOrigin(0).setScrollFactor(0).setDepth(19999);
    shadow.isUI = true;

    // Main Tab Background (Leather-like)
    const tabBg = scene.add.rectangle(tabX, tabY, tabW, tabH, 0x2a1c11, 0.95)
        .setStrokeStyle(3, 0x8b6b32)
        .setOrigin(0).setScrollFactor(0).setDepth(20000)
        .setInteractive({ useHandCursor: true });
    tabBg.isUI = true;

    // Decorative inner border
    const innerTab = scene.add.rectangle(tabX + 4, tabY + 4, tabW - 8, tabH - 6, 0x000000, 0)
        .setStrokeStyle(1, 0x8b6b32, 0.5)
        .setOrigin(0).setScrollFactor(0).setDepth(20000);
    innerTab.isUI = true;

    // Notebook Icon (Unicode)
    const iconText = scene.add.text(tabX + 15, tabY + 10, '📓', {
        fontSize: '22px'
    }).setOrigin(0).setScrollFactor(0).setDepth(20000);
    iconText.isUI = true;

    // Text Label
    const labelText = scene.add.text(tabX + 45, tabY + 14, 'CASE FILE', {
        fontSize: '16px', fill: '#8b6b32', fontFamily: 'serif', fontStyle: 'bold', letterSpacing: 1
    }).setOrigin(0).setScrollFactor(0).setDepth(20000);
    labelText.isUI = true;

    // Counter Text Container
    const counterBg = scene.add.rectangle(tabX + 155, tabY + 8, 48, 30, 0x1a1208, 1)
        .setStrokeStyle(1, 0x8b6b32)
        .setOrigin(0).setScrollFactor(0).setDepth(20000);
    counterBg.isUI = true;

    const cluesCount = Object.values(useGameStore.getState().savedStoryProgress?.clues || {}).filter(Boolean).length;
    const countText = scene.add.text(tabX + 163, tabY + 13, `${cluesCount}/4`, {
        fontSize: '18px', fill: '#e8dcc0', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0).setScrollFactor(0).setDepth(20000);
    countText.isUI = true;

    // Tab Interactivity
    const tabElements = [tabBg, innerTab, iconText, labelText, counterBg, countText];
    
    // Initial state to slide down from top
    tabElements.forEach(el => el.setY(el.y - tabH - 10));
    scene.tweens.add({
        targets: tabElements,
        y: `+=${tabH + 10}`,
        duration: 800,
        ease: 'Bounce.easeOut',
        delay: 500
    });

    tabBg.on('pointerdown', () => {
        // Prevent redundant opens and rapid double-clicks
        if (useGameStore.getState().isDeductionBoardOpen) return;

        // Temporarily disable the tab to avoid repeated clicks during the animation
        tabBg.disableInteractive();

        // Click animation (pulls down slightly)
        scene.tweens.add({
            targets: tabElements,
            y: '+=6',
            duration: 50,
            yoyo: true,
            onComplete: () => {
                try {
                    if (!useGameStore.getState().isDeductionBoardOpen) {
                        useGameStore.getState().setDeductionBoardOpen(true);
                    }
                } catch (err) {
                    console.warn('Failed to open deduction board:', err);
                }

                // Re-enable interaction after the short animation
                scene.time.delayedCall(150, () => tabBg.setInteractive({ useHandCursor: true }));
            }
        });
    });

    tabBg.on('pointerover', () => {
        tabBg.setFillStyle(0x3a2618, 1);
        labelText.setColor('#ffd700');
        scene.tweens.add({ targets: tabBg, scaleX: 1.02, scaleY: 1.02, duration: 150, ease: 'Sine.easeOut' });
    });

    tabBg.on('pointerout', () => {
        tabBg.setFillStyle(0x2a1c11, 0.95);
        labelText.setColor('#8b6b32');
        scene.tweens.add({ targets: tabBg, scaleX: 1, scaleY: 1, duration: 150, ease: 'Sine.easeOut' });
    });

    // ─── PAUSE BUTTON ────────────────────────────────────────────────────────────
    const pauseX = width - 40; // Center X
    const pauseY = 40;         // Center Y
    const radius = 24;

    // Shadow
    const pShadow = scene.add.circle(pauseX + 4, pauseY + 4, radius, 0x000000, 0.6)
        .setScrollFactor(0).setDepth(19999);
    pShadow.isUI = true;

    // Main Button
    const pauseBtn = scene.add.circle(pauseX, pauseY, radius, 0x1a1208, 0.95)
        .setStrokeStyle(2, 0x8b6b32)
        .setInteractive({ useHandCursor: true })
        .setScrollFactor(0).setDepth(20000);
    pauseBtn.isUI = true;

    // Inner ring
    const pInner = scene.add.circle(pauseX, pauseY, radius - 4, 0x000000, 0)
        .setStrokeStyle(1, 0x8b6b32, 0.4)
        .setScrollFactor(0).setDepth(20000);
    pInner.isUI = true;

    // Pause bars (two rectangles instead of text)
    const bar1 = scene.add.rectangle(pauseX - 5, pauseY, 6, 16, 0xd97706)
        .setScrollFactor(0).setDepth(20000);
    bar1.isUI = true;
    
    const bar2 = scene.add.rectangle(pauseX + 5, pauseY, 6, 16, 0xd97706)
        .setScrollFactor(0).setDepth(20000);
    bar2.isUI = true;

    // Interaction Events
    pauseBtn.on('pointerdown', () => {
        // Small click juice
        scene.tweens.add({
            targets: [pauseBtn, pInner, bar1, bar2],
            scale: 0.9,
            duration: 50,
            yoyo: true,
            onComplete: () => {
                useGameStore.getState().togglePause();
                scene.scene.pause();
            }
        });
    });

    pauseBtn.on('pointerover', () => {
        pauseBtn.setFillStyle(0x2a1e0e, 1);
        bar1.setFillStyle(0xffd700);
        bar2.setFillStyle(0xffd700);
        scene.tweens.add({ targets: [bar1, bar2], scaleY: 1.2, duration: 150, ease: 'Sine.easeOut' });
    });

    pauseBtn.on('pointerout', () => {
        pauseBtn.setFillStyle(0x1a1208, 0.95);
        bar1.setFillStyle(0xd97706);
        bar2.setFillStyle(0xd97706);
        scene.tweens.add({ targets: [bar1, bar2], scaleY: 1, duration: 150, ease: 'Sine.easeOut' });
    });

    // ─── STATE SYNC ─────────────────────────────────────────────────────────────
    const unsubscribe = useGameStore.subscribe((state, prevState) => {
        // Handle unpause from React overlay
        try {
            if (prevState.isStoryPaused && !state.isStoryPaused) {
                if (scene.scene.isPaused()) scene.scene.resume();
            }

            // Handle Deduction Board Pause/Resume
            if (!prevState.isDeductionBoardOpen && state.isDeductionBoardOpen) {
                if (!scene.scene.isPaused()) scene.scene.pause();
            }
            if (prevState.isDeductionBoardOpen && !state.isDeductionBoardOpen && !state.isStoryPaused) {
                if (scene.scene.isPaused()) scene.scene.resume();
            }
        } catch (err) {
            console.warn('Error while handling deduction board pause/resume:', err);
        }

        // Handle evidence updates automatically
        const oldCount = Object.values(prevState.savedStoryProgress?.clues || {}).filter(Boolean).length;
        const newCount = Object.values(state.savedStoryProgress?.clues || {}).filter(Boolean).length;
        
        if (newCount !== oldCount) {
            countText.setText(`${newCount}/4`);
            
            // Pop animation for the tab
            if (newCount > oldCount) {
                scene.tweens.add({
                    targets: tabElements,
                    scaleX: 1.08,
                    scaleY: 1.08,
                    duration: 150,
                    yoyo: true,
                    ease: 'Quad.easeOut'
                });

                // Flash the text gold then back
                countText.setColor('#ffd700');
                counterBg.setStrokeStyle(2, 0xffd700);
                scene.time.delayedCall(300, () => {
                    countText.setColor('#e8dcc0');
                    counterBg.setStrokeStyle(1, 0x8b6b32);
                });
            }
        }
    });
    scene.events.once('shutdown', () => unsubscribe());
    
    return {
        evidenceTrackerText: countText
    };
}
