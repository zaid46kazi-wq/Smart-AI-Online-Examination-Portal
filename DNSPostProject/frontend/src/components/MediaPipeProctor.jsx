import React, { useEffect, useRef, useState } from 'react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import { apiFetch } from '../services/api';

const DEFAULT_AI_SETTINGS = {
    max_warnings: 3,
    auto_submit_enabled: 1,
    face_timeout_seconds: 5,
    head_yaw_left_deg: 22,
    head_yaw_right_deg: 22,
    head_pitch_up_deg: 18,
    head_pitch_down_deg: 18,
    head_pose_hold_time_sec: 1.5,
    head_yaw_threshold_deg: 22,
    head_pitch_threshold_deg: 18,
    eye_gaze_max_duration_sec: 3.0,
    eye_gaze_side_glance_limit: 3,
    eye_gaze_confidence_threshold: 0.80,
    eye_blink_duration_thresh_sec: 3.0,
    eye_tracking_sensitivity: 'medium',
    eye_gaze_threshold: 0.12,
    phone_confidence_threshold: 0.50,
    phone_detection_interval_ms: 600,
    phone_repeat_limit: 2,
    max_allowed_faces: 1,
    multiple_faces_duration_sec: 1.0,
    allowed_tab_switches: 1,
    max_fullscreen_exits: 2,
    enable_ctrl_c: 1,
    enable_ctrl_v: 1,
    enable_ctrl_a: 1,
    enable_ctrl_p: 1,
    enable_ctrl_s: 1,
    enable_ctrl_shift_i: 1,
    enable_ctrl_shift_j: 1,
    enable_ctrl_u: 1,
    enable_f12: 1,
    enable_right_click: 1,
    screenshot_quality: 0.70,
    risk_weights: {
        LOOKING_AWAY: 10,
        RAPID_SIDE_GLANCES: 15,
        EYES_CLOSED_LONG: 20,
        HEAD_YAW: 10,
        HEAD_PITCH: 10,
        FACE_MISSING: 20,
        MULTIPLE_FACES: 40,
        PHONE_DETECTED: 30,
        TAB_SWITCH: 15,
        FULLSCREEN_EXIT: 10,
        KEYBOARD_SHORTCUT: 5,
        RIGHT_CLICK: 5
    }
};

const mergeSafeSettings = (incoming) => {
    if (!incoming || typeof incoming !== 'object') return DEFAULT_AI_SETTINGS;
    return {
        ...DEFAULT_AI_SETTINGS,
        ...incoming,
        risk_weights: {
            ...DEFAULT_AI_SETTINGS.risk_weights,
            ...(incoming.risk_weights && typeof incoming.risk_weights === 'object' ? incoming.risk_weights : {})
        }
    };
};

