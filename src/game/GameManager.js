import { useGameStore } from '../store/useGameStore';
import { suspectEvidence } from '../data/StoryEvidence';

export const GamePhases = Object.freeze({
    BRIEFING: 'BRIEFING',
    INVESTIGATING: 'INVESTIGATING',
    DEDUCTION: 'DEDUCTION',
    INTERROGATION: 'INTERROGATION'
});

class GameManager {
    get evidence() {
        return useGameStore.getState().savedStoryProgress?.clues || {};
    }

    get evidenceList() {
        return useGameStore.getState().savedStoryProgress?.cluesList || [];
    }

    get currentPhase() {
        let phase = useGameStore.getState().savedStoryProgress?.phase;
        if (!phase) {
            try {
                const raw = localStorage.getItem('aegis-game-storage');
                if (raw) {
                    const parsed = JSON.parse(raw);
                    const persisted = parsed.state?.savedStoryProgress || parsed.savedStoryProgress || parsed;
                    if (persisted && persisted.phase) {
                        phase = persisted.phase;
                    }
                }
            } catch (e) {
                // Ignore parse errors
            }
        }
        return phase || GamePhases.BRIEFING;
    }

    reset() {
        useGameStore.getState().resetProgress();
    }

    // Helper to collect evidence and add to the list
    collectEvidence(evidenceKey, evidenceData) {
        const clues = this.evidence;
        // Safely check if the evidence hasn't been collected yet, without relying on hasOwnProperty
        if (!clues[evidenceKey]) {
            // Try to resolve a full suspectEvidence entry from the provided evidenceData
            let fullEntry = null;
            if (evidenceData && evidenceData.name) {
                // suspectEvidence ids are like 'ev_log' — match by suffix
                fullEntry = suspectEvidence.find(ev => ev.id && ev.id.endsWith(`_${evidenceData.name}`));
            }

            const payload = fullEntry
                ? { ...fullEntry, location: evidenceData?.location }
                : { id: `ev_${evidenceData?.name || 'unknown'}`, title: evidenceData?.name || 'Evidence', location: evidenceData?.location };

            useGameStore.getState().saveEvidence(evidenceKey, payload);
            console.log(`Collected evidence: ${evidenceKey}`);

            // If we've collected all evidence, attempt an immediate cloud sync
            try {
                if (this.evidenceList.length >= suspectEvidence.length) {
                    useGameStore.getState().syncProgressToCloud();
                }
            } catch (e) {
                console.warn('Error while syncing progress after final evidence:', e);
            }

            return true;
        }
        return false;
    }

    // Helper to change phases
    setPhase(phase) {
        if (Object.values(GamePhases).includes(phase)) {
            useGameStore.getState().savePhase(phase);
            console.log(`Game phase changed to: ${phase}`);
        }
    }
}

// Export a singleton instance to act as the central brain
export const gameManager = new GameManager();
