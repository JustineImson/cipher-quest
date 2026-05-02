import { useGameStore } from '../store/useGameStore';

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
        return useGameStore.getState().savedStoryProgress?.phase || GamePhases.BRIEFING;
    }

    reset() {
        useGameStore.getState().resetProgress();
    }

    // Helper to collect evidence and add to the list
    collectEvidence(evidenceKey, evidenceData) {
        const clues = this.evidence;
        if (clues.hasOwnProperty(evidenceKey) && !clues[evidenceKey]) {
            useGameStore.getState().saveEvidence(evidenceKey, evidenceData);
            console.log(`Collected evidence: ${evidenceKey}`);
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
