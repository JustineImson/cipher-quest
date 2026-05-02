import { useGameStore } from '../store/useGameStore';

export function createHUD(scene) {
    const width = scene.scale.width;
    
    // ─── EVIDENCE TRACKER ────────────────────────────────────────────────────────
    const plateX = 20;
    const plateY = 20;
    const plateW = 200;
    const plateH = 46;

    // Shadow
    const shadow = scene.add.rectangle(plateX + 4, plateY + 4, plateW, plateH, 0x000000, 0.6)
        .setOrigin(0).setScrollFactor(0).setDepth(19999);
    shadow.isUI = true;

    // Main Dark Leather Plate
    const plate = scene.add.rectangle(plateX, plateY, plateW, plateH, 0x1a1208, 0.95)
        .setStrokeStyle(2, 0x8b6b32) // Outer gold border
        .setOrigin(0).setScrollFactor(0).setDepth(20000);
    plate.isUI = true;

    // Decorative inner border
    const innerPlate = scene.add.rectangle(plateX + 4, plateY + 4, plateW - 8, plateH - 8, 0x000000, 0)
        .setStrokeStyle(1, 0x8b6b32, 0.3)
        .setOrigin(0).setScrollFactor(0).setDepth(20000);
    innerPlate.isUI = true;

    // Text Label
    const labelText = scene.add.text(plateX + 15, plateY + 12, 'CLUES:', {
        fontSize: '18px', fill: '#8b6b32', fontFamily: 'serif', fontStyle: 'bold', letterSpacing: 2
    }).setOrigin(0).setScrollFactor(0).setDepth(20000);
    labelText.isUI = true;

    // Counter Text
    const cluesCount = Object.values(useGameStore.getState().savedStoryProgress?.clues || {}).filter(Boolean).length;
    const countText = scene.add.text(plateX + 110, plateY + 11, `${cluesCount} / 4`, {
        fontSize: '22px', fill: '#e8dcc0', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0).setScrollFactor(0).setDepth(20000);
    countText.isUI = true;

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

    const tabletElements = [shadow, plate, innerPlate, labelText, countText];

    // ─── STATE SYNC ─────────────────────────────────────────────────────────────
    const unsubscribe = useGameStore.subscribe((state, prevState) => {
        // Handle unpause from React overlay
        if (prevState.isStoryPaused && !state.isStoryPaused) {
            if (scene.scene.isPaused()) scene.scene.resume();
        }
        
        // Handle evidence updates automatically
        const oldCount = Object.values(prevState.savedStoryProgress?.clues || {}).filter(Boolean).length;
        const newCount = Object.values(state.savedStoryProgress?.clues || {}).filter(Boolean).length;
        
        if (newCount !== oldCount) {
            countText.setText(`${newCount} / 4`);
            
            // Pop animation for the tablet
            if (newCount > oldCount) {
                scene.tweens.add({
                    targets: tabletElements,
                    scaleX: 1.08,
                    scaleY: 1.08,
                    duration: 150,
                    yoyo: true,
                    ease: 'Quad.easeOut'
                });

                // Flash the text gold then back
                countText.setColor('#ffd700');
                scene.time.delayedCall(300, () => {
                    countText.setColor('#e8dcc0');
                });
            }
        }
    });
    scene.events.once('shutdown', () => unsubscribe());
    
    return {
        evidenceTrackerText: countText
    };
}
