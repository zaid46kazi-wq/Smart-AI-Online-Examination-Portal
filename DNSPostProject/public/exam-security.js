/**
 * Exam Security Module v5.1 — Production Hardened
 * AGMR College of Engineering | Online Examination System
 * 
 * v5.1 FIXES:
 * 1. Fullscreen triggers IMMEDIATELY on start button click
 * 2. Video uses explicit 640x480 constraints for reliable detection
 * 3. Face detection: scoreThreshold lowered to 0.25 for better capture
 * 4. Uses inputSize 224 for faster detection + 416 for deep scan fallback
 * 5. Single-threaded detection via while-await (no overlap)
 * 6. Longer absence buffer (6 frames ~5s) to avoid false positives
 * 7. Gaze thresholds widened to 0.30 for natural movement
 */

// ═══════════════════════════════════════════
//  EXAM SECURITY (Tab/Fullscreen/Keyboard)
// ═══════════════════════════════════════════
class ExamSecurity {
    constructor() {
        this.tabSwitchCount = 0;
        this.maxTabSwitches = 2;
        this.fullscreenWarnings = 0;
        this.maxFullscreenWarnings = 3;
        this.submitted = false;

        const params = new URLSearchParams(window.location.search);
        this.examId = params.get('id') || null;
        console.log(`[SECURITY] Initialized for Exam ${this.examId}`);

        this.init();
    }

