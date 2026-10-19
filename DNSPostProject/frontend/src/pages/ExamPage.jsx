import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { MediaPipeProctor } from '../components/MediaPipeProctor';
import { apiFetch } from '../services/api';
import { showToast } from '../components/Toast';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import {
    Clock,
    AlertTriangle,
    CheckCircle2,
    Bookmark,
    ArrowLeft,
    ArrowRight,
    Send,
    ShieldCheck,
    Check,
    Lock,
    HelpCircle,
    RotateCcw
} from 'lucide-react';

/**
 * Utility to strip redundant/conflicting question numbering prefixes from database or author input.
 * e.g., "Q4: Which device..." or "4. Which device..." -> "Which device..."
 */
export function cleanQuestionStatement(text) {
    if (!text || typeof text !== 'string') return '';
    return text.replace(/^(?:Q(?:uestion)?\s*\.?\s*\d+|\d+)[\s.:)-]+\s*/i, '').trim();
}

export function ExamPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const examId = searchParams.get('id');

    const proctorRef = useRef(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [exam, setExam] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [answers, setAnswers] = useState({});
    const [markedForReview, setMarkedForReview] = useState({});
    const [timeLeft, setTimeLeft] = useState(0);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [fsWarning, setFsWarning] = useState(false);
    const [isIdentityVerified, setIsIdentityVerified] = useState(false);
    const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);

    // Auto-submission notification modal state
    const [autoSubmitNotice, setAutoSubmitNotice] = useState({
        show: false,
        title: '',
        message: ''
    });

    // Live Proctoring Telemetry State
    const [proctorTelemetry, setProctorTelemetry] = useState({
        isCameraActive: false,
        statusText: 'AI INITIALIZING',
        statusColor: '#10B981',
        warnings: 0,
        maxWarnings: 3,
        riskScore: 0,
        riskCategory: 'LOW'
    });

    // Active Warning Modal State
    const [activeWarningModal, setActiveWarningModal] = useState({
        show: false,
        message: '',
        count: 0,
        severity: 'MEDIUM'
    });

    // Gatekeeper checklist
    const GATEKEEPER_STEPS = [
        { label: 'Secure Exam Environment Prepared' },
        { label: 'Camera & Microphone Permissions Active' },
        { label: 'MediaPipe AI Detection Models Loaded' },
        { label: 'Verifying Face Stability & Environment Lighting' },
        { label: 'Baseline Reference Snapshot Storage' },
        { label: 'Question Paper Decryption & Exam Session Activation' },
        { label: 'Exam Timer & Continuous AI Monitoring Activation' },
    ];
    const [stepStates, setStepStates] = useState({
        1: 'pending', 2: 'pending', 3: 'pending', 4: 'pending', 5: 'pending', 6: 'pending', 7: 'pending'
    });

    const handleStepProgress = (stepNum, status) => {
        setStepStates(prev => ({ ...prev, [stepNum]: status }));
    };

    // Environment hygiene & Blackbox / extension floating widget suppression
    useEffect(() => {
        document.body.classList.add('exam-mode');

        const removeInjectedWidgets = () => {
            const forbiddenSelectors = [
                '#blackbox-extension',
                '.blackbox-floating',
                '[id*="blackbox" i]',
                '[class*="blackbox" i]',
                '[id*="black-box" i]',
                '[class*="black-box" i]',
                '[id*="bb-icon" i]',
                '[class*="bb-icon" i]',
                '[id*="grammarly" i]',
                '[class*="grammarly" i]',
                '[id*="copilot" i]'
            ];
            forbiddenSelectors.forEach(selector => {
                document.querySelectorAll(selector).forEach(el => {
                    el.style.setProperty('display', 'none', 'important');
                    el.style.setProperty('visibility', 'hidden', 'important');
                    el.style.setProperty('opacity', '0', 'important');
                    el.style.setProperty('pointer-events', 'none', 'important');
                });
            });
        };

        removeInjectedWidgets();
        const observer = new MutationObserver(removeInjectedWidgets);
        observer.observe(document.body, { childList: true, subtree: true });

        return () => {
            document.body.classList.remove('exam-mode');
            observer.disconnect();
        };
    }, []);

    // Security listeners: Fullscreen & copy protection
    useEffect(() => {
        const handleFullscreenChange = () => {
            if (!document.fullscreenElement && !isSubmitted && isIdentityVerified) {
                setFsWarning(true);
            } else if (document.fullscreenElement) {
                setFsWarning(false);
            }
        };

        const preventCopy = (e) => e.preventDefault();

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        ['copy', 'paste', 'cut', 'contextmenu'].forEach(ev => document.addEventListener(ev, preventCopy));

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            ['copy', 'paste', 'cut', 'contextmenu'].forEach(ev => document.removeEventListener(ev, preventCopy));
        };
    }, [isSubmitted, isIdentityVerified]);

    // Initial Security & Attempt Check
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

                if (statusData.exam_name) {
                    setExam(prev => prev || statusData);
                    if (statusData.time_limit) setTimeLeft(statusData.time_limit * 60);
                }

                const secStatus = await apiFetch(`/api/exam-security-status?exam_id=${examId}`).catch(() => ({}));
                if (secStatus.identity_verified) {
                    await loadQuestionsAndActivateSession();
                } else {
                    setLoading(false);
                }
            } catch (err) {
                setError(err.message);
                setLoading(false);
            }
        }

        checkExamSecurityStatus();
    }, [examId]);

    const loadQuestionsAndActivateSession = async () => {
        try {
            const data = await apiFetch(`/api/exam-questions/${examId}`);
            setExam(data);
            setQuestions(data.questions || []);
            setTimeLeft((data.time_limit || 60) * 60);
            setIsIdentityVerified(true);
            setLoading(false);
        } catch (err) {
            setError(err.message || 'Failed to decrypt examination questions.');
            setLoading(false);
        }
    };

    // Countdown Timer Loop
    useEffect(() => {
        if (!isIdentityVerified || isSubmitted || timeLeft <= 0) return;

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
    }, [isIdentityVerified, isSubmitted, timeLeft]);

    const selectAnswer = (questionId, optionKey) => {
        if (isSubmitted || !isIdentityVerified) return;
        setAnswers(prev => ({
            ...prev,
            [questionId]: optionKey
        }));
    };

    const toggleMarkForReview = (questionId) => {
        if (isSubmitted || !isIdentityVerified) return;
        setMarkedForReview(prev => ({
            ...prev,
            [questionId]: !prev[questionId]
        }));
    };

    // Keyboard shortcuts for distraction-free assessment navigation
    useEffect(() => {
        if (!isIdentityVerified || isSubmitted || showConfirmSubmit || activeWarningModal.show || autoSubmitNotice.show || fsWarning) {
            return;
        }

        const handleKeyDown = (e) => {
            // Prevent shortcuts when user is in input/textarea
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName)) return;

            const q = questions[currentIdx];
            if (!q) return;

            const key = e.key.toUpperCase();
            if (['1', 'A'].includes(key) && q.option1) {
                selectAnswer(q.id, 'A');
            } else if (['2', 'B'].includes(key) && q.option2) {
                selectAnswer(q.id, 'B');
            } else if (['3', 'C'].includes(key) && q.option3) {
                selectAnswer(q.id, 'C');
            } else if (['4', 'D'].includes(key) && q.option4) {
                selectAnswer(q.id, 'D');
            } else if (key === 'R') {
                toggleMarkForReview(q.id);
            } else if ((e.key === 'ArrowLeft' || e.key === 'PageUp') && currentIdx > 0) {
                setCurrentIdx(prev => Math.max(0, prev - 1));
            } else if ((e.key === 'ArrowRight' || e.key === 'PageDown') && currentIdx < questions.length - 1) {
                setCurrentIdx(prev => Math.min(questions.length - 1, prev + 1));
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isIdentityVerified, isSubmitted, currentIdx, questions, showConfirmSubmit, activeWarningModal.show, autoSubmitNotice.show, fsWarning]);

    const submitExam = async (reason = 'USER_SUBMITTED') => {
        if (isSubmitted) return;
        setShowConfirmSubmit(false);

        const isAuto = reason !== 'USER_SUBMITTED' && reason !== 'USER_FINAL_CONFIRMED';
        if (isAuto) {
            const isTimeExpiry = reason.includes('TIME');
            setAutoSubmitNotice({
                show: true,
                title: isTimeExpiry ? "Time's Up" : "Examination Submitted",
                message: isTimeExpiry
                    ? "Your examination has been submitted automatically because the assessment time expired."
                    : "Your examination was automatically submitted because the maximum number of security warnings was reached."
            });

            // Brief delay to allow student to read the professional auto-submit notice
            await new Promise(res => setTimeout(res, 2200));
        }

        setIsSubmitted(true);

        try {
            const resultData = await apiFetch(`/api/submit`, {
                method: 'POST',
                body: JSON.stringify({
                    exam_id: parseInt(examId),
                    answers,
                    autoSubmit: isAuto,
                    reason: reason,
                    submission_reason: reason
                })
            });

            if (document.fullscreenElement) {
                document.exitFullscreen().catch(() => {});
            }

            showToast('Examination submitted successfully!', 'success');
            navigate(`/result?id=${resultData.result_id || resultData.id}`);
        } catch (err) {
            showToast('Submission error: ' + err.message, 'error');
            setIsSubmitted(false);
            setAutoSubmitNotice({ show: false, title: '', message: '' });
        }
    };

    const handleViolationReceived = (type, message, count, severity) => {
        setProctorTelemetry(prev => ({
            ...prev,
            warnings: count
        }));

        setActiveWarningModal({
            show: true,
            message: message || `Security guideline alert: ${type}`,
            count,
            severity
        });
    };

    if (error === 'EXAM_ALREADY_ATTEMPTED') {
        return (
            <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm max-w-md w-full text-center">
                    <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-100">
                        <CheckCircle2 size={24} />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mb-1">Assessment Already Completed</h3>
                    <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                        Our records indicate you have already completed and submitted this examination session. Duplicate attempts are not permitted.
                    </p>
                    <button
                        onClick={() => navigate('/student')}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg text-xs transition-colors shadow-xs"
                    >
                        Return to Student Portal
                    </button>
                </div>
            </div>
        );
    }

    if (loading && !exam) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm max-w-sm w-full text-center space-y-3">
                    <div className="w-9 h-9 border-3 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
                    <h3 className="text-sm font-bold text-slate-800">Loading Examination...</h3>
                    <p className="text-xs text-slate-500">Decrypting assessment questions and preparing proctoring environment.</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm max-w-md w-full text-center space-y-4">
                    <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-200">
                        <AlertTriangle size={24} />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-slate-900">Unable to load examination</h3>
                        <p className="text-xs text-red-600 font-medium mt-1 leading-relaxed">
                            {error}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-2">
                            Please verify examination schedule or contact your examination administrator.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                        <button
                            type="button"
                            onClick={() => navigate('/student')}
                            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2.5 rounded-lg text-xs transition-colors"
                        >
                            Return to Dashboard
                        </button>
                        <button
                            type="button"
                            onClick={() => window.location.reload()}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg text-xs transition-colors"
                        >
                            Retry Loading
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const currentQ = questions[currentIdx];
    const attemptedCount = Object.keys(answers).length;
    const reviewedCount = Object.values(markedForReview).filter(Boolean).length;
    const unattemptedCount = Math.max(0, questions.length - attemptedCount);
    const progressPct = questions.length > 0 ? Math.round((attemptedCount / questions.length) * 100) : 0;
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const isCurrentReviewed = currentQ && !!markedForReview[currentQ.id];

    return (
        <div className="h-screen w-screen bg-[#F8FAFC] flex flex-col font-sans text-slate-900 select-none overflow-hidden exam-interface-root">
            {/* 1. Exam Top Navigation Bar (~64px, Institutional Academic Header) */}
            <header className="h-16 shrink-0 bg-white border-b border-slate-200 z-30 flex items-center justify-between px-4 sm:px-6 shadow-2xs">
                {/* Left: Branding & Subject */}
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center font-extrabold text-xs shadow-xs tracking-tight">
                        AG
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                                AGMR College of Engineering
                            </span>
                            <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 hidden sm:inline-block">
                                {exam?.subjects?.subject_name || exam?.subject_name || 'Engineering'}
                            </span>
                        </div>
                        <span className="text-[11px] text-slate-500 block">
                            {exam?.exam_name || 'Online Examination'}
                        </span>
                    </div>
                </div>

                {/* Right: Security Status, Timer & Submit Button */}
                <div className="flex items-center gap-3 sm:gap-4">
                    {/* Compact Proctoring Pill */}
                    <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-xs">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="text-slate-700 font-medium">AI Proctoring Active</span>
                        <span className="text-slate-300">|</span>
                        <span className={`font-semibold ${proctorTelemetry.warnings > 0 ? 'text-amber-600' : 'text-slate-600'}`}>
                            Warnings {proctorTelemetry.warnings}/{proctorTelemetry.maxWarnings || 3}
                        </span>
                    </div>

                    {/* Compact Digital Timer (Issue #4) */}
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-mono text-xs sm:text-sm font-semibold transition-colors ${
                        !isIdentityVerified ? 'bg-slate-50 border-slate-200 text-slate-400' :
                        timeLeft <= 60 ? 'bg-red-50 border-red-300 text-red-700 font-bold' :
                        timeLeft <= 300 ? 'bg-amber-50 border-amber-300 text-amber-800' :
                        'bg-slate-50 border-slate-200 text-slate-800'
                    }`}>
                        <Clock size={15} className={
                            timeLeft <= 60 ? 'text-red-600' :
                            timeLeft <= 300 ? 'text-amber-600' :
                            'text-slate-500'
                        } />
                        <span>{isIdentityVerified ? `${minutes}:${seconds < 10 ? '0' : ''}${seconds}` : 'LOCKED'}</span>
                    </div>

                    {/* Submit Exam Button */}
                    <button
                        type="button"
                        onClick={() => setShowConfirmSubmit(true)}
                        disabled={!isIdentityVerified || isSubmitted}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                    >
                        <Send size={13} />
                        <span>Submit Exam</span>
                    </button>
                </div>
            </header>

            {/* 2. Three-Area Examination Layout (Palette: 240px | Question: Flex | Proctoring: 270px) */}
            <div className="flex flex-1 min-h-0 overflow-hidden relative">
                {/* Left: Question Navigation Palette (240px wide, Issue #6) */}
                <aside className="w-60 bg-white border-r border-slate-200 p-4 flex flex-col gap-3.5 shrink-0 overflow-hidden select-none">
                    <div>
                        <div className="flex justify-between items-center text-xs font-semibold text-slate-600 mb-1">
                            <span>Question Palette</span>
                            <span className="text-blue-600 font-bold">{progressPct}%</span>
                        </div>
                        <div className="text-xs font-bold text-slate-800 mb-1.5">
                            {attemptedCount} of {questions.length} Attempted
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-600 rounded-full transition-all duration-300" style={{ width: `${progressPct}%` }}></div>
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="grid grid-cols-2 gap-1.5 text-[11px] font-medium border-y border-slate-100 py-2.5">
                        <div className="flex items-center gap-1.5 text-emerald-800">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            <span>Answered ({attemptedCount})</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-amber-800">
                            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                            <span>Review ({reviewedCount})</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-600">
                            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                            <span>Pending ({unattemptedCount})</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-blue-700">
                            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                            <span>Current ({currentIdx + 1})</span>
                        </div>
                    </div>

                    {/* Question Grid: 4 columns of ~42px buttons */}
                    <div className="flex-1 overflow-y-auto grid grid-cols-4 gap-2 content-start pr-1 custom-scroll">
                        {questions.map((q, i) => {
                            const isAns = !!answers[q.id];
                            const isRev = !!markedForReview[q.id];
                            const isCur = i === currentIdx;

                            let btnStyle = 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50';
                            if (isCur) {
                                btnStyle = 'bg-blue-600 text-white border-blue-600 shadow-xs font-bold';
                            } else if (isRev) {
                                btnStyle = 'bg-amber-50 text-amber-800 border-amber-300 font-semibold';
                            } else if (isAns) {
                                btnStyle = 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold';
                            }

                            return (
                                <button
                                    key={q.id || i}
                                    type="button"
                                    onClick={() => isIdentityVerified && setCurrentIdx(i)}
                                    disabled={!isIdentityVerified}
                                    className={`h-10 w-full rounded-md border text-xs font-semibold flex items-center justify-center transition-colors relative palette-btn ${btnStyle}`}
                                >
                                    {i + 1}
                                    {isRev && !isCur && (
                                        <span className="absolute top-0.5 right-1 text-[8px] text-amber-600">★</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </aside>

                {/* Center: Main Question Examination Area (Flexible 65-70% width, Issue #7 & #8) */}
                <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[#F8FAFC] flex flex-col items-center">
                    <div className="w-full max-w-4xl flex flex-col">
                        {!isIdentityVerified ? (
                            /* Pre-exam Gatekeeper Checklist */
                            <div className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-sm space-y-6">
                                <div className="flex items-center gap-3.5 pb-4 border-b border-slate-200">
                                    <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shrink-0">
                                        <ShieldCheck size={22} />
                                    </div>
                                    <div>
                                        <h2 className="text-base sm:text-lg font-bold text-slate-900">
                                            Pre-Examination Verification Gatekeeper
                                        </h2>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            Align your face in the camera preview and initiate identity verification to begin.
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    {GATEKEEPER_STEPS.map((step, idx) => {
                                        const stepNum = idx + 1;
                                        const state = stepStates[stepNum];

                                        return (
                                            <div
                                                key={stepNum}
                                                className={`flex items-center justify-between p-3 rounded-lg text-xs font-medium border transition-colors ${
                                                    state === 'done' ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800' :
                                                    state === 'active' ? 'bg-blue-50 border-blue-200 text-blue-800' :
                                                    'bg-slate-50 border-slate-200 text-slate-500'
                                                }`}
                                            >
                                                <span>[{stepNum}/7] {step.label}</span>
                                                {state === 'done' ? (
                                                    <Check size={16} className="text-emerald-600" />
                                                ) : state === 'active' ? (
                                                    <span className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                                ) : (
                                                    <span className="text-[11px] text-slate-400">Pending</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="p-3.5 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
                                    <Lock size={16} className="shrink-0 text-amber-600" />
                                    <span>Questions and assessment timer remain locked until baseline face verification completes.</span>
                                </div>

                                <div className="pt-2 flex justify-end">
                                    <button
                                        type="button"
                                        onClick={() => proctorRef.current?.startIdentityVerification()}
                                        className="h-11 px-6 rounded-lg text-xs sm:text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 shadow-xs transition-colors"
                                    >
                                        <ShieldCheck size={16} />
                                        <span>Verify Identity & Start Exam</span>
                                    </button>
                                </div>
                            </div>
                        ) : (
                            currentQ && (
                                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8 flex flex-col gap-6">
                                    {/* Question Meta Header: Number Badge, Marks Badge, and Mark for Review */}
                                    <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="primary" size="md">
                                                Question {currentIdx + 1} of {questions.length}
                                            </Badge>
                                            <Badge variant="neutral" size="md">
                                                {currentQ.marks || 1} {currentQ.marks === 1 ? 'Mark' : 'Marks'}
                                            </Badge>
                                            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                                <CheckCircle2 size={11} /> Auto-Saved
                                            </span>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => toggleMarkForReview(currentQ.id)}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                                                isCurrentReviewed
                                                    ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100/70 shadow-2xs'
                                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                                            }`}
                                        >
                                            <Bookmark size={14} className={isCurrentReviewed ? 'fill-amber-500 text-amber-600' : ''} />
                                            <span>{isCurrentReviewed ? 'Flagged for Review' : 'Mark for Review'}</span>
                                        </button>
                                    </div>

                                    {/* Question Stem — Consistent clean numbering */}
                                    <h2 className="text-lg sm:text-xl font-semibold text-slate-900 leading-relaxed">
                                        Q{currentIdx + 1}. {cleanQuestionStatement(currentQ.question)}
                                    </h2>

                                    {/* Multiple Choice Options */}
                                    <div className="space-y-3 pt-1">
                                        {['option1', 'option2', 'option3', 'option4'].map((optKey, idx) => {
                                            const optText = currentQ[optKey];
                                            if (!optText) return null;
                                            const val = ['A', 'B', 'C', 'D'][idx];
                                            const isSel = answers[currentQ.id] === val;

                                            return (
                                                <div
                                                    key={idx}
                                                    onClick={() => selectAnswer(currentQ.id, val)}
                                                    className={`min-h-[58px] p-3.5 sm:p-4 rounded-xl border cursor-pointer transition-all flex items-center gap-3.5 select-none ${
                                                        isSel
                                                            ? 'bg-blue-50/70 border-blue-600 text-blue-900 shadow-2xs font-medium ring-1 ring-blue-600/20'
                                                            : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 text-slate-800'
                                                    }`}
                                                >
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                                                        isSel
                                                            ? 'bg-blue-600 text-white shadow-xs'
                                                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                                                    }`}>
                                                        {val}
                                                    </div>
                                                    <span className="text-sm sm:text-[15px] leading-relaxed flex-1 text-slate-800">
                                                        {optText}
                                                    </span>
                                                    {isSel && (
                                                        <CheckCircle2 size={19} className="text-blue-600 shrink-0" />
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Keyboard Navigation Helper */}
                                    <div className="hidden sm:flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 pt-3">
                                        <div className="flex items-center gap-2">
                                            <span>Shortcuts:</span>
                                            <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 border border-slate-200">[1-4] / [A-D] Select</span>
                                            <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 border border-slate-200">[R] Flag Review</span>
                                            <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 border border-slate-200">[← / →] Prev / Next</span>
                                        </div>
                                        <span>Auto-sync active</span>
                                    </div>

                                    {/* Bottom Navigation Buttons */}
                                    <div className="flex items-center justify-between pt-2">
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            size="md"
                                            icon={ArrowLeft}
                                            onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
                                            disabled={currentIdx === 0}
                                        >
                                            Previous
                                        </Button>

                                        {currentIdx < questions.length - 1 ? (
                                            <Button
                                                type="button"
                                                variant="primary"
                                                size="md"
                                                icon={ArrowRight}
                                                iconPosition="right"
                                                onClick={() => setCurrentIdx(prev => prev + 1)}
                                            >
                                                Save & Next
                                            </Button>
                                        ) : (
                                            <Button
                                                type="button"
                                                variant="success"
                                                size="md"
                                                icon={CheckCircle2}
                                                onClick={() => setShowConfirmSubmit(true)}
                                            >
                                                Review & Submit
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            )
                        )}
                    </div>
                </main>

                {/* Right: Security & Proctoring Sidebar (270px wide) */}
                <MediaPipeProctor
                    ref={proctorRef}
                    examId={examId}
                    initViolations={exam?.init_violations || 0}
                    onViolation={handleViolationReceived}
                    onAutoSubmit={(reason) => submitExam(reason)}
                    onIdentityVerified={() => loadQuestionsAndActivateSession()}
                    onStepProgress={handleStepProgress}
                    onTelemetryUpdate={setProctorTelemetry}
                />
            </div>

            {/* Modal: Fullscreen Exit Warning */}
            {fsWarning && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xl max-w-sm w-full text-center space-y-4">
                        <div className="w-11 h-11 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
                            <AlertTriangle size={22} />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-900">Fullscreen Required</h3>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                Examination security regulations require fullscreen mode. Please return to fullscreen immediately.
                            </p>
                        </div>
                        <Button
                            variant="primary"
                            fullWidth
                            onClick={() => {
                                document.documentElement.requestFullscreen().catch(() => {});
                                setFsWarning(false);
                            }}
                        >
                            Re-enter Fullscreen
                        </Button>
                    </div>
                </div>
            )}

            {/* Modal: Violation Alert Modal */}
            {activeWarningModal.show && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xl max-w-sm w-full text-center space-y-4">
                        <div className="w-11 h-11 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-200">
                            <AlertTriangle size={22} />
                        </div>
                        <div>
                            <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider block mb-1">
                                Security Alert • Warning {activeWarningModal.count} of {proctorTelemetry.maxWarnings || 3}
                            </span>
                            <h3 className="text-sm font-bold text-slate-900">
                                {activeWarningModal.message}
                            </h3>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                Continued violations will lead to automatic assessment termination and proctoring review.
                            </p>
                        </div>
                        <Button
                            variant="dark"
                            fullWidth
                            onClick={() => setActiveWarningModal({ show: false, message: '', count: 0, severity: 'MEDIUM' })}
                        >
                            Acknowledge & Continue
                        </Button>
                    </div>
                </div>
            )}

            {/* Modal: Confirm Submission Summary */}
            <Modal
                isOpen={showConfirmSubmit}
                onClose={() => setShowConfirmSubmit(false)}
                title="Submit Examination?"
                description="Review your assessment answers summary before final submission."
                size="md"
                footer={
                    <div className="flex items-center justify-end gap-2.5">
                        <Button
                            variant="secondary"
                            onClick={() => setShowConfirmSubmit(false)}
                        >
                            Continue Exam
                        </Button>
                        <Button
                            variant="primary"
                            icon={Send}
                            onClick={() => submitExam('USER_FINAL_CONFIRMED')}
                        >
                            Confirm Submission
                        </Button>
                    </div>
                }
            >
                <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-2.5 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
                        <div>
                            <span className="text-xl font-extrabold text-emerald-600 block">{attemptedCount}</span>
                            <span className="text-[11px] text-slate-500 font-medium">Answered</span>
                        </div>
                        <div>
                            <span className="text-xl font-extrabold text-slate-500 block">{unattemptedCount}</span>
                            <span className="text-[11px] text-slate-500 font-medium">Unanswered</span>
                        </div>
                        <div>
                            <span className="text-xl font-extrabold text-amber-600 block">{reviewedCount}</span>
                            <span className="text-[11px] text-slate-500 font-medium">Flagged Review</span>
                        </div>
                    </div>

                    <p className="text-xs text-slate-500 leading-relaxed">
                        {unattemptedCount > 0
                            ? `You have answered ${attemptedCount} of ${questions.length} questions. ${unattemptedCount} questions remain unanswered. Once submitted, your exam session is finalized.`
                            : `You have answered all ${questions.length} questions. Once submitted, your exam session will be securely evaluated and your result generated.`}
                    </p>
                </div>
            </Modal>

            {/* Modal: Auto-Submit Notice */}
            {autoSubmitNotice.show && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
                    <div className="bg-white p-6 sm:p-7 rounded-xl border border-slate-200 shadow-xl max-w-md w-full text-center space-y-4">
                        <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
                            <Clock size={24} />
                        </div>
                        <div>
                            <h3 className="text-base sm:text-lg font-bold text-slate-900">
                                {autoSubmitNotice.title}
                            </h3>
                            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                                {autoSubmitNotice.message}
                            </p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-center gap-2 text-xs text-slate-500">
                            <span className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
                            <span>Finalizing examination record and generating report...</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ExamPage;
