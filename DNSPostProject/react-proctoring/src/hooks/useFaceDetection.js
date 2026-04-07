import { useState, useCallback } from 'react';

export const useFaceDetection = (videoElement, isReady) => {
    const [detections, setDetections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lightingWarning, setLightingWarning] = useState(false);

    const initialize = useCallback(async () => {
        try {
            setLoading(true);
            // Load TinyFaceDetector, Landmarks, AND SSD Mobilenet for fallback
            await Promise.all([
                window.faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
                window.faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
                window.faceapi.nets.ssdMobilenetv1.loadFromUri('/models') // fallback model
            ]);
            setLoading(false);
            console.log("AI Models Loaded Successfully");
        } catch (err) {
            console.error("AI Initialization Error:", err);
            setError("Failed to load AI models. Contact admin.");
        }
    }, []);

    // Helper: Check Canvas Brightness
    const checkBrightness = useCallback(() => {
        if (!videoElement) return false;
        try {
            const canvas = document.createElement('canvas');
            canvas.width = 160;
            canvas.height = 120;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            let colorSum = 0;
            for (let x = 0, len = imageData.data.length; x < len; x += 4) {
                // Calculate perceived luminance
                colorSum += 0.299 * imageData.data[x] + 0.587 * imageData.data[x + 1] + 0.114 * imageData.data[x + 2];
            }
            const brightness = colorSum / (canvas.width * canvas.height);
            return brightness < 40; // threshold for "too dark"
        } catch (e) {
            return false;
        }
    }, [videoElement]);

    const detect = useCallback(async () => {
        // Only run if video is loadedmetadata and playing
        if (!isReady || !videoElement || !window.faceapi || !videoElement.videoWidth) return null;
        
        try {
            const options = new window.faceapi.TinyFaceDetectorOptions({
                inputSize: 512, 
                scoreThreshold: 0.3
            });

            let results = await window.faceapi
                .detectAllFaces(videoElement, options)
                .withFaceLandmarks();
            
            // FALLBACK TO SSD MOBILENET IF TINY FAILS to find any face
            if (results.length === 0) {
                const ssdOptions = new window.faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 });
                results = await window.faceapi.detectAllFaces(videoElement, ssdOptions).withFaceLandmarks();
            }
            
            setDetections(results);

            // Periodically check lighting (cheap operation due to downscaling, but don't do it every single frame if not needed)
            if (results.length === 0 && Math.random() < 0.2) {
                setLightingWarning(checkBrightness());
            } else if (results.length > 0) {
                setLightingWarning(false);
            }

            return results;
        } catch (err) {
            console.warn("Detection Loop Error:", err);
            return null;
        }
    }, [videoElement, isReady, checkBrightness]);

    return { detections, loading, error, lightingWarning, initialize, detect };
};
