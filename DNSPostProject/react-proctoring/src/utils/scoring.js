/**
 * Scoring Utility
 * Risk assessment weights for violation handling
 */
export const riskWeights = {
    NO_FACE: 20,
    MULTIPLE_FACES: 80, // High Risk
    LOOKING_AWAY: 25,
    TALKING: 30,
    TAB_SWITCH: 35,
    EXIT_FULLSCREEN: 40,
    WINDOW_BLUR: 5,
    KEY_SHORTCUT: 10
  };
  
  export const getStatusFromScore = (score) => {
    if (score >= 80) return 'cheating';
    if (score >= 40) return 'suspicious';
    return 'secure';
  };
  
  export const updateRiskScore = (currentScore, violationType) => {
    const weight = riskWeights[violationType] || 0;
    return Math.min(currentScore + weight, 100);
  };
  
