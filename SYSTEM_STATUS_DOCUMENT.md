# System Status Document — Cipher Quest

> Generated: 2026-05-06 | Repository: `JustineImson/cipher-quest`

---

## 1. High-Level Architecture

| Layer | Technology | Role |
|-------|-----------|------|
| **Frontend UI** | React 19 + Vite | SPA shell, menus, overlays, tutorial, and route mounting |
| **Game Engine** | Phaser 4 (Matter.js physics) | Isometric city map, scene transitions, dialogue system, particle effects |
| **State Bridge** | Zustand (with `persist` middleware) | Central store; synchronizes React UI, Phaser scenes, and cloud saves |
| **Backend / Auth** | Firebase (Auth + Firestore) | Email/password auth, user profiles, story progress cloud sync, social graph |
| **Styling** | Tailwind CSS 4 + inline Phaser Graphics | Victorian/detective noir aesthetic across React and Phaser layers |
| **AI Content** | Google Gemini 2.5 Flash (`@google/generative-ai`) | Generates dynamic puzzle plaintexts, keys, and thematic clues for Time Attack |
| **Multiplayer** | Socket.IO Client (`socket.io-client`) + local Node server | Real-time competitive cipher races with lobby/room system |
| **Audio** | Native HTML5 Audio (`BGMController` singleton) | Looping ambient tracks; volume controlled via Zustand settings |

**Interaction Flow:**
- React owns the chrome (menus, settings, auth modals, overlays).
- Phaser owns the interactive world (story scenes, map traversal, crime scenes).
- Zustand is the single source of truth; Phaser scenes read/write via `useGameStore.getState()` and window events (`CustomEvent`), while React components bind via Zustand subscriptions.
- Firestore persists story progress and social data; Firebase Auth manages identity.

---

## 2. Directory Structure

```
src/
├── components/
│   ├── ColumnarInteractive.jsx
│   ├── PauseOverlay.jsx
│   ├── PhaserGame.jsx              # React bridge that instantiates Phaser.Game
│   ├── RailFenceInteractive.jsx
│   ├── SocialOverlay.jsx
│   ├── StoryCipherOverlay.jsx
│   ├── SubstitutionInteractive.jsx
│   ├── VigenereInteractive.jsx
│   ├── VirtualKeyboard.jsx
│   └── ui/
│       ├── Button.jsx
│       ├── DeductionBoardOverlay.jsx
│       ├── DifficultySplash.jsx
│       ├── LoadingSpinner.jsx
│       ├── LoginModal.jsx
│       └── PostGameOverlay.jsx
├── data/
│   └── StoryEvidence.js            # Narrative evidence entries + suspect hints
├── engine/
│   ├── BGMController.js            # Singleton audio manager
│   ├── cipherAlgorithms.js         # 6 classical cipher implementations
│   └── gameLogic.js                # Cipher selection + answer validation
├── game/                           # Phaser scenes + helpers
│   ├── CipherData.js               # Story-mode ciphers per location/difficulty
│   ├── DeductionBoardScene.js      # Cork-board evidence review
│   ├── DevPanel.js                 # Dev teleport/debug panel
│   ├── DialogueController.js       # Typed-out dialogue system
│   ├── EndingScene.js              # Win/loss typewriter monologue
│   ├── GameManager.js              # Phase singleton (BRIEFING → INVESTIGATING → DEDUCTION → INTERROGATION)
│   ├── HUD.js                      # In-scene evidence tracker + pause button
│   ├── IntroScene.js               # Opening noir monologue
│   ├── LocationScene.js            # Crime-scene backgrounds + clickable evidence
│   ├── MainScene.js                # Isometric city map, player movement, rain
│   └── OfficeScene.js              # Police briefing + interrogation
├── hooks/
│   ├── useAudio.js
│   ├── useMultiplayer.js           # Socket.IO lobby/game lifecycle hook
│   ├── useSfx.js
│   └── useTimer.js
├── pages/
│   ├── DefaultPage.jsx
│   ├── Difficulty.jsx              # Pre-story difficulty selector
│   ├── Leaderboards.jsx            # Time Attack / Multiplayer tabs (mock data)
│   ├── MainMenu.jsx                # Root hub; auth-gated profile entry
│   ├── MultiplayerMode.jsx         # Socket.IO competitive mode UI
│   ├── Profile.jsx                 # Logged-in user card + logout
│   ├── Settings.jsx                # Volume, music, sfx, difficulty
│   ├── StoryMode.jsx               # Difficulty gate → mounts PhaserGame
│   ├── TimeAttackMode.jsx          # Solo timed cipher gauntlet
│   └── Tutorial.jsx                # Multi-phase cipher tutorial
├── services/
│   ├── aiGenerator.js              # Gemini puzzle generator
│   ├── authService.js              # Firebase Auth wrappers
│   ├── firebase.js                 # Firebase app init + auth/db exports
│   └── socialService.js            # Friend requests, friend list, game invites
├── store/
│   └── useGameStore.js             # Zustand store (settings, auth, story, multiplayer)
├── App.jsx                         # React Router + route-level BGM triggers
├── main.jsx
└── index.css
```

