import * as Phaser from 'phaser';

export default class MainScene extends Phaser.Scene {
    constructor() {
        super('MainScene');
    }

    preload() {
        // Load the exported Tiled map JSON first so we can inspect its tilesets,
        // then dynamically queue up the image files referenced by the tilesets.
        this.load.json('map', '/Map.tmj');

        // Will be populated with gid -> texture key mappings as we inspect the map.
        this.gidToKey = {};

        // When the map JSON file has finished loading, enqueue the referenced images.
        this.load.once('filecomplete-json-map', () => {
            const mapData = this.cache.json.get('map');
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
                    // Single-image tileset (a tilesheet). Load it under the tileset name/key.
                    const imagePath = tileset.image.replace(/\\/g, '/');
                    const filename = imagePath.split('/').pop();
                    const key = tileset.name || filename.replace(/\.[^/.]+$/, '');
                    const url = imagePath.startsWith('/') ? imagePath : '/' + filename;
                    if (!this.textures.exists(key)) this.load.image(key, url);
                    // Record the starting gid so create() can handle tilesheet-based tilesets.
                    this.gidToKey[firstgid] = key;
                }
            });

            // Start loading the queued images from tilesets.
            this.load.start();
        });
    }

    create() {
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

                // In Tiled, tile objects are Bottom-Center aligned.
                // We add tileH/2 to place the bottom of the object at the center of the grid cell.
                const spr = this.add.sprite(x, y + (tileH / 2), key);
                spr.setOrigin(0.5, 1);
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
                const points = obj.polygon.map(p => tiledIsoToScreen(obj.x + p.x, obj.y + p.y));
                
                // Shift the polygons down by tileH / 2 to perfectly match the object sprite Y-alignment
                const shifted = points.map(pt => ({ x: pt.x, y: pt.y + (tileH / 2) }));

                // compute centroid
                const cx = shifted.reduce((s, p) => s + p.x, 0) / shifted.length;
                const cy = shifted.reduce((s, p) => s + p.y, 0) / shifted.length;

                // vertices relative to centroid (Phaser.Matter expects local verts as {x, y} objects)
                const relVerts = shifted.map(p => ({ x: p.x - cx, y: p.y - cy }));

                try {
                    const labelName = obj.name ? obj.name : 'polygon';
                    const body = this.matter.add.fromVertices(cx, cy, relVerts, { isStatic: true, label: labelName }, true);
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

        // ─── PLAYER ──────────────────────────────────────────────────────────
        const center = toScreen(mapCols / 2, mapRows / 2);
        this.player = this.add.rectangle(center.x, center.y, 16, 32, 0x00aaff);
        
        // Enable Matter Physics for the player so it collides with static walls
        this.matter.add.gameObject(this.player, { isStatic: false, frictionAir: 0.1 });
        this.player.setFixedRotation(); // Keep player upright
        
        this.player.setDepth(center.y + 10);

        // Swap in sprite when ready:
        // this.player = this.add.sprite(center.x, center.y, 'player_sprite', 0);
        // this.anims.create({ key: 'walk_down',  frames: this.anims.generateFrameNumbers('player_sprite', { start: 0,  end: 3  }), frameRate: 8, repeat: -1 });
        // this.anims.create({ key: 'walk_left',  frames: this.anims.generateFrameNumbers('player_sprite', { start: 4,  end: 7  }), frameRate: 8, repeat: -1 });
        // this.anims.create({ key: 'walk_right', frames: this.anims.generateFrameNumbers('player_sprite', { start: 8,  end: 11 }), frameRate: 8, repeat: -1 });
        // this.anims.create({ key: 'walk_up',    frames: this.anims.generateFrameNumbers('player_sprite', { start: 12, end: 15 }), frameRate: 8, repeat: -1 });

        // ─── CAMERA ──────────────────────────────────────────────────────────
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
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
    }

    update() {
        if (!this.player) return;

        const speed = 160;
        let vx = 0;
        let vy = 0;

        const isUp = this.cursors.up.isDown || this.wasd.up.isDown;
        const isDown = this.cursors.down.isDown || this.wasd.down.isDown;
        const isLeft = this.cursors.left.isDown || this.wasd.left.isDown;
        const isRight = this.cursors.right.isDown || this.wasd.right.isDown;

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
            // Apply Matter Physics velocity
            this.player.setVelocity(vx * moveScale, vy * moveScale);
        } else {
            this.player.x += vx * moveScale;
            this.player.y += vy * moveScale;
        }
        
        this.player.setDepth(this.player.y + 10);

        // Swap in when using sprite:
        // if (vx !== 0 || vy !== 0) {
        //   const animKey = Math.abs(vy) > Math.abs(vx)
        //     ? (vy > 0 ? 'walk_down' : 'walk_up')
        //     : (vx > 0 ? 'walk_right' : 'walk_left');
        //   if (this.player.anims.getName() !== animKey) this.player.anims.play(animKey, true);
        // } else {
        //   this.player.anims.stop();
        //   this.player.setFrame(0);
        // }
    }
}