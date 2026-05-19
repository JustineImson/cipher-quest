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
  if (el.requestFullscreen) {
    el.requestFullscreen().then(lockLandscape).catch(() => { });
  } else if (el.webkitRequestFullscreen) {
    el.webkitRequestFullscreen();
    lockLandscape();
  }
}
