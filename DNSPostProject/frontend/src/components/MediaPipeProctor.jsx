import React, { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { apiFetch } from '../services/api';
import { ShieldCheck, ChevronDown, CheckCircle2, AlertTriangle, Video, Eye, Smartphone, Volume2, Shield } from 'lucide-react';

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

// Robust MediaPipe loader: tries local offline assets first, then pinned CDN, with GPU -> CPU fallback
async function loadFaceLandmarkerHelper() {
    const attempts = [
        // Strategy 1: Local assets (Vite served, 100% offline & zero CDN dependency)
        { wasm: '/wasm', model: '/models/face_landmarker.task', delegate: 'GPU', desc: 'Local assets (GPU)' },
        { wasm: '/wasm', model: '/models/face_landmarker.task', delegate: 'CPU', desc: 'Local assets (CPU)' },
        // Strategy 2: Pinned CDN (v0.10.35 matching local package)
        { wasm: 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm', model: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task', delegate: 'GPU', desc: 'CDN v0.10.35 (GPU)' },
        { wasm: 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm', model: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task', delegate: 'CPU', desc: 'CDN v0.10.35 (CPU)' },
        // Strategy 3: CDN latest fallback
        { wasm: 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm', model: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task', delegate: 'CPU', desc: 'CDN latest (CPU)' }
    ];

    let lastError = null;
    for (const config of attempts) {
        try {
            console.log(`[AI] Attempting MediaPipe load: ${config.desc}...`);
            const filesetResolver = await FilesetResolver.forVisionTasks(config.wasm);
            const landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
                baseOptions: { modelAssetPath: config.model, delegate: config.delegate },
                runningMode: 'VIDEO',
                numFaces: 3,
                outputFaceBlendshapes: true
            });
            console.log(`[AI] MediaPipe loaded successfully using ${config.desc}`);
            return landmarker;
        } catch (err) {
            console.warn(`[AI] ${config.desc} failed:`, err?.message || err);
            lastError = err;
        }
    }
    throw new Error('MODEL_FAILED:' + (lastError?.message || 'Failed to initialize AI model.'));
}