export function MediaPipeProctor({ examId, onViolation, onAutoSubmit, onIdentityVerified, initViolations = 0 }) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    
    // Model States
    const [landmarker, setLandmarker] = useState(null);
    const [cocoModel, setCocoModel] = useState(null);
    const [loading, setLoading] = useState(true);
    const [active, setActive] = useState(false);
    
    // Level 1: Pre-Exam Identity Verification States
    const [isVerifyingIdentity, setIsVerifyingIdentity] = useState(false);
    const [identityProgress, setIdentityProgress] = useState(0);
    const [identityVerified, setIdentityVerified] = useState(false);
    const [identityError, setIdentityError] = useState('');
    
    // Proctoring UI States
    const [statusText, setStatusText] = useState('AI INITIALIZING');
    const [statusColor, setStatusColor] = useState('#10B981');
    const [moveWarnings, setMoveWarnings] = useState(initViolations);
    const [micLevel, setMicLevel] = useState(0);
    const [incidents, setIncidents] = useState([]);
    const [isViolated, setIsViolated] = useState(false);
    
    // Level 11: AI Risk Score (0-100)
    const [riskScore, setRiskScore] = useState(0);
    const [riskCategory, setRiskCategory] = useState('LOW');
    const [riskColor, setRiskColor] = useState('#10B981');

    // Level 13: Configurable Settings State
    const [settings, setSettings] = useState(DEFAULT_AI_SETTINGS);

    // Dynamic Refs for Loop Safety & Cleanup
    const activeRef = useRef(false);
    const isViolatedRef = useRef(false);
    const streamRef = useRef(null);
    const audioCtxRef = useRef(null);
    const animFrameRef = useRef(null);
    const audioAnimFrameRef = useRef(null);
    const cocoIntervalRef = useRef(null);

    // Debug Mode Telemetry
    const [isDebugMode, setIsDebugMode] = useState(false);
    const debugDataRef = useRef({ fps: 0, faceCount: 0, faceConf: 0, yaw: 0, pitch: 0, roll: 0, eyeDir: 'CENTER', phoneConf: 0 });
    const lastFpsTimeRef = useRef(performance.now());
    const frameCountRef = useRef(0);

    // Detection History & Smoothing Buffers (Level 10)
    const absentFramesRef = useRef(0);
    const headAwayFramesRef = useRef(0);
    const gazeAwayFramesRef = useRef(0);
    const eyesClosedFramesRef = useRef(0);
    const multiFaceFramesRef = useRef(0);
    const phoneFramesRef = useRef(0);
    const lastGazeDirRef = useRef('LOOKING_CENTER');
    const sideGlanceCountRef = useRef(0);

    const identityStableTimerRef = useRef(0);
    const lastViolationTypeRef = useRef(null);
    const lastViolationTimeRef = useRef(0);

    // Keep active & status refs synchronized
    useEffect(() => { activeRef.current = active; }, [active]);
    useEffect(() => { isViolatedRef.current = isViolated; }, [isViolated]);

    // Load AI Proctoring Settings from Server with Safe Default Fallback
    useEffect(() => {
        let isCancelled = false;
        const fetchPromise = apiFetch('/api/proctor/settings');
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Settings fetch timeout')), 1500));

        Promise.race([fetchPromise, timeoutPromise])
            .then(data => {
                if (!isCancelled && data && typeof data === 'object') {
                    setSettings(mergeSafeSettings(data));
                }
            })
            .catch(err => {
                console.warn('[AI Engine] Settings load fallback to safe defaults:', err.message);
                if (!isCancelled) setSettings(DEFAULT_AI_SETTINGS);
            });

        return () => { isCancelled = true; };
    }, []);

    // Cleanup Media Streams, Contexts, and Animation Loops on Unmount
    useEffect(() => {
        return () => {
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
            if (audioAnimFrameRef.current) cancelAnimationFrame(audioAnimFrameRef.current);
            if (cocoIntervalRef.current) clearInterval(cocoIntervalRef.current);
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
            if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
                audioCtxRef.current.close().catch(() => {});
            }
        };
    }, []);

    // Initialize MediaPipe & TensorFlow.js COCO-SSD Models
    useEffect(() => {
        let isMounted = true;
        async function initAIModels() {
            try {
                // Initialize MediaPipe Face Landmarker
                const filesetResolver = await FilesetResolver.forVisionTasks(
                    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
                );
                const landmarkerInstance = await FaceLandmarker.createFromOptions(filesetResolver, {
                    baseOptions: {
                        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
                        delegate: "GPU"
                    },
                    runningMode: "VIDEO",
                    numFaces: 3,
                    outputFaceBlendshapes: true
                });

                // Initialize TensorFlow.js COCO-SSD Object Detector
                await tf.ready();
                const cocoInstance = await cocoSsd.load({ base: 'lite_mobilenet_v2' });

                if (isMounted) {
                    setLandmarker(landmarkerInstance);
                    setCocoModel(cocoInstance);
                    setLoading(false);
                    setStatusText('READY FOR AUDIT');
                }
            } catch (err) {
                console.error('[AI] Model Initialization Failed:', err);
                if (isMounted) {
                    setStatusText('AI MODEL ERROR');
                    setLoading(false);
                }
            }
        }
        initAIModels();
        return () => { isMounted = false; };
    }, []);

    // Auto-Start Identity Verification once AI Models are Loaded
    useEffect(() => {
        if (!loading && landmarker && !active && !identityVerified && !isVerifyingIdentity) {
            startIdentityVerification();
        }
    }, [loading, landmarker]);

    // Handle Camera Disconnections
    const attachCameraListeners = (stream) => {
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
            videoTrack.onended = () => {
                setStatusText('CAMERA DISCONNECTED');
                setStatusColor('#EF4444');
                setIdentityError('Camera disconnected. Please reconnect your camera to resume monitoring.');
                triggerViolation('CAMERA_DISCONNECTED', 'Camera stream disconnected or unplugged', settings.risk_weights.FACE_MISSING || 20);
            };
        }
    };

    // Level 1: Pre-Exam Identity Verification Process (Auto-Triggered)
    const startIdentityVerification = async () => {
        if (!landmarker) return;
        setLoading(true);
        setIdentityError('');

        try {
            // Request Fullscreen Mode
            if (!document.fullscreenElement) {
                await document.documentElement.requestFullscreen().catch(() => {});
            }

            let stream;
            try {
                stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 }, audio: true });
            } catch (_) {
                stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 } });
            }
            streamRef.current = stream;
            attachCameraListeners(stream);

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play().catch(() => {});
            }

            setupAudio(stream);
            setIsVerifyingIdentity(true);
            setLoading(false);
            setStatusText('VERIFYING IDENTITY');

            // Execute 3-Second Face Stability & Quality Verification Loop
            let startTime = null;
            const checkStability = () => {
                if (!videoRef.current || !landmarker) return;
                const video = videoRef.current;
                
                // Lighting / Quality Check
                try {
                    const sampleCanvas = document.createElement('canvas');
                    sampleCanvas.width = 160; sampleCanvas.height = 120;
                    const sampleCtx = sampleCanvas.getContext('2d');
                    sampleCtx.drawImage(video, 0, 0, 160, 120);
                    const imgData = sampleCtx.getImageData(0, 0, 160, 120);
                    let brightnessSum = 0;
                    for (let i = 0; i < imgData.data.length; i += 4) {
                        brightnessSum += (imgData.data[i] + imgData.data[i+1] + imgData.data[i+2]) / 3;
                    }
                    const avgBrightness = brightnessSum / (imgData.data.length / 4);

                    if (avgBrightness < 25) {
                        startTime = null;
                        setIdentityProgress(0);
                        setIdentityError('Poor lighting detected. Please move to a brighter room.');
                        requestAnimationFrame(checkStability);
                        return;
                    }
                } catch (_) {}

                const results = landmarker.detectForVideo(video, performance.now());

                if (!results.faceLandmarks || results.faceLandmarks.length === 0) {
                    startTime = null;
                    setIdentityProgress(0);
                    setIdentityError('No face detected. Position your face clearly in the camera frame.');
                    requestAnimationFrame(checkStability);
                } else if (results.faceLandmarks.length > 1) {
                    startTime = null;
                    setIdentityProgress(0);
                    setIdentityError('Multiple faces detected. Ensure only you are visible.');
                    requestAnimationFrame(checkStability);
                } else {
                    if (!startTime) startTime = performance.now();
                    const elapsed = performance.now() - startTime;
                    const pct = Math.min(100, Math.round((elapsed / 3000) * 100));
                    setIdentityProgress(pct);
                    setIdentityError('');

                    if (elapsed >= 3000) {
                        // Level 1 Verification Passed -> Capture Reference Snapshot
                        const snapshot = captureSnapshot(0.7);
                        setIdentityVerified(true);
                        setIsVerifyingIdentity(false);
                        setActive(true);
                        activeRef.current = true;
                        setStatusText('AI SECURE TRACKING');

                        apiFetch('/api/proctor/verify-identity', {
                            method: 'POST',
                            body: JSON.stringify({ exam_id: parseInt(examId), image_data: snapshot })
                        }).catch(() => {});

                        if (onIdentityVerified) onIdentityVerified(snapshot);

                        // Launch Continuous Proctoring Loops
                        startContinuousProctoring();
                        return;
                    }
                    requestAnimationFrame(checkStability);
                }
            };
            requestAnimationFrame(checkStability);
        } catch (err) {
            console.error('[AI] Camera Access Denied:', err);
            setIdentityError('Camera permission denied. Please grant camera access to begin the exam.');
            setStatusText('CAMERA PERMISSION DENIED');
            setStatusColor('#EF4444');
            setLoading(false);
        }
    };

    // Level 7, 8, 9: Security Event Listeners (Tab Switch, Fullscreen, Keyboard Shortcuts)
    useEffect(() => {
        if (!active) return;

        // Level 7: Tab Switch / Window Blur
        const handleVisibilityChange = () => {
            if (document.hidden) {
                triggerViolation('TAB_SWITCH', 'Student switched tabs or minimized browser window', settings.risk_weights.TAB_SWITCH || 15);
            }
        };

        const handleWindowBlur = () => {
            triggerViolation('WINDOW_BLUR', 'Student unfocused examination window', settings.risk_weights.TAB_SWITCH || 15);
        };

        // Level 8: Fullscreen Enforcement
        const handleFullscreenChange = () => {
            if (!document.fullscreenElement && activeRef.current) {
                triggerViolation('FULLSCREEN_EXIT', 'Student exited forced fullscreen mode', settings.risk_weights.FULLSCREEN_EXIT || 10);
            }
        };

        // Level 9: Keyboard Shortcut & Right Click Prevention
        const handleKeyDown = (e) => {
            // Debug Mode Toggle (Ctrl+Shift+D)
            if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd') {
                e.preventDefault();
                setIsDebugMode(prev => !prev);
                return false;
            }

            const forbiddenKeys = ['F12'];
            const forbiddenCombos = [
                (e.ctrlKey || e.metaKey) && ['c', 'v', 'a', 's', 'p', 'u'].includes(e.key.toLowerCase()),
                (e.ctrlKey || e.metaKey) && e.shiftKey && ['i', 'j', 'c'].includes(e.key.toLowerCase())
            ];

            if (forbiddenKeys.includes(e.key) || forbiddenCombos.some(Boolean)) {
                e.preventDefault();
                e.stopPropagation();
                triggerViolation('KEYBOARD_SHORTCUT', `Attempted prohibited key combination (${e.key})`, settings.risk_weights.KEYBOARD_SHORTCUT || 5);
                return false;
            }
        };

        const handleContextMenu = (e) => {
            e.preventDefault();
            triggerViolation('RIGHT_CLICK', 'Attempted context menu / right click', settings.risk_weights.RIGHT_CLICK || 5);
            return false;
        };

        const handleCopyPaste = (e) => {
            e.preventDefault();
            triggerViolation('COPY_PASTE', 'Attempted clipboard copy/paste operation', settings.risk_weights.KEYBOARD_SHORTCUT || 5);
            return false;
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('blur', handleWindowBlur);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        window.addEventListener('keydown', handleKeyDown, true);
        document.addEventListener('contextmenu', handleContextMenu, true);
        document.addEventListener('copy', handleCopyPaste, true);
        document.addEventListener('paste', handleCopyPaste, true);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('blur', handleWindowBlur);
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            window.removeEventListener('keydown', handleKeyDown, true);
            document.removeEventListener('contextmenu', handleContextMenu, true);
            document.removeEventListener('copy', handleCopyPaste, true);
            document.removeEventListener('paste', handleCopyPaste, true);
        };
    }, [active, settings]);

    // Audio Analysis Setup
    const setupAudio = (stream) => {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            audioCtxRef.current = ctx;
            if (ctx.state === 'suspended') ctx.resume().catch(() => {});
            const analyser = ctx.createAnalyser();
            ctx.createMediaStreamSource(stream).connect(analyser);
            const data = new Uint8Array(analyser.frequencyBinCount);

            const tick = () => {
                if (audioCtxRef.current && audioCtxRef.current.state === 'closed') return;
                analyser.getByteFrequencyData(data);
                const avg = data.reduce((a, b) => a + b, 0) / data.length;
                const pct = Math.min(100, Math.round(avg * 2.5));
                setMicLevel(pct);
                audioAnimFrameRef.current = requestAnimationFrame(tick);
            };
            tick();
        } catch (_) {}
    };

    // Helper: Capture Evidence Snapshot
    const captureSnapshot = (quality = settings.screenshot_quality || 0.5) => {
        if (!videoRef.current) return null;
        try {
            const canvas = document.createElement('canvas');
            canvas.width = 480;
            canvas.height = 360;
            const ctx = canvas.getContext('2d');
            ctx.translate(480, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(videoRef.current, 0, 0, 480, 360);
            return canvas.toDataURL('image/jpeg', quality);
        } catch (_) {
            return null;
        }
    };

    const logIncidentText = (text) => {
        setIncidents(prev => [`[${new Date().toLocaleTimeString()}] ${text}`, ...prev.slice(0, 25)]);
    };

    // Unified Violation Trigger & Live Risk Score Evaluator (Level 11 & 12)
    const triggerViolation = (type, msg, scoreWeight = 10, confidence = 0.95) => {
        if (lastViolationTypeRef.current === type && Date.now() - lastViolationTimeRef.current < 4000) return;
        lastViolationTypeRef.current = type;
        lastViolationTimeRef.current = Date.now();

        // Update Risk Score (Level 11)
        setRiskScore(prevScore => {
            const nextScore = Math.min(100, prevScore + scoreWeight);
            let cat = 'LOW'; let col = '#10B981';
            if (nextScore >= 76) { cat = 'CRITICAL'; col = '#EF4444'; }
            else if (nextScore >= 51) { cat = 'HIGH'; col = '#F97316'; }
            else if (nextScore >= 26) { cat = 'MODERATE'; col = '#F59E0B'; }
            
            setRiskCategory(cat);
            setRiskColor(col);
            return nextScore;
        });

        setMoveWarnings(prev => {
            const nextVal = prev + 1;
            logIncidentText(`${type}: ${msg} (Warning ${nextVal}/${settings.max_warnings})`);

            const snapshot = captureSnapshot();
            
            // Persist Evidence Record to MySQL (Level 12)
            apiFetch('/api/flag-violation', {
                method: 'POST',
                body: JSON.stringify({
                    exam_id: parseInt(examId),
                    violation_type: type,
                    confidence,
                    risk_score: scoreWeight,
                    details: { message: msg, warning_count: nextVal },
                    image_data: snapshot
                })
            }).catch(() => {});

            if (onViolation) onViolation(type, msg, nextVal);

            // Auto-Submit Exam if Max Warnings Exceeded
            if (settings.auto_submit_enabled && nextVal >= settings.max_warnings) {
                if (onAutoSubmit) onAutoSubmit(`AI_PROCTOR_SECURITY: ${type} — Exceeded max warning limit (${settings.max_warnings})`);
            }

            return nextVal;
        });
    };

    // Level 3: 3D Head Pose Angle Calculation (Yaw, Pitch, Roll)
    const calculateHeadPose = (landmarks) => {
        const nose = landmarks[1];
        const chin = landmarks[152];
        const leftEye = landmarks[33];
        const rightEye = landmarks[263];

        const midEyeX = (leftEye.x + rightEye.x) / 2;
        const midEyeY = (leftEye.y + rightEye.y) / 2;

        // Yaw (Left / Right Rotation in Degrees)
        const yaw = Math.round((nose.x - midEyeX) * 220);
        // Pitch (Up / Down Rotation in Degrees)
        const pitch = Math.round((nose.y - (midEyeY + (chin.y - midEyeY) * 0.4)) * 180);
        
        // Roll (Tilt Left / Right in Degrees)
        const dx = rightEye.x - leftEye.x;
        const dy = rightEye.y - leftEye.y;
        const roll = Math.round(Math.atan2(dy, dx) * (180 / Math.PI));

        return { yaw, pitch, roll };
    };

    // Level 4: Advanced Eye Tracking & Iris Gaze Estimation
    const calculateEyeMetrics = (landmarks) => {
        // Eye Aspect Ratio (EAR) for Eye Closure Detection
        const leftVertical = Math.hypot(landmarks[159].x - landmarks[145].x, landmarks[159].y - landmarks[145].y);
        const leftHorizontal = Math.hypot(landmarks[33].x - landmarks[133].x, landmarks[33].y - landmarks[133].y);
        const leftEAR = leftVertical / (leftHorizontal || 1);

        const rightVertical = Math.hypot(landmarks[386].x - landmarks[374].x, landmarks[386].y - landmarks[374].y);
        const rightHorizontal = Math.hypot(landmarks[362].x - landmarks[263].x, landmarks[362].y - landmarks[263].y);
        const rightEAR = rightVertical / (rightHorizontal || 1);

        const avgEAR = (leftEAR + rightEAR) / 2;
        const isEyesClosed = avgEAR < 0.14;

        // Iris Landmark Tracking (Landmarks 468-472 Left Iris, 473-477 Right Iris)
        const leftIris = landmarks[468] || landmarks[1];
        const rightIris = landmarks[473] || landmarks[1];

        // Horizontal Iris Offset Relative to Eye Corners
        const leftEyeWidth = (landmarks[133].x - landmarks[33].x) || 1;
        const leftIrisOffset = (leftIris.x - landmarks[33].x) / leftEyeWidth; // 0.5 is center

        const rightEyeWidth = (landmarks[263].x - landmarks[362].x) || 1;
        const rightIrisOffset = (landmarks[263].x - rightIris.x) / rightEyeWidth;

        const horizOffset = ((leftIrisOffset + rightIrisOffset) / 2) - 0.5;

        // Dynamic Sensitivity Map
        let sensitivityThresh = parseFloat(settings.eye_gaze_threshold) || 0.12;
        if (settings.eye_tracking_sensitivity === 'high') sensitivityThresh = 0.08;
        if (settings.eye_tracking_sensitivity === 'low') sensitivityThresh = 0.18;

        let gazeDirection = 'LOOKING_CENTER';
        if (horizOffset > sensitivityThresh) gazeDirection = 'LOOKING_RIGHT';
        else if (horizOffset < -sensitivityThresh) gazeDirection = 'LOOKING_LEFT';

        const confidence = Math.min(0.99, Math.max(0.70, 1 - Math.abs(horizOffset)));

        return { avgEAR, isEyesClosed, gazeDirection, horizOffset, confidence };
    };

    // Main Loop: MediaPipe Face Landmarker & Vision Auditing Loop
    const startContinuousProctoring = () => {
        let lastVideoTime = -1;

        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        if (cocoIntervalRef.current) clearInterval(cocoIntervalRef.current);

        // Level 6: Asynchronous Mobile Phone Detection Loop (TF.js COCO-SSD)
        if (cocoModel) {
            const intervalMs = parseInt(settings.phone_detection_interval_ms) || 600;
            const confThresh = parseFloat(settings.phone_confidence_threshold) || 0.50;
            const repeatLimit = parseInt(settings.phone_repeat_limit) || 2;

            cocoIntervalRef.current = setInterval(async () => {
                if (!videoRef.current || !activeRef.current) return;
                try {
                    const predictions = await cocoModel.detect(videoRef.current);
                    const phoneRaw = predictions.find(p => p.class === 'cell phone');
                    if (debugDataRef.current) debugDataRef.current.phoneConf = phoneRaw ? Math.round(phoneRaw.score * 100) : 0;
                    
                    const phone = predictions.find(p => p.class === 'cell phone' && p.score >= confThresh);
                    if (phone) {
                        phoneFramesRef.current++;
                        if (phoneFramesRef.current >= repeatLimit) {
                            setIsViolated(true);
                            setStatusText('MOBILE PHONE DETECTED');
                            setStatusColor('#EF4444');
                            triggerViolation('PHONE_DETECTED', `Mobile phone detected in camera view (${Math.round(phone.score * 100)}% confidence)`, settings.risk_weights.PHONE_DETECTED || 30, phone.score);
                            phoneFramesRef.current = 0;
                        }
                    } else {
                        phoneFramesRef.current = 0;
                    }
                } catch (_) {}
            }, intervalMs);
        }

        // Render Frame Loop
        const render = () => {
            if (!videoRef.current || !canvasRef.current || !activeRef.current) return;
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');

            if (video.currentTime !== lastVideoTime && landmarker) {
                lastVideoTime = video.currentTime;
                
                // Telemetry: Calculate FPS
                frameCountRef.current++;
                const now = performance.now();
                if (now - lastFpsTimeRef.current >= 1000) {
                    if (debugDataRef.current) debugDataRef.current.fps = frameCountRef.current;
                    frameCountRef.current = 0;
                    lastFpsTimeRef.current = now;
                }

                const results = landmarker.detectForVideo(video, performance.now());
                if (debugDataRef.current) debugDataRef.current.faceCount = results.faceLandmarks ? results.faceLandmarks.length : 0;

                ctx.clearRect(0, 0, canvas.width, canvas.height);

                // Dynamic Timeout Settings
                const faceTimeoutSec = parseFloat(settings.face_timeout_seconds) || 5;

                // Level 2: Face Missing / Camera Blocked Detection
                if (!results.faceLandmarks || results.faceLandmarks.length === 0) {
                    absentFramesRef.current++;
                    headAwayFramesRef.current = 0;
                    gazeAwayFramesRef.current = 0;

                    const absentTimeSec = Math.round(absentFramesRef.current * 0.1);
                    if (absentTimeSec < 2) {
                        setStatusText('SEARCHING FACE...');
                        setStatusColor('#F59E0B');
                    } else if (absentTimeSec < faceTimeoutSec) {
                        setStatusText('SUSPICIOUS: FACE ABSENT');
                        setStatusColor('#F97316');
                    } else {
                        setIsViolated(true);
                        setStatusText('FACE ABSENT VIOLATION');
                        setStatusColor('#EF4444');
                        triggerViolation('FACE_MISSING', `Candidate face absent from camera frame for >${faceTimeoutSec}s`, settings.risk_weights.FACE_MISSING || 20);
                        absentFramesRef.current = 0;
                    }
                } 
                // Level 5: Multiple Faces Detection
                else if (results.faceLandmarks.length > (parseInt(settings.max_allowed_faces) || 1)) {
                    absentFramesRef.current = 0;
                    multiFaceFramesRef.current++;
                    const multiFaceHoldFrames = Math.round((parseFloat(settings.multiple_faces_duration_sec) || 1.0) * 10);
                    if (multiFaceFramesRef.current >= multiFaceHoldFrames) {
                        setIsViolated(true);
                        setStatusText('MULTIPLE FACES DETECTED');
                        setStatusColor('#EF4444');
                        triggerViolation('MULTIPLE_FACES', `${results.faceLandmarks.length} faces detected in examination area`, settings.risk_weights.MULTIPLE_FACES || 40);
                        multiFaceFramesRef.current = 0;
                    }
                } 
                // Exactly 1 Face Detected
                else {
                    absentFramesRef.current = 0;
                    multiFaceFramesRef.current = 0;
                    const landmarks = results.faceLandmarks[0];

                    // Level 3: Head Pose Angle Analysis
                    const { yaw, pitch, roll } = calculateHeadPose(landmarks);
                    if (debugDataRef.current) {
                        debugDataRef.current.yaw = yaw;
                        debugDataRef.current.pitch = pitch;
                        debugDataRef.current.roll = roll;
                    }
                    const yawLeftMax = parseFloat(settings.head_yaw_left_deg || settings.head_yaw_threshold_deg) || 22;
                    const yawRightMax = parseFloat(settings.head_yaw_right_deg || settings.head_yaw_threshold_deg) || 22;
                    const pitchUpMax = parseFloat(settings.head_pitch_up_deg || settings.head_pitch_threshold_deg) || 18;
                    const pitchDownMax = parseFloat(settings.head_pitch_down_deg || settings.head_pitch_threshold_deg) || 18;
                    const headHoldFrames = Math.round((parseFloat(settings.head_pose_hold_time_sec) || 1.5) * 10);

                    const isHeadTurned = yaw > yawRightMax || yaw < -yawLeftMax || pitch < -pitchUpMax || pitch > pitchDownMax;

                    if (isHeadTurned) {
                        headAwayFramesRef.current++;
                        if (headAwayFramesRef.current >= headHoldFrames) {
                            setIsViolated(true);
                            const dir = yaw > yawRightMax ? 'RIGHT' : yaw < -yawLeftMax ? 'LEFT' : pitch > pitchDownMax ? 'DOWN' : 'UP';
                            setStatusText(`HEAD TURNED (${dir})`);
                            setStatusColor('#EF4444');
                            triggerViolation('HEAD_POSE', `Head turned ${dir} outside threshold (${yaw}°, ${pitch}°)`, settings.risk_weights.HEAD_YAW || 10);
                            headAwayFramesRef.current = 0;
                        }
                    } else {
                        headAwayFramesRef.current = 0;
                    }

                    // Level 4: Advanced Eye Gaze & Eye Closure Analysis
                    const { isEyesClosed, gazeDirection, confidence, horizOffset } = calculateEyeMetrics(landmarks);
                    if (debugDataRef.current) {
                        debugDataRef.current.eyeDir = gazeDirection;
                        debugDataRef.current.faceConf = Math.round(confidence * 100);
                    }
                    const gazeHoldFrames = Math.round((parseFloat(settings.eye_gaze_max_duration_sec) || 3.0) * 10);
                    const blinkHoldFrames = Math.round((parseFloat(settings.eye_blink_duration_thresh_sec) || 3.0) * 10);

                    if (isEyesClosed) {
                        eyesClosedFramesRef.current++;
                        if (eyesClosedFramesRef.current >= blinkHoldFrames) {
                            setIsViolated(true);
                            setStatusText('EYES CLOSED LONG DURATION');
                            setStatusColor('#EF4444');
                            triggerViolation('EYES_CLOSED_LONG', 'Eyes closed continuously beyond threshold duration', settings.risk_weights.EYES_CLOSED_LONG || 20, confidence);
                            eyesClosedFramesRef.current = 0;
                        }
                    } else {
                        eyesClosedFramesRef.current = 0;
                    }

                    if (gazeDirection !== 'LOOKING_CENTER') {
                        gazeAwayFramesRef.current++;
                        
                        // Check Rapid Side Glances (Left/Right Flip Detection)
                        if (lastGazeDirRef.current !== gazeDirection && gazeDirection !== 'LOOKING_CENTER') {
                            sideGlanceCountRef.current++;
                            lastGazeDirRef.current = gazeDirection;

                            if (sideGlanceCountRef.current >= (parseInt(settings.eye_gaze_side_glance_limit) || 3)) {
                                setIsViolated(true);
                                setStatusText('RAPID SIDE GLANCES DETECTED');
                                setStatusColor('#F97316');
                                triggerViolation('RAPID_SIDE_GLANCES', `Repeated rapid side glances (${sideGlanceCountRef.current} flips)`, settings.risk_weights.RAPID_SIDE_GLANCES || 15, confidence);
                                sideGlanceCountRef.current = 0;
                            }
                        }

                        if (gazeAwayFramesRef.current >= gazeHoldFrames) {
                            setIsViolated(true);
                            setStatusText(`GAZE AWAY (${gazeDirection})`);
                            setStatusColor('#F97316');
                            triggerViolation('LOOKING_AWAY', `Sustained eye gaze away (${gazeDirection})`, settings.risk_weights.LOOKING_AWAY || 10, confidence);
                            gazeAwayFramesRef.current = 0;
                        }
                    } else {
                        gazeAwayFramesRef.current = 0;
                        lastGazeDirRef.current = 'LOOKING_CENTER';
                    }

                    if (!isHeadTurned && !isEyesClosed && Math.abs(horizOffset) <= settings.eye_gaze_threshold) {
                        setIsViolated(false);
                        setStatusText('AI SECURE TRACKING');
                        setStatusColor('#10B981');
                    }

                    // Draw MediaPipe Face Mesh & Box Overlay
                    const violated = isViolatedRef.current;
                    ctx.strokeStyle = violated ? '#EF4444' : '#10B981';
                    ctx.lineWidth = 1.5;

                    landmarks.forEach(pt => {
                        ctx.beginPath();
                        ctx.arc(pt.x * canvas.width, pt.y * canvas.height, 0.8, 0, 2 * Math.PI);
                        ctx.fillStyle = violated ? '#EF4444' : '#10B981';
                        ctx.fill();
                    });
                }
            }

            animFrameRef.current = requestAnimationFrame(render);
        };

        animFrameRef.current = requestAnimationFrame(render);
    };

    return (
        <aside className="sidebar" style={{ width: 340, left: 'auto', right: 0, top: 64, height: 'calc(100vh - 64px)', background: '#0F172A', color: 'white', borderLeft: '1px solid #1E293B', zIndex: 40, display: 'flex', flexDirection: 'column' }}>
            {/* Camera Viewport Container */}
            <div style={{ padding: 16, background: '#020617', position: 'relative' }}>
                <div style={{ position: 'relative', aspectRatio: '16/9', borderRadius: 12, overflow: 'hidden', border: '2px solid #334155', background: 'black' }}>
                    <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', opacity: 0.9 }}></video>
                    <canvas ref={canvasRef} width={480} height={360} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', transform: 'scaleX(-1)' }}></canvas>
                    
                    {/* Level 14: AI Live Telemetry Overlay (Debug Mode) */}
                    {isDebugMode && (
                        <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', border: '1px solid #6366F1', borderRadius: 6, padding: '8px 12px', fontSize: 10, color: '#38BDF8', fontFamily: 'monospace', zIndex: 60, width: 140 }}>
                            <div style={{ color: '#F8FAFC', fontWeight: 900, marginBottom: 4, textAlign: 'center', borderBottom: '1px solid #334155', paddingBottom: 4 }}>AI TELEMETRY</div>
                            <div className="flex justify-between"><span>FPS:</span> <span>{debugDataRef.current?.fps}</span></div>
                            <div className="flex justify-between"><span>FACES:</span> <span>{debugDataRef.current?.faceCount}</span></div>
                            <div className="flex justify-between"><span>CONF:</span> <span>{debugDataRef.current?.faceConf}%</span></div>
                            <div className="flex justify-between"><span>YAW:</span> <span>{debugDataRef.current?.yaw}°</span></div>
                            <div className="flex justify-between"><span>PITCH:</span> <span>{debugDataRef.current?.pitch}°</span></div>
                            <div className="flex justify-between"><span>ROLL:</span> <span>{debugDataRef.current?.roll}°</span></div>
                            <div className="flex justify-between"><span>GAZE:</span> <span>{debugDataRef.current?.eyeDir.replace('LOOKING_', '')}</span></div>
                            <div className="flex justify-between"><span>PHONE:</span> <span>{debugDataRef.current?.phoneConf}%</span></div>
                        </div>
                    )}

                    {/* Level 1: Pre-Exam Verification Gate Overlay */}
                    {!active && (
                        <div id="startOverlay" style={{ position: 'absolute', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20, textAlign: 'center', background: 'rgba(15,23,42,0.96)', backdropFilter: 'blur(12px)' }}>
                            <div style={{ width: 44, height: 44, background: 'rgba(99,102,241,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8, border: '1px solid rgba(99,102,241,0.3)' }}>
                                <span className="material-symbols-outlined animate-pulse" style={{ color: '#818CF8', fontSize: 24 }}>fingerprint</span>
                            </div>
                            <h3 style={{ color: 'white', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Identity & AI Gate</h3>
                            <p style={{ fontSize: 9, color: '#94A3B8', marginBottom: 12, textTransform: 'uppercase', fontWeight: 700 }}>Face stability 3s required to unlock exam</p>

                            {isVerifyingIdentity && (
                                <div style={{ width: '100%', marginBottom: 12 }}>
                                    <div style={{ fontSize: 9, color: '#818CF8', fontWeight: 800, marginBottom: 4 }}>VERIFYING STABILITY {identityProgress}%</div>
                                    <div style={{ height: 6, width: '100%', background: '#1E293B', borderRadius: 99, overflow: 'hidden' }}>
                                        <div style={{ height: '100%', width: `${identityProgress}%`, background: '#6366F1', transition: 'width 0.1s linear' }}></div>
                                    </div>
                                </div>
                            )}

                            {identityError && (
                                <div style={{ color: '#EF4444', fontSize: 9, fontWeight: 800, marginBottom: 8, padding: '4px 8px', background: 'rgba(239,68,68,0.1)', borderRadius: 6 }}>
                                    {identityError}
                                </div>
                            )}

                            <button onClick={startIdentityVerification} disabled={loading || isVerifyingIdentity} className="btn btn-primary btn-sm" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', width: '100%' }}>
                                {loading ? 'Loading Models...' : isVerifyingIdentity ? 'Hold Face Still...' : 'Verify Identity & Start Exam'}
                            </button>
                        </div>
                    )}

                    {active && (
                        <div style={{ position: 'absolute', bottom: 8, left: 8, padding: '4px 8px', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', borderRadius: 4, border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor }} className="animate-pulse"></span>
                            <span>{statusText}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Level 11: Dynamic AI Risk Score Badge & Audio Indicator */}
            <div style={{ padding: '10px 16px', background: '#020617', borderBottom: '1px solid #1E293B' }}>
                <div className="flex justify-between items-center mb-1.5">
                    <span style={{ color: '#94A3B8', fontSize: 9, fontWeight: 800, textTransform: 'uppercase' }}>AI Risk Score</span>
                    <span style={{ fontSize: 11, fontWeight: 900, color: riskColor, background: `${riskColor}15`, padding: '2px 8px', borderRadius: 6, border: `1px solid ${riskColor}40` }}>
                        {riskScore} / 100 ({riskCategory})
                    </span>
                </div>
                <div style={{ height: 5, width: '100%', background: '#1E293B', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${riskScore}%`, background: riskColor, transition: 'width 0.3s ease' }}></div>
                </div>

                <div className="flex justify-between items-center text-xs mt-3 mb-1">
                    <span style={{ color: '#94A3B8', fontSize: 9, fontWeight: 800, textTransform: 'uppercase' }}>Audio Level</span>
                    <span style={{ fontSize: 9, fontWeight: 800, color: '#94A3B8' }}>{micLevel}%</span>
                </div>
                <div style={{ height: 4, width: '100%', background: '#1E293B', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${micLevel}%`, background: '#6366F1', transition: 'width 0.1s ease' }}></div>
                </div>
            </div>

            {/* Warnings Counter & Security Status */}
            <div style={{ padding: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ padding: 10, background: 'rgba(2,6,23,0.6)', border: '1px solid #1E293B', borderRadius: 10, textAlign: 'center' }}>
                    <span style={{ fontSize: 9, color: '#94A3B8', fontWeight: 800, textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>Warnings</span>
                    <span style={{ fontSize: 16, fontWeight: 900, color: moveWarnings > 0 ? '#EF4444' : '#F59E0B' }}>{moveWarnings} / {settings.max_warnings}</span>
                </div>
                <div style={{ padding: 10, background: 'rgba(2,6,23,0.6)', border: '1px solid #1E293B', borderRadius: 10, textAlign: 'center' }}>
                    <span style={{ fontSize: 9, color: '#94A3B8', fontWeight: 800, textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>Integrity</span>
                    <span style={{ fontSize: 14, fontWeight: 900, color: isViolated ? '#EF4444' : '#10B981', textTransform: 'uppercase' }}>
                        {isViolated ? 'Warning' : 'Verified'}
                    </span>
                </div>
            </div>

            {/* Incidents Log */}
            <div style={{ flex: 1, padding: '0 12px 12px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', color: '#64748B', letterSpacing: '0.1em', marginBottom: 6 }}>
                    Security Incidents Log
                </div>
                <div className="custom-scroll" style={{ flex: 1, background: 'rgba(2,6,23,0.5)', borderRadius: 10, border: '1px solid #1E293B', padding: 10, overflowY: 'auto', fontSize: 10 }}>
                    {incidents.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '20px 0', color: '#475569', fontWeight: 700, fontSize: 9, textTransform: 'uppercase' }}>No Security Violations</div>
                    ) : (
                        incidents.map((log, idx) => <div key={idx} style={{ color: '#94A3B8', marginBottom: 4, borderBottom: '1px solid #1E293B', paddingBottom: 4, fontSize: 9 }}>{log}</div>)
                    )}
                </div>
            </div>
        </aside>
    );
}
