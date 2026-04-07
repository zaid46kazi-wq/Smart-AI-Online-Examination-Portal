/**
 * Gaze Tracking Utility
 * Calculates current gaze based on facial landmarks
 */
export const calculateGaze = (landmarks) => {
  if (!landmarks) return 'Center';

  const leftEye = landmarks.getLeftEye();
  const rightEye = landmarks.getRightEye();
  const nose = landmarks.getNose();

  const eyeCenter = {
    x: (leftEye[0].x + rightEye[3].x) / 2,
    y: (leftEye[0].y + rightEye[3].y) / 2
  };

  const nosePeak = nose[3];

  // Horizontal threshold
  const dx = nosePeak.x - eyeCenter.x;
  // Vertical threshold
  const dy = nosePeak.y - eyeCenter.y;

  if (dx > 8) return 'Right';
  if (dx < -8) return 'Left';
  if (dy > 35) return 'Down';
  if (dy < 15) return 'Up';

  return 'Center';
};

export const isLookingAway = (gaze) => {
  return gaze !== 'Center';
};