    init() {
        // Tab visibility
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && !this.submitted) this.handleTabSwitch('Tab Switch');
        });
        window.addEventListener('blur', () => {
            if (!this.submitted) this.handleTabSwitch('Window Blur');
        });

        // Copy/paste/right-click
        ['copy', 'paste', 'cut'].forEach(ev =>
            document.addEventListener(ev, e => { e.preventDefault(); this.notify('Copy/Paste disabled', 'error'); })
        );
        document.addEventListener('contextmenu', e => e.preventDefault());

        // Keyboard shortcuts
        document.addEventListener('keydown', e => {
            if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key)) || (e.ctrlKey && e.key === 'u')) {
                e.preventDefault();
                this.notify('Developer tools blocked', 'error');
            }
        });

        // Fullscreen enforcement
        document.addEventListener('fullscreenchange', () => {
            if (!document.fullscreenElement && !this.submitted) this.handleFullscreenExit();
        });

        // Re-request fullscreen on any click while active
        document.addEventListener('click', () => {
            if (!document.fullscreenElement && !this.submitted && window.faceProctor && window.faceProctor.active) {
                this.requestFullscreen();
            }
        }, true);

        // Page unload
        window.onbeforeunload = e => {
            if (!this.submitted) { e.preventDefault(); return "Exam in progress!"; }
        };
    }

    handleTabSwitch(reason) {
        if (this.submitted) return;
        this.tabSwitchCount++;
        const remaining = this.maxTabSwitches - this.tabSwitchCount;
        if (window.faceProctor) window.faceProctor.logIncident(`${reason} (${this.tabSwitchCount}/${this.maxTabSwitches})`);
        this.notify(`⚠️ FOCUS LOST: ${reason} (${this.tabSwitchCount}/${this.maxTabSwitches})${remaining <= 0 ? ' — AUTO SUBMITTING' : ''}`, remaining > 0 ? 'error' : 'critical');
        if (this.tabSwitchCount >= this.maxTabSwitches) this.autoSubmit('TAB_SWITCH_VIOLATION');
    }

    handleFullscreenExit() {
        if (this.submitted) return;
        this.fullscreenWarnings++;
        if (window.faceProctor) window.faceProctor.logIncident(`Fullscreen Exit (${this.fullscreenWarnings}/${this.maxFullscreenWarnings})`);
        this.notify(`🚨 FULLSCREEN EXIT (${this.fullscreenWarnings}/${this.maxFullscreenWarnings})`, this.fullscreenWarnings >= this.maxFullscreenWarnings ? 'critical' : 'error');
        if (this.fullscreenWarnings >= this.maxFullscreenWarnings) this.autoSubmit('FULLSCREEN_VIOLATION');
    }

    async requestFullscreen() {
        try { 
            if (!document.fullscreenElement) {
                await document.documentElement.requestFullscreen();
            }
        } catch (e) { console.warn('[FS] Fullscreen request denied:', e.message); }
    }

    autoSubmit(reason) {
        if (this.submitted) return;
        this.submitted = true;
        const examId = this.examId || new URLSearchParams(window.location.search).get('id');
        const answers = window.answers || {};

        console.log(`[AUTO-SUBMIT] Exam ${examId} — Reason: ${reason}`);

        fetch('/api/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ exam_id: parseInt(examId), answers, autoSubmit: true, reason })
        }).then(r => r.json()).then(d => console.log('[AUTO-SUBMIT] Result:', d)).catch(e => console.error('[AUTO-SUBMIT] Error:', e));

        document.body.innerHTML = `
            <div style="height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#020617;color:white;font-family:sans-serif;text-align:center;padding:40px;">
                <div style="width:100px;height:100px;background:#450a0a;border-radius:50%;display:flex;align-items:center;justify-content:center;margin-bottom:2rem;border:4px solid #ef4444;animation:pulse 2s infinite;">
                    <span style="font-size:50px;">⚠️</span>
                </div>
                <h1 style="font-size:3rem;color:#ef4444;margin-bottom:1rem;font-weight:900;">EXAM TERMINATED</h1>
                <p style="font-size:1.2rem;color:#94a3b8;max-width:500px;">${reason}</p>
                <a href="/student" style="margin-top:3rem;padding:16px 32px;background:#4f46e5;color:white;text-decoration:none;border-radius:12px;font-weight:bold;">Exit</a>
            </div>
            <style>@keyframes pulse{0%{box-shadow:0 0 0 0 rgba(239,68,68,0.4)}70%{box-shadow:0 0 0 20px rgba(239,68,68,0)}100%{box-shadow:0 0 0 0 rgba(239,68,68,0)}}</style>`;
    }

    notify(message, type = 'info') {
        const toast = document.createElement('div');
        const bg = type === 'critical' ? '#991b1b' : type === 'error' ? '#ef4444' : '#4f46e5';
        Object.assign(toast.style, {
            position: 'fixed', bottom: '30px', right: '30px', padding: '16px 24px', borderRadius: '12px',
            color: 'white', fontWeight: 'bold', zIndex: '10000', background: bg, fontFamily: 'sans-serif',
            fontSize: '13px', boxShadow: '0 10px 25px rgba(0,0,0,0.4)', transition: 'opacity 0.5s',
            maxWidth: '400px'
        });
        toast.innerText = message;
        document.body.appendChild(toast);
        setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 500); }, 4000);
    }
}


