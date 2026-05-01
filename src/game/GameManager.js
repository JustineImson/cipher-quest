export const GamePhases = Object.freeze({
    BRIEFING: 'BRIEFING',
    INVESTIGATING: 'INVESTIGATING',
    DEDUCTION: 'DEDUCTION',
    INTERROGATION: 'INTERROGATION'
});

class GameManager {
    constructor() {
        this.reset();
    }

    reset() {
        // Initialize State Variables: Track which evidence has been found
        this.evidence = {
            hasFoundLog: false,
            hasFoundBoots: false,
            hasFoundReceipt: false,
            hasFoundPen: false
        };

        // Create the Evidence Array/List: Hold updated clues for Phase 3
        this.evidenceList = [];

        // Track the current game phase
        this.currentPhase = GamePhases.BRIEFING;
    }

    // Helper to collect evidence and add to the list
    collectEvidence(evidenceKey, evidenceData) {
        if (this.evidence.hasOwnProperty(evidenceKey) && !this.evidence[evidenceKey]) {
            this.evidence[evidenceKey] = true;
            this.evidenceList.push(evidenceData);
            console.log(`Collected evidence: ${evidenceKey}`);
            return true;
        }
        return false;
    }

    // Helper to change phases
    setPhase(phase) {
        if (Object.values(GamePhases).includes(phase)) {
            this.currentPhase = phase;
            console.log(`Game phase changed to: ${phase}`);
        }
    }
}

// Export a singleton instance to act as the central brain
export const gameManager = new GameManager();