---

## 3. State Management (`useGameStore.js`)

**Persisted slices (`localStorage` key: `aegis-game-storage`):**
- `settings` — `{ volume, musicEnabled, sfxEnabled, difficulty }`
- `playerProfile` — `{ username }`
- `savedStoryProgress` — current story phase + clue flags + clue list
- `collectedEvidence` — array of unlocked evidence objects

**Runtime state:**
- `currentUser` — `{ uid, email, username, friendCode }` (from Firebase Auth)
- `gameState` — `'idle' | 'playing' | 'paused' | 'game_over'`
- `currentDifficulty` / `puzzlesSolved` / `showDifficultySplash` — Time Attack progression
- `multiplayer` — `{ roomId, connectionStatus, opponentProgress }`
- `isStoryPaused` / `isDeductionBoardOpen` / `showPostGameMenu`

**Key actions:**
- `initializeAuthListener()` — Firebase `onAuthStateChanged`; loads cloud save on login
- `syncProgressToCloud()` — writes `storyProgress/{uid}` doc to Firestore
- `startNewStory(difficulty)` — initializes `savedStoryProgress` with `phase: 'BRIEFING'`
- `saveEvidence(key, data)` / `savePhase(phase)` / `unlockNextEvidence()`
- `incrementPuzzlesSolved()` — auto-escalates difficulty at solve thresholds (3 → moderate, 7 → hard)
- `setMultiplayerState()`, `togglePause()`, `resetProgression()`, `updateSettings()`

**Auto-sync:** a Zustand subscriber watches `savedStoryProgress` and `collectedEvidence`; any delta triggers `syncProgressToCloud()` when a user is logged in.

---

## 4. Services & Backend (`src/services/`)

### `firebase.js`
- Initializes the Firebase app with a hardcoded config for project `detective-game-db`.
- Exports: `auth` (Firebase Auth), `db` (Firestore).

### `authService.js`
- `loginUser(email, password)` → `signInWithEmailAndPassword`
- `registerUser(email, password, username)` → `createUserWithEmailAndPassword`, then `updateProfile(displayName)`, then creates a Firestore `users/{uid}` document containing `username`, `email`, `friendCode` (first 6 chars of UID, uppercase), and `createdAt`.
- `resetPassword(email)` → `sendPasswordResetEmail`
- `logoutUser()` → `signOut`

### `socialService.js`
- `sendFriendRequest(currentUid, targetFriendCode)` — queries `users` by `friendCode`, checks for existing `friendships` docs in either direction, then writes a `friendships` doc with `status: 'pending'`.
- `listenToPendingRequests(currentUid, callback)` — real-time Firestore listener for incoming pending requests; enriches sender UID with username/friendCode.
- `acceptFriendRequest(friendshipDocId)` — updates doc to `status: 'accepted'`.
- `listenToFriendsList(currentUid, callback)` — **dual-listener pattern**: listens to `senderId` and `receiverId` accepted queries separately, merges results, and enriches friend UIDs with profile data.
- `sendGameInvite(senderUid, receiverUid, roomCode)` — checks for existing pending invite between the pair; writes `gameInvites` doc with `status: 'pending'`.
- `listenToIncomingGameInvites(currentUid, callback)` — real-time listener for pending invites with sender enrichment.
- `resolveGameInvite(inviteId, status)` — updates invite doc status + `resolvedAt`.

