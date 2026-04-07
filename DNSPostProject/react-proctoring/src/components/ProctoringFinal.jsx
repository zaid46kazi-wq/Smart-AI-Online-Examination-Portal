import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  ShieldAlert, Camera, Mic, Maximize, AlertTriangle, 
  History, Activity, ShieldCheck, UserX, UserCheck, Eye, 
  CheckCircle, Trash2, Send
} from 'lucide-react';
import * as faceapi from 'face-api.js';
import { loadProctoringModels, drawDetections } from '../utils/faceDetection';
import { calculateGaze, isLookingAway } from '../utils/gazeTracking';
import { initAudioDetection, startAudioAnalysis } from '../utils/audioDetection';
import { captureScreenFrame, uploadEvidence } from '../utils/captureFrame';
import { logViolation } from '../services/supabaseClient';

const ProctoringFinal = ({ userId = 'STUDENT_X', onExamSubmit }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
  // States
  const [status, setStatus] = useState('secure'); 
  const [isExamActive, setIsExamActive] = useState(true); // AUTO START
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  // Warning Counters
  const [moveWarnings, setMoveWarnings] = useState(0);
  const [tabWarnings, setTabWarnings] = useState(0);
  const [voiceWarnings, setVoiceWarnings] = useState(0);
  
  const [stats, setStats] = useState({ face: 'None', audio: 'Silent', gaze: 'Center' });
  const [violations, setViolations] = useState([]);
  const [isModelsLoaded, setIsModelsLoaded] = useState(false);

  // 1. Violation Handler with thresholds
  const handleViolation = useCallback(async (type, msg) => {
    if (isSubmitted) return;

    const now = Date.now();
    // Throttle double logs
    if (violations.some(v => v.type === type && now - v.id < 4000)) return;

    const evidenceUrl = await captureAndUpload(type);
    const newViolation = { id: now, type, msg, time: new Date().toLocaleTimeString(), evidenceUrl };
    setViolations(prev => [newViolation, ...prev]);

    // Counter Mapping
    if (type === 'LOOKING_AWAY' || type === 'NO_FACE') {
      setMoveWarnings(prev => {
        const next = prev + 1;
        if (next >= 3) triggerAutoSubmit('MAX_MOVEMENT_VIOLATIONS');
        return next;
      });
    }
    if (type === 'TAB_SWITCH' || type === 'WINDOW_BLUR') {
      setTabWarnings(prev => {
        const next = prev + 1;
        if (next >= 2) triggerAutoSubmit('MAX_TAB_VIOLATIONS');
        return next;
      });
    }
    if (type === 'TALKING') setVoiceWarnings(prev => prev + 1);
    if (type === 'MULTIPLE_FACES') triggerAutoSubmit('CRITICAL_MULTIPLE_FACES');

    logViolation(userId, type, { msg, moveWarnings, tabWarnings, evidenceUrl });
  }, [userId, violations, isSubmitted]);

  const triggerAutoSubmit = (reason) => {
    if (isSubmitted) return;
    setIsSubmitted(true);
    setStatus('terminated');
    console.warn('Auto-Submitting Exam due to:', reason);
    if (onExamSubmit) onExamSubmit(reason);
  };

  const captureAndUpload = async (type) => {
    try {
      const blob = await captureScreenFrame(videoRef.current);
      return await uploadEvidence(userId, type, blob);
    } catch (e) { return null; }
  };

  // 2. Main Detection Loop (Optimized)
  useEffect(() => {
    let loopId;
    const runAI = async () => {
      if (!videoRef.current || !isExamActive || isSubmitted) return;
      
      const detections = await faceapi.detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 160 }))
        .withFaceLandmarks();
      
      if (canvasRef.current) drawDetections(canvasRef.current, videoRef.current, detections);

      if (detections.length === 0) {
        setStats(s => ({ ...s, face: 'Missing' }));
        handleViolation('NO_FACE', 'Face missing from camera');
      } else if (detections.length > 1) {
        setStats(s => ({ ...s, face: 'Multiple' }));
        handleViolation('MULTIPLE_FACES', 'Multiple people detected');
      } else {
        setStats(s => ({ ...s, face: 'Verified' }));
        const gazePos = calculateGaze(detections[0].landmarks);
        setStats(s => ({ ...s, gaze: gazePos }));
        if (isLookingAway(gazePos)) {
          handleViolation('LOOKING_AWAY', `User looking ${gazePos}`);
        }
      }

      loopId = setTimeout(runAI, 400);
    };

    if (isModelsLoaded) runAI();
    return () => clearTimeout(loopId);
  }, [isModelsLoaded, isExamActive, isSubmitted, handleViolation]);

  // 3. System Lock (Auto Start)
  useEffect(() => {
    const lockSystem = () => {
      if (document.hidden) handleViolation('TAB_SWITCH', 'Switched Tabs Detected');
      if (!document.fullscreenElement && isExamActive) {
         handleViolation('EXIT_FULLSCREEN', 'Exited Fullscreen Mode');
      }
    };
    
    document.addEventListener('visibilitychange', lockSystem);
    document.addEventListener('fullscreenchange', lockSystem);
    window.addEventListener('blur', () => handleViolation('WINDOW_BLUR', 'Focus Lost (Window Focus)'));
    
    // Auto-request fullscreen
    const requestFs = () => {
        document.documentElement.requestFullscreen().catch(() => {});
    };
    if (isExamActive) requestFs();

    return () => {
      document.removeEventListener('visibilitychange', lockSystem);
      document.removeEventListener('fullscreenchange', lockSystem);
    };
  }, [isExamActive, handleViolation]);

  // Initialization
  useEffect(() => {
    const init = async () => {
      await loadProctoringModels();
      setIsModelsLoaded(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
      
      const { analyzer, cleanup } = await initAudioDetection();
      startAudioAnalysis(analyzer, (voice) => {
          if (voice) {
              setStats(s => ({...s, audio: 'Talking'}));
              handleViolation('TALKING', 'User Voice Detected');
          } else {
              setStats(s => ({...s, audio: 'Silent'}));
          }
      });
    };
    init();
  }, []);

  if (isSubmitted) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center z-[9999] p-10 text-center animate-in fade-in zoom-in duration-500">
        <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6">
          <Send className="w-12 h-12 text-emerald-500" />
        </div>
        <h1 className="text-4xl font-black text-white mb-4 uppercase tracking-tighter">Exam Submitted</h1>
        <p className="text-slate-400 text-lg max-w-md font-medium leading-relaxed">
          The exam session has ended. Your answers and the AI proctoring report have been successfully submitted to the server.
        </p>
        <button onClick={() => window.location.reload()} className="mt-8 px-8 py-3 bg-indigo-600 font-black text-xs uppercase tracking-widest text-white rounded-xl shadow-lg shadow-indigo-500/20">Return Home</button>
      </div>
    );
  }

  return (
    <div className="w-[300px] h-screen fixed right-0 top-0 bg-slate-950 border-l border-slate-800 flex flex-col shadow-2xl z-50 overflow-hidden font-sans">
      
      {/* Dynamic Header */}
      <div className="p-5 border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-white font-black text-xs tracking-wider uppercase leading-none">AI Agent</h2>
            <p className="text-emerald-500 text-[8px] font-black uppercase mt-1 tracking-widest animate-pulse">Live Tracking</p>
          </div>
        </div>
        <div className="text-right">
             <div className="text-slate-500 text-[8px] font-black uppercase mb-1">Status</div>
             <div className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 rounded text-emerald-500 text-[8px] font-black uppercase">Active</div>
        </div>
      </div>

      {/* Main Feed with Eye Tracking Box Placeholder */}
      <div className="p-4">
        <div className={`relative aspect-video rounded-2xl overflow-hidden border-2 transition-all duration-300 ${status === 'secure' ? 'border-slate-800' : 'border-red-500/50 shadow-2xl scale-[1.03]'}`}>
             <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover grayscale-[30%] opacity-80" />
             <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
             
             {/* Eye Box Indicator */}
             <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded border border-white/10 flex items-center gap-1">
                 <Eye className="w-2.5 h-2.5 text-indigo-400" />
                 <span className="text-[8px] text-white font-black uppercase tracking-tighter">Eye-Lock v1</span>
             </div>
        </div>
      </div>

      {/* Real-time Warning Monitors */}
      <div className="px-4 grid grid-cols-2 gap-3 mb-4">
        <div className={`p-3 rounded-2xl border flex flex-col items-center gap-1 transition-all ${moveWarnings > 0 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-slate-900 border-slate-800'}`}>
            <span className="text-slate-500 text-[9px] font-black uppercase tracking-tighter">Move Warnings</span>
            <span className={`text-sm font-black ${moveWarnings > 0 ? 'text-amber-500' : 'text-slate-400'}`}>{moveWarnings} / 3</span>
        </div>
        <div className={`p-3 rounded-2xl border flex flex-col items-center gap-1 transition-all ${tabWarnings > 0 ? 'bg-red-500/10 border-red-500/30' : 'bg-slate-900 border-slate-800'}`}>
            <span className="text-slate-500 text-[9px] font-black uppercase tracking-tighter">Tab Violations</span>
            <span className={`text-sm font-black ${tabWarnings > 0 ? 'text-red-500' : 'text-slate-400'}`}>{tabWarnings} / 2</span>
        </div>
      </div>

      {/* Detailed Status */}
      <div className="mx-4 p-3 bg-slate-900/80 rounded-2xl border border-slate-800 grid grid-cols-3 divide-x divide-slate-800">
           <div className="flex flex-col items-center px-1">
               <span className="text-[7px] text-slate-500 font-black uppercase mb-1">Face</span>
               <span className="text-[9px] text-white font-bold truncate">{stats.face}</span>
           </div>
           <div className="flex flex-col items-center px-1">
               <span className="text-[7px] text-slate-500 font-black uppercase mb-1">Gaze</span>
               <span className="text-[9px] text-white font-bold truncate">{stats.gaze}</span>
           </div>
           <div className="flex flex-col items-center px-1">
               <span className="text-[7px] text-slate-500 font-black uppercase mb-1">Audio</span>
               <span className="text-[9px] text-white font-bold truncate">{stats.audio}</span>
           </div>
      </div>

      {/* Incident Stream */}
      <div className="flex-1 px-4 mt-6 overflow-hidden flex flex-col">
        <div className="flex items-center gap-2 mb-3 text-slate-500 uppercase text-[9px] font-black tracking-[0.2em] px-1">
          <History className="w-3 h-3" />
          Proctoring Log
        </div>
        <div className="flex-1 bg-slate-900/30 rounded-2xl border border-slate-800 p-2 overflow-y-auto space-y-1.5 custom-scroll">
          {violations.map(v => (
            <div key={v.id} className="p-2.5 bg-red-500/5 border border-red-500/10 rounded-xl animate-in slide-in-from-right">
               <div className="flex justify-between items-center mb-0.5">
                   <span className="text-[7px] font-black text-red-500 lowercase">[{v.type}]</span>
                   <span className="text-[7px] text-slate-600">{v.time}</span>
               </div>
               <p className="text-[10px] font-bold text-white uppercase tracking-tighter leading-tight">{v.msg}</p>
            </div>
          ))}
          {violations.length === 0 && <div className="h-full flex items-center justify-center opacity-10 font-black text-xs uppercase tracking-widest italic">Monitoring Secure</div>}
        </div>
      </div>

      <style>{`
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default ProctoringFinal;
