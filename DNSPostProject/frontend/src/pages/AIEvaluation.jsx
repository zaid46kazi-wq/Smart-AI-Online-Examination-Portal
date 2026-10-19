import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/api';
import { showToast } from '../components/Toast';
import { AppLayout } from '../components/ui/AppLayout';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { StatCard } from '../components/ui/StatCard';
import {
    Award,
    FileText,
    UploadCloud,
    CheckCircle2,
    AlertCircle,
    AlertTriangle,
    Check,
    ChevronRight,
    ChevronLeft,
    Download,
    Eye,
    Edit2,
    Trash2,
    Plus,
    Sparkles,
    BookOpen,
    Sliders,
    Layers,
    Search,
    RefreshCw,
    HelpCircle,
    Save,
    FileSpreadsheet,
    Printer,
    FileCheck,
    ExternalLink,
    Clock,
    UserCheck,
    ArrowRight
} from 'lucide-react';

export function AIEvaluation() {
    const { user } = useAuth();
    const navigate = useNavigate();

    // ─── Top-level States ───────────────────────────────────────────
    const [currentStep, setCurrentStep] = useState(1);
    const [sessions, setSessions] = useState([]);
    const [selectedSessionId, setSelectedSessionId] = useState(null);
    const [sessionData, setSessionData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [subjects, setSubjects] = useState([]);

    // ─── Step 1: Session Form ───────────────────────────────────────
    const [formData, setFormData] = useState({
        subject_id: '',
        semester: '5th Semester',
        exam_name: 'Internal Assessment - 1',
        academic_year: '2025-2026',
        evaluation_title: 'AI Answer Booklet Evaluation'
    });

    // ─── Step 2: Question Paper ─────────────────────────────────────
    const [qpFile, setQpFile] = useState(null);
    const [extractedQuestions, setExtractedQuestions] = useState([]);
    const [editingQuestionIdx, setEditingQuestionIdx] = useState(null);

    // ─── Step 3: Valuation Scheme ───────────────────────────────────
    const [schemeFile, setSchemeFile] = useState(null);
    const [extractedScheme, setExtractedScheme] = useState([]);
    const [editingSchemeIdx, setEditingSchemeIdx] = useState(null);

    // ─── Step 4: Optional References ────────────────────────────────
    const [refFile, setRefFile] = useState(null);
    const [uploadedRefs, setUploadedRefs] = useState([]);

    // ─── Step 5: Mode ───────────────────────────────────────────────
    const [evalMode, setEvalMode] = useState('easy');

    // ─── Step 6: Booklets ───────────────────────────────────────────
    const [bookletFiles, setBookletFiles] = useState([]);
    const [bookletStudentInfo, setBookletStudentInfo] = useState({ usn: '', name: '' });
    const [bookletsList, setBookletsList] = useState([]);
    const [ocrModalOpen, setOcrModalOpen] = useState(false);
    const [selectedBookletForOCR, setSelectedBookletForOCR] = useState(null);
    const [editableOCR, setEditableOCR] = useState({});

    // ─── Step 7: Automated Evaluation Screen ────────────────────────
    const [activeBookletId, setActiveBookletId] = useState(null);
    const [evaluationResults, setEvaluationResults] = useState([]);
    const [evaluatingBookletId, setEvaluatingBookletId] = useState(null);
    const [overrideMarks, setOverrideMarks] = useState({});
    const [feedbackNotes, setFeedbackNotes] = useState({});

    // ─── Step 8: Reports & Exports ──────────────────────────────────
    const [summaryStats, setSummaryStats] = useState(null);
    const [summaryRows, setSummaryRows] = useState([]);

    // ─── Lifecycle / Initial Data Loading ───────────────────────────
    useEffect(() => {
        loadSubjects();
        loadSessions();
    }, []);

    useEffect(() => {
        if (selectedSessionId) {
            loadSessionDetails(selectedSessionId);
        }
    }, [selectedSessionId]);

    const loadSubjects = async () => {
        try {
            const data = await apiFetch('/api/subjects');
            setSubjects(Array.isArray(data) ? data : data.subjects || []);
        } catch (err) {
            console.error('Failed to load subjects:', err);
        }
    };

    const loadSessions = async () => {
        try {
            setLoading(true);
            const data = await apiFetch('/api/evaluation/sessions');
            setSessions(data || []);
            if (data && data.length > 0 && !selectedSessionId) {
                setSelectedSessionId(data[0].id);
            }
        } catch (err) {
            console.error('Failed to load evaluation sessions:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadSessionDetails = async (sessionId) => {
        try {
            setLoading(true);
            const data = await apiFetch(`/api/evaluation/sessions/${sessionId}`);
            if (data && data.session) {
                setSessionData(data);
                const s = data.session;
                setFormData({
                    subject_id: s.subject_id || '',
                    semester: s.semester || '5th Semester',
                    exam_name: s.exam_name || 'Internal Assessment - 1',
                    academic_year: s.academic_year || '2025-2026',
                    evaluation_title: s.evaluation_title || 'AI Answer Booklet Evaluation'
                });
                if (s.evaluation_mode) {
                    setEvalMode(s.evaluation_mode);
                }

                // Populate extracted questions
                if (data.questions && data.questions.length > 0) {
                    setExtractedQuestions(data.questions);
                } else {
                    setExtractedQuestions([]);
                }

                // Populate scheme
                if (data.scheme && data.scheme.length > 0) {
                    setExtractedScheme(data.scheme);
                } else {
                    setExtractedScheme([]);
                }

                // Populate documents (module notes, etc.)
                if (data.documents) {
                    const refs = data.documents.filter(d => d.doc_type === 'module_pdf');
                    setUploadedRefs(refs);
                }

                // Populate booklets
                if (data.booklets) {
                    setBookletsList(data.booklets);
                    if (data.booklets.length > 0 && !activeBookletId) {
                        setActiveBookletId(data.booklets[0].id);
                    }
                }

                // Determine appropriate current step based on status
                determineStepFromStatus(s.status, data);
            }
        } catch (err) {
            showToast('Failed to load session details: ' + err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const determineStepFromStatus = (status, data) => {
        if (!status || status === 'draft') {
            setCurrentStep(1);
        } else if (status === 'question_paper_uploaded') {
            setCurrentStep(2);
        } else if (status === 'question_paper_confirmed' || status === 'scheme_uploaded') {
            setCurrentStep(3);
        } else if (status === 'scheme_confirmed') {
            setCurrentStep(4);
        } else if (status === 'mode_selected') {
            setCurrentStep(6);
        } else if (status === 'ready_for_evaluation' || status === 'evaluation_in_progress') {
            setCurrentStep(7);
        } else if (status === 'evaluation_completed' || status === 'approved') {
            setCurrentStep(8);
        }
    };

    // ─── Step 1 Action: Create or Save Session ───────────────────────
    const handleCreateSession = async (e) => {
        if (e) e.preventDefault();
        try {
            setActionLoading(true);
            const res = await apiFetch('/api/evaluation/sessions', {
                method: 'POST',
                body: JSON.stringify(formData)
            });
            showToast('Evaluation session created successfully!', 'success');
            await loadSessions();
            if (res.session?.id) {
                setSelectedSessionId(res.session.id);
                setCurrentStep(2);
            }
        } catch (err) {
            showToast(err.message || 'Error creating session', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    // ─── Step 2 Action: Upload & Extract Question Paper ─────────────
    const handleUploadQuestionPaper = async () => {
        if (!qpFile) {
            showToast('Please select a question paper file (PDF or Image)', 'warning');
            return;
        }
        if (!selectedSessionId) {
            showToast('Please select or create an evaluation session first', 'warning');
            return;
        }

        try {
            setActionLoading(true);
            const data = new FormData();
            data.append('file', qpFile);

            const res = await apiFetch(`/api/evaluation/upload/${selectedSessionId}/question_paper`, {
                method: 'POST',
                body: data
            });

            showToast('Question paper uploaded and parsed successfully!', 'success');
            setQpFile(null);
            await loadSessionDetails(selectedSessionId);
        } catch (err) {
            showToast('Question paper processing failed: ' + err.message, 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleConfirmQuestions = async () => {
        if (!selectedSessionId) return;
        if (!extractedQuestions || extractedQuestions.length === 0) {
            showToast('Please upload a question paper or add questions first', 'warning');
            return;
        }

        try {
            setActionLoading(true);
            await apiFetch(`/api/evaluation/confirm-questions/${selectedSessionId}`, {
                method: 'POST',
                body: JSON.stringify({ questions: extractedQuestions })
            });
            showToast('Extracted questions confirmed successfully!', 'success');
            await loadSessionDetails(selectedSessionId);
            setCurrentStep(3);
        } catch (err) {
            showToast('Failed to confirm questions: ' + err.message, 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleAddQuestion = () => {
        const nextNum = extractedQuestions.length + 1;
        setExtractedQuestions([
            ...extractedQuestions,
            {
                question_number: String(nextNum),
                sub_question: '',
                question_text: 'New question description...',
                max_marks: 5,
                has_internal_choice: 0,
                choice_group: ''
            }
        ]);
    };

    const handleRemoveQuestion = (idx) => {
        const updated = [...extractedQuestions];
        updated.splice(idx, 1);
        setExtractedQuestions(updated);
    };

    // ─── Step 3 Action: Upload & Extract Valuation Scheme ───────────
    const handleUploadValuationScheme = async () => {
        if (!schemeFile) {
            showToast('Please select a valuation scheme / answer key file', 'warning');
            return;
        }
        if (!selectedSessionId) return;

        try {
            setActionLoading(true);
            const data = new FormData();
            data.append('file', schemeFile);

            await apiFetch(`/api/evaluation/upload/${selectedSessionId}/valuation_scheme`, {
                method: 'POST',
                body: data
            });

            showToast('Valuation scheme uploaded & matched successfully!', 'success');
            setSchemeFile(null);
            await loadSessionDetails(selectedSessionId);
        } catch (err) {
            showToast('Scheme upload failed: ' + err.message, 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleConfirmScheme = async () => {
        if (!selectedSessionId) return;
        if (!extractedScheme || extractedScheme.length === 0) {
            showToast('Please upload a valuation scheme or add answer key entries first', 'warning');
            return;
        }

        try {
            setActionLoading(true);
            await apiFetch(`/api/evaluation/confirm-scheme/${selectedSessionId}`, {
                method: 'POST',
                body: JSON.stringify({ scheme: extractedScheme })
            });
            showToast('Valuation scheme confirmed successfully!', 'success');
            await loadSessionDetails(selectedSessionId);
            setCurrentStep(4);
        } catch (err) {
            showToast('Failed to confirm scheme: ' + err.message, 'error');
        } finally {
            setActionLoading(false);
        }
    };

    // ─── Step 4 Action: Upload Optional Reference Materials ─────────
    const handleUploadReference = async () => {
        if (!refFile || !selectedSessionId) return;
        try {
            setActionLoading(true);
            const data = new FormData();
            data.append('file', refFile);

            await apiFetch(`/api/evaluation/upload/${selectedSessionId}/module_pdf`, {
                method: 'POST',
                body: data
            });

            showToast('Module reference material uploaded!', 'success');
            setRefFile(null);
            await loadSessionDetails(selectedSessionId);
        } catch (err) {
            showToast('Reference upload failed: ' + err.message, 'error');
        } finally {
            setActionLoading(false);
        }
    };

    // ─── Step 5 Action: Select Mode ─────────────────────────────────
    const handleSetEvaluationMode = async (mode) => {
        if (!selectedSessionId) return;
        try {
            setActionLoading(true);
            await apiFetch(`/api/evaluation/set-mode/${selectedSessionId}`, {
                method: 'POST',
                body: JSON.stringify({ mode })
            });
            setEvalMode(mode);
            showToast(`Evaluation mode set to ${mode.toUpperCase()}!`, 'success');
            await loadSessionDetails(selectedSessionId);
            setCurrentStep(6);
        } catch (err) {
            showToast('Failed to set mode: ' + err.message, 'error');
        } finally {
            setActionLoading(false);
        }
    };

    // ─── Step 6 Action: Upload Answer Booklet ───────────────────────
    const handleUploadBooklet = async (e) => {
        if (e) e.preventDefault();
        if (!bookletFiles || bookletFiles.length === 0) {
            showToast('Please select at least one student answer booklet file', 'warning');
            return;
        }
        if (!selectedSessionId) return;

        try {
            setActionLoading(true);
            for (let i = 0; i < bookletFiles.length; i++) {
                const file = bookletFiles[i];
                const data = new FormData();
                data.append('file', file);
                data.append('student_usn', bookletStudentInfo.usn || '');
                data.append('student_name', bookletStudentInfo.name || '');

                await apiFetch(`/api/evaluation/upload-booklet/${selectedSessionId}`, {
                    method: 'POST',
                    body: data
                });
            }

            showToast(`Uploaded ${bookletFiles.length} booklet(s) & completed handwriting OCR!`, 'success');
            setBookletFiles([]);
            setBookletStudentInfo({ usn: '', name: '' });
            await loadSessionDetails(selectedSessionId);
        } catch (err) {
            showToast('Booklet upload/OCR error: ' + err.message, 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleOpenOCRModal = (booklet) => {
        setSelectedBookletForOCR(booklet);
        let parsed = booklet.ocr_output;
        if (typeof parsed === 'string') {
            try { parsed = JSON.parse(parsed); } catch (_) { parsed = {}; }
        }
        setEditableOCR(parsed || {});
        setOcrModalOpen(true);
    };

    const handleSaveOCRText = async () => {
        if (!selectedBookletForOCR) return;
        try {
            setActionLoading(true);
            await apiFetch(`/api/evaluation/confirm-ocr/${selectedBookletForOCR.id}`, {
                method: 'POST',
                body: JSON.stringify({ ocr_output: editableOCR })
            });
            showToast('Handwriting OCR transcript verified & saved!', 'success');
            setOcrModalOpen(false);
            await loadSessionDetails(selectedSessionId);
        } catch (err) {
            showToast('Failed to save OCR transcript: ' + err.message, 'error');
        } finally {
            setActionLoading(false);
        }
    };

    // ─── Step 7 Action: Run Automated Evaluation ────────────────────
    const loadBookletResults = async (bookletId) => {
        if (!bookletId) return;
        try {
            const data = await apiFetch(`/api/evaluation/results/${bookletId}`);
            const resultsList = Array.isArray(data) ? data : (data?.results || []);
            setEvaluationResults(resultsList);
            // Populate override marks & feedback
            const marksMap = {};
            const notesMap = {};
            resultsList.forEach(r => {
                marksMap[r.id] = r.faculty_final_marks !== null && r.faculty_final_marks !== undefined
                    ? r.faculty_final_marks : r.ai_suggested_marks;
                notesMap[r.id] = '';
            });
            setOverrideMarks(marksMap);
            setFeedbackNotes(notesMap);
        } catch (err) {
            console.error('Failed to load booklet results:', err);
        }
    };

    useEffect(() => {
        if (currentStep === 7 && activeBookletId) {
            loadBookletResults(activeBookletId);
        }
        if (currentStep === 8 && selectedSessionId) {
            loadSummaryReport(selectedSessionId);
        }
    }, [currentStep, activeBookletId, selectedSessionId]);

    const handleRunEvaluation = async (bookletId) => {
        if (!selectedSessionId || !bookletId) return;
        try {
            setEvaluatingBookletId(bookletId);
            showToast('AI evaluating student answers against valuation scheme...', 'info');

            const res = await apiFetch(`/api/evaluation/evaluate/${selectedSessionId}/${bookletId}`, {
                method: 'POST'
            });

            showToast('Evaluation completed successfully!', 'success');
            await loadSessionDetails(selectedSessionId);
            await loadBookletResults(bookletId);
        } catch (err) {
            showToast('Evaluation failed: ' + err.message, 'error');
        } finally {
            setEvaluatingBookletId(null);
        }
    };

    const handleUpdateResultMarks = async (resultId) => {
        const marks = overrideMarks[resultId];
        const feedback = feedbackNotes[resultId];
        if (marks === undefined || marks === '') {
            showToast('Please enter valid marks', 'warning');
            return;
        }

        try {
            setActionLoading(true);
            await apiFetch(`/api/evaluation/results/${resultId}/marks`, {
                method: 'PUT',
                body: JSON.stringify({
                    marks: parseFloat(marks),
                    faculty_final_marks: parseFloat(marks),
                    feedback
                })
            });
            showToast('Marks override and feedback saved!', 'success');
            if (activeBookletId) {
                await loadBookletResults(activeBookletId);
            }
        } catch (err) {
            showToast('Failed to update marks: ' + err.message, 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleApproveBooklet = async (bookletId) => {
        if (!selectedSessionId || !bookletId) return;
        try {
            setActionLoading(true);
            await apiFetch(`/api/evaluation/approve/${selectedSessionId}/${bookletId}`, {
                method: 'POST'
            });
            showToast('Final marks approved for this answer booklet!', 'success');
            await loadSessionDetails(selectedSessionId);
            await loadBookletResults(bookletId);
        } catch (err) {
            showToast('Approval failed: ' + err.message, 'error');
        } finally {
            setActionLoading(false);
        }
    };

    // ─── Step 8 Action: Summary Reports & Export ─────────────────────
    const loadSummaryReport = async (sessionId) => {
        try {
            setLoading(true);
            const summary = await apiFetch(`/api/evaluation/summary/${sessionId}`);
            const rows = Array.isArray(summary) ? summary : [];
            setSummaryRows(rows);

            // Compute statistics
            if (rows.length > 0) {
                const totalEvaluated = rows.length;
                const approvedCount = rows.filter(r => r.processing_status === 'approved').length;
                const scores = rows.map(r => parseFloat(r.total_marks || 0));
                const maxMarks = rows[0]?.total_max_marks || 100;
                const avgScore = (scores.reduce((a, b) => a + b, 0) / totalEvaluated).toFixed(1);
                const highest = Math.max(...scores).toFixed(1);
                const lowest = Math.min(...scores).toFixed(1);
                const avgPct = maxMarks > 0 ? ((avgScore / maxMarks) * 100).toFixed(1) : 0;

                setSummaryStats({
                    totalEvaluated,
                    approvedCount,
                    avgScore,
                    highest,
                    lowest,
                    avgPct,
                    maxMarks
                });
            } else {
                setSummaryStats(null);
            }
        } catch (err) {
            console.error('Failed to load summary:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadPDF = () => {
        if (!selectedSessionId) return;
        const token = localStorage.getItem('token');
        const url = `/api/evaluation/export-pdf/${selectedSessionId}?token=${encodeURIComponent(token || '')}`;
        window.open(url, '_blank');
    };

    const handleDownloadCSV = () => {
        if (!selectedSessionId) return;
        const token = localStorage.getItem('token');
        const url = `/api/evaluation/export/${selectedSessionId}?format=csv&token=${encodeURIComponent(token || '')}`;
        window.open(url, '_blank');
    };

    // ─── Stepper Logic & Step Titles ────────────────────────────────
    const steps = [
        { num: 1, title: 'Exam Details', desc: 'Subject & Session' },
        { num: 2, title: 'Question Paper', desc: 'PDF / Image (Req)' },
        { num: 3, title: 'Valuation Scheme', desc: 'Answer Key (Req)' },
        { num: 4, title: 'Module Notes', desc: 'References (Opt)' },
        { num: 5, title: 'Evaluation Mode', desc: 'Easy / Hard' },
        { num: 6, title: 'Answer Booklets', desc: 'Upload & OCR' },
        { num: 7, title: 'Verification', desc: 'AI Evaluation & Marks' },
        { num: 8, title: 'Marks & Reports', desc: 'Export & Summary' }
    ];

    const canAccessStep = (stepNum) => {
        if (stepNum === 1) return true;
        if (!selectedSessionId) return false;
        if (stepNum === 2) return true;
        if (stepNum === 3) return extractedQuestions.length > 0;
        if (stepNum === 4 || stepNum === 5) return extractedScheme.length > 0;
        if (stepNum === 6) return !!evalMode;
        if (stepNum === 7) return bookletsList.length > 0;
        if (stepNum === 8) return bookletsList.length > 0;
        return false;
    };

    // Current active booklet helper
    const activeBooklet = bookletsList.find(b => b.id === activeBookletId) || bookletsList[0];

    return (
        <AppLayout>
            <div className="space-y-6">
                {/* ─── Header & Session Selector ─── */}
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-slate-200">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                                <Award size={20} />
                            </span>
                            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                                AI Answer Booklet Evaluation
                            </h1>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-500 mt-1">
                            Automated OCR transcription and semantic AI evaluation with faculty verification & provisional marks control.
                        </p>
                    </div>

                    {/* Active Session Dropdown & Quick Status */}
                    <div className="flex flex-wrap items-center gap-3">
                        {sessions.length > 0 && (
                            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
                                <span className="text-xs font-semibold text-slate-500 uppercase">Session:</span>
                                <select
                                    value={selectedSessionId || ''}
                                    onChange={(e) => setSelectedSessionId(parseInt(e.target.value))}
                                    className="text-xs font-semibold text-slate-800 bg-transparent focus:outline-hidden"
                                >
                                    {sessions.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            {s.evaluation_title || s.exam_name} (#{s.id})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {sessionData?.session && (
                            <Badge
                                variant={
                                    sessionData.session.status === 'approved' ? 'success' :
                                    sessionData.session.status === 'ready_for_evaluation' ? 'primary' : 'warning'
                                }
                                size="md"
                            >
                                Status: {(sessionData.session.status || 'draft').replace(/_/g, ' ').toUpperCase()}
                            </Badge>
                        )}

                        {sessionData?.session?.evaluation_mode && (
                            <Badge variant={sessionData.session.evaluation_mode === 'easy' ? 'success' : 'info'} size="md">
                                Mode: {sessionData.session.evaluation_mode.toUpperCase()}
                            </Badge>
                        )}

                        <Button
                            variant="secondary"
                            size="sm"
                            icon={Plus}
                            onClick={() => {
                                setSelectedSessionId(null);
                                setSessionData(null);
                                setCurrentStep(1);
                            }}
                        >
                            New Session
                        </Button>
                    </div>
                </div>

                {/* ─── Workflow Stepper ─── */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-3 sm:p-4 overflow-x-auto">
                    <div className="flex items-center justify-between min-w-[760px] gap-2">
                        {steps.map((s, idx) => {
                            const isCurrent = currentStep === s.num;
                            const isAccessible = canAccessStep(s.num);
                            const isDone = currentStep > s.num;

                            return (
                                <React.Fragment key={s.num}>
                                    <button
                                        type="button"
                                        disabled={!isAccessible}
                                        onClick={() => setCurrentStep(s.num)}
                                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all shrink-0 ${
                                            isCurrent
                                                ? 'bg-blue-50 border border-blue-200 text-blue-700 shadow-2xs'
                                                : isDone
                                                ? 'text-slate-800 hover:bg-slate-50 cursor-pointer'
                                                : isAccessible
                                                ? 'text-slate-600 hover:bg-slate-50 cursor-pointer'
                                                : 'text-slate-400 opacity-60 cursor-not-allowed'
                                        }`}
                                    >
                                        <div
                                            className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                                                isDone
                                                    ? 'bg-emerald-600 text-white'
                                                    : isCurrent
                                                    ? 'bg-blue-600 text-white shadow-xs'
                                                    : 'bg-slate-100 text-slate-500 border border-slate-200'
                                            }`}
                                        >
                                            {isDone ? <Check size={14} /> : s.num}
                                        </div>
                                        <div className="leading-tight">
                                            <div className="text-xs font-semibold">{s.title}</div>
                                            <div className="text-[10px] text-slate-400 font-medium">{s.desc}</div>
                                        </div>
                                    </button>
                                    {idx < steps.length - 1 && (
                                        <ChevronRight size={16} className="text-slate-300 shrink-0" />
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>
                </div>

                {/* ─── Step Content Panels ─── */}

                {/* ============================================================ */}
                {/* STEP 1: SELECT EXAMINATION DETAILS */}
                {/* ============================================================ */}
                {currentStep === 1 && (
                    <Card
                        title="Step 1: Select Examination Details"
                        subtitle="Define or select the academic context for this evaluation session"
                    >
                        <form onSubmit={handleCreateSession} className="space-y-5 max-w-3xl">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                                        Evaluation Title <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.evaluation_title}
                                        onChange={(e) => setFormData({ ...formData, evaluation_title: e.target.value })}
                                        placeholder="e.g. Data Structures & Algorithms IA-1"
                                        className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                                        Subject
                                    </label>
                                    <select
                                        value={formData.subject_id}
                                        onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
                                        className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">Select Existing Subject (Optional)</option>
                                        {subjects.map((sub) => (
                                            <option key={sub.id} value={sub.id}>
                                                {sub.subject_code} - {sub.subject_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                                        Examination Name / Type <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.exam_name}
                                        onChange={(e) => setFormData({ ...formData, exam_name: e.target.value })}
                                        placeholder="e.g. Mid Term, Internal Assessment 1"
                                        className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                                        Semester
                                    </label>
                                    <select
                                        value={formData.semester}
                                        onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                                        className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                                    >
                                        {['1st Semester', '2nd Semester', '3rd Semester', '4th Semester', '5th Semester', '6th Semester', '7th Semester', '8th Semester'].map((sem) => (
                                            <option key={sem} value={sem}>{sem}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                                        Academic Year
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.academic_year}
                                        onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
                                        placeholder="2025-2026"
                                        className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                                <span className="text-xs text-slate-500">
                                    {selectedSessionId ? `Working on Session #${selectedSessionId}` : 'A new session will be initialized'}
                                </span>
                                <div className="flex items-center gap-3">
                                    {selectedSessionId && (
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            onClick={() => setCurrentStep(2)}
                                            icon={ArrowRight}
                                            iconPosition="right"
                                        >
                                            Continue with Current Session
                                        </Button>
                                    )}
                                    <Button
                                        type="submit"
                                        variant="primary"
                                        loading={actionLoading}
                                        icon={CheckCircle2}
                                    >
                                        {selectedSessionId ? 'Update & Proceed to Question Paper' : 'Create Session & Proceed'}
                                    </Button>
                                </div>
                            </div>
                        </form>
                    </Card>
                )}

                {/* ============================================================ */}
                {/* STEP 2: UPLOAD QUESTION PAPER (REQUIRED) */}
                {/* ============================================================ */}
                {currentStep === 2 && (
                    <div className="space-y-6">
                        <Card
                            title="Step 2: Upload Question Paper (Required)"
                            subtitle="Upload the official question paper PDF or scanned images. AI will extract all questions, subquestions, and maximum marks."
                        >
                            <div className="space-y-4">
                                {/* Upload Box */}
                                <div className="p-6 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100/60 transition-colors text-center">
                                    <UploadCloud size={36} className="mx-auto text-blue-600 mb-2" />
                                    <h4 className="text-sm font-semibold text-slate-800">
                                        Upload Question Paper Document
                                    </h4>
                                    <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                                        Supports PDF and scanned image files (.pdf, .jpg, .jpeg, .png, .webp). Maximum file size: 25MB.
                                    </p>
                                    <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                                        <input
                                            type="file"
                                            id="qp-file-input"
                                            accept=".pdf,.jpg,.jpeg,.png,.webp"
                                            onChange={(e) => setQpFile(e.target.files[0] || null)}
                                            className="hidden"
                                        />
                                        <label
                                            htmlFor="qp-file-input"
                                            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs hover:bg-slate-50 cursor-pointer"
                                        >
                                            {qpFile ? qpFile.name : 'Select File'}
                                        </label>
                                        <Button
                                            variant="primary"
                                            size="sm"
                                            loading={actionLoading}
                                            disabled={!qpFile}
                                            icon={Sparkles}
                                            onClick={handleUploadQuestionPaper}
                                        >
                                            Upload & Extract with Gemini
                                        </Button>
                                    </div>
                                </div>

                                {sessionData?.documents?.find(d => d.doc_type === 'question_paper') && (
                                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between text-xs text-blue-800">
                                        <div className="flex items-center gap-2">
                                            <FileCheck size={16} className="text-blue-600" />
                                            <span>
                                                Uploaded file: <strong>{sessionData.documents.find(d => d.doc_type === 'question_paper').original_filename}</strong>
                                            </span>
                                        </div>
                                        <Badge variant="success" size="xs">Document Parsed</Badge>
                                    </div>
                                )}
                            </div>
                        </Card>

                        {/* Extracted Questions Verification Table */}
                        <Card
                            title={`Extracted Questions (${extractedQuestions.length})`}
                            subtitle="Review the questions extracted by AI. Faculty can adjust marks, question text, or add missing subquestions."
                            action={
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    icon={Plus}
                                    onClick={handleAddQuestion}
                                >
                                    Add Question
                                </Button>
                            }
                        >
                            {extractedQuestions.length === 0 ? (
                                <EmptyState
                                    icon={FileText}
                                    title="No questions extracted yet"
                                    description="Upload a question paper above to automatically extract question numbers, text, and marks."
                                />
                            ) : (
                                <div className="space-y-4">
                                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider">
                                                <tr>
                                                    <th className="px-3 py-2.5 w-16">Q #</th>
                                                    <th className="px-3 py-2.5 w-16">Sub</th>
                                                    <th className="px-4 py-2.5">Question Description</th>
                                                    <th className="px-3 py-2.5 w-24 text-center">Max Marks</th>
                                                    <th className="px-3 py-2.5 w-28 text-center">Internal Choice</th>
                                                    <th className="px-3 py-2.5 w-16 text-center">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-200">
                                                {extractedQuestions.map((q, idx) => (
                                                    <tr key={idx} className="hover:bg-slate-50/50">
                                                        <td className="px-3 py-2 font-bold text-slate-900">
                                                            <input
                                                                type="text"
                                                                value={q.question_number}
                                                                onChange={(e) => {
                                                                    const updated = [...extractedQuestions];
                                                                    updated[idx].question_number = e.target.value;
                                                                    setExtractedQuestions(updated);
                                                                }}
                                                                className="w-12 px-2 py-1 border border-slate-200 rounded text-xs font-semibold text-center"
                                                            />
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            <input
                                                                type="text"
                                                                value={q.sub_question || ''}
                                                                placeholder="a/b"
                                                                onChange={(e) => {
                                                                    const updated = [...extractedQuestions];
                                                                    updated[idx].sub_question = e.target.value;
                                                                    setExtractedQuestions(updated);
                                                                }}
                                                                className="w-12 px-2 py-1 border border-slate-200 rounded text-xs text-center"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-2">
                                                            <textarea
                                                                rows={2}
                                                                value={q.question_text}
                                                                onChange={(e) => {
                                                                    const updated = [...extractedQuestions];
                                                                    updated[idx].question_text = e.target.value;
                                                                    setExtractedQuestions(updated);
                                                                }}
                                                                className="w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500"
                                                            />
                                                        </td>
                                                        <td className="px-3 py-2 text-center">
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                value={q.max_marks}
                                                                onChange={(e) => {
                                                                    const updated = [...extractedQuestions];
                                                                    updated[idx].max_marks = parseInt(e.target.value) || 0;
                                                                    setExtractedQuestions(updated);
                                                                }}
                                                                className="w-16 px-2 py-1 border border-slate-200 rounded text-xs font-bold text-center"
                                                            />
                                                        </td>
                                                        <td className="px-3 py-2 text-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={!!q.has_internal_choice}
                                                                onChange={(e) => {
                                                                    const updated = [...extractedQuestions];
                                                                    updated[idx].has_internal_choice = e.target.checked ? 1 : 0;
                                                                    setExtractedQuestions(updated);
                                                                }}
                                                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                            />
                                                        </td>
                                                        <td className="px-3 py-2 text-center">
                                                            <button
                                                                onClick={() => handleRemoveQuestion(idx)}
                                                                className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                                                                title="Delete question"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Confirmation Footer */}
                                    <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                                        <div className="text-xs text-slate-500 font-medium">
                                            Total Questions: <strong>{extractedQuestions.length}</strong> | Total Marks:{' '}
                                            <strong>{extractedQuestions.reduce((sum, q) => sum + (parseInt(q.max_marks) || 0), 0)}</strong>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                icon={ChevronLeft}
                                                onClick={() => setCurrentStep(1)}
                                            >
                                                Back
                                            </Button>
                                            <Button
                                                variant="primary"
                                                size="sm"
                                                loading={actionLoading}
                                                icon={CheckCircle2}
                                                onClick={handleConfirmQuestions}
                                            >
                                                Confirm Questions & Proceed to Scheme
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </Card>
                    </div>
                )}

                {/* ============================================================ */}
                {/* STEP 3: UPLOAD VALUATION SCHEME / ANSWER KEY (REQUIRED) */}
                {/* ============================================================ */}
                {currentStep === 3 && (
                    <div className="space-y-6">
                        <Card
                            title="Step 3: Upload Valuation Scheme / Answer Key (Required)"
                            subtitle="Upload the official solution manual, valuation scheme, or faculty answer key. AI matches expected answer points and partial marking rules to extracted questions."
                        >
                            <div className="space-y-4">
                                <div className="p-6 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100/60 transition-colors text-center">
                                    <FileSpreadsheet size={36} className="mx-auto text-emerald-600 mb-2" />
                                    <h4 className="text-sm font-semibold text-slate-800">
                                        Upload Valuation Scheme / Answer Key
                                    </h4>
                                    <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                                        Upload PDF or image of the marking scheme. AI parses ideal solutions, step breakdowns, and partial-credit rules.
                                    </p>
                                    <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                                        <input
                                            type="file"
                                            id="scheme-file-input"
                                            accept=".pdf,.jpg,.jpeg,.png,.webp"
                                            onChange={(e) => setSchemeFile(e.target.files[0] || null)}
                                            className="hidden"
                                        />
                                        <label
                                            htmlFor="scheme-file-input"
                                            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs hover:bg-slate-50 cursor-pointer"
                                        >
                                            {schemeFile ? schemeFile.name : 'Select Scheme File'}
                                        </label>
                                        <Button
                                            variant="primary"
                                            size="sm"
                                            loading={actionLoading}
                                            disabled={!schemeFile}
                                            icon={Sparkles}
                                            onClick={handleUploadValuationScheme}
                                        >
                                            Upload & Parse Scheme
                                        </Button>
                                    </div>
                                </div>

                                {sessionData?.documents?.find(d => d.doc_type === 'valuation_scheme') && (
                                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs text-emerald-800">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 size={16} className="text-emerald-600" />
                                            <span>
                                                Scheme uploaded: <strong>{sessionData.documents.find(d => d.doc_type === 'valuation_scheme').original_filename}</strong>
                                            </span>
                                        </div>
                                        <Badge variant="success" size="xs">Scheme Active</Badge>
                                    </div>
                                )}
                            </div>
                        </Card>

                        {/* Extracted Scheme Mapping View */}
                        <Card
                            title={`Mapped Valuation Scheme Entries (${extractedScheme.length})`}
                            subtitle="Verify expected answers and step marking breakdowns mapped to questions."
                        >
                            {extractedScheme.length === 0 ? (
                                <EmptyState
                                    icon={BookOpen}
                                    title="No valuation scheme mapped"
                                    description="Upload the valuation scheme above to map expected answers and step breakdown."
                                />
                            ) : (
                                <div className="space-y-4">
                                    <div className="space-y-3">
                                        {extractedScheme.map((item, idx) => (
                                            <div
                                                key={idx}
                                                className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2.5"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-xs bg-slate-100 text-slate-800 px-2.5 py-1 rounded-md border border-slate-200">
                                                            Q{item.question_number}{item.sub_question ? ` (${item.sub_question})` : ''}
                                                        </span>
                                                        <span className="text-xs font-semibold text-slate-700">
                                                            Expected Solution & Marking Breakdown
                                                        </span>
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
                                                        Expected Answer / Ideal Points:
                                                    </label>
                                                    <textarea
                                                        rows={3}
                                                        value={item.expected_answer || ''}
                                                        onChange={(e) => {
                                                            const updated = [...extractedScheme];
                                                            updated[idx].expected_answer = e.target.value;
                                                            setExtractedScheme(updated);
                                                        }}
                                                        className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500"
                                                    />
                                                </div>

                                                {item.marking_breakdown && (
                                                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                                                        <span className="font-semibold text-slate-600 block mb-1">
                                                            Step-wise Marking Rules:
                                                        </span>
                                                        <p className="text-slate-600 text-[11px] font-mono">
                                                            {typeof item.marking_breakdown === 'object'
                                                                ? JSON.stringify(item.marking_breakdown)
                                                                : item.marking_breakdown}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Action footer */}
                                    <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            icon={ChevronLeft}
                                            onClick={() => setCurrentStep(2)}
                                        >
                                            Back to Questions
                                        </Button>
                                        <Button
                                            variant="primary"
                                            size="sm"
                                            loading={actionLoading}
                                            icon={CheckCircle2}
                                            onClick={handleConfirmScheme}
                                        >
                                            Confirm Valuation Scheme & Proceed
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </Card>
                    </div>
                )}

                {/* ============================================================ */}
                {/* STEP 4: OPTIONAL REFERENCE MATERIALS */}
                {/* ============================================================ */}
                {currentStep === 4 && (
                    <Card
                        title="Step 4: Optional Reference Materials"
                        subtitle="Upload supplementary module notes or textbook chapters. These give the AI contextual grounding for alternate terms and notations."
                    >
                        <div className="space-y-5 max-w-3xl">
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2.5">
                                <HelpCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                                <div>
                                    <strong className="font-semibold">Optional Step:</strong> You can upload module notes, textbook excerpts, or syllabus topic references. The AI uses these to accommodate valid terminology variations, equivalent mathematical proofs, and textbook definitions without penalizing students.
                                </div>
                            </div>

                            {/* Reference Upload Box */}
                            <div className="p-5 border border-dashed border-slate-300 rounded-xl bg-slate-50 text-center">
                                <BookOpen size={28} className="mx-auto text-blue-600 mb-2" />
                                <h4 className="text-xs font-semibold text-slate-800">
                                    Upload Module Notes / Textbook Reference (PDF)
                                </h4>
                                <div className="mt-3 flex items-center justify-center gap-3">
                                    <input
                                        type="file"
                                        id="ref-file-input"
                                        accept=".pdf"
                                        onChange={(e) => setRefFile(e.target.files[0] || null)}
                                        className="hidden"
                                    />
                                    <label
                                        htmlFor="ref-file-input"
                                        className="px-3.5 py-1.5 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs hover:bg-slate-50 cursor-pointer"
                                    >
                                        {refFile ? refFile.name : 'Choose PDF File'}
                                    </label>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        disabled={!refFile}
                                        loading={actionLoading}
                                        onClick={handleUploadReference}
                                    >
                                        Upload Note
                                    </Button>
                                </div>
                            </div>

                            {/* Uploaded references list */}
                            {uploadedRefs.length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                        Uploaded Reference Documents ({uploadedRefs.length})
                                    </h4>
                                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                                        {uploadedRefs.map((doc) => (
                                            <div key={doc.id} className="p-3 bg-white flex items-center justify-between text-xs">
                                                <div className="flex items-center gap-2">
                                                    <FileText size={16} className="text-slate-400" />
                                                    <span className="font-semibold text-slate-800">{doc.original_filename}</span>
                                                    <span className="text-[10px] text-slate-400">({(doc.file_size / 1024).toFixed(0)} KB)</span>
                                                </div>
                                                <Badge variant="info" size="xs">Context Loaded</Badge>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    icon={ChevronLeft}
                                    onClick={() => setCurrentStep(3)}
                                >
                                    Back to Scheme
                                </Button>
                                <Button
                                    variant="primary"
                                    size="sm"
                                    icon={ArrowRight}
                                    iconPosition="right"
                                    onClick={() => setCurrentStep(5)}
                                >
                                    Proceed to Evaluation Mode
                                </Button>
                            </div>
                        </div>
                    </Card>
                )}

                {/* ============================================================ */}
                {/* STEP 5: SELECT AI EVALUATION MODE */}
                {/* ============================================================ */}
                {currentStep === 5 && (
                    <Card
                        title="Step 5: Select AI Evaluation Mode"
                        subtitle="Choose the grading philosophy for evaluating student answer booklets."
                    >
                        <div className="space-y-6 max-w-4xl">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {/* Easy Mode Card */}
                                <div
                                    onClick={() => setEvalMode('easy')}
                                    className={`p-6 rounded-xl border-2 transition-all cursor-pointer relative ${
                                        evalMode === 'easy'
                                            ? 'border-emerald-600 bg-emerald-50/40 shadow-sm'
                                            : 'border-slate-200 bg-white hover:border-slate-300'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <Badge variant="success" size="md">EASY MODE</Badge>
                                        <span className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                                            evalMode === 'easy' ? 'bg-emerald-600 text-white border-emerald-600' : 'border-slate-300'
                                        }`}>
                                            {evalMode === 'easy' && <Check size={12} />}
                                        </span>
                                    </div>
                                    <h3 className="text-base font-bold text-slate-900 mb-1">
                                        Generous & Concept-Centric Evaluation
                                    </h3>
                                    <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                                        Focuses on assessing whether the student grasps core concepts rather than rote reproduction of textbook wording.
                                    </p>
                                    <ul className="space-y-1.5 text-xs text-slate-600">
                                        <li className="flex items-center gap-2">
                                            <Check size={14} className="text-emerald-600 shrink-0" />
                                            <span>Awards partial credit for relevant diagrams, flowcharts, or equations</span>
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <Check size={14} className="text-emerald-600 shrink-0" />
                                            <span>Forgiving on minor syntax, typo, or unit omission mistakes</span>
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <Check size={14} className="text-emerald-600 shrink-0" />
                                            <span>Prioritizes logical progression over exact solution structure</span>
                                        </li>
                                    </ul>
                                </div>

                                {/* Hard Mode Card */}
                                <div
                                    onClick={() => setEvalMode('hard')}
                                    className={`p-6 rounded-xl border-2 transition-all cursor-pointer relative ${
                                        evalMode === 'hard'
                                            ? 'border-indigo-600 bg-indigo-50/40 shadow-sm'
                                            : 'border-slate-200 bg-white hover:border-slate-300'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <Badge variant="primary" size="md">HARD MODE</Badge>
                                        <span className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                                            evalMode === 'hard' ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-300'
                                        }`}>
                                            {evalMode === 'hard' && <Check size={12} />}
                                        </span>
                                    </div>
                                    <h3 className="text-base font-bold text-slate-900 mb-1">
                                        Strict & Rigorous Deductive Evaluation
                                    </h3>
                                    <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                                        Strictly enforces the valuation scheme with precision criteria, penalizing omissions, incorrect claims, or vague generalities.
                                    </p>
                                    <ul className="space-y-1.5 text-xs text-slate-600">
                                        <li className="flex items-center gap-2">
                                            <Check size={14} className="text-indigo-600 shrink-0" />
                                            <span>Strict adherence to expected steps, key formulae, and derivations</span>
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <Check size={14} className="text-indigo-600 shrink-0" />
                                            <span>Deducts marks for missing technical keywords or unverified assertions</span>
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <Check size={14} className="text-indigo-600 shrink-0" />
                                            <span>Flagged for university semester-end exams and high-stakes tests</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    icon={ChevronLeft}
                                    onClick={() => setCurrentStep(4)}
                                >
                                    Back
                                </Button>
                                <Button
                                    variant="primary"
                                    size="sm"
                                    loading={actionLoading}
                                    icon={CheckCircle2}
                                    onClick={() => handleSetEvaluationMode(evalMode)}
                                >
                                    Confirm Mode: {evalMode.toUpperCase()} & Proceed
                                </Button>
                            </div>
                        </div>
                    </Card>
                )}

                {/* ============================================================ */}
                {/* STEP 6: UPLOAD STUDENT ANSWER BOOKLETS */}
                {/* ============================================================ */}
                {currentStep === 6 && (
                    <div className="space-y-6">
                        <Card
                            title="Step 6: Upload Student Answer Booklets"
                            subtitle="Upload handwritten or scanned student answer booklets. OCR recognition will transcribe handwriting for each question."
                        >
                            <form onSubmit={handleUploadBooklet} className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                                            Student USN / Roll No
                                        </label>
                                        <input
                                            type="text"
                                            value={bookletStudentInfo.usn}
                                            onChange={(e) => setBookletStudentInfo({ ...bookletStudentInfo, usn: e.target.value })}
                                            placeholder="e.g. 1AG21CS045 (or leave blank to auto-detect)"
                                            className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                                            Student Name
                                        </label>
                                        <input
                                            type="text"
                                            value={bookletStudentInfo.name}
                                            onChange={(e) => setBookletStudentInfo({ ...bookletStudentInfo, name: e.target.value })}
                                            placeholder="e.g. Rahul Sharma"
                                            className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>

                                <div className="p-6 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 text-center">
                                    <UploadCloud size={32} className="mx-auto text-blue-600 mb-2" />
                                    <h4 className="text-xs font-semibold text-slate-800">
                                        Select Answer Booklet Files (PDF or Images)
                                    </h4>
                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                        Supports single or batch files. Hand-written answer sheets will be transcribed via Gemini OCR.
                                    </p>
                                    <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                                        <input
                                            type="file"
                                            id="booklet-input"
                                            multiple
                                            accept=".pdf,.jpg,.jpeg,.png,.webp"
                                            onChange={(e) => setBookletFiles(Array.from(e.target.files || []))}
                                            className="hidden"
                                        />
                                        <label
                                            htmlFor="booklet-input"
                                            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs hover:bg-slate-50 cursor-pointer"
                                        >
                                            {bookletFiles.length > 0 ? `${bookletFiles.length} file(s) selected` : 'Select Booklet Files'}
                                        </label>
                                        <Button
                                            type="submit"
                                            variant="primary"
                                            size="sm"
                                            loading={actionLoading}
                                            disabled={bookletFiles.length === 0}
                                            icon={Sparkles}
                                        >
                                            Upload & Run OCR
                                        </Button>
                                    </div>
                                </div>
                            </form>
                        </Card>

                        {/* Uploaded Booklets List */}
                        <Card
                            title={`Uploaded Answer Booklets (${bookletsList.length})`}
                            subtitle="Review OCR recognized text and student associations before running evaluation."
                        >
                            {bookletsList.length === 0 ? (
                                <EmptyState
                                    icon={Layers}
                                    title="No answer booklets uploaded yet"
                                    description="Upload answer booklets above to begin automated OCR extraction."
                                />
                            ) : (
                                <div className="space-y-4">
                                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider">
                                                <tr>
                                                    <th className="px-3 py-2.5">#</th>
                                                    <th className="px-3 py-2.5">Student USN</th>
                                                    <th className="px-3 py-2.5">Student Name</th>
                                                    <th className="px-3 py-2.5">Booklet File</th>
                                                    <th className="px-3 py-2.5 text-center">OCR Status</th>
                                                    <th className="px-3 py-2.5 text-center">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-200">
                                                {bookletsList.map((b, idx) => (
                                                    <tr key={b.id} className="hover:bg-slate-50/50">
                                                        <td className="px-3 py-2 font-bold text-slate-500">{idx + 1}</td>
                                                        <td className="px-3 py-2 font-mono font-semibold text-slate-900">
                                                            {b.student_usn || 'Not Provided'}
                                                        </td>
                                                        <td className="px-3 py-2 font-medium text-slate-800">
                                                            {b.student_name || 'Anonymous Student'}
                                                        </td>
                                                        <td className="px-3 py-2 text-slate-600 truncate max-w-[200px]">
                                                            {b.original_filename}
                                                        </td>
                                                        <td className="px-3 py-2 text-center">
                                                            <Badge
                                                                variant={
                                                                    b.processing_status === 'approved' ? 'success' :
                                                                    b.processing_status === 'evaluated' ? 'info' :
                                                                    b.processing_status === 'ocr_complete' ? 'primary' : 'warning'
                                                                }
                                                                size="xs"
                                                            >
                                                                {b.processing_status}
                                                            </Badge>
                                                        </td>
                                                        <td className="px-3 py-2 text-center flex items-center justify-center gap-2">
                                                            <Button
                                                                variant="secondary"
                                                                size="sm"
                                                                icon={Eye}
                                                                onClick={() => handleOpenOCRModal(b)}
                                                            >
                                                                Review OCR
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            icon={ChevronLeft}
                                            onClick={() => setCurrentStep(5)}
                                        >
                                            Back to Mode
                                        </Button>
                                        <Button
                                            variant="primary"
                                            size="sm"
                                            icon={ArrowRight}
                                            iconPosition="right"
                                            onClick={() => setCurrentStep(7)}
                                        >
                                            Proceed to Verification & Grading
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </Card>
                    </div>
                )}

                {/* ============================================================ */}
                {/* STEP 7: AUTOMATED EVALUATION & FACULTY VERIFICATION SCREEN */}
                {/* ============================================================ */}
                {currentStep === 7 && (
                    <div className="space-y-6">
                        {/* Student Booklet Selector Bar */}
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-semibold text-slate-500 uppercase">Evaluating Student:</span>
                                <select
                                    value={activeBookletId || ''}
                                    onChange={(e) => setActiveBookletId(parseInt(e.target.value))}
                                    className="text-xs sm:text-sm font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-hidden"
                                >
                                    {bookletsList.map((b) => (
                                        <option key={b.id} value={b.id}>
                                            {b.student_name ? `${b.student_name} (${b.student_usn || 'No USN'})` : b.original_filename}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center gap-3">
                                <Button
                                    variant="subtle"
                                    size="sm"
                                    icon={Sparkles}
                                    loading={evaluatingBookletId === activeBookletId}
                                    onClick={() => handleRunEvaluation(activeBookletId)}
                                >
                                    Run AI Evaluation on this Booklet
                                </Button>

                                <Button
                                    variant="primary"
                                    size="sm"
                                    icon={UserCheck}
                                    loading={actionLoading}
                                    onClick={() => handleApproveBooklet(activeBookletId)}
                                >
                                    Approve Final Marks
                                </Button>
                            </div>
                        </div>

                        {/* Provisional Marks Warning Banner */}
                        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-900">
                            <div className="flex items-center gap-2">
                                <AlertTriangle size={18} className="text-amber-600 shrink-0" />
                                <span>
                                    <strong>Provisional Marks Notice:</strong> All AI suggested marks remain provisional. Faculty can adjust any question score and provide remarks before clicking <strong>Approve Final Marks</strong>.
                                </span>
                            </div>
                            <Badge variant="warning" size="xs">Provisional</Badge>
                        </div>

                        {/* Evaluation Questions Breakdown Cards */}
                        {evaluationResults.length === 0 ? (
                            <Card>
                                <EmptyState
                                    icon={Sparkles}
                                    title="Booklet not evaluated yet"
                                    description="Click 'Run AI Evaluation on this Booklet' above to generate detailed rubric scoring, concept verification, and error analysis."
                                />
                            </Card>
                        ) : (
                            <div className="space-y-5">
                                {evaluationResults.map((result) => {
                                    const isApproved = !!result.faculty_approved;
                                    const needsReview = !!result.needs_review;
                                    const qInfo = extractedQuestions.find(q => q.id === result.question_id) || {};
                                    const sInfo = extractedScheme.find(s => s.question_id === result.question_id) || {};

                                    return (
                                        <div
                                            key={result.id}
                                            className={`rounded-xl border bg-white shadow-2xs overflow-hidden transition-all ${
                                                needsReview ? 'border-amber-300 ring-1 ring-amber-200' : 'border-slate-200'
                                            }`}
                                        >
                                            {/* Question Result Header */}
                                            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                                                <div className="flex items-center gap-3">
                                                    <span className="font-bold text-xs bg-blue-600 text-white px-2.5 py-1 rounded-md">
                                                        Q{qInfo.question_number || result.question_id}{qInfo.sub_question ? ` (${qInfo.sub_question})` : ''}
                                                    </span>
                                                    <span className="text-xs font-semibold text-slate-800 truncate max-w-md">
                                                        {qInfo.question_text || 'Exam Question'}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    {needsReview && (
                                                        <Badge variant="warning" size="xs">Needs Faculty Review</Badge>
                                                    )}
                                                    {isApproved && (
                                                        <Badge variant="success" size="xs">Approved</Badge>
                                                    )}
                                                    <div className="text-xs text-slate-600 font-semibold">
                                                        Max: <span className="text-slate-900">{result.max_marks}</span>
                                                    </div>
                                                    <div className="text-xs text-blue-700 font-bold bg-blue-50 px-2.5 py-1 rounded border border-blue-200">
                                                        AI Score: {parseFloat(result.ai_suggested_marks).toFixed(1)} / {result.max_marks}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Side-by-Side Comparison Grid */}
                                            <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-5 border-b border-slate-100">
                                                {/* Left: Student Answer */}
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                                            <FileText size={14} className="text-slate-500" />
                                                            Student Handwritten / OCR Text
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 font-medium">
                                                            Confidence: {((result.ocr_confidence || 0.85) * 100).toFixed(0)}%
                                                        </span>
                                                    </div>
                                                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap font-sans">
                                                        {result.evidence || 'No handwritten response identified for this question.'}
                                                    </div>
                                                </div>

                                                {/* Right: Valuation Scheme Answer */}
                                                <div className="space-y-2">
                                                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                                        <BookOpen size={14} className="text-emerald-600" />
                                                        Valuation Scheme / Ideal Answer
                                                    </span>
                                                    <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-lg text-xs text-slate-800 leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap">
                                                        {sInfo.expected_answer || 'Expected solution from valuation scheme.'}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Evaluation Feedback & Rubric Badges */}
                                            <div className="p-5 bg-white space-y-4">
                                                {/* Analysis Points */}
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                    {/* Correct concepts */}
                                                    <div className="p-3 rounded-lg border border-emerald-100 bg-emerald-50/40 text-xs">
                                                        <span className="font-semibold text-emerald-800 block mb-1 flex items-center gap-1">
                                                            <CheckCircle2 size={13} className="text-emerald-600" />
                                                            Correct Concepts Identified
                                                        </span>
                                                        <div className="space-y-1 text-[11px] text-emerald-900">
                                                            {Array.isArray(result.correct_concepts) && result.correct_concepts.length > 0 ? (
                                                                result.correct_concepts.map((c, i) => (
                                                                    <div key={i} className="flex items-start gap-1">
                                                                        <span className="text-emerald-500">•</span>
                                                                        <span>{typeof c === 'string' ? c : JSON.stringify(c)}</span>
                                                                    </div>
                                                                ))
                                                            ) : (
                                                                <span className="text-slate-400 italic">None noted</span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Missing points */}
                                                    <div className="p-3 rounded-lg border border-amber-100 bg-amber-50/40 text-xs">
                                                        <span className="font-semibold text-amber-800 block mb-1 flex items-center gap-1">
                                                            <AlertCircle size={13} className="text-amber-600" />
                                                            Missing Scheme Points
                                                        </span>
                                                        <div className="space-y-1 text-[11px] text-amber-900">
                                                            {Array.isArray(result.missing_points) && result.missing_points.length > 0 ? (
                                                                result.missing_points.map((m, i) => (
                                                                    <div key={i} className="flex items-start gap-1">
                                                                        <span className="text-amber-500">•</span>
                                                                        <span>{typeof m === 'string' ? m : JSON.stringify(m)}</span>
                                                                    </div>
                                                                ))
                                                            ) : (
                                                                <span className="text-slate-400 italic">No missing points noted</span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Inaccuracies */}
                                                    <div className="p-3 rounded-lg border border-red-100 bg-red-50/40 text-xs">
                                                        <span className="font-semibold text-red-800 block mb-1 flex items-center gap-1">
                                                            <AlertTriangle size={13} className="text-red-600" />
                                                            Inaccuracies / Flaws
                                                        </span>
                                                        <div className="space-y-1 text-[11px] text-red-900">
                                                            {Array.isArray(result.incorrect_statements) && result.incorrect_statements.length > 0 ? (
                                                                result.incorrect_statements.map((s, i) => (
                                                                    <div key={i} className="flex items-start gap-1">
                                                                        <span className="text-red-500">•</span>
                                                                        <span>{typeof s === 'string' ? s : JSON.stringify(s)}</span>
                                                                    </div>
                                                                ))
                                                            ) : (
                                                                <span className="text-slate-400 italic">No direct errors noted</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* AI Scoring Rationale */}
                                                {result.ai_explanation && (
                                                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700">
                                                        <strong className="font-semibold text-slate-900">AI Scoring Rationale: </strong>
                                                        {result.ai_explanation}
                                                    </div>
                                                )}

                                                {/* Faculty Mark Override Form */}
                                                <div className="p-3.5 bg-blue-50/50 border border-blue-100 rounded-lg flex flex-wrap items-center justify-between gap-3">
                                                    <div className="flex items-center gap-3">
                                                        <div>
                                                            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                                                                Faculty Final Marks (Max {result.max_marks}):
                                                            </label>
                                                            <input
                                                                type="number"
                                                                step="0.5"
                                                                min="0"
                                                                max={result.max_marks}
                                                                value={overrideMarks[result.id] !== undefined ? overrideMarks[result.id] : ''}
                                                                onChange={(e) => setOverrideMarks({
                                                                    ...overrideMarks,
                                                                    [result.id]: e.target.value
                                                                })}
                                                                className="w-24 px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-xs font-bold text-slate-900"
                                                            />
                                                        </div>
                                                        <div className="flex-1 min-w-[200px]">
                                                            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                                                                Faculty Remarks / Reason:
                                                            </label>
                                                            <input
                                                                type="text"
                                                                placeholder="e.g. Granted bonus for alternative proof"
                                                                value={feedbackNotes[result.id] || ''}
                                                                onChange={(e) => setFeedbackNotes({
                                                                    ...feedbackNotes,
                                                                    [result.id]: e.target.value
                                                                })}
                                                                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-xs text-slate-800"
                                                            />
                                                        </div>
                                                    </div>

                                                    <Button
                                                        variant="primary"
                                                        size="sm"
                                                        icon={Save}
                                                        loading={actionLoading}
                                                        onClick={() => handleUpdateResultMarks(result.id)}
                                                    >
                                                        Save Override
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Step 7 Navigation Footer */}
                                <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        icon={ChevronLeft}
                                        onClick={() => setCurrentStep(6)}
                                    >
                                        Back to Booklets
                                    </Button>
                                    <Button
                                        variant="primary"
                                        size="sm"
                                        icon={ArrowRight}
                                        iconPosition="right"
                                        onClick={() => setCurrentStep(8)}
                                    >
                                        Proceed to Final Marks & Reports
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ============================================================ */}
                {/* STEP 8: FINAL RESULTS & REPORTS */}
                {/* ============================================================ */}
                {currentStep === 8 && (
                    <div className="space-y-6">
                        {/* Summary Metrics */}
                        {summaryStats && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <StatCard
                                    label="Total Evaluated"
                                    value={summaryStats.totalEvaluated}
                                    description="Student answer booklets"
                                    icon={Layers}
                                />
                                <StatCard
                                    label="Approved Booklets"
                                    value={`${summaryStats.approvedCount} / ${summaryStats.totalEvaluated}`}
                                    description="Verified by faculty"
                                    icon={CheckCircle2}
                                />
                                <StatCard
                                    label="Class Average"
                                    value={`${summaryStats.avgScore} / ${summaryStats.maxMarks}`}
                                    description={`${summaryStats.avgPct}% mean performance`}
                                    icon={Award}
                                />
                                <StatCard
                                    label="Score Spread"
                                    value={`${summaryStats.highest} max`}
                                    description={`Lowest: ${summaryStats.lowest}`}
                                    icon={Sliders}
                                />
                            </div>
                        )}

                        {/* Marks Sheet Table */}
                        <Card
                            title="Consolidated Evaluation Marks Sheet"
                            subtitle="Official evaluation summary with per-student marks, percentages, and faculty approval status."
                            action={
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        icon={FileSpreadsheet}
                                        onClick={handleDownloadCSV}
                                    >
                                        Export CSV / Excel
                                    </Button>
                                    <Button
                                        variant="primary"
                                        size="sm"
                                        icon={Download}
                                        onClick={handleDownloadPDF}
                                    >
                                        Export Official PDF
                                    </Button>
                                </div>
                            }
                        >
                            {summaryRows.length === 0 ? (
                                <EmptyState
                                    icon={FileText}
                                    title="No evaluation records found"
                                    description="Complete steps 6 and 7 to evaluate answer booklets and generate final marks sheets."
                                />
                            ) : (
                                <div className="space-y-4">
                                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider">
                                                <tr>
                                                    <th className="px-3 py-2.5">#</th>
                                                    <th className="px-3 py-2.5">Student Name</th>
                                                    <th className="px-3 py-2.5">USN</th>
                                                    <th className="px-3 py-2.5 text-center">Marks Obtained</th>
                                                    <th className="px-3 py-2.5 text-center">Max Marks</th>
                                                    <th className="px-3 py-2.5 text-center">Percentage</th>
                                                    <th className="px-3 py-2.5 text-center">Mode</th>
                                                    <th className="px-3 py-2.5 text-center">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-200">
                                                {summaryRows.map((row, idx) => {
                                                    const pct = row.total_max_marks > 0
                                                        ? ((row.total_marks / row.total_max_marks) * 100).toFixed(1)
                                                        : '0.0';
                                                    const isApproved = row.processing_status === 'approved';

                                                    return (
                                                        <tr key={row.booklet_id} className="hover:bg-slate-50/50">
                                                            <td className="px-3 py-2 font-bold text-slate-400">{idx + 1}</td>
                                                            <td className="px-3 py-2 font-semibold text-slate-900">
                                                                {row.student_name || 'Anonymous Student'}
                                                            </td>
                                                            <td className="px-3 py-2 font-mono text-slate-700">
                                                                {row.student_usn || '-'}
                                                            </td>
                                                            <td className="px-3 py-2 text-center font-bold text-blue-600">
                                                                {parseFloat(row.total_marks || 0).toFixed(1)}
                                                            </td>
                                                            <td className="px-3 py-2 text-center text-slate-500 font-semibold">
                                                                {row.total_max_marks || 100}
                                                            </td>
                                                            <td className="px-3 py-2 text-center font-semibold text-slate-800">
                                                                {pct}%
                                                            </td>
                                                            <td className="px-3 py-2 text-center">
                                                                <Badge variant={evalMode === 'easy' ? 'success' : 'primary'} size="xs">
                                                                    {evalMode.toUpperCase()}
                                                                </Badge>
                                                            </td>
                                                            <td className="px-3 py-2 text-center">
                                                                <Badge variant={isApproved ? 'success' : 'warning'} size="xs">
                                                                    {isApproved ? 'Approved' : 'Pending'}
                                                                </Badge>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            icon={ChevronLeft}
                                            onClick={() => setCurrentStep(7)}
                                        >
                                            Back to Verification
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            icon={RefreshCw}
                                            onClick={() => loadSummaryReport(selectedSessionId)}
                                        >
                                            Refresh Report
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </Card>
                    </div>
                )}

                {/* ─── OCR Review & Correction Modal ─── */}
                <Modal
                    isOpen={ocrModalOpen}
                    onClose={() => setOcrModalOpen(false)}
                    title={`Review Raw OCR Transcript: ${selectedBookletForOCR?.original_filename || 'Booklet'}`}
                    size="lg"
                >
                    <div className="space-y-4">
                        <p className="text-xs text-slate-600">
                            Faculty can review and fix any handwritten words transcribed by Gemini Vision OCR before grading.
                        </p>
                        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                            {Object.keys(editableOCR).length === 0 ? (
                                <p className="text-xs text-slate-400 italic">No question-wise OCR output found.</p>
                            ) : (
                                Object.entries(editableOCR).map(([qKey, ocrVal]) => (
                                    <div key={qKey} className="space-y-1">
                                        <label className="text-xs font-bold text-slate-700">
                                            Question {qKey}:
                                        </label>
                                        <textarea
                                            rows={3}
                                            value={typeof ocrVal === 'string' ? ocrVal : JSON.stringify(ocrVal)}
                                            onChange={(e) => setEditableOCR({
                                                ...editableOCR,
                                                [qKey]: e.target.value
                                            })}
                                            className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 font-sans"
                                        />
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setOcrModalOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="primary"
                                size="sm"
                                icon={Save}
                                loading={actionLoading}
                                onClick={handleSaveOCRText}
                            >
                                Save & Verify OCR
                            </Button>
                        </div>
                    </div>
                </Modal>
            </div>
        </AppLayout>
    );
}

export default AIEvaluation;
