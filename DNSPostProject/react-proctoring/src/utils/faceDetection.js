import * as faceapi from 'face-api.js';

/**
 * Load required AI models for face detection
 * @param {string} modelPath - The URL to the folder containing models
 */
export const loadProctoringModels = async (modelPath = '/models') => {
  try {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(modelPath),
      faceapi.nets.faceLandmark68Net.loadFromUri(modelPath)
    ]);
    console.log('Face detection & Landmark models loaded successfully.');
  } catch (error) {
    console.error('Error loading AI models:', error);
    throw error;
  }
};

/**
 * Perform face detection on a video stream
 * @param {HTMLVideoElement} video - The video element to detect faces from
 * @returns {Promise<faceapi.FaceDetection[]>}
 */
export const detectFaces = async (video) => {
  if (!video || video.paused || video.ended) return null;
  
  // Use TinyFaceDetector for high performance (lower CPU usage)
  const options = new faceapi.TinyFaceDetectorOptions({
    inputSize: 160, // Smaller is faster, larger is more accurate
    scoreThreshold: 0.5 // Confidence threshold
  });
  
  return await faceapi.detectAllFaces(video, options);
};

/**
 * Draw detection bounding boxes on canvas
 * @param {HTMLCanvasElement} canvas - The canvas overlay
 * @param {HTMLVideoElement} video - The source video
 * @param {faceapi.FaceDetection[]} detections - Array of found faces
 */
export const drawDetections = (canvas, video, detections) => {
  if (!canvas || !video) return;
  
  const displaySize = { width: video.videoWidth, height: video.videoHeight };
  faceapi.matchDimensions(canvas, displaySize);
  
  const resizedDetections = faceapi.resizeResults(detections, displaySize);
  
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Draw bounding boxes manually if you want custom styling, or use API helper
  resizedDetections.forEach(detection => {
    const box = detection.box;
    // 1. Draw Face Box (Indigo)
    ctx.strokeStyle = '#6366f1'; 
    ctx.lineWidth = 3;
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'rgba(99, 102, 241, 0.4)';
    ctx.strokeRect(box.x, box.y, box.width, box.height);

    // 2. Draw Eye Boxes (Emerald)
    if (detection.landmarks) {
      const leftEye = detection.landmarks.getLeftEye();
      const rightEye = detection.landmarks.getRightEye();

      const drawEyeBox = (eyePoints) => {
        const x = Math.min(...eyePoints.map(p => p.x));
        const y = Math.min(...eyePoints.map(p => p.y));
        const w = Math.max(...eyePoints.map(p => p.x)) - x;
        const h = Math.max(...eyePoints.map(p => p.y)) - y;
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2;
        ctx.strokeRect(x - 3, y - 3, w + 6, h + 6);
      };

      drawEyeBox(leftEye);
      drawEyeBox(rightEye);
    }

    // 3. Draw Label
    ctx.fillStyle = '#6366f1';
    ctx.fillRect(box.x, box.y - 25, 60, 20);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px Inter';
    ctx.fillText('ACTIVE', box.x + 5, box.y - 12);
  });
};
