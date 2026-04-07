import { useEffect, useRef, useState, useCallback } from 'react';

import { uploadSnapshot, logWarning } from '../services/supabaseClient';

/**
 * Stable, production-ready hook for AI proctoring using face-api's TinyFaceDetector.
 * Uses a face history buffer and global cooldowns to eliminate false positives.
 */
export const useSimpleProctoring = (userId, examId) => {
    const videoRef = useRef(null);
    const [status, setStatus] = useState('initializing');
    const [warnings, setWarnings] = useState(0);
    const [isAbsent, setIsAbsent] = useState(false);
    const [lastWarning, setLastWarning] = useState("");

    // Stability tracking
    const faceHistory = useRef([]);
    const prevFacePos = useRef(null);
    const consecutiveMovement = useRef(0);
    const sessionActive = useRef(true);
    
    // Cooldown & Startup State
    const lastWarningTime = useRef(0);
    const systemStartTime = useRef(Date.now());
    const detectionCount = useRef(0);

    const HISTORY_SIZE = 10;

    // Helper to capture base64 snapshot from camera
    const captureSnapshot = useCallback(() => {
        if (!videoRef.current) return null;
        try {
            const snap = document.createElement('canvas');
            snap.width = videoRef.current.videoWidth || 640;
            snap.height = videoRef.current.videoHeight || 480;
            const ctx = snap.getContext('2d');
            ctx.drawImage(videoRef.current, 0, 0, snap.width, snap.height);
            return snap.toDataURL('image/png');
        } catch(e) { return null; }
    }, []);

    const checkAndTriggerWarning = useCallback((type, message) => {
        const now = Date.now();
        
        // Strict global cooldown between warnings (8 seconds minimum gap)
        if (now - lastWarningTime.current < 8000) {
            console.log(`[Proctoring] 🛡️ Warning suppressed by strict cooldown (8s gap required). Offense: ${message}`);
            return false;
        }

        console.log(`[Proctoring] 🔥 WARNING TRIGGERED: ${message}`);
        lastWarningTime.current = now; // Set strict cooldown
        
        setWarnings(prev => {
            const next = prev + 1;
            
            // Max 3 warnings allowed to trigger a snapshot and store incident
            if (next <= 3) {
                setLastWarning(message);
                console.warn(`[Proctor Warning Logged] ${message}`);
                
                // Capture snapshot and save asynchronously
                const snapshot = captureSnapshot();
                (async () => {
                    let publicUrl = null;
                    if (snapshot && ['noFace', 'multipleFaces', 'tab_switch', 'movement'].includes(type)) {
                        publicUrl = await uploadSnapshot(snapshot, userId, examId);
                    }
                    await logWarning(userId, examId, message, publicUrl);
                    
                    if (next >= 3) {
                        alert("MAXIMUM WARNINGS REACHED. EXAM WILL AUTO-SUBMIT.");
                        window.location.href = "/student"; // Redirect to auto-submit fallback
                    }
                })();
            }
            return next;
        });

        return true;
    }, [captureSnapshot, userId, examId]);

    // Handle Tab Switches
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden' && status === 'active') {
                checkAndTriggerWarning('tab_switch', 'Tab switched or minimized');
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [status, checkAndTriggerWarning]);

    useEffect(() => {
        const setup = async () => {
            try {
                // Fixed resolution requirement: 640x480
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: 640, height: 480 },
                    audio: false
                });
                
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play();
                }

                // Wait explicitly for video to be fully ready before starting models/detection
                await new Promise(resolve => {
                    if (videoRef.current.readyState >= 1) { 
                        resolve();
                    } else {
                        videoRef.current.onloadedmetadata = () => resolve();
                    }
                });

                // Load highly optimized TinyFaceDetector explicitly
                await window.faceapi.nets.tinyFaceDetector.loadFromUri('/models');
                
                setStatus('active');
                systemStartTime.current = Date.now();
                requestAnimationFrame(runDetection);
                
            } catch (error) {
                console.error("Camera Setup Error:", error);
                setStatus('error');
            }
        };

        const runDetection = async () => {
            if (!sessionActive.current || !videoRef.current) return;

            // Updated stability detection parameters
            const options = new window.faceapi.TinyFaceDetectorOptions({
                inputSize: 512, 
                scoreThreshold: 0.5
            });

            try {
                // STARTUP DELAY: Ignore detection for first 5 seconds
                const timeSinceStart = Date.now() - systemStartTime.current;
                if (timeSinceStart < 5000) {
                    if (detectionCount.current % 30 === 0) {
                        console.log(`[Proctoring] Startup Phase (${(timeSinceStart/1000).toFixed(1)}s / 5.0s)...`);
                    }
                    detectionCount.current++;
                    requestAnimationFrame(runDetection);
                    return;
                }

                const results = await window.faceapi.detectAllFaces(videoRef.current, options);
                detectionCount.current++;
                const faceCount = results.length;

                // Push current detection count into history buffer
                faceHistory.current.push(faceCount);
                if (faceHistory.current.length > HISTORY_SIZE) {
                    faceHistory.current.shift();
                }

                // Debug logs every 30 frames
                if (detectionCount.current % 30 === 0) {
                    console.log(`[Proctoring Debug] Total Frames: ${detectionCount.current} | History Buffer: [${faceHistory.current.join(', ')}]`);
                }

                // Process buffer logic only when history is saturated
                if (faceHistory.current.length === HISTORY_SIZE) {
                    // Tally the conditions in the history buffer
                    const noFaceFrames = faceHistory.current.filter(c => c === 0).length;
                    const multipleFaceFrames = faceHistory.current.filter(c => c > 1).length;

                    if (noFaceFrames >= 7) {
                        // Majority no face
                        setIsAbsent(true);
                        const triggered = checkAndTriggerWarning('noFace', 'No face detected');
                        if (triggered) faceHistory.current = []; // Clear buffer after successfully warning
                        
                        consecutiveMovement.current = 0;
                    } 
                    else if (multipleFaceFrames >= 6) {
                        // Majority multiple faces
                        setIsAbsent(false);
                        const triggered = checkAndTriggerWarning('multipleFaces', 'Multiple faces detected');
                        if (triggered) faceHistory.current = [];
                        
                        consecutiveMovement.current = 0;
                    } 
                    else {
                        // Normal operations
                        setIsAbsent(false);

                        // Only track movement if exactly 1 face is currently detected in this frame
                        if (faceCount === 1) {
                            const faceBox = results[0].box;
                            const currentPos = { x: faceBox.x, y: faceBox.y };
                            
                            if (prevFacePos.current) {
                                const diffX = Math.abs(currentPos.x - prevFacePos.current.x);
                                const diffY = Math.abs(currentPos.y - prevFacePos.current.y);
                                
                                if (diffX > 100 || diffY > 100) {
                                    consecutiveMovement.current++;
                                    if (consecutiveMovement.current >= 4) {
                                        const triggered = checkAndTriggerWarning('movement', 'Excessive head movement');
                                        if (triggered) {
                                            prevFacePos.current = currentPos; // Update base reference
                                        }
                                        consecutiveMovement.current = 0;
                                    }
                                } else {
                                    consecutiveMovement.current = 0;
                                    prevFacePos.current = currentPos; // Update reference when stable
                                }
                            } else {
                                prevFacePos.current = currentPos;
                            }
                        } else {
                            consecutiveMovement.current = 0;
                        }
                    }
                }
            } catch (err) {
                // Ignore transient API errors
            }

            // Loop logic continuous
            requestAnimationFrame(runDetection);
        };

        setup();

        // Cleanup
        return () => {
            sessionActive.current = false;
            if (videoRef.current && videoRef.current.srcObject) {
                videoRef.current.srcObject.getTracks().forEach(track => track.stop());
            }
        };
    }, [checkAndTriggerWarning]);

    return {
        videoRef,
        status,
        warnings,
        isAbsent,
        lastWarning
    };
};

