Summary: Debounced Cloud Sync and Force-Flush Points

Overview
- Purpose: Prevent excessive Firestore writes by debouncing automatic syncs and ensure reliable immediate saves at critical moments.
- Debounce delay: 2500ms (2.5s)

Files changed
- src/store/useGameStore.js
  - Added a module-level `debounce` helper and a `debouncedSync` wrapper around `syncProgressToCloud()`.
  - Replaced the previous subscriber that directly called `syncProgressToCloud()` with one that calls `debouncedSync()`.
  - Added an auth guard so the subscriber returns early when no `currentUser` is present.

- src/components/StoryCipherOverlay.jsx
  - After unlocking evidence, if the final evidence is reached (4/4), the overlay now calls `syncProgressToCloud()` directly and awaits it. This guarantees the final progress is flushed immediately.

- src/game/EndingScene.js
  - When the ending sequence completes, the scene now force-flushes `syncProgressToCloud()` before showing the post-game menu.

- src/services/authService.js
  - `logoutUser()` now attempts to `await` a direct `syncProgressToCloud()` before calling `signOut(auth)` so progress is saved prior to logout.

Notes and rationale
- The debounced auto-sync reduces write storms to Firestore by coalescing rapid local changes into a single write every 2.5s.
- The three force-flush points (final evidence, ending completion, logout) are chosen to ensure progress persistence at natural session endpoints where immediate durability matters.
- `debouncedSync` is defined outside the Zustand creator to avoid recreation on every state update.

How to test manually
1. Login with a user and play Story Mode: ensure periodic state changes do not immediately fire many Firestore writes.
2. Collect evidence until the final piece (4/4) — verify a immediate cloud write occurs.
3. Reach the ending — verify an immediate cloud write occurs before the post-game menu appears.
4. On manual logout, verify a final write occurs before sign-out.

If you want, I can:
- Replace the simple debounce with `lodash.debounce` and add it to `package.json`.
- Expose `debouncedSync` for testing or cancellation.

End of summary.