// ═══════════════════════════════════════════
//  FACE PROCTORING (Camera + AI Detection)
// ═══════════════════════════════════════════
class FaceProctor {
    constructor() {
        this.video = document.getElementById('proctorVideo');
        this.canvas = document.getElementById('proctorCanvas');
        this.statusLabel = document.getElementById('aiStatusLabel');
        this.statusText = document.getElementById('statusText');
        this.statusPulse = document.getElementById('statusPulse');
        this.moveWarningLabel = document.getElementById('moveWarningCount');
        this.logs = document.getElementById('proctorLogs');
        this.focusLabel = document.getElementById('focusScore');
        this.startOverlay = document.getElementById('startOverlay');
        this.startBtn = document.getElementById('startAiBtn');
        this.micBar = document.getElementById('micLevelBar');
        this.micScore = document.getElementById('micScore');

        // State
        this.moveWarnings = window.initViolations || 0;
        this.maxMoveWarnings = 3;
        this.modelsLoaded = false;
        this.active = false;
        this.submitted = false;
        this.lastDetections = [];
        this.isViolated = false;
        this.scanY = 0;

        // Debounce counters
        this.absentFrames = 0;
        this.gazeAwayFrames = 0;
        this.lastViolationType = null;
        this.lastViolationTime = 0;

        // Restore persisted warning count
        if (this.moveWarningLabel && this.moveWarnings > 0) {
            this.moveWarningLabel.innerText = `${this.moveWarnings} / 3`;
        }

        // Wire up start button explicitly
        if (this.startBtn) {
            this.startBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.start();
            });
        }

        this.loadModels();
    }

    // ─── MODEL LOADING ─────────────────────────
    async loadModels() {
        // Wait for face-api.js CDN script to load
        const maxWait = 20000;
        const start = Date.now();
        while (typeof faceapi === 'undefined' && Date.now() - start < maxWait) {
            await new Promise(r => setTimeout(r, 300));
        }

        if (typeof faceapi === 'undefined') {
            console.error('[AI] face-api.js failed to load from CDN after 20s');
            if (this.startBtn) this.startBtn.innerText = 'AI LOAD FAILED';
            return;
        }

        try {
            console.log('[AI] Loading neural networks...');
            await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
            await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
            this.modelsLoaded = true;
            console.log('[AI] ✅ Neural networks loaded successfully');
            if (this.startBtn) this.startBtn.innerText = 'START AI MONITORING';
        } catch (e) {
            console.error('[AI] Model load error:', e);
            if (this.startBtn) this.startBtn.innerText = 'MODEL ERROR — RETRY';
        }
    }

    // ─── START PROCTORING ──────────────────────
    async start() {
        if (this.active) return;
        if (!this.modelsLoaded) {
            alert('AI models are still loading. Please wait a moment and try again.');
            return;
        }

        if (this.startBtn) {
            this.startBtn.innerText = 'CONNECTING...';
            this.startBtn.disabled = true;
        }

        // ═══ FULLSCREEN FIRST ═══
        try {
            if (!document.fullscreenElement) {
                await document.documentElement.requestFullscreen();
            }
        } catch (e) { console.warn('[FS] Denied:', e.message); }

        try {
            // Get camera stream with NATIVE resolution for maximum hardware compatibility
            // This prevents the common 'aspect ratio crop mismatch' bug forcing 640x480 causes
            let stream;
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'user' },
                    audio: true
                });
            } catch (_) {
                console.warn('[AI] Mic denied, video-only mode');
                stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'user' }
                });
            }

            this.video.srcObject = stream;
            this.stream = stream;

            // ═══ CRITICAL: Wait for video to be truly ready ═══
            await this.waitForVideoReady();

            this.active = true;
            if (this.startOverlay) this.startOverlay.style.display = 'none';
            if (this.statusLabel) this.statusLabel.classList.remove('hidden');

            // Set canvas size to match actual video dimensions
            const vw = this.video.videoWidth || 640;
            const vh = this.video.videoHeight || 480;
            this.canvas.width = vw;
            this.canvas.height = vh;
            console.log(`[AI] Video dimensions: ${vw}x${vh}`);

            // Start audio monitoring
            this.setupAudio(stream);

            // Start detection (single-threaded loop)
            this.runDetectionLoop();

            // Start drawing loop
            this.runDrawLoop();

            console.log('[AI] ✅ Proctoring active — face detection running');
        } catch (err) {
            console.error('[AI] Camera access failed:', err);
            alert('Camera access is required for this exam. Please allow camera access and refresh the page.');
            if (this.startBtn) { this.startBtn.innerText = 'RETRY CAMERA'; this.startBtn.disabled = false; }
        }
    }

    // ─── WAIT FOR VIDEO READY ──────────────────
    waitForVideoReady() {
        return new Promise((resolve) => {
            const tryPlay = () => {
                this.video.play().then(resolve).catch(() => {
                    setTimeout(tryPlay, 200);
                });
            };

            if (this.video.readyState >= 3) {
                // HAVE_FUTURE_DATA or more — ready to play
                return tryPlay();
            }

            const handler = () => {
                this.video.removeEventListener('canplay', handler);
                tryPlay();
            };
            this.video.addEventListener('canplay', handler);

            // Safety timeout
            setTimeout(() => {
                this.video.removeEventListener('canplay', handler);
                tryPlay();
            }, 5000);
        });
    }

    // ─── DETECTION LOOP (single-threaded, no overlap) ────
    async runDetectionLoop() {
        // Grace period: let student settle for 4 seconds
        await new Promise(r => setTimeout(r, 4000));
        console.log('[AI] Detection loop started');

        while (this.active && !this.submitted) {
            try {
                if (!this.video.paused && this.video.readyState >= 2) {
                    // Adaptive: use faster scan normally, deep scan when face is lost
                    const inputSize = (this.absentFrames > 2) ? 416 : 320;
                    const options = new faceapi.TinyFaceDetectorOptions({
                        inputSize: inputSize,
                        scoreThreshold: 0.15  // VERY LOW threshold to heavily favor capturing any dark edges as a face
                    });

                    const dets = await faceapi.detectAllFaces(this.video, options).withFaceLandmarks();
                    this.lastDetections = dets;
                    this.isViolated = false;

                    if (dets.length === 0) {
                        // ─── NO FACE: require 6 consecutive misses (~5 seconds) ───
                        this.absentFrames++;
                        this.gazeAwayFrames = 0;

                        if (this.absentFrames >= 6) {
                            this.isViolated = true;
                            this.triggerViolation('ABSENT', 'No face detected in camera');
                            this.setStatus('FACE LOST', '#ef4444');
                            this.absentFrames = 0;
                        } else {
                            this.setStatus('SEARCHING...', '#f59e0b');
                        }
                    } else if (dets.length > 1) {
                        // ─── MULTIPLE FACES: instant violation ───
                        this.absentFrames = 0;
                        this.gazeAwayFrames = 0;
                        this.isViolated = true;
                        this.triggerViolation('MULTIPLE_FACES', `${dets.length} faces detected`);
                        this.setStatus('MULTIPLE FACES', '#ef4444');
                    } else {
                        // ─── SINGLE FACE FOUND ───
                        this.absentFrames = 0;
                        const det = dets[0];
                        const confidence = Math.round(det.detection.score * 100);

                        const gaze = this.checkGaze(det.landmarks);
                        if (gaze !== 'CENTER') {
                            this.gazeAwayFrames++;
                            if (this.gazeAwayFrames >= 4) {
                                this.isViolated = true;
                                this.triggerViolation('EYE_AWAY', `Looking ${gaze}`);
                                this.gazeAwayFrames = 0;
                            } else {
                                this.setStatus(`AI TRACKING (${confidence}%)`, '#10b981');
                            }
                        } else {
                            this.gazeAwayFrames = 0;
                            this.setStatus(`AI TRACKING (${confidence}%)`, '#10b981');
                        }
                    }
                }
            } catch (e) {
                console.warn('[AI] Detection error:', e.message);
            }

            // Wait 800ms before next detection
            await new Promise(r => setTimeout(r, 800));
        }
    }

    // ─── GAZE ANALYSIS ─────────────────────────
    checkGaze(landmarks) {
        try {
            const nose = landmarks.getNose()[0];
            const lEye = landmarks.getLeftEye()[0];
            const rEye = landmarks.getRightEye()[0];
            const jaw = landmarks.getJawOutline();

            const faceWidth = Math.abs(jaw[16].x - jaw[0].x);
            if (faceWidth < 30) return 'CENTER'; // Face too small/far, skip

            // Horizontal gaze — WIDER thresholds to allow natural head movement
            const center = (lEye.x + rEye.x) / 2;
            const hDiff = (nose.x - center) / faceWidth;
            if (hDiff > 0.30) return 'LEFT';
            if (hDiff < -0.30) return 'RIGHT';

            // Vertical gaze
            const eyeAvgY = (lEye.y + rEye.y) / 2;
            const vDiff = (nose.y - eyeAvgY) / faceWidth;
            if (vDiff < 0.02) return 'DOWN';
            if (vDiff > 0.70) return 'UP';

            return 'CENTER';
        } catch (e) {
            return 'CENTER'; // On error, don't penalize
        }
    }

    // ─── SNAPSHOT CAPTURE ──────────────────────
    captureSnapshot() {
        if (!this.video || !this.active) return null;
        try {
            const snapCanvas = document.createElement('canvas');
            // Scale down to 320x240 for storage efficiency
            snapCanvas.width = 320;
            snapCanvas.height = Math.round((this.video.videoHeight / this.video.videoWidth) * 320) || 240;
            const ctx = snapCanvas.getContext('2d');
            
            // Draw video to canvas (this effectively mirrors it back correctly)
            ctx.translate(snapCanvas.width, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(this.video, 0, 0, snapCanvas.width, snapCanvas.height);
            
            // Output as JPEG
            return snapCanvas.toDataURL('image/jpeg', 0.4);
        } catch (e) {
            console.error('[AI] Snapshot failed', e);
            return null;
        }
    }

    // ─── VIOLATION HANDLER (with cooldown) ─────
    triggerViolation(type, msg) {
        if (this.submitted) return;

        // 4-second cooldown between violations of the same type
        if (this.lastViolationType === type && Date.now() - this.lastViolationTime < 4000) return;

        this.lastViolationType = type;
        this.lastViolationTime = Date.now();
        this.moveWarnings++;

        console.warn(`[SECURITY] ${type}: ${msg} | Warnings: ${this.moveWarnings}/${this.maxMoveWarnings}`);

        // Update UI
        if (this.moveWarningLabel) {
            this.moveWarningLabel.innerText = `${this.moveWarnings} / ${this.maxMoveWarnings}`;
            this.moveWarningLabel.classList.add('text-red-500');
        }

        this.logIncident(`${type}: ${msg} (${this.moveWarnings}/${this.maxMoveWarnings})`);

        // Capture snapshot for the database
        const snapshot = ['EYE_AWAY', 'ABSENT', 'MULTIPLE_FACES', 'AI_EYE_AWAY', 'AI_ABSENT', 'AI_MULTIPLE_FACES'].includes(type) ? this.captureSnapshot() : null;

        // Report to server
        const examId = new URLSearchParams(window.location.search).get('id');
        fetch('/api/flag-violation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                exam_id: examId,
                violation_type: type,
                details: { message: msg, warning_count: this.moveWarnings },
                image_data: snapshot
            })
        }).catch(e => console.error('[AI] Failed to report violation:', e));

        // Show notification
        const remaining = this.maxMoveWarnings - this.moveWarnings;
        const notifMsg = remaining <= 0
            ? '🚨 MAXIMUM VIOLATIONS — AUTO SUBMITTING'
            : remaining === 1
                ? '⚠️ FINAL WARNING: Next violation will auto-submit your exam!'
                : `🚨 PROCTOR WARNING (${this.moveWarnings}/${this.maxMoveWarnings}): ${msg}`;

        if (window.examSecurity) {
            window.examSecurity.notify(notifMsg, remaining <= 0 ? 'critical' : 'error');
        }

        // Auto-submit at max warnings
        if (this.moveWarnings >= this.maxMoveWarnings) {
            this.submitted = true;
            if (window.examSecurity) {
                window.examSecurity.autoSubmit(`AI_PROCTOR: ${type} — ${this.moveWarnings} violations`);
            }
        }
    }

    // ─── DRAWING LOOP ──────────────────────────
    runDrawLoop() {
        const draw = () => {
            if (!this.active) return;
            this.render();
            requestAnimationFrame(draw);
        };
        requestAnimationFrame(draw);
    }

    render() {
        if (!this.canvas) return;
        const ctx = this.canvas.getContext('2d');
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const color = this.isViolated ? '#ef4444' : '#10b981';

        // Scan line effect
        this.scanY = (this.scanY + 2) % this.canvas.height;
        ctx.strokeStyle = color + '22';
        ctx.beginPath();
        ctx.moveTo(0, this.scanY);
        ctx.lineTo(this.canvas.width, this.scanY);
        ctx.stroke();

        if (this.lastDetections.length > 0) {
            const resized = faceapi.resizeResults(this.lastDetections, {
                width: this.canvas.width,
                height: this.canvas.height
            });

            resized.forEach(d => {
                const { x, y, width, height } = d.detection.box;

                // Mirror X to compensate for CSS scale-x-[-1]
                const mx = this.canvas.width - x - width;

                // Bounding box
                ctx.strokeStyle = color;
                ctx.lineWidth = 2;
                ctx.strokeRect(mx, y, width, height);

                // Corner brackets (professional look)
                const cornerLen = Math.min(width, height) * 0.2;
                ctx.lineWidth = 3;
                // Top-left
                ctx.beginPath(); ctx.moveTo(mx, y + cornerLen); ctx.lineTo(mx, y); ctx.lineTo(mx + cornerLen, y); ctx.stroke();
                // Top-right
                ctx.beginPath(); ctx.moveTo(mx + width - cornerLen, y); ctx.lineTo(mx + width, y); ctx.lineTo(mx + width, y + cornerLen); ctx.stroke();
                // Bottom-left
                ctx.beginPath(); ctx.moveTo(mx, y + height - cornerLen); ctx.lineTo(mx, y + height); ctx.lineTo(mx + cornerLen, y + height); ctx.stroke();
                // Bottom-right
                ctx.beginPath(); ctx.moveTo(mx + width - cornerLen, y + height); ctx.lineTo(mx + width, y + height); ctx.lineTo(mx + width, y + height - cornerLen); ctx.stroke();

                // Semi-transparent fill
                ctx.fillStyle = color + '08';
                ctx.fillRect(mx, y, width, height);

                // Label
                ctx.fillStyle = color;
                ctx.font = 'bold 9px sans-serif';
                const label = 'AI VERIFIED (' + Math.round(d.detection.score * 100) + '%)';
                ctx.fillText(label, mx + 4, y - 6);

                // Landmark dots
                ctx.fillStyle = color + '80';
                d.landmarks.positions.forEach(p => {
                    const mpx = this.canvas.width - p.x;
                    ctx.beginPath();
                    ctx.arc(mpx, p.y, 1, 0, 2 * Math.PI);
                    ctx.fill();
                });
            });
        }
    }

    // ─── AUDIO MONITORING ──────────────────────
    setupAudio(stream) {
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const analyser = audioCtx.createAnalyser();
            audioCtx.createMediaStreamSource(stream).connect(analyser);
            const data = new Uint8Array(analyser.frequencyBinCount);

            const tick = () => {
                if (!this.active) return;
                analyser.getByteFrequencyData(data);
                const avg = data.reduce((a, b) => a + b) / data.length;
                const pct = Math.min(100, Math.round(avg * 2.5));
                if (this.micBar) this.micBar.style.width = pct + '%';
                if (this.micScore) this.micScore.innerText = pct + '%';
                requestAnimationFrame(tick);
            };
            tick();
        } catch (e) {
            console.warn('[AI] Audio setup skipped:', e.message);
        }
    }

    // ─── HELPERS ───────────────────────────────
    setStatus(text, color) {
        if (this.statusText) this.statusText.innerText = text;
        if (this.statusPulse) this.statusPulse.style.background = color;
    }

    logIncident(text) {
        if (!this.logs) return;
        const div = document.createElement('div');
        div.className = 'text-[9px] border-b border-slate-800 pb-2 text-slate-400';
        div.innerHTML = `<span class="text-indigo-400 font-bold">[${new Date().toLocaleTimeString()}]</span> ${text}`;
        if (this.logs.innerText.includes('No Incidents')) this.logs.innerHTML = '';
        this.logs.prepend(div);
    }
}


// ═══════════════════════════════════════════
//  BOOTSTRAP
// ═══════════════════════════════════════════
function bootstrap() {
    if (window.proctorInited) return;
    window.proctorInited = true;

    window.faceProctor = new FaceProctor();
    window.examSecurity = new ExamSecurity();

    console.log('[SYSTEM] ✅ Security + Proctoring initialized');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
} else {
    bootstrap();
}
