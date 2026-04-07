import React, { useState, useEffect, useRef } from 'react';
import * as faceapi from 'face-api.js';
import { Camera, Mic, Shield, AlertCircle, CheckCircle, Play, Settings } from 'lucide-react';

const ProctoringFixed = () => {
    // --- State Management ---
    const [status, setStatus] = useState('INIT'); // INIT, STARTING, ACTIVE, ERROR
    const [statusText, setStatusText] = useState('Initializing AI System...');
    const [error, setError] = useState(null);
    const [micLevel, setMicLevel] = useState(0);
    const [moveWarnings, setMoveWarnings] = useState(0);
    const [gazeStatus, setGazeStatus] = useState('Secure');

    // --- Refs ---
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const streamRef = useRef(null);
    const animationFrameRef = useRef(null);

    // --- Constants ---
    const MODEL_URL = '/models';
    const MAX_WARNINGS = 3;

    // --- Effect: Load Models and Setup Auto-Trigger ---
    useEffect(() => {
        const loadModels = async () => {
            try {
                setStatusText('⏳ Downloading AI weights...');
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL)
                ]);
                setStatus('INIT');
                setStatusText('Ready: Click anywhere to enter exam.');
            } catch (err) {
                console.error("Model Loading Error:", err);
                setStatus('ERROR');
                setError('Neural weights failed to load. Check models folder.');
            }
        };
        loadModels();

        // Zero-Click Automatic Trigger Logic
        const handleInteraction = () => {
            if (status === 'INIT') startMonitoring();
        };
        window.addEventListener('click', handleInteraction, { once: true });
        window.addEventListener('keydown', handleInteraction, { once: true });

        return () => {
            stopAllMedia();
            window.removeEventListener('click', handleInteraction);
            window.removeEventListener('keydown', handleInteraction);
        };
    }, [status]); // Re-attach if status changes to INIT

    // --- Media Control: Stop All ---
    const stopAllMedia = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
    };

    // --- Action: Start Monitoring (User Trigger) ---
    const startMonitoring = async () => {
        if (status === 'ACTIVE' || status === 'STARTING') return;
        setStatus('STARTING');
        setStatusText('Unlocking hardware context...');
        setError(null);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480 },
                audio: true
            }).catch(async () => {
                console.warn("Audio Context failed. Video only fallback.");
                return await navigator.mediaDevices.getUserMedia({ video: true });
            });
            
            streamRef.current = stream;
            
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.onloadedmetadata = () => {
                    videoRef.current.play();
                    setStatus('ACTIVE');
                    setStatusText('Security Active');
                    startAnalysisLoop();
                };
            }
            setupAudioAnalysis(stream);

        } catch (err) {
            setStatus('ERROR');
            setError(`Media Blocked: ${err.name}. Please allow camera access.`);
        }
    };

    // --- Audio Logic: Volume Bar ---
    const setupAudioAnalysis = (stream) => {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const audioCtx = new AudioContext();
        const analyser = audioCtx.createAnalyser();
        const source = audioCtx.createMediaStreamSource(stream);
        
        analyser.fftSize = 256;
        source.connect(analyser);
        
        audioContextRef.current = audioCtx;
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateLevel = () => {
            if (status !== 'ACTIVE' && status !== 'STARTING') return;
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
            const average = sum / dataArray.length;
            setMicLevel(average); // 0 to 255 range
            animationFrameRef.current = requestAnimationFrame(updateLevel);
        };
        updateLevel();
    };

    // --- AI Logic: Face Detection Loop ---
    const startAnalysisLoop = () => {
        const loop = async () => {
            if (!videoRef.current || videoRef.current.paused || videoRef.current.ended) return;

            // 1. Detect Faces
            const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.5 });
            const detections = await faceapi.detectAllFaces(videoRef.current, options).withFaceLandmarks();

            // 2. Draw Overlays
            drawDetections(detections);

            // 3. Proctoring Rules
            handleProctoringRules(detections);

            setTimeout(() => requestAnimationFrame(loop), 200); // 5 FPS for efficiency
        };
        loop();
    };

    const drawDetections = (detections) => {
        if (!canvasRef.current || !videoRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        const displaySize = { width: canvasRef.current.width, height: canvasRef.current.height };
        
        faceapi.matchDimensions(canvasRef.current, displaySize);
        const resized = faceapi.resizeResults(detections, displaySize);
        ctx.clearRect(0, 0, displaySize.width, displaySize.height);

        resized.forEach(d => {
            const { x, y, width, height } = d.detection.box;
            const isAlert = status === 'ERROR' || gazeStatus !== 'Secure';
            const color = isAlert ? '#ef4444' : '#10b981';

            // Sci-fi Bounding Box
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.strokeRect(x, y, width, height);

            // Scan line
            const scanLineY = y + (Math.sin(Date.now() / 200) * 0.5 + 0.5) * height;
            ctx.fillStyle = color + '44';
            ctx.fillRect(x, scanLineY, width, 2);

            // Landmarks
            ctx.fillStyle = color;
            d.landmarks.positions.slice(0, 68).forEach(p => {
                ctx.beginPath(); ctx.arc(p.x, p.y, 1, 0, 2*Math.PI); ctx.fill();
            });
        });
    };

    const handleProctoringRules = (detections) => {
        if (detections.length === 0) {
            setGazeStatus('Missing');
            // Log violation logic could go here
        } else if (detections.length > 1) {
            setGazeStatus('Multiple Faces');
        } else {
            // Check eye/nose for gaze
            const landmarks = detections[0].landmarks;
            const nose = landmarks.getNose()[0];
            const leftEye = landmarks.getLeftEye()[0];
            const rightEye = landmarks.getRightEye()[0];
            const dx = nose.x - (leftEye.x + rightEye.x) / 2;
            
            if (Math.abs(dx) > 15) {
                setGazeStatus('Looking Away');
            } else {
                setGazeStatus('Secure');
            }
        }
    };

    // --- UI Render ---
    return (
        <div className="w-full h-full bg-slate-950 flex flex-col items-center justify-center p-6 font-sans">
            <div className={`relative w-[320px] rounded-3xl overflow-hidden border-4 transition-all duration-500 shadow-2xl ${
                status === 'ACTIVE' ? 'border-emerald-500 shadow-emerald-500/20' : 
                status === 'ERROR' ? 'border-red-500 shadow-red-500/20' : 'border-slate-800'
            }`}>
                
                {/* 1. Live Video Feed */}
                <div className="relative aspect-video bg-black overflow-hidden">
                    <video 
                        ref={videoRef} 
                        muted 
                        playsInline 
                        autoPlay
                        className="w-full h-full object-cover scale-x-[-1]"
                    />
                    <canvas 
                        ref={canvasRef}
                        width="320"
                        height="180"
                        className="absolute inset-0 w-full h-full object-cover scale-x-[-1] pointer-events-none"
                    />

                    {/* Overlay: Initial State */}
                    {status === 'INIT' && (
                        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md flex flex-col items-center justify-center text-center p-4">
                            <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center mb-4 shadow-xl shadow-indigo-600/30">
                                <Shield className="text-white w-8 h-8" />
                            </div>
                            <h3 className="text-white font-bold text-lg mb-2">Secure Assessment</h3>
                            <p className="text-slate-400 text-xs mb-6 max-w-[200px]">{statusText}</p>
                            <button 
                                onClick={startMonitoring}
                                className="flex items-center gap-2 bg-indigo-600 px-6 py-3 rounded-xl text-white font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-600/40"
                            >
                                <Play className="w-4 h-4" /> Start Monitoring
                            </button>
                        </div>
                    )}

                    {/* Overlay: Error State */}
                    {status === 'ERROR' && (
                        <div className="absolute inset-0 bg-red-950/90 backdrop-blur-md flex flex-col items-center justify-center text-center p-4">
                            <AlertCircle className="text-red-500 w-12 h-12 mb-4 animate-bounce" />
                            <h3 className="text-white font-bold">Hardware Alert</h3>
                            <p className="text-red-200 text-[10px] mt-2 mb-6 max-w-[180px] font-medium leading-relaxed">{error}</p>
                            <button 
                                onClick={startMonitoring}
                                className="bg-white/10 hover:bg-white/20 px-6 py-2 rounded-lg text-white border border-white/20 font-bold text-[10px] uppercase transition-all"
                            >
                                Try Again
                            </button>
                        </div>
                    )}

                    {/* Status Badge (Active) */}
                    {status === 'ACTIVE' && (
                        <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full border border-emerald-500/30">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                            <span className="text-[10px] font-black text-white uppercase tracking-tighter">Monitoring Active</span>
                        </div>
                    )}
                </div>

                {/* 2. Control Panel (Bottom) */}
                <div className="bg-slate-900 border-t border-slate-800 p-5 space-y-4">
                    {/* Mic Level Bar */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center px-1">
                            <div className="flex items-center gap-1.5 text-slate-400">
                                <Mic className={`w-3.5 h-3.5 ${status === 'ACTIVE' && micLevel > 40 ? 'text-emerald-500' : ''}`} />
                                <span className="text-[10px] font-black uppercase tracking-widest leading-none">Audio Frequency</span>
                            </div>
                            <span className={`text-[10px] font-black px-1.5 rounded ${micLevel > 40 ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-500'}`}>
                                {Math.round((micLevel / 255) * 100)}%
                            </span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
                            <div 
                                className={`h-full transition-all duration-100 ${micLevel > 40 ? 'bg-emerald-500' : 'bg-indigo-600'}`}
                                style={{ width: `${(micLevel / 255) * 100}%` }}
                            />
                        </div>
                    </div>

                    {/* Security Stats Grid */}
                    <div className="grid grid-cols-2 gap-3 pt-1">
                        <div className="bg-slate-950/50 p-3 rounded-2xl border border-slate-800/50 flex flex-col items-center">
                            <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest mb-1.5">Movement</span>
                            <span className={`text-sm font-black tracking-tighter ${moveWarnings > 0 ? 'text-red-500' : 'text-slate-200'}`}>
                                {moveWarnings} / 3
                            </span>
                        </div>
                        <div className="bg-slate-950/50 p-3 rounded-2xl border border-slate-800/50 flex flex-col items-center">
                            <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest mb-1.5">Gaze Focus</span>
                            <span className="text-xs font-black italic uppercase text-emerald-500 tracking-tight">
                                {gazeStatus}
                            </span>
                        </div>
                    </div>

                    {/* Integrity Label */}
                    <div className="flex items-center justify-between pt-1 opacity-60">
                        <div className="flex items-center gap-2">
                            <Shield className="w-3 h-3 text-indigo-400" />
                            <span className="text-[9px] font-bold text-slate-400 uppercase italic">AGMR Secure Hub v4.0</span>
                        </div>
                        <CheckCircle className="w-3 h-3 text-emerald-500" />
                    </div>
                </div>

            </div>
        </div>
    );
};

export default ProctoringFixed;
