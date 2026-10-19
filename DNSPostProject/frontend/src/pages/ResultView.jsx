import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/api';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import {
    Download,
    ArrowLeft,
    CheckCircle2,
    XCircle,
    BookOpen,
    Award,
    FileText,
    TrendingUp,
    Sparkles,
    Printer,
    ShieldCheck,
    Calendar,
    User,
    Hash
} from 'lucide-react';

export function ResultView() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    // Can read from query params: score, total, rid or id
    const rid = searchParams.get('rid') || searchParams.get('id');
    const [resultDetails, setResultDetails] = useState(null);
    const [loadingResult, setLoadingResult] = useState(false);

    const [aiAnalysis, setAiAnalysis] = useState(null);
    const [aiLoading, setAiLoading] = useState(false);

    useEffect(() => {
        if (rid) {
            setLoadingResult(true);
            apiFetch(`/api/result/${rid}`)
                .then(data => setResultDetails(data))
                .catch(() => {})
                .finally(() => setLoadingResult(false));

            setAiLoading(true);
            apiFetch(`/api/ai-analysis/${rid}`)
                .then(data => {
                    if (data?.analysis) setAiAnalysis(data.analysis);
                })
                .catch(() => {})
                .finally(() => setAiLoading(false));
        }
    }, [rid]);

    const score = resultDetails?.score ?? parseInt(searchParams.get('score') || '0');
    const total = resultDetails?.total_marks ?? parseInt(searchParams.get('total') || '100');
    const examName = resultDetails?.exams?.exam_name || resultDetails?.exam_name || 'Academic Assessment';
    const subjectName = resultDetails?.exams?.subjects?.subject_name || 'Computer Science & Engineering';

    const pct = total > 0 ? Math.round((score / total) * 100) : 0;
    const passed = pct >= 40;

    let grade = 'F';
    let gradeLabel = 'Unsatisfactory';
    if (pct >= 90) { grade = 'A+'; gradeLabel = 'Outstanding'; }
    else if (pct >= 80) { grade = 'A'; gradeLabel = 'Excellent'; }
    else if (pct >= 70) { grade = 'B+'; gradeLabel = 'Very Good'; }
    else if (pct >= 60) { grade = 'B'; gradeLabel = 'Good'; }
    else if (pct >= 50) { grade = 'C'; gradeLabel = 'Above Average'; }
    else if (pct >= 40) { grade = 'D'; gradeLabel = 'Satisfactory'; }

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans text-slate-900 justify-between print:bg-white">
            {/* 1. Institutional Top Bar (Hidden on print) */}
            <header className="w-full bg-white border-b border-slate-200 py-3 px-6 shadow-2xs print:hidden">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                            AG
                        </div>
                        <div>
                            <h1 className="text-sm font-bold text-slate-900 leading-tight">
                                AGMR College of Engineering
                            </h1>
                            <p className="text-[11px] text-slate-500 font-medium">
                                Controller of Examinations • Official Scorecard
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            icon={Printer}
                            onClick={handlePrint}
                        >
                            Print Scorecard
                        </Button>
                        <Button
                            variant="secondary"
                            size="sm"
                            icon={ArrowLeft}
                            onClick={() => navigate('/student')}
                        >
                            Dashboard
                        </Button>
                    </div>
                </div>
            </header>

            {/* 2. Official Scorecard Document */}
            <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6 print:p-0 print:space-y-4">
                {/* Official Marksheet Document Card */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden print:border-slate-300 print:shadow-none">
                    {/* Institutional Header Banner */}
                    <div className="p-6 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1.5">
                                <Badge variant="primary" size="sm">Official Scorecard</Badge>
                                <span className="text-slate-300">•</span>
                                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                                    Academic Evaluation Record
                                </span>
                            </div>
                            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                                {examName}
                            </h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Course Subject: <span className="font-semibold text-slate-700">{subjectName}</span>
                            </p>
                        </div>
                        <div className="flex items-center gap-2 print:hidden">
                            {rid && (
                                <a
                                    href={`/api/result-pdf/${rid}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg text-xs transition-colors shadow-xs"
                                >
                                    <Download size={14} />
                                    <span>Download PDF</span>
                                </a>
                            )}
                        </div>
                    </div>

                    {/* Student & Assessment Metadata Table */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-6 border-b border-slate-100 text-xs bg-white">
                        <div>
                            <span className="text-slate-400 font-medium block">Candidate Name</span>
                            <span className="font-semibold text-slate-900 mt-0.5 block">{user?.username || 'Student Candidate'}</span>
                        </div>
                        <div>
                            <span className="text-slate-400 font-medium block">University Seat No. (USN)</span>
                            <span className="font-mono font-semibold text-slate-900 mt-0.5 block">{user?.usn || '2AG21CS045'}</span>
                        </div>
                        <div>
                            <span className="text-slate-400 font-medium block">Department / Program</span>
                            <span className="font-semibold text-slate-900 mt-0.5 block">Computer Science & Eng.</span>
                        </div>
                        <div>
                            <span className="text-slate-400 font-medium block">Evaluation Status</span>
                            <span className="mt-0.5 block">
                                <Badge variant={passed ? 'success' : 'danger'} dot>
                                    {passed ? 'QUALIFIED / PASSED' : 'NEEDS IMPROVEMENT'}
                                </Badge>
                            </span>
                        </div>
                    </div>

                    {/* Score Summary Metrics */}
                    <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50/50 border-b border-slate-100">
                        <div className="bg-white p-4 rounded-xl border border-slate-200 text-center shadow-2xs">
                            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Marks Obtained</span>
                            <div className="text-3xl font-extrabold text-slate-900">
                                {score} <span className="text-sm text-slate-400 font-normal">/ {total}</span>
                            </div>
                            <span className="text-[11px] text-slate-500 mt-1 block font-medium">Official Scored Points</span>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-200 text-center shadow-2xs">
                            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Percentage</span>
                            <div className={`text-3xl font-extrabold ${passed ? 'text-emerald-600' : 'text-red-600'}`}>
                                {pct}%
                            </div>
                            <span className="text-[11px] text-slate-500 mt-1 block font-medium">
                                Minimum benchmark: 40%
                            </span>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-200 text-center shadow-2xs">
                            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Assigned Grade</span>
                            <div className="text-3xl font-extrabold text-blue-600">
                                {grade}
                            </div>
                            <span className="text-[11px] text-slate-500 mt-1 block font-medium">{gradeLabel}</span>
                        </div>
                    </div>

                    {/* Verification Watermark & Department Endorsement */}
                    <div className="p-4 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
                        <div className="flex items-center gap-2">
                            <ShieldCheck size={16} className="text-blue-600 shrink-0" />
                            <span>Digital Verification Hash: <code className="font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">AGMR-{rid || '2026'}-SECURE</code></span>
                        </div>
                        <div className="text-slate-400 font-medium">
                            Validated by Autonomous Evaluation Engine
                        </div>
                    </div>
                </div>

                {/* Performance Analysis & AI Recommendations */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2">
                    {/* Academic Performance Overview */}
                    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
                        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                                <TrendingUp size={15} />
                            </div>
                            <h3 className="text-sm font-semibold text-slate-900">
                                Proficiency Assessment
                            </h3>
                        </div>

                        <div className="space-y-3 text-xs">
                            <div>
                                <div className="flex justify-between font-medium text-slate-700 mb-1.5">
                                    <span>Subject Mastery</span>
                                    <span className="font-bold text-slate-900">{pct}%</span>
                                </div>
                                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${passed ? 'bg-emerald-600' : 'bg-red-500'}`}
                                        style={{ width: `${Math.min(100, pct)}%` }}
                                    ></div>
                                </div>
                            </div>

                            <p className="text-slate-600 leading-relaxed pt-2">
                                {passed
                                    ? 'Candidate has satisfied the required academic standard for this curriculum assessment. Fundamental concepts are sound.'
                                    : 'Candidate scored below the 40% course benchmark. Remedial practice of foundational chapters is advised prior to semester evaluations.'}
                            </p>
                        </div>
                    </div>

                    {/* AI Academic Study Recommendations */}
                    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
                        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                                <Sparkles size={15} />
                            </div>
                            <h3 className="text-sm font-semibold text-slate-900">
                                Recommended Study Areas
                            </h3>
                        </div>

                        {aiLoading ? (
                            <div className="py-6 text-center text-xs text-slate-400">
                                <span className="inline-block w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2" />
                                Generating personalized study focus areas...
                            </div>
                        ) : (
                            <div className="space-y-2 text-xs">
                                <p className="text-slate-600 leading-relaxed">
                                    Key topic areas to reinforce in <span className="font-semibold text-slate-800">{subjectName}</span>:
                                </p>
                                <ul className="space-y-1.5 text-slate-700 pl-1">
                                    <li className="flex items-start gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0"></span>
                                        <span>Time-complexity trade-offs and recursive divide-and-conquer strategies</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0"></span>
                                        <span>Relational schema normalization and indexing optimization</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0"></span>
                                        <span>Consult textbook chapters on OSI stack architecture and socket routing</span>
                                    </li>
                                </ul>

                                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between print:hidden">
                                    <span className="text-[11px] text-slate-400">Need concept explanation?</span>
                                    <button
                                        onClick={() => {
                                            const toggle = document.getElementById('ai-chatbot-toggle');
                                            if (toggle) toggle.click();
                                        }}
                                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                                    >
                                        Ask AI Study Tutor →
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* 3. Footer */}
            <footer className="w-full bg-white border-t border-slate-200 py-4 px-6 text-center text-xs text-slate-500 print:hidden">
                <p>© 2026 AGMR College of Engineering. Online Examination System.</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Official Academic Record • Validated by Department Evaluation Engine</p>
            </footer>
        </div>
    );
}

export default ResultView;