### `aiGenerator.js`
- `generatePuzzleDetails(difficulty, theme)` — calls Gemini 2.5 Flash (`gemini-2.5-flash`) with a structured prompt requesting strict JSON output: `{ plaintext, key, clue }`.
- Difficulty rules encoded in prompt:
  - `easy`: 1 word (5–8 chars), obvious clue
  - `moderate`: 1–2 words (9–14 chars), vague clue
  - `hard`: 2–3 words (15+ chars), highly cryptic clue

---

## 5. React Routing & Pages

| Route | Page | Current Behavior |
|-------|------|------------------|
| `/` | `MainMenu` | Root hub with animated menu entries; auth-gated Profile button opens `LoginModal` if anonymous. Plays `bgm4`. |
| `/tutorial` | `Tutorial` | Multi-phase instructional page covering crime-scene exploration, cipher identification, and the deduction board. |
| `/story` | `StoryMode` | Difficulty selector overlay; once chosen, mounts `PhaserGame` with `startScene: 'IntroScene'`. |
| `/timeAttack` | `TimeAttackMode` | Solo gauntlet: 60-second timer, AI-generated or algorithmic puzzles, difficulty auto-escalates every 3/7 solves. Includes pause, virtual keyboard, and interactive cipher widgets. |
| `/multiplayer` | `MultiplayerMode` | Socket.IO lobby (create/join room), real-time competitive rounds, opponent progress tracking, social overlay for invites. |
| `/leaderboards` | `Leaderboards` | Tabs for Time Attack and Multiplayer; currently populated with mock data arrays. |
| `/settings` | `Settings` | Master volume slider, music/sfx toggles, and difficulty selector with animated transitions. |
| `/difficulty` | `Difficulty` | Pre-game difficulty selector specifically for Story Mode; calls `startNewStory(diff)` before routing to `/story`. |
| `/profile` | `Profile` | Displays current Firebase user (username, email, friend code) and logout button. Redirects unauthenticated users. |

**BGM routing rule (in `App.jsx`):** menu routes (`/`, `/tutorial`, `/settings`, `/difficulty`, `/leaderboards`, `/profile`) automatically trigger `bgmController.play('bgm4')`.

---

## 6. Phaser Game Engine (`src/game/`)

**Scene List & Purpose:**

| Scene | Key | Role |
|-------|-----|------|
| `IntroScene` | `IntroScene` | Noir typewriter monologue (5 lines). Skippable. Fades to `OfficeScene`. |
| `OfficeScene` | `OfficeScene` | **Phase A:** Police Chief briefing with suspect profiles (Donovan, Marcus, Elena). **Phase D:** Interrogation — player clicks a suspect image; correct accusation (Elena) triggers victory dialogue and `EndingScene(win)`; wrong choice triggers `EndingScene(loss)`. |
| `MainScene` | `MainScene` | Isometric city map (Tiled `Map.tmj`). Player runs/idles with directional sprite animations. Matter.js collision polygons for buildings + yellow sensor triggers for locations (`apartment`, `park`, `alley`, `beach`). Rain particle overlay. HUD evidence tracker + pause button. Press **F** at a trigger to zoom/fade into `LocationScene`. |
| `LocationScene` | `LocationScene` | Crime-scene background + one clickable evidence object. On click: tweens evidence to center, pauses Phaser, and fires `openStoryCipher` window event to mount `StoryCipherOverlay`. On solve: collects evidence via `GameManager`, updates HUD, plays detective dialogue. When 4/4 evidence collected, auto-transitions to `DeductionBoardScene`. |
| `DeductionBoardScene` | `DeductionBoardScene` | Cork-board aesthetic. Renders collected evidence cards with staggered slide-in animations. "Begin Interrogation" button transitions back to `OfficeScene` in `INTERROGATION` phase. |
| `EndingScene` | `EndingScene` | Typewriter epilogue (good vs bad). Fades out, then flips `showPostGameMenu` in Zustand to render `PostGameOverlay` in React. |

