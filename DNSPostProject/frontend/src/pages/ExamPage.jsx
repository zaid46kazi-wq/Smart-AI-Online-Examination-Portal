import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { MediaPipeProctor } from '../components/MediaPipeProctor';
import { apiFetch } from '../services/api';
import { showToast } from '../components/Toast';

export function ExamPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const examId = searchParams.get('id');

    const [loading, setLoading] = useState(true);
    const [loadingQuestions, setLoadingQuestions] = useState(false);
    const [error, setError] = useState('');
    const [exam, setExam] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [answers, setAnswers] = useState({});
    const [timeLeft, setTimeLeft] = useState(0);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [fsWarning, setFsWarning] = useState(false);
    const [isIdentityVerified, setIsIdentityVerified] = useState(false);

    const tabSwitchesRef = useRef(0);
    const fsWarningsRef = useRef(0);

    // Security listeners
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden && !isSubmitted && isIdentityVerified) {
                tabSwitchesRef.current += 1;
                const count = tabSwitchesRef.current;
                showToast(`⚠️ FOCUS LOST: Tab Switch (${count}/2)`, 'error');
                if (count >= 2) submitExam('TAB_SWITCH_VIOLATION');
            }
        };

        const handleFullscreenChange = () => {
            if (!document.fullscreenElement && !isSubmitted && isIdentityVerified) {
                fsWarningsRef.current += 1;
                const count = fsWarningsRef.current;
                setFsWarning(true);
                showToast(`🚨 FULLSCREEN EXIT (${count}/3)`, 'error');
                if (count >= 3) submitExam('FULLSCREEN_VIOLATION');
            }
        };

        const preventCopy = (e) => e.preventDefault();

        document.addEventListener('visibilitychange', handleVisibilityChange);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        ['copy', 'paste', 'cut', 'contextmenu'].forEach(ev => document.addEventListener(ev, preventCopy));

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            ['copy', 'paste', 'cut', 'contextmenu'].forEach(ev => document.removeEventListener(ev, preventCopy));
        };
    }, [isSubmitted, isIdentityVerified]);

    // Step 1: Initial Security & Attempt Check (DO NOT load questions yet unless already verified from page refresh!)
    useEffect(() => {
        if (!examId) return;

        async function checkExamSecurityStatus() {
            try {
                const statusData = await apiFetch(`/api/exam-status/${examId}`);
                if (statusData.already_attempted) {
                    setError('EXAM_ALREADY_ATTEMPTED');
                    setLoading(false);
                    return;
                }

                // Check security status in database for active session (e.g. Page Refresh Restoration)
                const secStatus = await apiFetch(`/api/exam-security-status?exam_id=${examId}`).catch(() => ({}));
                if (secStatus.identity_verified) {
                    // Candidate already completed verification (Page Refresh) -> Unlock Questions & Timer immediately
                    await loadQuestionsAndActivateSession();
                } else {
                    // Candidate NOT verified yet -> Show AI Verification Gatekeeper (DO NOT load questions or start timer)
                    setLoading(false);
                }
            } catch (err) {
                setError(err.message);
                setLoading(false);
            }
        }

        checkExamSecurityStatus();
    }, [examId]);

    // Step 2: Unlocks Exam Questions and Activates Exam Session AFTER Verification Succeeds
    const loadQuestionsAndActivateSession = async () => {
        setLoadingQuestions(true);
        try {
            const data = await apiFetch(`/api/exam-questions/${examId}`);
            setExam(data);
            setQuestions(data.questions || []);
            setTimeLeft((data.time_limit || 60) * 60);
            setIsIdentityVerified(true);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
            setLoadingQuestions(false);
        }
    };

    // Exam Timer Countdown (Starts ONLY after Identity Verification succeeds!)
    useEffect(() => {
        if (timeLeft <= 0 || isSubmitted || loading || !isIdentityVerified) return;
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    submitExam('TIME_EXPIRED');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [timeLeft, isSubmitted, loading, isIdentityVerified]);

    const selectAnswer = (qId, key) => {
        setAnswers(prev => ({ ...prev, [qId]: key }));
    };

    const submitExam = async (reason = 'NORMAL') => {
        if (isSubmitted) return;
        setIsSubmitted(true);

        try {
            const data = await apiFetch('/api/submit', {
                method: 'POST',
                body: JSON.stringify({
                    exam_id: parseInt(examId),
                    answers,
                    autoSubmit: reason !== 'NORMAL',
                    reason
                })
            });
            navigate(`/result?score=${data.score}&total=${data.total_marks}&rid=${data.result_id || ''}`);
        } catch (err) {
            setIsSubmitted(false); // Allow retry on network error
            showToast('Submission error: ' + err.message, 'error');
        }
    };

    const requestFsAndResume = () => {
        document.documentElement.requestFullscreen().then(() => {
            setFsWarning(false);
        }).catch(() => {});
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4"></div>
                    <p className="text-xs font-bold uppercase tracking-widest text-muted">Decrypting Question Paper...</p>
                </div>
            </div>
        );
    }

    if (error === 'EXAM_ALREADY_ATTEMPTED') {
        return (
            <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 40 }}>
                <div style={{ width: 80, height: 80, background: 'var(--color-warning-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                    <span style={{ fontSize: 40 }}>✅</span>
                </div>
                <h1 style={{ fontSize: '1.8rem', marginBottom: '1rem', fontWeight: 800 }}>Exam Already Attempted</h1>
                <p style={{ fontSize: '1rem', color: 'var(--color-text-secondary)', maxWidth: 500, marginBottom: '2rem' }}>You can only attempt each exam once. Your score has been recorded.</p>
                <button onClick={() => navigate('/student')} className="btn btn-primary">Return to Dashboard</button>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center p-8 text-center">
                <div className="card p-8 text-error font-bold">
                    <p>Error loading exam: {error}</p>
                    <button onClick={() => navigate('/student')} className="btn btn-primary mt-4">Back to Dashboard</button>
                </div>
            </div>
        );
    }

    const currentQ = questions[currentIdx];
    const attemptedCount = Object.keys(answers).length;
    const progressPct = questions.length > 0 ? Math.round((attemptedCount / questions.length) * 100) : 0;
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    return (
        <div style={{ userSelect: 'none', overflow: 'hidden', minHeight: '100vh' }}>
            {/* Progress Halo */}
            <div style={{ height: 4, position: 'fixed', top: 0, left: 0, width: '100%', zIndex: 100, background: 'var(--color-border)' }}>
                <div style={{ height: '100%', background: 'var(--color-primary)', width: `${progressPct}%`, transition: 'width 0.3s ease' }}></div>
            </div>

            {/* Top Navigation */}
            <nav className="top-nav" style={{ position: 'fixed', top: 0, left: 0, right: 0 }}>
                <div className="flex items-center gap-4">
                    <span className="font-extrabold text-primary" style={{ fontSize: 16 }}>AGMR EXAM PORTAL</span>
                    <span className="text-xs text-muted">|</span>
                    <span className="text-xs font-bold text-secondary">{exam?.exam_name || 'Active Assessment'}</span>
                </div>
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 px-4 py-1.5 rounded-full" style={{ background: 'var(--color-bg)', border: `1px solid ${!isIdentityVerified ? 'var(--color-border)' : timeLeft <= 300 ? 'var(--color-error)' : 'var(--color-border)'}`, color: timeLeft <= 300 ? 'var(--color-error)' : 'inherit' }}>
                        <span className="material-symbols-outlined text-sm">timer</span>
                        <span className="font-bold text-sm font-mono">
                            {isIdentityVerified ? `${minutes}:${seconds < 10 ? '0' : ''}${seconds}` : 'WAITING VERIFICATION'}
                        </span>
                    </div>
                    <button onClick={() => submitExam('NORMAL')} disabled={!isIdentityVerified} className="btn btn-primary btn-sm">Submit Exam</button>
                </div>
            </nav>

            {/* AI Proctoring MediaPipe Component */}
            <MediaPipeProctor
                examId={examId}
                initViolations={exam?.init_violations || 0}
                onViolation={(type, msg, count) => showToast(`⚠️ PROCTOR WARNING (${count}/3): ${msg}`, 'error')}
                onAutoSubmit={(reason) => submitExam(reason)}
                onIdentityVerified={() => loadQuestionsAndActivateSession()}
            />

            {/* Main Exam Body */}
            <div className="flex" style={{ paddingTop: 64, paddingRight: 340, height: '100vh', overflow: 'hidden' }}>
                {/* Left Palette */}
                <aside style={{ width: 240, background: 'var(--color-surface)', borderRight: '1px solid var(--color-border)', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                        <h3 style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Question Tracker</h3>
                        <p style={{ fontSize: 13, fontWeight: 800 }}>{attemptedCount} of {questions.length} attempted</p>
                    </div>
                    <div className="custom-scroll" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, overflowY: 'auto', maxHeight: '60vh' }}>
                        {questions.map((q, i) => {
                            let btnClass = 'btn btn-ghost btn-sm';
                            if (i === currentIdx) btnClass = 'btn btn-primary btn-sm';
                            else if (answers[q.id]) btnClass = 'btn btn-secondary btn-sm';
                            return (
                                <button key={i} onClick={() => isIdentityVerified && setCurrentIdx(i)} disabled={!isIdentityVerified} className={btnClass} style={{ padding: 8 }}>
                                    {i + 1}
                                </button>
                            );
                        })}
                    </div>
                </aside>

                {/* Question View Area */}
                <main className="custom-scroll" style={{ flex: 1, overflowY: 'auto', padding: 32, background: 'var(--color-bg)' }}>
                    <div style={{ maxWidth: 720, margin: '0 auto' }}>
                        {!isIdentityVerified ? (
                            <div className="bg-surface-container-lowest p-8 rounded-3xl border border-outline-variant/10 shadow-xl space-y-6 max-w-xl mx-auto my-6">
                                <div className="flex items-center gap-4 border-b border-outline-variant/10 pb-4">
                                    <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                                        <span className="material-symbols-outlined text-3xl animate-pulse">security</span>
                                    </div>
                                    <div className="text-left">
                                        <h2 className="text-lg font-bold font-headline text-on-surface">Secure AI Examination Gatekeeper</h2>
                                        <p className="text-xs text-on-surface-variant">Identity verification & environment security check in progress</p>
                                    </div>
                                </div>

                                {/* Loading Steps Checklist */}
                                <div className="space-y-2.5 text-left">
                                    <div className="flex items-center gap-3 p-3 rounded-xl bg-success/10 text-success text-xs font-bold">
                                        <span className="material-symbols-outlined text-base">check_circle</span>
                                        <span>[1/7] Secure Exam Environment Prepared</span>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 rounded-xl bg-success/10 text-success text-xs font-bold">
                                        <span className="material-symbols-outlined text-base">check_circle</span>
                                        <span>[2/7] Camera & Microphone Permissions Active</span>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 rounded-xl bg-success/10 text-success text-xs font-bold">
                                        <span className="material-symbols-outlined text-base">check_circle</span>
                                        <span>[3/7] MediaPipe & TF.js AI Detection Models Loaded</span>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/10 text-primary text-xs font-bold border border-primary/20">
                                        <span className="material-symbols-outlined text-base animate-spin">sync</span>
                                        <span>[4/7] Verifying Face Stability & Environment Lighting...</span>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-container-high text-outline text-xs font-bold opacity-60">
                                        <span className="material-symbols-outlined text-base">photo_camera</span>
                                        <span>[5/7] Baseline Reference Snapshot Storage</span>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-container-high text-outline text-xs font-bold opacity-60">
                                        <span className="material-symbols-outlined text-base">vpn_key</span>
                                        <span>[6/7] Question Paper Decryption & Exam Session Activation</span>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-container-high text-outline text-xs font-bold opacity-60">
                                        <span className="material-symbols-outlined text-base">timer</span>
                                        <span>[7/7] Exam Timer & Continuous AI Monitoring Activation</span>
                                    </div>
                                </div>

                                <div className="p-4 bg-secondary-container/20 rounded-2xl border border-primary/20 text-xs font-bold text-primary flex items-center justify-center gap-2">
                                    <span className="material-symbols-outlined text-base">shield_lock</span>
                                    <span>Questions & Exam Timer are locked. Look at the camera in sidebar to complete verification.</span>
                                </div>
                            </div>
                        ) : (
                            currentQ && (
                                <div>
                                    <div className="mb-6">
                                        <span className="badge badge-info">Question {currentIdx + 1} | {currentQ.marks || 1} Marks</span>
                                    </div>
                                    <h1 className="text-2xl font-black mb-8" style={{ lineHeight: 1.4 }}>{currentQ.question}</h1>
                                    
                                    <div className="space-y-3">
                                        {['option1', 'option2', 'option3', 'option4'].map((optKey, idx) => {
                                            const optText = currentQ[optKey];
                                            if (!optText) return null;
                                            const val = ['A', 'B', 'C', 'D'][idx];
                                            const isSel = answers[currentQ.id] === val;
                                            return (
                                                <label key={idx} className="card flex items-center p-4 cursor-pointer transition-all" style={{ border: `2px solid ${isSel ? 'var(--color-primary)' : 'var(--color-border)'}` }} onClick={() => selectAnswer(currentQ.id, val)}>
                                                    <input type="radio" name={`q_${currentQ.id}`} value={val} checked={isSel} onChange={() => {}} className="hidden" />
                                                    <div style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 16, fontWeight: 800, fontSize: 12, background: isSel ? 'var(--color-primary)' : 'var(--color-bg)', color: isSel ? 'white' : 'var(--color-text-secondary)' }}>{val}</div>
                                                    <span style={{ fontSize: 15, fontWeight: 600 }}>{optText}</span>
                                                </label>
                                            );
                                        })}
                                    </div>

                                    <div className="flex items-center justify-between mt-12 pt-6 border-t" style={{ borderColor: 'var(--color-border)' }}>
                                        <button onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))} disabled={currentIdx === 0} className="btn btn-ghost btn-sm">Previous</button>
                                        <span className="text-xs font-bold text-muted">Question {currentIdx + 1} of {questions.length}</span>
                                        <button onClick={() => setCurrentIdx(prev => Math.min(questions.length - 1, prev + 1))} disabled={currentIdx === questions.length - 1} className="btn btn-primary btn-sm">Save & Next</button>
                                    </div>
                                </div>
                            )
                        )}
                    </div>
                </main>
            </div>

            {/* Fullscreen Warning Modal */}
            <div className={`modal-overlay ${fsWarning ? 'active' : ''}`}>
                <div className="modal" style={{ maxWidth: 400, textAlign: 'center', padding: 32 }}>
                    <div style={{ width: 64, height: 64, background: 'var(--color-error-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                        <span className="material-symbols-outlined text-error text-3xl">security</span>
                    </div>
                    <h2 className="text-xl font-bold mb-2">Security Violation</h2>
                    <p className="text-sm text-secondary mb-6">Fullscreen mode is mandatory for exam integrity. Please re-verify to resume.</p>
                    <button onClick={requestFsAndResume} className="btn btn-primary btn-block">Re-Verify & Return</button>
                </div>
            </div>
        </div>
    );
}
