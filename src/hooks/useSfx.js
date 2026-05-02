import { useCallback } from 'react';
import { useGameStore } from '../store/useGameStore';

/**
 * Singleton AudioContext – shared across all useSfx consumers to avoid
 * creating hundreds of AudioContext instances (browsers limit to ~6-8).
 */
let _ctx = null;
function getCtx() {
  if (!_ctx) {
    _ctx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return _ctx;
}

/**
 * useSfx – lightweight sound-effect hook that respects global SFX settings.
 *
 * Returns:
 *   playClick()  – short "thock" for button / tab clicks (matches Tutorial tab sound)
 *   playKeyTap() – subtle typewriter tap for keyboard presses
 */
export function useSfx() {
  const settings = useGameStore((s) => s.settings);

  const isMuted = !settings.sfxEnabled || settings.volume === 0;
  const vol = settings.volume / 100;

  /* ── Click sound (matches Tutorial.jsx playClick) ───────────── */
  const playClick = useCallback(() => {
    if (isMuted) return;
    try {
      const ctx = getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(700, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.06);
      gain.gain.setValueAtTime(0.15 * vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.06);
    } catch (_) { /* silence errors on restrictive browsers */ }
  }, [isMuted, vol]);

  /* ── Key-tap sound (soft typewriter click) ──────────────────── */
  const playKeyTap = useCallback(() => {
    if (isMuted) return;
    try {
      const ctx = getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(1800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.03);
      gain.gain.setValueAtTime(0.06 * vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.03);
    } catch (_) { /* silence */ }
  }, [isMuted, vol]);

  return { playClick, playKeyTap };
}
