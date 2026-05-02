import * as Phaser from 'phaser';
import { gameManager, GamePhases } from './GameManager';

const devLocations = [
    { name: 'Office', key: '__office__' },
    { name: 'City Map', key: '__map__' },
    { name: 'Apartment', key: 'apartment' },
    { name: 'Park', key: 'park' },
    { name: 'Alley', key: 'alley' },
    { name: 'Beach', key: 'beach' },
    { name: 'Deduction', key: '__deduction__' }
];

/**
 * Adds a dev teleport panel to any Phaser scene.
 * Works even on scenes with camera zoom by ignoring the main camera
 * and rendering on a dedicated UI camera.
 */
export function addDevPanel(scene) {
    const panelX = 10;
    const panelY = 10;
    const panelW = 160;
    const panelH = 30 + devLocations.length * 30;

    // Collect all panel objects so we can assign them to a UI camera
    const panelObjects = [];

    // Panel background
    const bg = scene.add.rectangle(panelX + panelW / 2, panelY + panelH / 2, panelW, panelH, 0x000000, 0.7)
        .setStrokeStyle(1, 0xff0000)
        .setScrollFactor(0)
        .setDepth(99999);
    panelObjects.push(bg);

    // Panel title
    const title = scene.add.text(panelX + panelW / 2, panelY + 14, '⚡ DEV TELEPORT', {
        fontSize: '13px', fill: '#ff4444', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100000);
    panelObjects.push(title);

    devLocations.forEach((loc, i) => {
        const ty = panelY + 36 + i * 30;
        const label = scene.add.text(panelX + panelW / 2, ty, loc.name, {
            fontSize: '15px', fill: '#00ff88', fontFamily: 'monospace'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(100000)
          .setInteractive({ useHandCursor: true })
          .on('pointerover', () => label.setStyle({ fill: '#ffffff' }))
          .on('pointerout', () => label.setStyle({ fill: '#00ff88' }))
          .on('pointerdown', () => {
              if (gameManager.currentPhase === GamePhases.BRIEFING) {
                  gameManager.setPhase(GamePhases.INVESTIGATING);
              }

              if (loc.key === '__office__') {
                  scene.scene.start('OfficeScene');
              } else if (loc.key === '__map__') {
                  scene.scene.start('MainScene');
              } else if (loc.key === '__deduction__') {
                  gameManager.setPhase('DEDUCTION');
                  scene.scene.start('DeductionBoardScene');
              } else {
                  scene.scene.start('LocationScene', { locationKey: loc.key });
              }
          });
        panelObjects.push(label);
    });

    // If the main camera is zoomed, create a separate UI camera at zoom 1
    // so the dev panel always renders at normal size.
    const mainCam = scene.cameras.main;
    if (mainCam.zoom !== 1) {
        const uiCam = scene.cameras.add(0, 0, scene.scale.width, scene.scale.height);
        uiCam.setZoom(1);
        uiCam.setScroll(0, 0);

        // Identify all UI objects (Dev panel + any other game UI marked with isUI)
        const uiObjects = scene.children.list.filter(child => panelObjects.includes(child) || child.isUI);

        // Main camera ignores UI objects
        uiObjects.forEach(obj => mainCam.ignore(obj));

        // UI camera ignores everything EXCEPT UI objects
        uiCam.ignore(scene.children.list.filter(child => !uiObjects.includes(child)));
    }
}
