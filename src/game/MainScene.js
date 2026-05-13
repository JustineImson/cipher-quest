import * as Phaser from 'phaser';
import { gameManager, GamePhases } from './GameManager';
import { addDevPanel } from './DevPanel';
import { bgmController } from '../engine/BGMController';
import { useGameStore } from '../store/useGameStore';
import { createHUD } from './HUD';

const RUN_FRAME_W = 64;   // 512px / 8 columns
const RUN_FRAME_H = 64;   // 256px / 4 rows
const IDLE_FRAME_W = 64;  // 768px / 12 columns
const IDLE_FRAME_H = 64;  // 256px / 4 rows
const DISPLAY_W = 32;
const DISPLAY_H = 48;
const HITBOX_W = 16;
const HITBOX_H = 10;

export default class MainScene extends Phaser.Scene {
    constructor() {
        super('MainScene');
    }

    init(data) {
        this.fromLocation = data && data.fromLocation ? data.fromLocation : null;
        this.spawnPoints = {};
    }

    preload() {
        // Will be populated with gid -> texture key mappings as we inspect the map.
        this.gidToKey = {};

        // Helper: build the gidToKey map from the JSON data and queue any missing images.
        const buildGidMap = (mapData) => {
            if (!mapData || !Array.isArray(mapData.tilesets)) return;

            mapData.tilesets.forEach(tileset => {
                const firstgid = tileset.firstgid || 1;

                // Tileset defined as a collection of separate images (common in Tiled).
                if (Array.isArray(tileset.tiles) && tileset.tiles.length) {
                    tileset.tiles.forEach(tile => {
                        if (!tile.image) return;
                        const imagePath = tile.image.replace(/\\/g, '/');
                        const filename = imagePath.split('/').pop();
                        const key = filename.replace(/\.[^/.]+$/, '');
                        const url = imagePath.startsWith('/') ? imagePath : '/' + filename;
                        this.gidToKey[firstgid + tile.id] = key;
                        if (!this.textures.exists(key)) this.load.image(key, url);
                    });
                } else if (tileset.image) {
                    // Single-image tileset (a tilesheet).
                    const imagePath = tileset.image.replace(/\\/g, '/');
                    const filename = imagePath.split('/').pop();
                    const key = tileset.name || filename.replace(/\.[^/.]+$/, '');
                    const url = imagePath.startsWith('/') ? imagePath : '/' + filename;
                    if (!this.textures.exists(key)) this.load.image(key, url);
                    this.gidToKey[firstgid] = key;
                }
            });
        };

        // Load master sprite sheets (run: 8 cols x 4 rows, idle: 12 cols x 4 rows)
        this.load.spritesheet('player_run', '/spriteSheet/run.png', { frameWidth: RUN_FRAME_W, frameHeight: RUN_FRAME_H });
        this.load.spritesheet('player_idle', '/spriteSheet/idle.png', { frameWidth: IDLE_FRAME_W, frameHeight: IDLE_FRAME_H });

        // If the map JSON is already cached (scene restart), build mapping directly.
        const cachedMap = this.cache.json.get('map');
        if (cachedMap) {
            buildGidMap(cachedMap);
        } else {
            // First load: queue the JSON and build the map when it arrives.
            this.load.json('map', '/Map.tmj');
            this.load.once('filecomplete-json-map', () => {
                buildGidMap(this.cache.json.get('map'));
                this.load.start();
            });
        }
    }

