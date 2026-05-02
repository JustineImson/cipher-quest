import { useGameStore } from '../store/useGameStore';

class BGMController {
  constructor() {
    this.currentTrack = null;
    this.audioElement = new Audio();
    this.audioElement.loop = true;

    // Apply initial volume
    this.updateVolume(useGameStore.getState().settings);

    // Subscribe to store changes to update volume/mute in real-time
    useGameStore.subscribe((state) => {
      if (state && state.settings) {
        this.updateVolume(state.settings);
      }
    });
  }

  updateVolume(settings) {
    if (!settings.musicEnabled) {
      this.audioElement.volume = 0;
    } else {
      this.audioElement.volume = settings.volume / 100;
    }
  }

  play(trackName) {
    if (this.currentTrack === trackName) return;

    this.currentTrack = trackName;
    this.audioElement.src = `/bgm/${trackName}.mp3`;
    
    this.audioElement.play().catch(e => {
      console.warn('BGM Auto-play prevented by browser. Will attempt on next interaction.', e);
      // Optional: Add a one-time click listener to the document to resume audio
      const resumeAudio = () => {
        if (this.currentTrack === trackName) {
           this.audioElement.play().catch(() => {});
        }
        document.removeEventListener('click', resumeAudio);
      };
      document.addEventListener('click', resumeAudio);
    });
  }

  stop() {
    this.audioElement.pause();
    this.currentTrack = null;
  }
}

export const bgmController = new BGMController();
