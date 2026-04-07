import React, { useState, useEffect } from 'react';
import ProctorCamera from '../components/ProctorCamera';
import { useSimpleProctoring } from '../hooks/useSimpleProctoring';
import { sessionService } from '../services/sessionService';

/**
 * Production-ready Exam Page with full proctoring and attempt locking
 */
const ExamPage = ({ userId = 1, examId = 27 }) => {
    const [canStart, setCanStart] = useState(null); // null, loading, true, false
    const [errorMessage, setErrorMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Simple Proctoring Hook
    const { videoRef, warnings, status, isAbsent, lastWarning } = useSimpleProctoring(userId, examId);

    // 1. Check Attempt Status on Init
    useEffect(() => {
        const validate = async () => {
            setCanStart('loading');
            const result = await sessionService.checkAttemptStatus(userId, examId);
            
            if (result.canStart) {
                // LOCK THE ATTEMPT: Initialize 'in_progress' session
                await sessionService.startSession(userId, examId);
                setCanStart(true);
            } else {
                setCanStart(false);
                setErrorMessage(result.error);
            }
        };
        validate();
    }, [userId, examId]);

    const handleSubmit = async () => {
        setIsSubmitting(true);
        // FINAL LOCK: Update status to 'completed'
        await sessionService.completeSession(userId, examId);
        alert("Exam Submitted Successfully!");
        window.location.reload(); // Redirect to results
    };

    if (canStart === 'loading' || canStart === null) {
        return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Validating Security Session...</div>;
    }

    if (canStart === false) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
                <div className="bg-white/10 p-8 rounded-2xl max-w-md w-full text-center backdrop-blur-xl border border-white/10 shadow-2xl">
                    <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    </div>
                    <h2 className="text-2xl font-bold font-sans text-white mb-2">Access Denied</h2>
                    <p className="text-slate-400 mb-8">{errorMessage}</p>
                    <button className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-xl transition-colors w-full font-medium shadow-lg">Return to Dashboard</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col font-sans uppercase">
            {/* Header */}
            <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-8 shadow-md">
                <h1 className="text-slate-100 font-bold tracking-tight">ONLINE EXAMINATION : CORE JAVA</h1>
                <div className="flex items-center gap-4">
                    <div className="bg-slate-800 px-4 py-2 rounded-lg text-emerald-400 text-sm font-mono tracking-widest leading-none">00:59:45 LEFT</div>
                    <button onClick={handleSubmit} disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg transition-all font-bold tracking-wide shadow-lg active:scale-95 disabled:opacity-50">FINISH EXAM</button>
                </div>
            </header>

            {/* Main Layout */}
            <main className="flex-1 flex overflow-hidden">
                {/* Dashboard: Left Side (Proctoring) */}
                <aside className="w-[380px] bg-slate-900/50 border-r border-slate-800 p-8 flex flex-col gap-8 custom-scroll overflow-y-auto">
                    <section className="space-y-4">
                        <h3 className="text-slate-400 text-xs font-bold tracking-widest uppercase">Live Surveillance Feed</h3>
                        <ProctorCamera videoRef={videoRef} isAbsent={isAbsent} isLoading={status === 'initializing'} status={status} lightingWarning={false} />
                        {lastWarning && <div className="bg-amber-500/10 text-amber-500 p-3 rounded-lg text-xs font-bold leading-relaxed border border-amber-500/20">WARNING: {lastWarning}</div>}
                        {status === 'error' && <div className="bg-red-500/10 text-red-500 p-3 rounded-lg text-xs leading-relaxed border border-red-500/20">Camera Error. Please allow permissions.</div>}
                    </section>

                    <section className="space-y-4">
                        <h3 className="text-slate-400 text-xs font-bold tracking-widest uppercase">Security Incidents</h3>
                        <div className="bg-slate-900 rounded-xl p-5 border border-slate-800/50 shadow-inner">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-slate-100 font-bold text-sm">TOTAL VIOLATIONS</span>
                                <span className={`text-xl font-black ${warnings > 2 ? 'text-red-500' : 'text-emerald-500'}`}>{warnings}/3</span>
                            </div>
                            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                <div className={`h-full transition-all duration-500 rounded-full ${warnings > 2 ? 'bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.5)]' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'}`} style={{ width: `${(warnings / 3) * 100}%` }}></div>
                            </div>
                        </div>
                    </section>
                </aside>

                {/* Content: Right Side (Exam Questions) */}
                <section className="flex-1 p-12 overflow-y-auto bg-grid-slate-800/20 relative">
                    <div className="max-w-3xl mx-auto space-y-10">
                        <div className="bg-slate-900 p-10 rounded-3xl border border-slate-800/50 shadow-2xl">
                            <h2 className="text-2xl font-bold font-sans text-white mb-8 border-l-4 border-emerald-500 pl-6">What is the output of <span className="text-emerald-400">System.out.println(10 + 20 + "Java")</span>?</h2>
                            <div className="grid gap-4">
                                {['30Java', '1020Java', 'Java30', 'Error'].map((opt, i) => (
                                    <button key={i} className="group flex items-center gap-6 p-6 rounded-2xl bg-slate-800/50 hover:bg-emerald-500/10 border border-slate-700 hover:border-emerald-500/50 transition-all text-left">
                                        <div className="w-10 h-10 rounded-xl bg-slate-700 group-hover:bg-emerald-500/20 text-slate-400 group-hover:text-emerald-400 flex items-center justify-center font-bold font-mono transition-all border border-slate-600/50">{String.fromCharCode(65 + i)}</div>
                                        <span className="text-slate-200 group-hover:text-white font-medium transition-all">{opt}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex justify-between items-center px-4">
                            <button className="text-slate-400 hover:text-white flex items-center gap-2 font-bold font-sans transition-all py-2 px-4 hover:bg-slate-800/50 rounded-lg">PREVIOUS QUESTION</button>
                            <button className="bg-emerald-600 hover:bg-emerald-500 text-white px-10 py-4 rounded-xl font-bold tracking-wide shadow-lg shadow-emerald-900/20 active:scale-95 transition-all">NEXT QUESTION</button>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
};

export default ExamPage;
