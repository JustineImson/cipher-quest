/**
 * Orientation lock utilities for forcing landscape mode
 * on mobile devices and PWA installs.
 */

export async function lockLandscape() {
  try {
    // Works in fullscreen mode on Android Chrome and some desktop browsers
    if (screen.orientation?.lock) {
      await screen.orientation.lock('landscape');
    }
  } catch {
    // Browser doesn't support it or not in fullscreen — rotate prompt handles it
  }
}

export function requestFullscreenAndLock() {
  const el = document.documentElement;
  // Use the first available fullscreen method (vendor-prefixed fallbacks)
  const rfs = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
  if (rfs) {
    // Wrap in try/catch because some browsers throw synchronously
    // when not triggered by a user gesture
    try {
      const result = rfs.call(el);
      // rfs.call may return a Promise (standard) or undefined (webkit)
      if (result && result.then) {
        result.then(lockLandscape).catch(() => {});
      } else {
        lockLandscape();
      }
    } catch {
      // Not triggered by user gesture or unsupported
    }
  }
}