**Scene Flow (Story Mode):**
```
IntroScene
    ↓ (typewriter finish)
OfficeScene [BRIEFING]
    ↓ (dialogue finish)
MainScene (explore city)
    ↓ (F at access trigger)
LocationScene (collect 1 of 4 clues)
    ↓ (return)
MainScene → ... repeat for all 4 locations ...
    ↓ (4/4 clues)
DeductionBoardScene
    ↓ (Begin Interrogation)
OfficeScene [INTERROGATION]
    ↓ (accuse Elena)
EndingScene (isWin = true)
    ↓ (typewriter finish)
PostGameOverlay (React)
```

**Key Systems:**
- `DialogueController.js` — reusable typed-text renderer with portrait sprites and callback chains.
- `GameManager.js` — singleton proxy that reads/writes story phase and evidence through Zustand; defines `GamePhases` enum.
- `HUD.js` — creates the evidence tracker plate and pause button; subscribes to Zustand to animate count changes.
- `DevPanel.js` — in-scene dev utilities (teleport to locations, force deduction scene).

---

## 7. Core Game Logic (`src/data/` & `src/engine/`)

### Cipher Algorithms (`cipherAlgorithms.js`)
Six classical ciphers implemented as pure functions:
1. **Caesar Shift** — configurable shift, modulo-safe.
2. **Atbash** — direct alphabetical reversal.
3. **Vigenère** — keyword-driven polyalphabetic substitution.
4. **Columnar Transposition** — keyword sorts columns; reads down sorted columns.
5. **Rail Fence** — zig-zag write across N rails; flattened read.
6. **Keyword Substitution** — keyword prefixes a custom alphabet; maps A→Z sequentially.

### Puzzle Selection & Validation (`gameLogic.js`)
- `selectCipherMethod(difficulty)` — returns a random cipher object from a curated pool per difficulty:
  - **Easy:** Caesar, Substitution (`CAT`/`DOG`), Columnar (`TIME`), Rail Fence (3 rails), Vigenère (`KEY`/`FUN`); includes encryption-mode variants.
  - **Medium:** Substitution (`SECRET`/`PUZZLE`), Rail Fence (3), Columnar (`TIME`), Vigenère (`CODE`/`HIDE`); encryption variants.
  - **Hard:** Substitution (`OBFUSCATE`/`ENCRYPT`), Vigenère (`MYSTERY`/`ENIGMA`), Columnar (`TIME`), Rail Fence (4); encryption variants.
- `validateAnswer(userInput, actualTerm)` — strips spaces/punctuation, uppercases both, and performs strict equality.

### Story Ciphers (`CipherData.js`)
Hard-coded per-location, per-difficulty puzzles:
- **Apartment** — Vigenère (`CAT` / `MAYOR`)
- **Park** — Rail Fence (2 / 3 / 5 rails)
- **Alley** — Columnar (`BAD` / `HACK` / `HACKER`)
- **Beach** — Substitution (`PEN` / `SILVER`)

Each entry specifies: `type`, `keyword`/`rails`, `clue`, `ciphertext`, `solution`.

### Story Evidence (`StoryEvidence.js`)
Four narrative evidence items that point to the true culprit (Elena Rostova):
1. `ev_log` — *Corrupted Access Log* (ID starts with `ER`; internal access)
2. `ev_boots` — *Muddy Work Boots* (size 14, but stiletto heel marks; staged frame)
3. `ev_receipt` — *Grease Pit Receipt* (City Hall card paying for alley pizza; sloppy frame)
4. `ev_pen` — *Sterling Silver Pen* (`E.R.` initials; dropped while burning blueprints)

Each item has a `suspectHint` narrative string explaining why the evidence eliminates Donovan/Marcus and implicates Elena.

---

## Build & Dev Notes

- **Dev server:** `concurrently "vite" "node server/index.js"` — Vite frontend + Node/Socket.IO backend on `localhost:3001`.
- **No TypeScript** — plain JSX/JS throughout.
- **Tailwind v4** — imported via `@tailwindcss/vite` plugin; custom mystery-dark theme tokens used heavily.
- **Phaser v4** — uses `matter.js` physics; sprite sheets loaded from `/public/spriteSheet/` and Tiled map from `/public/Map.tmj`.

---

*End of Document*