    create() {
        localStorage.setItem('currentScene', this.scene.key);
        localStorage.setItem('hasFinishedIntro', 'true');
        
        // Setup dark gloomy background color
        this.cameras.main.setBackgroundColor('#0d131f');

        const mapData = this.cache.json.get('map');

        const tileW = mapData.tilewidth;   // 256
        const tileH = mapData.tileheight;  // 128
        const mapCols = mapData.width;        // 30
        const mapRows = mapData.height;       // 30

        // Top diamond of the iso map sits at mapOffsetX on screen
        const mapOffsetX = mapCols * (tileW / 2); // 3840

        // ─── GID → IMAGE KEY MAP ─────────────────────────────────────────────
        // Use the mapping built during preload when available; fall back to the
        // original hard-coded mapping for compatibility.
        const gidToKey = (this.gidToKey && Object.keys(this.gidToKey).length) ? this.gidToKey : {
            1: 'road1',
            2: 'road2',
            3: 'dirt',       // entire ground layer is GID 3
            4: 'road3',
            5: 'road4',
            6: 'road5',
            7: 'road6',
            8: 'road7',
            9: 'road8',
            10: 'bldg1',
            11: 'bldg2',      // ← bldg layer objects id:15,16,17
            12: 'bldg3',
            13: 'bldg4',
            14: 'bldg5',
            20: 'bldg_main',  // ← bldg layer object id:1 (large building)
        };

        // ─── HELPER: grid (col, row) → screen (x, y) ─────────────────────────
        const toScreen = (col, row) => ({
            x: (col - row) * (tileW / 2) + mapOffsetX,
            y: (col + row) * (tileH / 2),
        });

        // ─── HELPER: Tiled iso pixel → screen ────────────────────────────────
        // Tiled object x,y are orthogonal pixel coordinates representing the bottom-left corner
        // of the object's bounding box. The standard isometric projection directly converts them:
        const tiledIsoToScreen = (px, py) => {
            return {
                x: (px - py) + mapOffsetX,
                y: (px + py) / 2
            };
        };

        // ─── GROUND LAYER ────────────────────────────────────────────────────
        const groundLayer = mapData.layers.find(l => l.name === 'ground' && l.type === 'tilelayer');
        if (groundLayer?.data) {
            let i = 0;
            for (let row = 0; row < groundLayer.height; row++) {
                for (let col = 0; col < groundLayer.width; col++) {
                    const rawGid = groundLayer.data[i++] & 0x1fffffff;
                    if (rawGid === 0) continue;
                    const key = gidToKey[rawGid];
                    if (!key) continue;

                    const { x, y } = toScreen(col, row);
                    const spr = this.add.sprite(x, y, key);
                    spr.setOrigin(0.5, 0); // top-center of diamond
                    spr.setDepth(0);
                    // Add a gloomy bluish-gray tint to the ground
                    spr.setTint(0x73879a);
                }
            }
        }

        // ─── OBJECT LAYERS ───────────────────────────────────────────────────
        const renderObjectLayer = (layerName, baseDepth = 1) => {
            const layer = mapData.layers.find(l => l.name === layerName && l.type === 'objectgroup');
            if (!layer?.objects) {
                console.warn(`Layer "${layerName}" not found.`);
                return;
            }

            layer.objects.forEach((obj) => {
                if (!obj.gid) return; // skip polygon/point collision objects

                const rawGid = obj.gid & 0x1fffffff;
                const key = gidToKey[rawGid];
                if (!key) {
                    console.warn(`GID ${rawGid} not in gidToKey (layer: ${layerName})`);
                    return;
                }

                // Tiled object x,y points to the top-left of the orthogonal bounds.
                // Projecting gives the top-vertex of the isometric diamond.
                const { x, y } = tiledIsoToScreen(obj.x, obj.y);
                const finalY = y + (tileH / 2);

                // In Tiled, tile objects are Bottom-Center aligned.
                // We add tileH/2 to place the bottom of the object at the center of the grid cell.
                const spr = this.add.sprite(x, finalY, key);
                spr.setOrigin(0.5, 1);
                // Add a gloomy tint to the object (slightly brighter than ground)
                spr.setTint(0x9aaebf);
                spr.setDepth(spr.y + baseDepth); // Y-sort using the final bottom coordinate
            });
        };

        // Render all object layers found in the map (skip collision layers).
        mapData.layers
            .filter(l => l.type === 'objectgroup' && !(l.name && /collis/i.test(l.name)))
            .forEach((l, idx) => renderObjectLayer(l.name, idx + 1));

        // ─── COLLISION HANDLING ──────────────────────────────────────────────
        // All polygon objects are now used for collisions and visually drawn for debugging.
        // We create static Matter bodies from them and shift each polygon one tile south-west.
        const polygonObjects = mapData.layers
            .filter(l => l.type === 'objectgroup' && Array.isArray(l.objects))
            .flatMap(l => l.objects)
            .filter(o => o && Array.isArray(o.polygon));

        if (polygonObjects.length) {
            polygonObjects.forEach(obj => {
                const isAccessTrigger = obj.name && obj.name.toLowerCase().trim() === 'access';
                
                let locationKey = '';
                if (isAccessTrigger && Array.isArray(obj.properties)) {
                    const prop = obj.properties[0];
                    if (prop && prop.value) {
                        locationKey = prop.value.trim();
                    }
                }

                // Compute polygon screen points and centroid up-front so we can always
                // register a spawn point for the access location even if the trigger
                // itself will be hidden because the evidence has already been collected.
                const points = obj.polygon.map(p => tiledIsoToScreen(obj.x + p.x, obj.y + p.y));
                // Shift the polygons down by tileH / 2 to perfectly match the object sprite Y-alignment
                const shifted = points.map(pt => ({ x: pt.x, y: pt.y + (tileH / 2) }));

                // compute centroid
                const cx = shifted.reduce((s, p) => s + p.x, 0) / shifted.length;
                const cy = shifted.reduce((s, p) => s + p.y, 0) / shifted.length;

                // Always register spawn point for access locations so returning players
                // can be placed at the correct spot even when the trigger is removed.
                if (isAccessTrigger && locationKey) {
                    this.spawnPoints[locationKey] = { x: cx, y: cy };

                    const evidenceMap = {
                        apartment: 'hasFoundLog',
                        park: 'hasFoundBoots',
                        alley: 'hasFoundReceipt',
                        beach: 'hasFoundPen'
                    };
                    const evKey = evidenceMap[locationKey];
                    if (evKey && gameManager.evidence[evKey]) {
                        // Evidence already found: don't render the trigger or add a sensor body,
                        // but we've stored the spawn point above so the player can still return here.
                        return;
                    }
                }

                // Visually render access triggers so they are visible
                if (isAccessTrigger && shifted.length > 0) {
                    const triggerGfx = this.add.graphics();
                    triggerGfx.lineStyle(2, 0xffff00, 1);
                    triggerGfx.fillStyle(0xffff00, 0.4);
                    triggerGfx.setDepth(10000);
                    triggerGfx.beginPath();
                    triggerGfx.moveTo(shifted[0].x, shifted[0].y);
                    for (let i = 1; i < shifted.length; i++) {
                        triggerGfx.lineTo(shifted[i].x, shifted[i].y);
                    }
                    triggerGfx.closePath();
                    triggerGfx.strokePath();
                    triggerGfx.fillPath();
                }


                // vertices relative to centroid (Phaser.Matter expects local verts as {x, y} objects)
                const relVerts = shifted.map(p => ({ x: p.x - cx, y: p.y - cy }));

                try {
                    const labelName = isAccessTrigger
                        ? (locationKey ? `access_${locationKey}` : 'access')
                        : (obj.name ? obj.name : 'polygon');

                    const body = this.matter.add.fromVertices(cx, cy, relVerts, { isStatic: true, isSensor: isAccessTrigger, label: labelName }, true);
                    if (body) {
                        body.render = body.render || {};
                        body.render.visible = false;
                        if (body.gameObject) body.gameObject.setVisible(false);
                    }
                } catch (err) {
                    console.warn('Failed to create collision body for object', obj.id, err);
                }
            });
        }
        
        // Handle non-polygon access triggers if any exist
        const accessObjects = mapData.layers
            .filter(l => l.type === 'objectgroup' && Array.isArray(l.objects))
            .flatMap(l => l.objects)
            .filter(o => o && o.name && o.name.toLowerCase().trim() === 'access' && !Array.isArray(o.polygon));

        accessObjects.forEach(obj => {
            let locationKey = '';
            if (Array.isArray(obj.properties)) {
                const prop = obj.properties[0];
                if (prop && prop.value) {
                    locationKey = prop.value.trim();
                }
            }

            const { x, y } = tiledIsoToScreen(obj.x, obj.y);
            const w = obj.width || 64;
            const h = obj.height || 64;
            const labelName = locationKey ? `access_${locationKey}` : 'access';

            // Register spawn point even if evidence already found so the player
            // will return to the correct tile after leaving a location.
            if (locationKey) {
                this.spawnPoints[locationKey] = { x, y: y + tileH / 2 };

                const evidenceMap = {
                    apartment: 'hasFoundLog',
                    park: 'hasFoundBoots',
                    alley: 'hasFoundReceipt',
                    beach: 'hasFoundPen'
                };
                const evKey = evidenceMap[locationKey];
                if (evKey && gameManager.evidence[evKey]) {
                    // Evidence found: skip creating the access body entirely
                    return;
                }
            }

            this.matter.add.rectangle(x, y + tileH / 2, w, h, { isStatic: true, isSensor: true, label: labelName });
            
            const g = this.add.graphics();
            g.fillStyle(0xffff00, 0.4);
            g.fillRect(x - w/2, y + tileH/2 - h/2, w, h);
            g.setDepth(10000);
        });

        // ─── PLAYER ──────────────────────────────────────────────────────────
        let spawnPos = toScreen(mapCols / 2, mapRows / 2);
        
        // Spawn player near the location they just returned from
        if (this.fromLocation && this.spawnPoints[this.fromLocation]) {
            spawnPos = this.spawnPoints[this.fromLocation];
        }

        this.player = this.matter.add.sprite(spawnPos.x, spawnPos.y, 'player_idle');
        this.player.setDisplaySize(DISPLAY_W, DISPLAY_H);
        
        // Create a smaller collision box centered near the bottom (feet)
        this.player.setBody({
            type: 'rectangle',
            width: HITBOX_W,
            height: HITBOX_H
        });
        
        // Visual Offset (Crucial for Isometric)
        this.player.setOrigin(0.5, 0.8);
        
        // Reapply physics properties
        this.player.setFrictionAir(0.1);
        this.player.setFixedRotation(); // Keep player upright
        
        this.player.setDepth(spawnPos.y + 10);

        // State tracking for idle direction
        this.lastDirection = 's';
        this.lastFlip = false;

        // --- RUNNING ANIMATIONS (8 frames per row) ---
        this.anims.create({ key: 'run-s',  frames: this.anims.generateFrameNumbers('player_run', { start: 0,  end: 7  }), frameRate: 10, repeat: -1 });
        this.anims.create({ key: 'run-se', frames: this.anims.generateFrameNumbers('player_run', { start: 8,  end: 15 }), frameRate: 10, repeat: -1 });
        this.anims.create({ key: 'run-e',  frames: this.anims.generateFrameNumbers('player_run', { start: 16, end: 23 }), frameRate: 10, repeat: -1 });
        this.anims.create({ key: 'run-ne', frames: this.anims.generateFrameNumbers('player_run', { start: 24, end: 31 }), frameRate: 10, repeat: -1 });

        // --- IDLING ANIMATIONS (12 frames per row) ---
        this.anims.create({ key: 'idle-s',  frames: this.anims.generateFrameNumbers('player_idle', { start: 0,  end: 11 }), frameRate: 8, repeat: -1 });
        this.anims.create({ key: 'idle-se', frames: this.anims.generateFrameNumbers('player_idle', { start: 12, end: 23 }), frameRate: 8, repeat: -1 });
        this.anims.create({ key: 'idle-e',  frames: this.anims.generateFrameNumbers('player_idle', { start: 24, end: 35 }), frameRate: 8, repeat: -1 });
        this.anims.create({ key: 'idle-ne', frames: this.anims.generateFrameNumbers('player_idle', { start: 36, end: 39 }), frameRate: 8, repeat: -1 });

        // ─── CAMERA ──────────────────────────────────────────────────────────
        this.cameras.main.fadeIn(1500, 0, 0, 0);
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        
        bgmController.play('bgm5');
        this.cameras.main.setZoom(2);
        const renderedWidth = (mapCols + mapRows) * (tileW / 2);
        const renderedHeight = (mapCols + mapRows) * (tileH / 2);
        this.cameras.main.setBounds(0, 0, renderedWidth, renderedHeight);

        // ─── CONTROLS ────────────────────────────────────────────────────────
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = {
            up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
            down: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
            left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
            right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
        };
        
        // ─── TRIGGERS ────────────────────────────────────────────────────────
        this.fKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F);
        this.canAccess = false;
        this.currentAccessLocation = null;  // tracks which location the player is near
        
