import { useEffect, useRef, useState, useCallback } from 'react';
import { useCamera } from './useCamera';
import { useFaceDetection } from './useFaceDetection';
import { useWarnings } from './useWarnings';

export const useProctoring = (userId, examId) => {
    const { videoRef, stream, isReady: videoReady, error: cameraError, startCamera } = useCamera();
    const { loading: aiLoading, error: aiError, lightingWarning, initialize, detect } = useFaceDetection(videoRef.current, videoReady);
    const { warningCount, triggerWarning } = useWarnings(userId, examId);
    
    const [status, setStatus] = useState('initializing');
    const [absentFrames, setAbsentFrames] = useState(0);
    const requestRef = useRef();
    const sessionActive = useRef(true);

    const captureSnapshot = useCallback(() => {
        if (!videoRef.current) return null;
        try {
            const snap = document.createElement('canvas');
            snap.width = 640;
            snap.height = 480;
            const ctx = snap.getContext('2d');
            ctx.translate(snap.width, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(videoRef.current, 0, 0, snap.width, snap.height);
            return snap.toDataURL('image/jpeg', 0.5);
        } catch(e) { return null; }
    }, [videoRef]);

    useEffect(() => {
        const setup = async () => {
            await startCamera();
            await initialize();
            setStatus('active');
        };
        setup();
    }, [startCamera, initialize]);

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden' && status === 'active') {
                triggerWarning('tab_switch', captureSnapshot());
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [status, triggerWarning, captureSnapshot]);

    const proctorLoop = useCallback(async () => {
        if (!sessionActive.current || !videoRef.current || !videoReady) {
            requestRef.current = requestAnimationFrame(proctorLoop);
            return;
        }

        const results = await detect();
        
        if (results) {
            if (results.length === 0) {
                setAbsentFrames((f) => {
                    const newFrames = f + 1;
                    // Trigger if 3-5 consecutive frames fail
                    if (newFrames >= 5) { 
                        triggerWarning('no_face', captureSnapshot());
                        return 0; 
                    }
                    return newFrames;
                });
            } else if (results.length > 1) {
                triggerWarning('multiple_faces', captureSnapshot());
                setAbsentFrames(0);
            } else {
                setAbsentFrames(0);
            }
        }

        requestRef.current = requestAnimationFrame(proctorLoop);
    }, [detect, videoRef, videoReady, triggerWarning, captureSnapshot]);

    useEffect(() => {
        if (status === 'active') {
            requestRef.current = requestAnimationFrame(proctorLoop);
        }
        return () => cancelAnimationFrame(requestRef.current);
    }, [status, proctorLoop]);

    useEffect(() => {
        return () => { sessionActive.current = false; };
    }, []);

    return {
        videoRef,
        warnings: warningCount,
        status,
        lightingWarning,
        loading: aiLoading,
        error: cameraError || aiError,
        isAbsent: absentFrames > 3,
    };
};
