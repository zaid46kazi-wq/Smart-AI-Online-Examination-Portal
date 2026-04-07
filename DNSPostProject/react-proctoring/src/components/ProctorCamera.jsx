import React, { useEffect, useRef } from 'react';

/**
 * Component to display the webcam and AI detection overlay
 */
const ProctorCamera = ({ videoRef, isAbsent, isLoading, status, lightingWarning }) => {
    const canvasRef = useRef(null);

    // Bounding Box Drawing Logic
    useEffect(() => {
        if (!videoRef.current || !canvasRef.current) return;
        
        const draw = () => {
            if (!videoRef.current || !canvasRef.current || !window.faceapi) return;
            
            const context = canvasRef.current.getContext('2d');
            context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            
            // Mirror logic for drawing: Since video is scale-x-[-1], math must flip
            // For simplicity, we wrap the canvas in a container that mirrors it
            // See the CSS below.
            
            requestAnimationFrame(draw);
        };
        requestAnimationFrame(draw);
    }, [videoRef]);

    return (
        <div className="relative w-[320px] h-[240px] bg-slate-900 rounded-xl overflow-hidden shadow-2xl border-2 border-slate-700">
            {/* Mirror Stream via CSS */}
            <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
            />
            
            {/* Mirror Canvas via CSS to align with video */}
            <canvas
                ref={canvasRef}
                width={320}
                height={240}
                className="absolute inset-0 w-full h-full pointer-events-none scale-x-[-1]"
            />

            {/* Status Overlays */}
            {isLoading && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <span className="text-white text-sm font-medium">Initializing AI...</span>
                </div>
            )}

            {lightingWarning && !isAbsent && !isLoading && (
                <div className="absolute top-3 right-3 bg-amber-500/90 text-white px-2 py-1 rounded text-[10px] font-bold uppercase shadow">
                    Low Lighting
                </div>
            )}

            <div className={`absolute bottom-3 left-3 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                isAbsent ? 'bg-red-500 text-white' : 'bg-emerald-500/90 text-white'
            }`}>
                {status === 'active' ? (isAbsent ? 'FACE NOT DETECTED' : 'AI SECURED') : 'INITIALIZING'}
            </div>
        </div>
    );
};

export default ProctorCamera;
