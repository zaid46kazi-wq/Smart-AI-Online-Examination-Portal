import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { showToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/api';
import { AIChatbot } from '../components/AIChatbot';
import { AppLayout } from '../components/ui/AppLayout';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';
import {
    CheckCircle2,
    Clock,
    FileText,
    Award,
    Sparkles,
    Calendar,
    BookOpen,
    Play,
    Download,
    TrendingUp,
    Trophy,
    ArrowUpRight,
    HelpCircle,
    Shield,
    ExternalLink,
    AlertCircle,
    User,
    ClipboardList
} from 'lucide-react';

export function StudentDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const currentTab = searchParams.get('tab') || 'overview';

    const [exams, setExams] = useState([]);
    const [results, setResults] = useState([]);
    const [leaderboard, setLeaderboard] = useState([]);
    const [rankInfo, setRankInfo] = useState({ rank: '-', desc: 'Complete assessments to rank' });
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        setLoading(true);
        try {
            const [ex, res, lb] = await Promise.all([
                apiFetch('/api/exams').catch(() => []),
                apiFetch('/api/my-results').catch(() => []),
                apiFetch('/api/leaderboard').catch(() => [])
            ]);
            setExams(Array.isArray(ex) ? ex : []);
            setResults(Array.isArray(res) ? res : []);
            const lbArray = Array.isArray(lb) ? lb : [];
            setLeaderboard(lbArray);

            if (user && lbArray.length > 0) {
                const idx = lbArray.findIndex(l => (l.Username || l.username || '').toLowerCase() === (user.username || '').toLowerCase());
                if (idx !== -1) {
                    setRankInfo({ rank: `#${idx + 1}`, desc: `Top ${idx + 1} standing in batch` });
                }
            }
        } catch (err) {
            console.error('Load student error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const startExam = async (examId) => {
        try {
            const statusData = await apiFetch(`/api/exam-status/${examId}`);
            if (statusData && statusData.already_attempted) {
                showToast('You have already submitted this examination.', 'warning');
                loadData();
                return;
            }
            navigate(`/exam?id=${examId}&autoProctor=true`);
        } catch (err) {
            showToast('Error initializing exam session: ' + err.message, 'error');
        }
    };

    const askAI = (prompt) => {
        window.dispatchEvent(new CustomEvent('ai-ask-prompt', { detail: { prompt } }));
    };

    const resultsArray = Array.isArray(results) ? results : [];
    const examsArray = Array.isArray(exams) ? exams : [];
    const leaderboardArray = Array.isArray(leaderboard) ? leaderboard : [];

    const scores = resultsArray.map(r => r.total_marks > 0 ? Math.round((r.score / r.total_marks) * 100) : 0);
    const bestScore = scores.length > 0 ? Math.max(...scores) + '%' : 'N/A';
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) + '%' : '0%';
    const availableCount = examsArray.filter(e => !e.already_attempted).length;

    const tabs = [
        { id: 'overview', label: 'Student Portal Overview' },
        { id: 'exams', label: 'Examinations', count: availableCount },
        { id: 'results', label: 'Official Results', count: resultsArray.length },
        { id: 'performance', label: 'Academic Standing' },
        { id: 'ai', label: 'AI Study Assistant' }
    ];

    return (
        <AppLayout activeTab={currentTab} onTabChange={(t) => setSearchParams({ tab: t })}>
            {/* 1. Header Banner */}
            <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 rounded-2xl p-6 text-white mb-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/20 text-white uppercase tracking-wider backdrop-blur-xs">
                                Student Portal
                            </span>
                            <span className="text-blue-200 text-xs font-mono">
                                USN: {user?.usn || '1AG21CS001'}
                            </span>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                            Welcome back, {user?.name || user?.username || 'Student'}!
                        </h2>
                        <p className="text-xs text-blue-100 max-w-xl">
                            Autonomous examination schedule, verified grade reports, and AI study guidance for the current semester.
                        </p>
                    </div>

                    <div className="shrink-0 flex items-center gap-3 bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/10">
                        <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center font-bold text-white text-base">
                            {user?.username?.charAt(0)?.toUpperCase() || 'S'}
                        </div>
                        <div className="text-xs">
                            <div className="font-bold text-white leading-tight">
                                {user?.name || user?.username}
                            </div>
                            <div className="text-blue-200 text-[11px]">
                                CSE Department • 8th Sem
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. Key Metrics Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <StatCard
                    label="Completed Exams"
                    value={resultsArray.length}
                    description={`Top score: ${bestScore}`}
                    icon={CheckCircle2}
                    badgeText="Verified"
                    badgeColor="green"
                />
                <StatCard
                    label="Cumulative Average"
                    value={avgScore}
                    description="Across evaluated attempts"
                    icon={TrendingUp}
                    badgeText="Mean"
                    badgeColor="blue"
                />
                <StatCard
                    label="Available Assessments"
                    value={availableCount}
                    description="Ready to attempt"
                    icon={Clock}
                    badgeText="Active"
                    badgeColor="amber"
                />
                <StatCard
                    label="Batch Standing"
                    value={rankInfo.rank}
                    description={rankInfo.desc}
                    icon={Trophy}
                    badgeText="Rank"
                    badgeColor="blue"
                />
            </div>

            {/* 3. Navigation Tabs */}
            <div className="flex border-b border-slate-200 mb-6 overflow-x-auto gap-2">
                {tabs.map((tab) => {
                    const active = currentTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setSearchParams({ tab: tab.id })}
                            className={`flex items-center gap-2 py-2.5 px-3.5 border-b-2 text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                                active
                                    ? 'border-blue-600 text-blue-600 font-bold'
                                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                            }`}
                        >
                            <span>{tab.label}</span>
                            {tab.count !== undefined && (
                                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                                    active ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
                                }`}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* 4. Tab Contents */}
            {loading ? (
                <LoadingSkeleton variant="cards" rows={3} />
            ) : (
                <div>
                    {/* ──────────────────────────────────────────────────────────── */}
                    {/* TAB: OVERVIEW & EXAMS */}
                    {/* ──────────────────────────────────────────────────────────── */}
                    {(currentTab === 'overview' || currentTab === 'exams') && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Left 2 Columns: Scheduled Examinations */}
                            <div className="lg:col-span-2 space-y-6">
                                <Card
                                    title="Scheduled & Available Examinations"
                                    subtitle="AI proctored online examinations assigned to your batch"
                                    icon={ClipboardList}
                                >
                                    {examsArray.length === 0 ? (
                                        <EmptyState
                                            title="No examinations scheduled"
                                            description="There are currently no active or pending examinations assigned to your profile."
                                        />
                                    ) : (
                                        <div className="space-y-3">
                                            {examsArray.map((e) => {
                                                const isAttempted = e.already_attempted === true;
                                                return (
                                                    <div
                                                        key={e.id}
                                                        className="p-4.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-2xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                                                    >
                                                        <div className="space-y-2">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <h4 className="text-sm font-bold text-slate-900 tracking-tight">
                                                                    {e.exam_name || e.name}
                                                                </h4>
                                                                <Badge variant={isAttempted ? 'default' : 'success'} size="xs" dot={!isAttempted}>
                                                                    {isAttempted ? 'SUBMITTED' : 'AVAILABLE'}
                                                                </Badge>
                                                            </div>
                                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500">
                                                                <span className="flex items-center gap-1.5">
                                                                    <BookOpen size={13} className="text-slate-400" />
                                                                    <span className="font-medium text-slate-700">
                                                                        {e.subjects?.subject_name || e.subject_name || 'General Engineering'}
                                                                    </span>
                                                                </span>
                                                                <span className="flex items-center gap-1.5">
                                                                    <Clock size={13} className="text-slate-400" />
                                                                    <span>{e.time_limit} mins</span>
                                                                </span>
                                                                <span className="flex items-center gap-1.5">
                                                                    <FileText size={13} className="text-slate-400" />
                                                                    <span>{e.total_questions || '?'} Items</span>
                                                                </span>
                                                                {e.exam_date && (
                                                                    <span className="flex items-center gap-1.5">
                                                                        <Calendar size={13} className="text-slate-400" />
                                                                        <span>{e.exam_date}</span>
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-2 shrink-0">
                                                            <a
                                                                href={`/api/hall-ticket/${e.id}`}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200 transition-colors inline-flex items-center gap-1.5"
                                                            >
                                                                <Download size={13} />
                                                                <span>Hall Ticket</span>
                                                            </a>
                                                            {isAttempted ? (
                                                                <button
                                                                    disabled
                                                                    className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-400 bg-slate-50 border border-slate-200 cursor-not-allowed"
                                                                >
                                                                    Completed
                                                                </button>
                                                            ) : (
                                                                <Button
                                                                    size="sm"
                                                                    variant="primary"
                                                                    onClick={() => startExam(e.id)}
                                                                    icon={Play}
                                                                >
                                                                    Start Exam
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </Card>

                                {/* Recent Results Snapshot */}
                                <Card
                                    title="Recent Assessment Results"
                                    subtitle="Verified evaluation scores and grade performance reports"
                                    icon={Award}
                                    action={
                                        resultsArray.length > 0 && (
                                            <Button size="sm" variant="secondary" onClick={() => setSearchParams({ tab: 'results' })}>
                                                View All Results ({resultsArray.length})
                                            </Button>
                                        )
                                    }
                                >
                                    {resultsArray.length === 0 ? (
                                        <EmptyState
                                            title="No evaluation results on record"
                                            description="Completed examination scorecards and analytics will automatically appear here."
                                        />
                                    ) : (
                                        <div className="overflow-x-auto -mx-5 -mb-5">
                                            <table className="academic-table">
                                                <thead>
                                                    <tr>
                                                        <th>Subject / Examination</th>
                                                        <th>Score Obtained</th>
                                                        <th>Percentage</th>
                                                        <th>Grade</th>
                                                        <th>Result</th>
                                                        <th className="text-right">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {resultsArray.slice(0, 5).map((r) => {
                                                        const pct = r.total_marks > 0 ? Math.round((r.score / r.total_marks) * 100) : 0;
                                                        const passed = pct >= 40;
                                                        let grade = 'F';
                                                        if (pct >= 90) grade = 'A+';
                                                        else if (pct >= 80) grade = 'A';
                                                        else if (pct >= 70) grade = 'B+';
                                                        else if (pct >= 60) grade = 'B';
                                                        else if (pct >= 50) grade = 'C';
                                                        else if (pct >= 40) grade = 'D';

                                                        return (
                                                            <tr key={r.id}>
                                                                <td>
                                                                    <div className="font-bold text-slate-900">{r.exams?.name || r.exam_name || 'Exam'}</div>
                                                                    <div className="text-[11px] text-slate-500">{r.exams?.subjects?.subject_name || r.subject_name || 'Curriculum Subject'}</div>
                                                                </td>
                                                                <td className="font-bold text-slate-900">
                                                                    {r.score} <span className="text-slate-400 font-normal">/ {r.total_marks}</span>
                                                                </td>
                                                                <td className="font-bold text-blue-600">{pct}%</td>
                                                                <td>
                                                                    <Badge variant={passed ? 'primary' : 'danger'} size="xs">{grade}</Badge>
                                                                </td>
                                                                <td>
                                                                    <Badge variant={passed ? 'success' : 'danger'} size="xs">
                                                                        {passed ? 'PASS' : 'FAIL'}
                                                                    </Badge>
                                                                </td>
                                                                <td className="text-right">
                                                                    <Button
                                                                        size="xs"
                                                                        variant="secondary"
                                                                        onClick={() => navigate(`/result?rid=${r.id}`)}
                                                                        icon={ExternalLink}
                                                                    >
                                                                        Scorecard
                                                                    </Button>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </Card>
                            </div>

                            {/* Right Column: AI Assistant & Cohort Leaderboard */}
                            <div className="space-y-6">
                                {/* AI Study Assistant Card */}
                                <Card
                                    title="AI Study Assistant"
                                    subtitle="Prepare for exams with conversational concept reviews"
                                    icon={Sparkles}
                                    badge={<Badge variant="primary" size="xs">Gemini 2.5</Badge>}
                                >
                                    <div className="space-y-3">
                                        <p className="text-xs text-slate-600 leading-relaxed">
                                            Ask our academic AI tutor to explain algorithms, clarify formulas, or quiz you on course concepts.
                                        </p>
                                        <div className="space-y-1.5 pt-1">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Suggested Topics:</span>
                                            <div className="space-y-1">
                                                {[
                                                    'Explain Dijkstra shortest path algorithm',
                                                    'Explain Database normalization 1NF to BCNF',
                                                    'Explain Process scheduling algorithms in OS',
                                                    'Explain OSI model vs TCP/IP layer mapping'
                                                ].map((prompt, i) => (
                                                    <button
                                                        key={i}
                                                        type="button"
                                                        onClick={() => askAI(prompt)}
                                                        className="w-full text-left p-2 rounded-lg bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 text-xs text-slate-700 transition-colors flex items-center justify-between group cursor-pointer"
                                                    >
                                                        <span className="truncate">{prompt}</span>
                                                        <ArrowUpRight size={13} className="text-slate-400 group-hover:text-blue-600 shrink-0" />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </Card>

                                {/* Cohort Leaderboard Card */}
                                <Card
                                    title="Academic Standing (Top 5)"
                                    subtitle="Batch merit rank by overall score"
                                    icon={Trophy}
                                >
                                    {leaderboardArray.length === 0 ? (
                                        <p className="text-xs text-slate-400 text-center py-4">No leaderboard records yet</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {leaderboardArray.slice(0, 5).map((l, i) => {
                                                const isUser = (l.Username || l.username || '').toLowerCase() === (user?.username || '').toLowerCase();
                                                return (
                                                    <div
                                                        key={i}
                                                        className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                                                            isUser ? 'bg-blue-50 border-blue-200 font-bold text-blue-900' : 'bg-white border-slate-200'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center font-bold text-[10px] text-slate-600">
                                                                {i + 1}
                                                            </span>
                                                            <span className="truncate">{l.Name || l.name || l.Username}</span>
                                                        </div>
                                                        <span className="font-mono font-bold text-slate-800">{l.AverageScore || l.score || 0}%</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </Card>
                            </div>
                        </div>
                    )}

                    {/* ──────────────────────────────────────────────────────────── */}
                    {/* TAB: RESULTS */}
                    {/* ──────────────────────────────────────────────────────────── */}
                    {currentTab === 'results' && (
                        <Card
                            title={`Official Academic Results (${resultsArray.length})`}
                            subtitle="Verifiable evaluation scorecards, question marks, and downloadable pass certificates"
                            icon={Award}
                        >
                            {resultsArray.length === 0 ? (
                                <EmptyState
                                    icon={Award}
                                    title="No results found"
                                    description="You have not completed any examinations yet."
                                />
                            ) : (
                                <div className="overflow-x-auto -mx-5 -mb-5">
                                    <table className="academic-table">
                                        <thead>
                                            <tr>
                                                <th>Subject / Exam</th>
                                                <th>Score Obtained</th>
                                                <th>Percentage</th>
                                                <th>Grade</th>
                                                <th>Status</th>
                                                <th>Date Attempted</th>
                                                <th className="text-right">Official Documents</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {resultsArray.map((r) => {
                                                const pct = r.total_marks > 0 ? Math.round((r.score / r.total_marks) * 100) : 0;
                                                const passed = pct >= 40;
                                                let grade = 'F';
                                                if (pct >= 90) grade = 'A+';
                                                else if (pct >= 80) grade = 'A';
                                                else if (pct >= 70) grade = 'B+';
                                                else if (pct >= 60) grade = 'B';
                                                else if (pct >= 50) grade = 'C';
                                                else if (pct >= 40) grade = 'D';

                                                return (
                                                    <tr key={r.id}>
                                                        <td>
                                                            <div className="font-bold text-slate-900">{r.exams?.name || r.exam_name || 'Exam'}</div>
                                                            <div className="text-[11px] text-slate-500">{r.exams?.subjects?.subject_name || r.subject_name || 'Curriculum Subject'}</div>
                                                        </td>
                                                        <td className="font-bold text-slate-900">
                                                            {r.score} <span className="text-slate-400 font-normal">/ {r.total_marks}</span>
                                                        </td>
                                                        <td className="font-bold text-blue-600">{pct}%</td>
                                                        <td>
                                                            <Badge variant={passed ? 'primary' : 'danger'} size="xs">{grade}</Badge>
                                                        </td>
                                                        <td>
                                                            <Badge variant={passed ? 'success' : 'danger'} size="xs">
                                                                {passed ? 'PASS' : 'FAIL'}
                                                            </Badge>
                                                        </td>
                                                        <td className="text-slate-500 text-xs">
                                                            {r.exam_date ? new Date(r.exam_date).toLocaleDateString('en-IN') : 'Recent'}
                                                        </td>
                                                        <td className="text-right space-x-2">
                                                            <a
                                                                href={`/api/result-pdf/${r.id}`}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="px-2.5 py-1 rounded-md text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200 transition-colors inline-flex items-center gap-1"
                                                            >
                                                                <Download size={12} />
                                                                <span>Certificate</span>
                                                            </a>
                                                            <Button
                                                                size="xs"
                                                                variant="primary"
                                                                onClick={() => navigate(`/result?rid=${r.id}`)}
                                                                icon={ExternalLink}
                                                            >
                                                                View Report
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </Card>
                    )}

                    {/* ──────────────────────────────────────────────────────────── */}
                    {/* TAB: PERFORMANCE */}
                    {/* ──────────────────────────────────────────────────────────── */}
                    {currentTab === 'performance' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Card title="Cohort Standing & Merit Rank" subtitle="Comparative standing among peer examinees" icon={Trophy}>
                                <div className="space-y-3">
                                    {leaderboardArray.map((l, i) => {
                                        const isUser = (l.Username || l.username || '').toLowerCase() === (user?.username || '').toLowerCase();
                                        return (
                                            <div
                                                key={i}
                                                className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                                                    isUser ? 'bg-blue-50 border-blue-300 font-bold text-blue-900 shadow-2xs' : 'bg-white border-slate-200'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                                                        i === 0 ? 'bg-amber-100 text-amber-700' :
                                                        i === 1 ? 'bg-slate-200 text-slate-700' :
                                                        i === 2 ? 'bg-amber-50 text-amber-800' : 'bg-slate-100 text-slate-600'
                                                    }`}>
                                                        {i + 1}
                                                    </span>
                                                    <div>
                                                        <div className="font-semibold text-slate-900">{l.Name || l.name || l.Username}</div>
                                                        <div className="text-[10px] text-slate-400 font-mono">@{l.Username}</div>
                                                    </div>
                                                </div>
                                                <span className="font-bold text-blue-600">{l.AverageScore || l.score || 0}%</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </Card>

                            <Card title="Examination Performance Summary" subtitle="Key metrics across attempted assessments" icon={Award}>
                                <div className="space-y-4">
                                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                                        <div className="flex justify-between text-xs font-semibold text-slate-700">
                                            <span>Passing Rate</span>
                                            <span>
                                                {resultsArray.length > 0
                                                    ? Math.round((resultsArray.filter(r => (r.score / r.total_marks) >= 0.4).length / resultsArray.length) * 100)
                                                    : 0}%
                                            </span>
                                        </div>
                                        <div className="w-full bg-slate-200 rounded-full h-2">
                                            <div
                                                className="bg-emerald-600 h-2 rounded-full"
                                                style={{
                                                    width: `${resultsArray.length > 0 ? (resultsArray.filter(r => (r.score / r.total_marks) >= 0.4).length / resultsArray.length) * 100 : 0}%`
                                                }}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 text-xs">
                                        <div className="p-3 bg-white border border-slate-200 rounded-lg">
                                            <span className="text-slate-400 block text-[10px] uppercase font-bold">Highest Score</span>
                                            <span className="text-base font-bold text-slate-900">{bestScore}</span>
                                        </div>
                                        <div className="p-3 bg-white border border-slate-200 rounded-lg">
                                            <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Attempts</span>
                                            <span className="text-base font-bold text-slate-900">{resultsArray.length}</span>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    )}

                    {/* ──────────────────────────────────────────────────────────── */}
                    {/* TAB: AI STUDY ASSISTANT */}
                    {/* ──────────────────────────────────────────────────────────── */}
                    {currentTab === 'ai' && (
                        <div className="max-w-3xl mx-auto">
                            <Card
                                title="AI Academic Tutor & Study Assistant"
                                subtitle="Context-aware study assistant powered by Gemini Flash"
                                icon={Sparkles}
                            >
                                <div className="space-y-4">
                                    <p className="text-xs text-slate-600">
                                        Click the floating AI Study Assistant in the lower corner or select any concept below to open the study dialogue.
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {[
                                            'Explain Dijkstra shortest path algorithm',
                                            'Explain Database normalization 1NF to BCNF',
                                            'Explain Process scheduling algorithms in OS',
                                            'Explain OSI model vs TCP/IP layer mapping',
                                            'Explain quicksort vs mergesort time complexity',
                                            'Explain ACID properties in database transactions'
                                        ].map((prompt, i) => (
                                            <button
                                                key={i}
                                                type="button"
                                                onClick={() => askAI(prompt)}
                                                className="p-3 text-left rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 text-xs text-slate-800 transition-colors flex items-center justify-between cursor-pointer"
                                            >
                                                <span>{prompt}</span>
                                                <ArrowUpRight size={14} className="text-blue-600 shrink-0" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </Card>
                        </div>
                    )}
                </div>
            )}

            {/* Global AI Chatbot Widget */}
            <AIChatbot />
        </AppLayout>
    );
}

export default StudentDashboard;
