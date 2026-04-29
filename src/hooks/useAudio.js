import { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '../store/useGameStore';

export function useAudio(backgroundMusicUrl = null) {
  const { settings } = useGameStore();
  const bgMusicRef = useRef(null);

  // Background Music controller
  useEffect(() => {
    if (!backgroundMusicUrl) return;

    if (!bgMusicRef.current) {
      const audio = new Audio(backgroundMusicUrl);
      audio.loop = true;
      bgMusicRef.current = audio;
    }

    const audio = bgMusicRef.current;
    
    // Normalize volume (slider is 0-100, HTML5 audio is 0.0-1.0)
    audio.volume = settings.musicEnabled ? (settings.volume / 100) : 0;

    if (settings.musicEnabled && settings.volume > 0) {
      // Playback may be rejected by browser autoplay policies initially
      // We catch the error silently
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }

    return () => {
      // Ensure we don't leak audio nodes during dismounts/HMR
    };
  }, [backgroundMusicUrl, settings.musicEnabled, settings.volume]);

  // One-shot SFX player function
  const playSfx = useCallback((sfxUrl) => {
    if (!settings.sfxEnabled || settings.volume === 0) return;
    
    // Using a new primitive Audio instance enables overlapping SFX
    const sfx = new Audio(sfxUrl);
    sfx.volume = settings.volume / 100;
    
    sfx.play().catch(() => {});
  }, [settings.sfxEnabled, settings.volume]);

  return { playSfx };
}