        this.promptText = this.add.text(0, 0, 'Press F to Enter', { fontSize: '20px', fill: '#ffff00', backgroundColor: '#000000bb', padding: { x: 8, y: 4 } })
            .setOrigin(0.5)
            .setVisible(false)
            .setDepth(20000);

        this.matter.world.on('collisionstart', (event) => {
            event.pairs.forEach(pair => {
                const { bodyA, bodyB } = pair;
                const otherBody = bodyA === this.player.body ? bodyB : (bodyB === this.player.body ? bodyA : null);
                if (otherBody && otherBody.label && otherBody.label.startsWith('access')) {
                    this.canAccess = true;
                    // Extract location key from label like "access_apartment"
                    const parts = otherBody.label.split('_');
                    this.currentAccessLocation = parts.length > 1 ? parts.slice(1).join('_') : null;
                    this.promptText.setVisible(true);
                    const uiScene = this.scene.get('UIScene');
                    if (uiScene && uiScene.showActionButton) uiScene.showActionButton();
                }
            });
        });
        
        this.matter.world.on('collisionend', (event) => {
            event.pairs.forEach(pair => {
                const { bodyA, bodyB } = pair;
                const otherBody = bodyA === this.player.body ? bodyB : (bodyB === this.player.body ? bodyA : null);
                if (otherBody && otherBody.label && otherBody.label.startsWith('access')) {
                    this.canAccess = false;
                    this.currentAccessLocation = null;
                    this.promptText.setVisible(false);
                    const uiScene = this.scene.get('UIScene');
                    if (uiScene && uiScene.hideActionButton) uiScene.hideActionButton();
                }
            });
        });