export const MediaPipeProctor = forwardRef(function MediaPipeProctor({
    examId,
    onViolation,
    onAutoSubmit,
    onIdentityVerified,
    onStepProgress,
    onTelemetryUpdate,
    initViolations = 0,
    className = ''
}, ref) {
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
    const [detailsCollapsed, setDetailsCollapsed] = useState(false);
    
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

    // Model refs — needed to avoid stale closures in requestAnimationFrame/setInterval loops
    const landmarkerRef = useRef(null);
    const cocoModelRef = useRef(null);
    const settingsRef = useRef(DEFAULT_AI_SETTINGS);

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
    const phoneStateRef = useRef('PHONE_NOT_DETECTED'); // 'PHONE_NOT_DETECTED' | 'PHONE_CANDIDATE' | 'PHONE_VIOLATION_REPORTED'
    const phoneAbsentCountRef = useRef(0);
    const lastGazeDirRef = useRef('LOOKING_CENTER');
    const sideGlanceCountRef = useRef(0);

    const identityStableTimerRef = useRef(0);
    const lastViolationTypeRef = useRef(null);
    const lastViolationTimeRef = useRef(0);
    const lastFocusViolationRef = useRef(0);

    // Helper: Report step progress to parent
    const reportStep = useCallback((stepNum, status) => {
        if (onStepProgress) onStepProgress(stepNum, status);
    }, [onStepProgress]);

    // Keep active & status refs synchronized
    useEffect(() => { activeRef.current = active; }, [active]);
    useEffect(() => { isViolatedRef.current = isViolated; }, [isViolated]);
    useEffect(() => { settingsRef.current = settings; }, [settings]);

    // Telemetry Sync with Parent Container
    useEffect(() => {
        if (onTelemetryUpdate) {
            onTelemetryUpdate({
                isCameraActive: !!streamRef.current,
                statusText,
                statusColor,
                warnings: moveWarnings,
                maxWarnings: settings.max_warnings || 3,
                riskScore,
                riskCategory,
                active
            });
        }
    }, [moveWarnings, statusText, statusColor, riskScore, riskCategory, active, onTelemetryUpdate]);

    // When deferred COCO-SSD loads, start phone detection interval
    useEffect(() => {
        if (!cocoModel || !activeRef.current) return;
        cocoModelRef.current = cocoModel;
        startPhoneDetectionInterval(cocoModel);
        return () => {
            if (cocoIntervalRef.current) clearInterval(cocoIntervalRef.current);
        };
    }, [cocoModel]);

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

    // OPTIMIZED: Parallel initialization — MediaPipe + Camera + Settings all at once
    useEffect(() => {
        let isMounted = true;

        async function parallelInit() {
            reportStep(1, 'active'); // Step 1: Secure Exam Environment

            try {
                reportStep(2, 'active');

                // ── Task B: Camera first (independent of AI model loading) ──
                let stream;
                try {
                    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 }, audio: true });
                } catch (_) {
                    try {
                        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 } });
                    } catch (camErr) {
                        throw new Error('CAMERA_DENIED:' + camErr.message);
                    }
                }

                if (!isMounted) return;
                reportStep(1, 'done');
                reportStep(2, 'done');

                // Attach camera to video element immediately (don't wait for model)
                streamRef.current = stream;
                attachCameraListeners(stream);
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    await videoRef.current.play().catch(() => {});
                }
                setupAudio(stream);

                // ── Task C: Settings fetch (fast) ──
                const settingsData = await (async () => {
                    try {
                        return await Promise.race([
                            apiFetch('/api/proctor/settings'),
                            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1500))
                        ]);
                    } catch (_) { return null; }
                })();
                if (settingsData && typeof settingsData === 'object') {
                    setSettings(mergeSafeSettings(settingsData));
                }

                // ── Task A: MediaPipe — local first, CDN fallback, GPU→CPU ──
                const landmarkerInstance = await loadFaceLandmarkerHelper();

                if (!isMounted) return;

                // Mark model loaded
                reportStep(3, 'done'); // Step 3: AI Models Loaded
                setLandmarker(landmarkerInstance);
                landmarkerRef.current = landmarkerInstance;
                setLoading(false);
                setStatusText('READY FOR AUDIT');

                // Request fullscreen
                if (!document.fullscreenElement) {
                    await document.documentElement.requestFullscreen().catch(() => {});
                }

                // Auto-start identity verification immediately
                startIdentityVerificationFast(landmarkerInstance);

            } catch (err) {
                console.error('[AI] Init Failed:', err);
                if (!isMounted) return;
                setStatusColor('#EF4444');
                setLoading(false);
                if (err.message?.startsWith('CAMERA_DENIED')) {
                    setStatusText('CAMERA PERMISSION DENIED');
                    setIdentityError('Camera access was denied. Please click the camera icon in your browser address bar, allow access, then click Retry below.');
                } else if (err.message?.startsWith('MODEL_FAILED')) {
                    setStatusText('AI MODEL LOAD ERROR');
                    setIdentityError('AI detection model failed to load (GPU and CPU both failed). Please check your internet connection and click Retry below.');
                } else {
                    setStatusText('INITIALIZATION ERROR');
                    setIdentityError('Initialization error: ' + (err.message || 'Unknown error') + '. Please click Retry below.');
                }
            }
        }

        parallelInit();
        return () => { isMounted = false; };
    }, []);

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

    // OPTIMIZED: Fast identity verification — camera already running, landmarker passed directly
    // Reduced stability time from 3s → 1.5s
    const FACE_STABILITY_MS = 1500;

    const startIdentityVerificationFast = (landmarkerInstance) => {
        const lm = landmarkerInstance || landmarker;
        if (!lm) return;

        setIsVerifyingIdentity(true);
        setStatusText('VERIFYING IDENTITY');
        reportStep(4, 'active'); // Step 4: Verifying Face Stability

        // Reusable canvas for lighting checks (avoid creating new ones per frame)
        const sampleCanvas = document.createElement('canvas');
        sampleCanvas.width = 160; sampleCanvas.height = 120;
        const sampleCtx = sampleCanvas.getContext('2d');

        let startTime = null;
        const checkStability = () => {
            if (!videoRef.current) return;
            const video = videoRef.current;

            // Lighting / Quality Check
            try {
                sampleCtx.drawImage(video, 0, 0, 160, 120);
                const imgData = sampleCtx.getImageData(0, 0, 160, 120);
                let brightnessSum = 0;
                for (let i = 0; i < imgData.data.length; i += 16) { // Sample every 4th pixel for speed
                    brightnessSum += (imgData.data[i] + imgData.data[i+1] + imgData.data[i+2]) / 3;
                }
                const avgBrightness = brightnessSum / (imgData.data.length / 16);

                if (avgBrightness < 25) {
                    startTime = null;
                    setIdentityProgress(0);
                    setIdentityError('Poor lighting detected. Please move to a brighter room.');
                    requestAnimationFrame(checkStability);
                    return;
                }
            } catch (_) {}

            const results = lm.detectForVideo(video, performance.now());

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
                const pct = Math.min(100, Math.round((elapsed / FACE_STABILITY_MS) * 100));
                setIdentityProgress(pct);
                setIdentityError('');

                if (elapsed >= FACE_STABILITY_MS) {
                    // Verification Passed → Capture Reference Snapshot
                    reportStep(4, 'done');
                    reportStep(5, 'active'); // Step 5: Snapshot

                    const snapshot = captureSnapshot(0.7);

                    reportStep(5, 'done');
                    reportStep(6, 'active'); // Step 6: Session Activation

                    setIdentityVerified(true);
                    setIsVerifyingIdentity(false);
                    setActive(true);
                    activeRef.current = true;
                    setStatusText('AI SECURE TRACKING');

                    // Fire-and-forget: persist identity snapshot to server
                    apiFetch('/api/proctor/verify-identity', {
                        method: 'POST',
                        body: JSON.stringify({ exam_id: parseInt(examId), image_data: snapshot })
                    }).catch(() => {});

                    if (onIdentityVerified) onIdentityVerified(snapshot);
                    logIncident('Face verified & session activated', 'INFO');

                    reportStep(6, 'done');
                    reportStep(7, 'active'); // Step 7: Timer & Monitoring

                    // Launch continuous proctoring (face tracking loop)
                    startContinuousProctoring(lm);

                    // DEFERRED: Load COCO-SSD in background AFTER exam starts
                    loadCocoSsdDeferred();

                    reportStep(7, 'done');
                    return;
                }
                requestAnimationFrame(checkStability);
            }
        };
        requestAnimationFrame(checkStability);
    };

    // Retry button handler — re-attempts camera AND model loading if needed
    const startIdentityVerification = async () => {
        setLoading(true);
        setIdentityError('');
        setStatusText('RETRYING...');

        try {
            if (!document.fullscreenElement) {
                await document.documentElement.requestFullscreen().catch(() => {});
            }

            // Re-acquire camera
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

            // Re-attempt model loading if it previously failed
            let lm = landmarker;
            if (!lm) {
                console.log('[AI] Retry: Re-attempting MediaPipe model load...');
                try {
                    lm = await loadFaceLandmarkerHelper();
                    setLandmarker(lm);
                    landmarkerRef.current = lm;
                } catch (retryErr) {
                    throw new Error('AI detection model failed to load. Please verify camera permissions and connection, then click Retry.');
                }
            }

            setLoading(false);
            startIdentityVerificationFast(lm);
        } catch (err) {
            console.error('[AI] Retry Failed:', err);
            setIdentityError(err.message || 'Retry failed. Please reload the page.');
            setStatusText('RETRY FAILED');
            setStatusColor('#EF4444');
            setLoading(false);
        }
    };

    useImperativeHandle(ref, () => ({
        startIdentityVerification,
        isVerifying: isVerifyingIdentity,
        isVerified: identityVerified
    }));

    // DEFERRED COCO-SSD: Load phone detection model in background after exam starts
    const loadCocoSsdDeferred = async () => {
        try {
            const tf = await import('@tensorflow/tfjs');
            await tf.ready();
            const cocoSsd = await import('@tensorflow-models/coco-ssd');
            const cocoInstance = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
            cocoModelRef.current = cocoInstance;
            setCocoModel(cocoInstance);
            if (activeRef.current) {
                startPhoneDetectionInterval(cocoInstance);
            }
            console.log('[AI] COCO-SSD phone detection model loaded and started (deferred)');
        } catch (err) {
            console.warn('[AI] COCO-SSD deferred load failed (phone detection disabled):', err.message);
        }
    };

    // Phone detection interval — Robust temporal state machine (Part 6 & Part 10)
    const startPhoneDetectionInterval = (cocoInstance) => {
        if (cocoIntervalRef.current) clearInterval(cocoIntervalRef.current);
        if (!cocoInstance) return;

        const s = settingsRef.current;
        const intervalMs = parseInt(s.phone_detection_interval_ms) || 600;
        const confThresh = parseFloat(s.phone_confidence_threshold) || 0.45;
        const repeatLimit = parseInt(s.phone_repeat_limit) || 2;

        cocoIntervalRef.current = setInterval(async () => {
            if (!videoRef.current || !activeRef.current || videoRef.current.readyState < 2) return;
            try {
                const predictions = await cocoInstance.detect(videoRef.current);
                const phoneRaw = predictions.find(p => p.class === 'cell phone' || p.class === 'remote');
                if (debugDataRef.current) debugDataRef.current.phoneConf = phoneRaw ? Math.round(phoneRaw.score * 100) : 0;

                const phone = predictions.find(p => (p.class === 'cell phone' || p.class === 'remote') && p.score >= confThresh);
                if (phone) {
                    phoneAbsentCountRef.current = 0;

                    if (phoneStateRef.current === 'PHONE_NOT_DETECTED') {
                        phoneStateRef.current = 'PHONE_CANDIDATE';
                        phoneFramesRef.current = 1;
                    } else if (phoneStateRef.current === 'PHONE_CANDIDATE') {
                        phoneFramesRef.current++;
                        if (phoneFramesRef.current >= repeatLimit) {
                            phoneStateRef.current = 'PHONE_VIOLATION_REPORTED'; // Latched — exactly ONE warning per incident
                            setIsViolated(true);
                            setStatusText('MOBILE PHONE CONFIRMED');
                            setStatusColor('#EF4444');
                            triggerSecurityEvent({
                                type: 'PHONE_DETECTED',
                                message: `Mobile phone detected in examination area (${Math.round(phone.score * 100)}% confidence)`,
                                severity: 'HIGH',
                                scoreWeight: settingsRef.current.risk_weights?.PHONE_DETECTED || 30,
                                confidence: phone.score,
                                takeSnapshot: true
                            });
                        }
                    } else if (phoneStateRef.current === 'PHONE_VIOLATION_REPORTED') {
                        // Phone remains visible — maintain alert state without generating duplicate warnings
                        setStatusText('MOBILE PHONE STILL VISIBLE');
                        setStatusColor('#EF4444');
                    }
                } else {
                    phoneAbsentCountRef.current++;
                    if (phoneAbsentCountRef.current >= 3) {
                        // Phone absent for >= 3 cycles (~1.8s) -> clean reset
                        phoneStateRef.current = 'PHONE_NOT_DETECTED';
                        phoneFramesRef.current = 0;
                        phoneAbsentCountRef.current = 0;
                    }
                }
            } catch (_) {}
        }, intervalMs);
    };

    // Auto-hook phone detection when cocoModel becomes available or active state changes
    useEffect(() => {
        if (cocoModel && active) {
            startPhoneDetectionInterval(cocoModel);
        }
        return () => {
            if (cocoIntervalRef.current) clearInterval(cocoIntervalRef.current);
        };
    }, [cocoModel, active]);

    // Proctor component unmount cleanup (prevents camera, audio context, and timer leaks)
    useEffect(() => {
        return () => {
            activeRef.current = false;
            if (cocoIntervalRef.current) clearInterval(cocoIntervalRef.current);
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
            if (audioAnimFrameRef.current) cancelAnimationFrame(audioAnimFrameRef.current);
            if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
                audioCtxRef.current.close().catch(() => {});
            }
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
            }
        };
    }, []);

    // Level 7, 8, 9: Security Event Listeners (Tab Switch, Fullscreen, Keyboard Shortcuts)
    useEffect(() => {
        if (!active) return;

        // Level 7: Tab Switch / Window Blur (Unified Debounced Focus Loss)
        const handleFocusLoss = () => {
            const now = Date.now();
            if (now - lastFocusViolationRef.current < 4000) return;
            lastFocusViolationRef.current = now;
            triggerViolation('TAB_SWITCH', 'Student switched tabs or unfocused examination window', settings.risk_weights.TAB_SWITCH || 15);
        };

        const handleVisibilityChange = () => {
            if (document.hidden) handleFocusLoss();
        };

        const handleWindowBlur = () => {
            handleFocusLoss();
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

    const logIncident = (eventText, severity = 'INFO') => {
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
        setIncidents(prev => [{
            id: Date.now() + Math.random(),
            time: timeStr,
            event: eventText,
            severity
        }, ...prev.slice(0, 35)]);
    };

    // Centralized Security Event Manager (Part 10 & 11)
    const triggerSecurityEvent = ({
        type,
        message,
        severity = 'MEDIUM',
        confidence = 0.95,
        scoreWeight = 10,
        takeSnapshot = true
    }) => {
        const now = Date.now();
        // 1. Deduplication window: ignore identical event within 4 seconds
        if (lastViolationTypeRef.current === type && (now - lastViolationTimeRef.current) < 4000) return;
        // 2. Throttle non-critical events from firing simultaneously within 1.5 seconds
        if ((now - lastViolationTimeRef.current) < 1500 && severity !== 'HIGH') return;

        lastViolationTypeRef.current = type;
        lastViolationTimeRef.current = now;

        // 3. Update Risk Score
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

        // 4. Increment Warnings Counter & Persist Evidence
        setMoveWarnings(prev => {
            const nextVal = prev + 1;
            const humanEvent = type === 'HEAD_POSE' ? 'Head pose deviation'
                : type === 'LOOKING_AWAY' ? 'Eye gaze deviation'
                : type === 'RAPID_SIDE_GLANCES' ? 'Rapid side glances'
                : type === 'EYES_CLOSED_LONG' ? 'Eyes closed long duration'
                : type === 'FACE_MISSING' ? 'Candidate face absent'
                : type === 'MULTIPLE_FACES' ? 'Multiple faces detected'
                : type === 'PHONE_DETECTED' ? 'Mobile phone detected'
                : type === 'TAB_SWITCH' ? 'Tab switched / focus loss'
                : type === 'FULLSCREEN_EXIT' ? 'Fullscreen exited'
                : type === 'KEYBOARD_SHORTCUT' ? 'Prohibited key combination'
                : type === 'RIGHT_CLICK' ? 'Context menu attempted'
                : type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());

            logIncident(humanEvent, severity);

            const snapshot = (takeSnapshot || severity === 'HIGH' || severity === 'MEDIUM') ? captureSnapshot() : null;
            
            // Persist Evidence Record to MySQL
            apiFetch('/api/flag-violation', {
                method: 'POST',
                body: JSON.stringify({
                    exam_id: parseInt(examId),
                    violation_type: type,
                    confidence,
                    risk_score: scoreWeight,
                    severity,
                    details: { message, warning_count: nextVal, severity },
                    image_data: snapshot
                })
            }).catch(() => {});

            if (onViolation) onViolation(type, message, nextVal, severity);

            // Auto-Submit Exam if Max Warnings Exceeded
            if (settings.auto_submit_enabled && nextVal >= settings.max_warnings) {
                if (onAutoSubmit) onAutoSubmit(`AI_PROCTOR_SECURITY: ${type} — Exceeded max warning limit (${settings.max_warnings})`);
            }

            return nextVal;
        });
    };

    // Legacy adapter for existing call sites
    const triggerViolation = (type, msg, scoreWeight = 10, confidence = 0.95, severity = 'MEDIUM') => {
        triggerSecurityEvent({ type, message: msg, scoreWeight, confidence, severity });
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
    const startContinuousProctoring = (landmarkerInstance) => {
        // Use the passed instance directly to avoid stale closure over state
        const lm = landmarkerInstance || landmarkerRef.current;
        if (!lm) {
            console.error('[AI] startContinuousProctoring called without landmarker!');
            return;
        }
        let lastVideoTime = -1;

        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

        // Start phone detection if COCO-SSD is already loaded (usually not yet due to deferred loading)
        if (cocoModelRef.current) {
            startPhoneDetectionInterval(cocoModelRef.current);
        }

        // Render Frame Loop — uses `lm` (direct reference) instead of `landmarker` (stale state)
        const render = () => {
            if (!videoRef.current || !canvasRef.current || !activeRef.current) return;
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');

            if (video.currentTime !== lastVideoTime) {
                lastVideoTime = video.currentTime;
                
                // Telemetry: Calculate FPS
                frameCountRef.current++;
                const now = performance.now();
                if (now - lastFpsTimeRef.current >= 1000) {
                    if (debugDataRef.current) debugDataRef.current.fps = frameCountRef.current;
                    frameCountRef.current = 0;
                    lastFpsTimeRef.current = now;
                }

                const results = lm.detectForVideo(video, performance.now());
                if (debugDataRef.current) debugDataRef.current.faceCount = results.faceLandmarks ? results.faceLandmarks.length : 0;

                ctx.clearRect(0, 0, canvas.width, canvas.height);

                // Read settings from ref to avoid stale closure
                const s = settingsRef.current;

                // Dynamic Timeout Settings
                const faceTimeoutSec = parseFloat(s.face_timeout_seconds) || 5;

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
                        triggerViolation('FACE_MISSING', `Candidate face absent from camera frame for >${faceTimeoutSec}s`, s.risk_weights.FACE_MISSING || 20);
                        absentFramesRef.current = 0;
                    }
                } 
                // Level 5: Multiple Faces Detection
                else if (results.faceLandmarks.length > (parseInt(s.max_allowed_faces) || 1)) {
                    absentFramesRef.current = 0;
                    multiFaceFramesRef.current++;
                    const multiFaceHoldFrames = Math.round((parseFloat(s.multiple_faces_duration_sec) || 1.0) * 10);
                    if (multiFaceFramesRef.current >= multiFaceHoldFrames) {
                        setIsViolated(true);
                        setStatusText('MULTIPLE FACES DETECTED');
                        setStatusColor('#EF4444');
                        triggerViolation('MULTIPLE_FACES', `${results.faceLandmarks.length} faces detected in examination area`, s.risk_weights.MULTIPLE_FACES || 40);
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
                    const yawLeftMax = parseFloat(s.head_yaw_left_deg || s.head_yaw_threshold_deg) || 22;
                    const yawRightMax = parseFloat(s.head_yaw_right_deg || s.head_yaw_threshold_deg) || 22;
                    const pitchUpMax = parseFloat(s.head_pitch_up_deg || s.head_pitch_threshold_deg) || 18;
                    const pitchDownMax = parseFloat(s.head_pitch_down_deg || s.head_pitch_threshold_deg) || 18;
                    const headHoldFrames = Math.round((parseFloat(s.head_pose_hold_time_sec) || 1.5) * 10);

                    const isHeadTurned = yaw > yawRightMax || yaw < -yawLeftMax || pitch < -pitchUpMax || pitch > pitchDownMax;

                    if (isHeadTurned) {
                        headAwayFramesRef.current++;
                        if (headAwayFramesRef.current >= headHoldFrames) {
                            setIsViolated(true);
                            const dir = yaw > yawRightMax ? 'RIGHT' : yaw < -yawLeftMax ? 'LEFT' : pitch > pitchDownMax ? 'DOWN' : 'UP';
                            setStatusText(`HEAD TURNED (${dir})`);
                            setStatusColor('#EF4444');
                            triggerViolation('HEAD_POSE', `Head turned ${dir} outside threshold (${yaw}°, ${pitch}°)`, s.risk_weights.HEAD_YAW || 10);
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
                    const gazeHoldFrames = Math.round((parseFloat(s.eye_gaze_max_duration_sec) || 3.0) * 10);
                    const blinkHoldFrames = Math.round((parseFloat(s.eye_blink_duration_thresh_sec) || 3.0) * 10);

                    if (isEyesClosed) {
                        eyesClosedFramesRef.current++;
                        if (eyesClosedFramesRef.current >= blinkHoldFrames) {
                            setIsViolated(true);
                            setStatusText('EYES CLOSED LONG DURATION');
                            setStatusColor('#EF4444');
                            triggerViolation('EYES_CLOSED_LONG', 'Eyes closed continuously beyond threshold duration', s.risk_weights.EYES_CLOSED_LONG || 20, confidence);
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

                            if (sideGlanceCountRef.current >= (parseInt(s.eye_gaze_side_glance_limit) || 3)) {
                                setIsViolated(true);
                                setStatusText('RAPID SIDE GLANCES DETECTED');
                                setStatusColor('#F97316');
                                triggerViolation('RAPID_SIDE_GLANCES', `Repeated rapid side glances (${sideGlanceCountRef.current} flips)`, s.risk_weights.RAPID_SIDE_GLANCES || 15, confidence);
                                sideGlanceCountRef.current = 0;
                            }
                        }

                        if (gazeAwayFramesRef.current >= gazeHoldFrames) {
                            setIsViolated(true);
                            setStatusText(`GAZE AWAY (${gazeDirection})`);
                            setStatusColor('#F97316');
                            triggerViolation('LOOKING_AWAY', `Sustained eye gaze away (${gazeDirection})`, s.risk_weights.LOOKING_AWAY || 10, confidence);
                            gazeAwayFramesRef.current = 0;
                        }
                    } else {
                        gazeAwayFramesRef.current = 0;
                        lastGazeDirRef.current = 'LOOKING_CENTER';
                    }

                    if (!isHeadTurned && !isEyesClosed && Math.abs(horizOffset) <= s.eye_gaze_threshold) {
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
        <aside className={`w-[270px] shrink-0 bg-white border-l border-slate-200 h-full flex flex-col overflow-hidden text-slate-900 select-none ${className}`}>
            {/* Header: Security Monitoring | ● Active | Collapse Toggle */}
            <div className="h-10 px-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${active ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
                    <span className="text-xs font-bold text-slate-800 tracking-tight">Security Monitoring</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        {active ? 'Active' : 'Standby'}
                    </span>
                    <button
                        type="button"
                        onClick={() => setDetailsCollapsed(prev => !prev)}
                        aria-label={detailsCollapsed ? "Expand security details" : "Collapse security details"}
                        className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded transition-colors"
                        title={detailsCollapsed ? "Expand details" : "Collapse details"}
                    >
                        <ChevronDown size={14} className={`transform transition-transform duration-200 ${detailsCollapsed ? '-rotate-90' : 'rotate-0'}`} />
                    </button>
                </div>
            </div>

            {/* Camera Viewport Container (Aspect 16:9, ~246px wide, no vertical stretching) */}
            <div className="p-3 bg-slate-50/50 border-b border-slate-200 shrink-0">
                <div className="relative aspect-video rounded-lg overflow-hidden border border-slate-300 bg-slate-900 shadow-2xs">
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover -scale-x-100 opacity-95"></video>
                    <canvas ref={canvasRef} width={480} height={360} className="absolute inset-0 w-full h-full pointer-events-none -scale-x-100"></canvas>

                    {/* Level 14: AI Live Telemetry Overlay (Debug Mode) */}
                    {isDebugMode && (
                        <div className="absolute top-1.5 right-1.5 bg-slate-950/90 border border-blue-500 rounded p-1.5 text-[9px] text-blue-200 font-mono z-50 w-28">
                            <div className="text-white font-bold mb-1 text-center border-b border-slate-800 pb-0.5">TELEMETRY</div>
                            <div className="flex justify-between"><span>FPS:</span> <span>{debugDataRef.current?.fps}</span></div>
                            <div className="flex justify-between"><span>FACES:</span> <span>{debugDataRef.current?.faceCount}</span></div>
                            <div className="flex justify-between"><span>CONF:</span> <span>{debugDataRef.current?.faceConf}%</span></div>
                            <div className="flex justify-between"><span>PHONE:</span> <span>{debugDataRef.current?.phoneConf}%</span></div>
                        </div>
                    )}

                    {/* Pre-Exam Identity Gate Overlay (before verification) */}
                    {!active && (
                        <div id="startOverlay" className="absolute inset-0 z-40 flex flex-col items-center justify-center p-3 text-center bg-white/95">
                            <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-1.5 border border-blue-200">
                                <ShieldCheck size={18} />
                            </div>
                            <h4 className="text-[11px] font-bold text-slate-900 uppercase tracking-wide mb-0.5">Identity Verification</h4>
                            <p className="text-[10px] text-slate-500 mb-2 leading-tight">Face alignment required to start</p>

                            {isVerifyingIdentity && (
                                <div className="w-full mb-2">
                                    <div className="text-[10px] text-blue-600 font-semibold mb-1">Verifying face {identityProgress}%</div>
                                    <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-600 rounded-full transition-all duration-100" style={{ width: `${identityProgress}%` }}></div>
                                    </div>
                                </div>
                            )}

                            {identityError && (
                                <div className="text-[10px] text-red-600 font-semibold mb-2 p-1.5 bg-red-50 border border-red-200 rounded text-left">
                                    {identityError}
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={startIdentityVerification}
                                disabled={loading || isVerifyingIdentity}
                                className="px-3 py-1.5 rounded-md text-[11px] font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors w-full shadow-xs disabled:opacity-50"
                            >
                                {loading ? 'Loading AI Model...' : isVerifyingIdentity ? 'Hold Face Steady...' : 'Verify & Begin'}
                            </button>
                        </div>
                    )}

                    {/* Active Tracking Subtle Pill */}
                    {active && (
                        <div className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded bg-black/60 backdrop-blur-xs text-white text-[10px] font-medium flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColor || '#10B981' }}></span>
                            <span className="truncate max-w-[170px]">{statusText || 'AI Tracking'}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Collapsible Details Area */}
            <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-200 ${detailsCollapsed ? 'hidden' : 'flex'}`}>
                {/* Security Status & Risk Meter (Requirement 13) */}
                <div className="p-3 bg-white border-b border-slate-200 space-y-2.5 shrink-0">
                    <div className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Security Risk</span>
                            <span className="font-semibold text-xs" style={{ color: riskColor }}>
                                {riskScore}/100 <span className="text-[10px] font-bold uppercase text-slate-500">({riskCategory})</span>
                            </span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-300" style={{ width: `${riskScore}%`, backgroundColor: riskColor }}></div>
                        </div>
                    </div>

                    {/* Compact Metric Rows */}
                    <div className="divide-y divide-slate-100 border-t border-slate-100 pt-1 text-xs">
                        <div className="flex items-center justify-between py-1.5">
                            <span className="text-slate-500 text-[11px]">Warnings</span>
                            <span className={`font-semibold text-xs ${moveWarnings > 0 ? 'text-amber-600' : 'text-slate-700'}`}>
                                {moveWarnings} / {settings.max_warnings}
                            </span>
                        </div>
                        <div className="flex items-center justify-between py-1.5">
                            <span className="text-slate-500 text-[11px]">Session</span>
                            <span className="inline-flex items-center gap-1 font-semibold text-xs text-emerald-600">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                <span>{isViolated ? 'Warning' : 'Verified'}</span>
                            </span>
                        </div>
                        <div className="flex items-center justify-between py-1.5">
                            <span className="text-slate-500 text-[11px]">Audio Level</span>
                            <div className="flex items-center gap-2">
                                <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500 rounded-full transition-all duration-150" style={{ width: `${micLevel}%` }}></div>
                                </div>
                                <span className="font-mono text-[10px] text-slate-600 w-7 text-right">{micLevel}%</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recent Security Events / Proctoring Audit Log (Requirement 14) */}
                <div className="flex-1 flex flex-col min-h-0 bg-white">
                    <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Recent Events</span>
                        <span className="text-[10px] text-slate-400 font-medium">{incidents.length} logged</span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                        {incidents.length === 0 ? (
                            <div className="h-24 flex flex-col items-center justify-center text-center text-slate-400 p-2">
                                <ShieldCheck size={18} className="text-slate-300 mb-1" />
                                <span className="text-[10px]">No security events logged</span>
                            </div>
                        ) : (
                            incidents.map((item) => (
                                <div key={item.id} className="p-1.5 rounded bg-slate-50 border border-slate-200/80 text-[11px]">
                                    <div className="flex items-center justify-between gap-1 mb-0.5">
                                        <span className="font-mono text-[10px] text-slate-400">{item.time}</span>
                                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                                            item.severity === 'HIGH' ? 'bg-red-50 text-red-700 border border-red-200' :
                                            item.severity === 'MEDIUM' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                            item.severity === 'LOW' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                            'bg-slate-100 text-slate-600 border border-slate-200'
                                        }`}>
                                            {item.severity}
                                        </span>
                                    </div>
                                    <p className="text-slate-700 font-medium truncate leading-tight" title={item.event}>
                                        {item.event}
                                    </p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* When collapsed, show minimal status footer */}
            {detailsCollapsed && (
                <div className="p-3 bg-slate-50 border-t border-slate-200 text-center shrink-0">
                    <span className="text-[10px] font-semibold text-slate-500 block mb-1">
                        Risk: {riskScore}/100 • Warnings: {moveWarnings}/{settings.max_warnings}
                    </span>
                    <button
                        type="button"
                        onClick={() => setDetailsCollapsed(false)}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                        Show Details ▾
                    </button>
                </div>
            )}
        </aside>
    );
});

export default MediaPipeProctor;
