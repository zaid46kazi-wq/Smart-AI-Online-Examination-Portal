import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, AlertCircle, ShieldCheck, User, Users, History, Activity } from 'lucide-react';
import { detectFaces, drawDetections, loadProctoringModels } from '../utils/faceDetection';
import { logViolation } from '../services/supabaseClient';

const ProctoringPanel = ({ userId = 'student_demo', onStatusChange }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isModelsLoaded, setIsModelsLoaded] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [detections, setDetections] = useState([]);
  const [violations, setViolations] = useState([]);
  const [status, setStatus] = useState('initializing'); // initializing, active, warning, critical

  // Rule C: Tab Switching & Rule D: Window Blur
  useEffect(() => {
    const handleVis = () => {
      if (document.visibilityState === 'hidden') {
        const msg = 'Tab Switch Detected';
        setViolations(prev => [{ id: Date.now(), type: 'TAB_SWITCH', msg, time: new Date().toLocaleTimeString() }, ...prev]);
        logViolation(userId, 'TAB_SWITCH');
      }
    };
    const handleBlur = () => {
      const msg = 'Window Focus Lost';
      setViolations(prev => [{ id: Date.now(), type: 'WINDOW_BLUR', msg, time: new Date().toLocaleTimeString() }, ...prev]);
      logViolation(userId, 'WINDOW_BLUR');
    };

    document.addEventListener('visibilitychange', handleVis);
    window.addEventListener('blur', handleBlur);
    return () => {
      document.removeEventListener('visibilitychange', handleVis);
      window.removeEventListener('blur', handleBlur);
    };
  }, [userId]);

  // Video and AI logic
  useEffect(() => {
    const init = async () => {
      try {
        await loadProctoringModels();
        setIsModelsLoaded(true);
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: 320, height: 240, frameRate: 15 } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => setIsCameraReady(true);
        }
      } catch (e) {
        setStatus('critical');
      }
    };
    init();
    return () => {
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // Real-time Detection Loop
  useEffect(() => {
    let intervalId;
    if (isCameraReady && isModelsLoaded) {
      setStatus('active');
      intervalId = setInterval(async () => {
        if (!videoRef.current) return;
        const results = await detectFaces(videoRef.current);
        setDetections(results || []);
        
        if (canvasRef.current) drawDetections(canvasRef.current, videoRef.current, results);

        // Rule A & B Enforcement
        if (results?.length === 0) {
          setStatus('warning');
          // Note: Full violation log for No Face usually happens after a few seconds of absence
        } else if (results?.length > 1) {
          setStatus('critical');
          const msg = 'Multiple Faces Detected';
          if (!violations.some(v => v.type === 'MULTIPLE_FACES' && Date.now() - v.id < 5000)) {
            setViolations(prev => [{ id: Date.now(), type: 'MULTIPLE_FACES', msg, time: new Date().toLocaleTimeString() }, ...prev]);
            logViolation(userId, 'MULTIPLE_FACES');
          }
        } else {
          setStatus('active');
        }
      }, 500);
    }
    return () => clearInterval(intervalId);
  }, [isCameraReady, isModelsLoaded, userId, violations]);

  return (
    <div className="w-[300px] h-screen fixed right-0 top-0 bg-slate-950 border-l border-slate-800 flex flex-col shadow-2xl z-50 overflow-hidden font-['Inter']">
      
      {/* Header */}
      <div className="p-4 bg-slate-900/50 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className={`w-5 h-5 ${status === 'active' ? 'text-emerald-500' : 'text-amber-500'}`} />
          <h2 className="text-white font-bold text-sm uppercase tracking-wider">AI Proctoring</h2>
        </div>
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${status === 'active' ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse`}></div>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Live</span>
        </div>
      </div>

      {/* Camera Feed Section */}
      <div className="p-4 space-y-4">
        <div className={`relative aspect-video bg-black rounded-xl overflow-hidden border-2 transition-colors duration-300 ${
          status === 'active' ? 'border-emerald-500/30' : 
          status === 'warning' ? 'border-amber-500/50 animate-pulse' : 
          'border-red-500/50 animate-pulse'
        }`}>
          <video 
            ref={videoRef} autoPlay playsInline muted 
            className="w-full h-full object-cover grayscale-[20%]" 
          />
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
          
          {/* Overlay Status Icon */}
          <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md p-1.5 rounded-lg border border-white/10">
            {detections.length === 1 ? <User className="w-4 h-4 text-emerald-400" /> : 
             detections.length > 1 ? <Users className="w-4 h-4 text-red-400" /> : 
             <AlertCircle className="w-4 h-4 text-amber-400" />}
          </div>
        </div>

        {/* Status Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex flex-col items-center justify-center gap-1">
            <span className="text-slate-500 text-[9px] font-bold uppercase tracking-widest">Face Match</span>
            <span className={`text-xs font-bold ${detections.length === 1 ? 'text-emerald-400' : 'text-red-400'}`}>
              {detections.length === 1 ? 'Verified' : 'Unstable'}
            </span>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex flex-col items-center justify-center gap-1">
            <span className="text-slate-500 text-[9px] font-bold uppercase tracking-widest">Atmosphere</span>
            <span className={`text-xs font-bold ${detections.length <= 1 ? 'text-emerald-400' : 'text-red-400'}`}>
              {detections.length > 1 ? 'Compromised' : 'Secure'}
            </span>
          </div>
        </div>
      </div>

      {/* Violation Log Section */}
      <div className="flex-1 px-4 pb-4 overflow-hidden flex flex-col">
        <div className="flex items-center gap-2 mb-3 text-slate-500 uppercase text-[10px] font-black tracking-[0.2em] px-1">
          <History className="w-3.5 h-3.5" />
          Real-time Event Log
        </div>
        
        <div className="flex-1 bg-slate-900/30 rounded-2xl border border-slate-800 p-3 overflow-y-auto space-y-2 custom-scrollbar">
          {violations.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-2">
              <Activity className="w-8 h-8 opacity-20" />
              <p className="text-[10px] font-bold uppercase tracking-tighter">No incidents recorded</p>
            </div>
          ) : (
            violations.map(v => (
              <div key={v.id} className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex flex-col gap-1.5 animate-in slide-in-from-right duration-500">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black text-red-400 uppercase tracking-widest">⚠ Violation</span>
                  <span className="text-[8px] font-medium text-slate-500 uppercase">{v.time}</span>
                </div>
                <p className="text-xs text-white font-bold leading-tight uppercase tracking-tight">{v.msg}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-4 bg-slate-900/80 border-t border-slate-800 flex flex-col gap-1 text-center">
        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Monitoring ID: {userId}</p>
        <p className="text-[8px] font-medium text-amber-500 leading-tight">Every action is recorded for audit purposes.</p>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default ProctoringPanel;
