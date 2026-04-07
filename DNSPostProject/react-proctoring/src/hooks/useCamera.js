import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Hook to manage the webcam stream and metadata loading for reliable face detection
 * @returns { videoRef, stream, isReady, error, startCamera, stopCamera }
 */
export const useCamera = () => {
    const [stream, setStream] = useState(null);
    const [error, setError] = useState(null);
    const [isReady, setIsReady] = useState(false);
    const videoRef = useRef(null);

    const startCamera = useCallback(async () => {
        try {
            // FIXED RESOLUTION 640x480 as required for reliable exact bounding box mapping
            const constraints = {
                video: { width: 640, height: 480 },
                audio: false
            };
            const newStream = await navigator.mediaDevices.getUserMedia(constraints);
            setStream(newStream);
            
            if (videoRef.current) {
                videoRef.current.srcObject = newStream;
                videoRef.current.play();
            }
            return newStream;
        } catch (err) {
            console.error('Webcam Access Failed:', err);
            setError(err.name === 'NotAllowedError' ? 'Permission Denied' : 'Camera Error');
            return null;
        }
    }, []);

    const stopCamera = useCallback(() => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
            setIsReady(false);
        }
    }, [stream]);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const onLoadedMetadata = () => {
            setIsReady(true);
        };

        video.addEventListener('loadedmetadata', onLoadedMetadata);

        return () => {
            if (video) {
                video.removeEventListener('loadedmetadata', onLoadedMetadata);
            }
        };
    }, [stream]);

    return { videoRef, stream, isReady, error, startCamera, stopCamera };
};