        // ─── RAIN EFFECT ─────────────────────────────────────────────────────
        if (!this.textures.exists('raindrop')) {
            const dropGfx = this.add.graphics();
            dropGfx.fillStyle(0xaaddff, 0.4);
            dropGfx.fillRect(0, 0, 2, 25);
            dropGfx.generateTexture('raindrop', 2, 25);
            dropGfx.destroy();
        }

        this.add.particles(0, 0, 'raindrop', {
            x: { min: -400, max: this.scale.width + 400 },
            y: { min: -100, max: -50 },
            lifespan: 2000,
            speedY: { min: 600, max: 900 },
            speedX: { min: -100, max: -50 }, // Slight wind angle
            angle: { min: 80, max: 85 },
            gravityY: 300,
            scale: { start: 0.5, end: 1.2 },
            alpha: { start: 0.5, end: 0 },
            quantity: 12,
            blendMode: 'SCREEN'
        }).setScrollFactor(0).setDepth(15000);


        // ─── MAP NAVIGATION UI ───────────────────────────────────────────────
        const uiContainer = this.add.container(0, 0).setScrollFactor(0).setDepth(20000);
        uiContainer.isUI = true;
        const navX = this.scale.width - 130;

        createHUD(this);

        // Dev panel must be added LAST so its UI camera can ignore all existing objects
        addDevPanel(this);

        const handleForceDeduction = () => {
            if (this.scene.isActive('MainScene')) {
                this.cameras.main.fadeOut(500, 0, 0, 0);
                this.cameras.main.once('camerafadeoutcomplete', () => {
                    this.scene.stop('UIScene');
                    this.scene.start('DeductionBoardScene');
                });
            }
        };
        window.addEventListener('forceDeductionScene', handleForceDeduction);
        this.events.on('shutdown', () => {
            window.removeEventListener('forceDeductionScene', handleForceDeduction);
            this.scene.stop('UIScene');
        });

        // Launch UIScene and hook up inspect-pressed event
        this.scene.launch('UIScene');
        this.inspectRequested = false;
        // The UIScene might take a frame to become available, so we wait or poll.
        // Safest is to just let update() handle it, but we can also bind an event if we grab the scene manager:
        const checkAndBindUIScene = () => {
            const uiScene = this.scene.get('UIScene');
            if (uiScene && uiScene.events) {
                uiScene.events.on('inspect-pressed', () => {
                    this.inspectRequested = true;
                });
            } else {
                this.time.delayedCall(100, checkAndBindUIScene);
            }
        };
        checkAndBindUIScene();
    }

    update() {
        if (!this.player) return;

        const speed = 160;
        let vx = 0;
        let vy = 0;

        const uiScene = this.scene.get('UIScene');
        let joyUp = false, joyDown = false, joyLeft = false, joyRight = false;
        if (uiScene && uiScene.getJoystickState) {
            const joyState = uiScene.getJoystickState();
            joyUp = joyState.up;
            joyDown = joyState.down;
            joyLeft = joyState.left;
            joyRight = joyState.right;
        }

        const isUp = this.cursors.up.isDown || this.wasd.up.isDown || joyUp;
        const isDown = this.cursors.down.isDown || this.wasd.down.isDown || joyDown;
        const isLeft = this.cursors.left.isDown || this.wasd.left.isDown || joyLeft;
        const isRight = this.cursors.right.isDown || this.wasd.right.isDown || joyRight;

        if (isLeft) vx = -speed;
        if (isRight) vx = speed;
        if (isUp) vy = -speed;
        if (isDown) vy = speed;

        if (vx !== 0 && vy !== 0) {
            vx *= Math.SQRT1_2;
            vy *= Math.SQRT1_2;
        }

        const moveScale = this.game.loop.delta / 1000;
        if (this.player.body) {
            this.player.setVelocity(vx * moveScale, vy * moveScale);
        } else {
            this.player.x += vx * moveScale;
            this.player.y += vy * moveScale;
        }

        // Animation logic
        if (isUp && isRight) {
            this.player.play('run-ne', true); this.player.setFlipX(false);
            this.lastDirection = 'ne'; this.lastFlip = false;
        } else if (isUp && isLeft) {
            this.player.play('run-ne', true); this.player.setFlipX(true);
            this.lastDirection = 'ne'; this.lastFlip = true;
        } else if (isDown && isRight) {
            this.player.play('run-se', true); this.player.setFlipX(true);
            this.lastDirection = 'se'; this.lastFlip = true;
        } else if (isDown && isLeft) {
            this.player.play('run-se', true); this.player.setFlipX(false);
            this.lastDirection = 'se'; this.lastFlip = false;
        } else if (isUp) {
            this.player.play('run-ne', true); this.player.setFlipX(false);
            this.lastDirection = 'ne'; this.lastFlip = false;
        } else if (isDown) {
            this.player.play('run-s', true); this.player.setFlipX(false);
            this.lastDirection = 's'; this.lastFlip = false;
        } else if (isRight) {
            this.player.play('run-e', true); this.player.setFlipX(false);
            this.lastDirection = 'e'; this.lastFlip = false;
        } else if (isLeft) {
            this.player.play('run-e', true); this.player.setFlipX(true);
            this.lastDirection = 'e'; this.lastFlip = true;
        } else {
            this.player.play(`idle-${this.lastDirection}`, true);
            this.player.setFlipX(this.lastFlip);
        }
        
        this.player.setDepth(this.player.y + 10);

        if (this.canAccess) {
            this.promptText.setPosition(this.player.x, this.player.y - 40);
            if (Phaser.Input.Keyboard.JustDown(this.fKey) || this.inspectRequested) {
                this.canAccess = false;
                this.inspectRequested = false;
                this.promptText.setVisible(false);
                if (uiScene && uiScene.hideActionButton) uiScene.hideActionButton();

                if (this.currentAccessLocation) {
                    this.input.enabled = false;
                    this.cameras.main.zoomTo(4, 1200, 'Sine.easeInOut');
                    this.cameras.main.fadeOut(1200, 0, 0, 0);
                    this.cameras.main.once('camerafadeoutcomplete', () => {
                        this.scene.stop('UIScene');
                        this.scene.start('LocationScene', { locationKey: this.currentAccessLocation });
                    });
                }
            }
        } else {
            this.inspectRequested = false;
        }
    }
}