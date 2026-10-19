import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { showToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/api';
import { AppLayout } from '../components/ui/AppLayout';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';
import {
    Users,
    ClipboardList,
    TrendingUp,
    BookOpen,
    Plus,
    Trash2,
    Upload,
    Video,
    ShieldAlert,
    AlertTriangle,
    Search,
    CheckCircle2,
    Calendar,
    GraduationCap,
    Clock,
    FileText,
    Shield,
    Sparkles,
    Eye,
    ChevronRight,
    ArrowUpRight,
    Award,
    ShieldCheck
} from 'lucide-react';

const formatIncidentDetails = (inc) => {
    if (!inc) return 'Security threshold exceeded';

    let details = inc.details;
    if (typeof details === 'string') {
        try {
            details = JSON.parse(details);
        } catch {
            return details || inc.message || 'Security threshold exceeded';
        }
    }

    if (details && typeof details === 'object') {
        const msg = details.message || inc.message || details.detail || details.description;
        const count = details.warning_count ?? inc.warning_count;
        if (msg) {
            return count !== undefined && count !== null
                ? `${msg} (Warning #${count})`
                : msg;
        }
        try {
            return JSON.stringify(details);
        } catch {
            return 'Security threshold exceeded';
        }
    }

    return inc.message || 'Security threshold exceeded';
};

export function AdminDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const currentTab = searchParams.get('tab') || 'overview';

    const [loading, setLoading] = useState(true);
    const [analytics, setAnalytics] = useState({ totalStudents: 0, totalExams: 0, avgScore: 0, totalResults: 0 });
    const [exams, setExams] = useState([]);
    const [students, setStudents] = useState([]);
    const [subjects, setSubjects] = useState([]);

    // Forms
    const [subjectName, setSubjectName] = useState('');
    const [subjectCode, setSubjectCode] = useState('');

    const [studentName, setStudentName] = useState('');
    const [studentUsn, setStudentUsn] = useState('');
    const [studentEmail, setStudentEmail] = useState('');
    const [studentUsername, setStudentUsername] = useState('');
    const [studentPassword, setStudentPassword] = useState('pass123');
    const [studentFile, setStudentFile] = useState(null);
    const [studentModalTab, setStudentModalTab] = useState('single'); // 'single' | 'csv'

    // Filter/Search states
    const [searchStudent, setSearchStudent] = useState('');
    const [searchExam, setSearchExam] = useState('');
    const [searchSubject, setSearchSubject] = useState('');

    // Modals
    const [incidentsModal, setIncidentsModal] = useState(false);
    const [incidents, setIncidents] = useState([]);
    const [activeExamTitle, setActiveExamTitle] = useState('');
    const [incidentsLoading, setIncidentsLoading] = useState(false);

    const [addStudentModal, setAddStudentModal] = useState(false);
    const [addSubjectModal, setAddSubjectModal] = useState(false);

    // Confirm dialog state
    const [confirmDialog, setConfirmDialog] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: null,
        confirmVariant: 'danger',
        loading: false
    });

    const loadData = async () => {
        setLoading(true);
        try {
            const [a, e, sub, st] = await Promise.all([
                apiFetch('/api/analytics').catch(() => ({ totalStudents: 0, totalExams: 0, avgScore: 0, totalResults: 0 })),
                apiFetch('/api/exams').catch(() => []),
                apiFetch('/api/subjects').catch(() => []),
                apiFetch('/api/students').catch(() => []),
            ]);
            setAnalytics(a || { totalStudents: 0, totalExams: 0, avgScore: 0, totalResults: 0 });
            setExams(Array.isArray(e) ? e : []);
            setSubjects(Array.isArray(sub) ? sub : []);
            setStudents(Array.isArray(st) ? st : []);
        } catch (err) {
            console.error('Admin load error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const addSubject = async (e) => {
        if (e) e.preventDefault();
        if (!subjectName.trim()) { showToast('Please enter subject name', 'warning'); return; }
        try {
            await apiFetch('/api/subjects', {
                method: 'POST',
                body: JSON.stringify({ subject_name: subjectName, subject_code: subjectCode })
            });
            showToast('Subject created successfully', 'success');
            setSubjectName(''); setSubjectCode('');
            setAddSubjectModal(false);
            loadData();
        } catch (err) { showToast(err.message, 'error'); }
    };

    const confirmDeleteSubject = (id, name) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Remove Academic Subject',
            message: `Are you sure you want to delete "${name}"? Any connected examinations may be affected.`,
            confirmVariant: 'danger',
            onConfirm: async () => {
                try {
                    await apiFetch(`/api/subjects/${id}`, { method: 'DELETE' });
                    showToast('Subject removed', 'success');
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                    loadData();
                } catch (err) { showToast(err.message, 'error'); }
            }
        });
    };

    const addStudent = async (e) => {
        if (e) e.preventDefault();
        if (!studentUsername.trim()) { showToast('Username is required', 'warning'); return; }
        if (!studentPassword.trim()) { showToast('Password is required', 'warning'); return; }
        try {
            await apiFetch('/api/students', {
                method: 'POST',
                body: JSON.stringify({
                    name: studentName, usn: studentUsn, email: studentEmail,
                    username: studentUsername, password: studentPassword
                })
            });
            showToast('Student enrolled successfully', 'success');
            setStudentName(''); setStudentUsn(''); setStudentEmail(''); setStudentUsername('');
            setAddStudentModal(false);
            loadData();
        } catch (err) { showToast(err.message, 'error'); }
    };

    const importStudents = async (e) => {
        if (e) e.preventDefault();
        if (!studentFile) { showToast('Please select a valid CSV or Excel file', 'warning'); return; }
        const form = new FormData();
        form.append('file', studentFile);
        try {
            const data = await apiFetch('/api/students/import', { method: 'POST', body: form });
            showToast(`Imported ${data.inserted || 0} student records successfully`, 'success');
            setStudentFile(null);
            setAddStudentModal(false);
            loadData();
        } catch (err) { showToast(err.message, 'error'); }
    };

    const confirmDeleteStudent = (id, name) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Delete Student Account',
            message: `Are you sure you want to delete candidate record for "${name}"? This removes their examination access.`,
            confirmVariant: 'danger',
            onConfirm: async () => {
                try {
                    await apiFetch(`/api/students/${id}`, { method: 'DELETE' });
                    showToast('Student record removed', 'success');
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                    loadData();
                } catch (err) { showToast(err.message, 'error'); }
            }
        });
    };

    const confirmDeleteExam = (id, title) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Delete Examination',
            message: `Are you sure you want to delete "${title}"? All submitted candidate attempts and questions will be permanently removed.`,
            confirmVariant: 'danger',
            onConfirm: async () => {
                try {
                    await apiFetch(`/api/exams/${id}`, { method: 'DELETE' });
                    showToast('Examination deleted', 'success');
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                    loadData();
                } catch (err) { showToast(err.message, 'error'); }
            }
        });
    };

    const viewIncidents = async (examId, examTitle) => {
        setActiveExamTitle(examTitle || `Exam #${examId}`);
        setIncidentsModal(true);
        setIncidentsLoading(true);
        try {
            const data = await apiFetch(`/api/proctor/incidents/${examId}`);
            setIncidents(Array.isArray(data) ? data : []);
        } catch (err) {
            setIncidents([]);
        } finally {
            setIncidentsLoading(false);
        }
    };

    // Filter logic
    const filteredStudents = students.filter(s => {
        const query = searchStudent.toLowerCase();
        return (s.name || '').toLowerCase().includes(query) ||
               (s.usn || '').toLowerCase().includes(query) ||
               (s.username || '').toLowerCase().includes(query) ||
               (s.email || '').toLowerCase().includes(query);
    });

    const filteredExams = exams.filter(e => {
        const query = searchExam.toLowerCase();
        return (e.exam_name || e.name || '').toLowerCase().includes(query) ||
               (e.subjects?.subject_name || '').toLowerCase().includes(query);
    });

    const filteredSubjects = subjects.filter(sub => {
        const query = searchSubject.toLowerCase();
        return (sub.subject_name || '').toLowerCase().includes(query) ||
               (sub.subject_code || '').toLowerCase().includes(query);
    });

    // Faculty members list (students table users with Admin role)
    const facultyList = students.filter(s => (s.role || '').toLowerCase() === 'admin');

    const tabs = [
        { id: 'overview', label: 'Command Overview', icon: LayoutDashboardIcon },
        { id: 'exams', label: 'Examinations', icon: ClipboardList, count: exams.length },
        { id: 'students', label: 'Students Roster', icon: Users, count: students.length },
        { id: 'faculty', label: 'Faculty Directory', icon: GraduationCap, count: facultyList.length },
        { id: 'subjects', label: 'Subjects Catalog', icon: BookOpen, count: subjects.length },
    ];

    function LayoutDashboardIcon(props) {
        return <ClipboardList {...props} />;
    }

    return (
        <AppLayout activeTab={currentTab} onTabChange={(t) => setSearchParams({ tab: t })}>
            {/* 1. Page Header */}
            <PageHeader
                title="Examination Command Center"
                description="Comprehensive academic administration for autonomous examinations, student credentials, subject syllabi, and live AI security."
                action={
                    <div className="flex items-center gap-2 flex-wrap">
                        <Button
                            variant="secondary"
                            size="sm"
                            icon={Plus}
                            onClick={() => setAddSubjectModal(true)}
                        >
                            Add Subject
                        </Button>
                        <Button
                            variant="secondary"
                            size="sm"
                            icon={Plus}
                            onClick={() => setAddStudentModal(true)}
                        >
                            Enroll Student
                        </Button>
                        <Button
                            variant="primary"
                            size="sm"
                            icon={Plus}
                            onClick={() => navigate('/create-exam')}
                        >
                            Create Exam
                        </Button>
                    </div>
                }
            />

            {/* 2. Key Metrics Overview (Stripe/Linear Style) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard
                    label="Registered Students"
                    value={analytics.totalStudents || students.length || 0}
                    description="Active enrolled candidates"
                    icon={Users}
                    badgeText="Active"
                    badgeColor="blue"
                />
                <StatCard
                    label="Active Examinations"
                    value={exams.length}
                    description={`${subjects.length} academic subjects`}
                    icon={ClipboardList}
                    badgeText="Published"
                    badgeColor="green"
                />
                <StatCard
                    label="Class Average Score"
                    value={`${analytics.avgScore || 0}%`}
                    description={`${analytics.totalResults || 0} attempts evaluated`}
                    icon={TrendingUp}
                    badgeText="Mean"
                    badgeColor="amber"
                />
                <StatCard
                    label="Curriculum Subjects"
                    value={subjects.length}
                    description="Autonomous course codes"
                    icon={BookOpen}
                    badgeText="Catalog"
                    badgeColor="blue"
                />
            </div>

            {/* 3. Segmented Tab Navigation */}
            <div className="flex border-b border-slate-200 mb-6 overflow-x-auto gap-2">
                {tabs.map((tab) => {
                    const active = currentTab === tab.id;
                    const Icon = tab.icon;
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
                            <Icon size={15} />
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

            {/* 4. Tab Content Panels */}
            {loading ? (
                <LoadingSkeleton variant="table" rows={5} />
            ) : (
                <div className="space-y-6">
                    {/* ──────────────────────────────────────────────────────────── */}
                    {/* TAB: OVERVIEW */}
                    {/* ──────────────────────────────────────────────────────────── */}
                    {currentTab === 'overview' && (
                        <div className="space-y-6">
                            {/* Quick Navigation Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div
                                    onClick={() => navigate('/create-exam')}
                                    className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs hover:shadow-xs hover:border-blue-300 transition-all cursor-pointer group flex items-start justify-between"
                                >
                                    <div className="space-y-1">
                                        <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-2">
                                            <FileText size={18} />
                                        </div>
                                        <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                                            Question Authoring & AI Generation
                                        </h4>
                                        <p className="text-xs text-slate-500">
                                            Create questions manually or upload module notes for Gemini AI question drafting.
                                        </p>
                                    </div>
                                    <ArrowUpRight size={16} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
                                </div>

                                <div
                                    onClick={() => navigate('/ai-evaluation')}
                                    className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs hover:shadow-xs hover:border-blue-300 transition-all cursor-pointer group flex items-start justify-between"
                                >
                                    <div className="space-y-1">
                                        <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
                                            <Award size={18} />
                                        </div>
                                        <h4 className="text-sm font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                                            AI Answer Booklet Evaluation
                                        </h4>
                                        <p className="text-xs text-slate-500">
                                            Upload question papers, valuation schemes, and student handwritten booklets for AI evaluation.
                                        </p>
                                    </div>
                                    <ArrowUpRight size={16} className="text-slate-400 group-hover:text-emerald-600 transition-colors" />
                                </div>

                                <div
                                    onClick={() => navigate('/results')}
                                    className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs hover:shadow-xs hover:border-blue-300 transition-all cursor-pointer group flex items-start justify-between"
                                >
                                    <div className="space-y-1">
                                        <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2">
                                            <ClipboardList size={18} />
                                        </div>
                                        <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                            Official Results & Grade Ledger
                                        </h4>
                                        <p className="text-xs text-slate-500">
                                            Inspect finalized student scorecards, percentage calculations, and download certificates.
                                        </p>
                                    </div>
                                    <ArrowUpRight size={16} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
                                </div>
                            </div>

                            {/* Recent Examinations Summary Table */}
                            <Card
                                title="Scheduled Examinations Summary"
                                subtitle="Overview of currently deployed assessments and question totals"
                                action={
                                    <Button size="sm" variant="secondary" onClick={() => setSearchParams({ tab: 'exams' })}>
                                        View All ({exams.length})
                                    </Button>
                                }
                            >
                                {exams.length === 0 ? (
                                    <EmptyState
                                        title="No examinations created yet"
                                        description="Start by creating an examination and assigning subject questions."
                                        action={<Button size="sm" onClick={() => navigate('/create-exam')}>Create Examination</Button>}
                                    />
                                ) : (
                                    <div className="overflow-x-auto -mx-5 -mb-5">
                                        <table className="academic-table">
                                            <thead>
                                                <tr>
                                                    <th>Exam ID</th>
                                                    <th>Title</th>
                                                    <th>Subject</th>
                                                    <th>Duration</th>
                                                    <th>Questions</th>
                                                    <th>Status</th>
                                                    <th className="text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {exams.slice(0, 5).map(e => (
                                                    <tr key={e.id}>
                                                        <td className="font-mono text-xs font-semibold text-slate-500">#{e.id}</td>
                                                        <td className="font-bold text-slate-900">{e.exam_name || e.name}</td>
                                                        <td>
                                                            <Badge variant="primary" size="xs">
                                                                {e.subjects?.subject_name || e.subject_name || 'General'}
                                                            </Badge>
                                                        </td>
                                                        <td>
                                                            <div className="flex items-center gap-1.5 text-xs text-slate-600">
                                                                <Clock size={13} className="text-slate-400" />
                                                                <span>{e.time_limit} mins</span>
                                                            </div>
                                                        </td>
                                                        <td className="font-semibold text-slate-800">{e.total_questions || 0} Questions</td>
                                                        <td>
                                                            <Badge variant="success" size="xs" dot>Active</Badge>
                                                        </td>
                                                        <td className="text-right space-x-1">
                                                            <button
                                                                onClick={() => viewIncidents(e.id, e.exam_name || e.name)}
                                                                className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 cursor-pointer"
                                                                title="Security & Proctoring Audit"
                                                            >
                                                                <Video size={15} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </Card>
                        </div>
                    )}

                    {/* ──────────────────────────────────────────────────────────── */}
                    {/* TAB: EXAMINATIONS */}
                    {/* ──────────────────────────────────────────────────────────── */}
                    {currentTab === 'exams' && (
                        <Card
                            title={`Examinations Catalog (${filteredExams.length})`}
                            subtitle="Manage scheduled assessments, time limits, question assignments, and integrity records"
                            action={
                                <div className="flex items-center gap-2">
                                    <div className="relative">
                                        <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Search examinations..."
                                            value={searchExam}
                                            onChange={e => setSearchExam(e.target.value)}
                                            className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg w-52 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                                        />
                                    </div>
                                    <Button size="sm" icon={Plus} onClick={() => navigate('/create-exam')}>
                                        New Exam
                                    </Button>
                                </div>
                            }
                        >
                            {filteredExams.length === 0 ? (
                                <EmptyState
                                    title="No examinations match your filter"
                                    description="Create an examination to assign it to students."
                                    action={<Button size="sm" onClick={() => navigate('/create-exam')}>Create Examination</Button>}
                                />
                            ) : (
                                <div className="overflow-x-auto -mx-5 -mb-5">
                                    <table className="academic-table">
                                        <thead>
                                            <tr>
                                                <th>ID</th>
                                                <th>Examination Title</th>
                                                <th>Subject</th>
                                                <th>Duration</th>
                                                <th>Questions</th>
                                                <th>Status</th>
                                                <th className="text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredExams.map(e => (
                                                <tr key={e.id}>
                                                    <td className="font-mono text-slate-400 text-xs font-semibold">#{e.id}</td>
                                                    <td className="font-bold text-slate-900">{e.exam_name || e.name}</td>
                                                    <td>
                                                        <Badge variant="primary" size="xs">
                                                            {e.subjects?.subject_name || e.subject_name || 'General'}
                                                        </Badge>
                                                    </td>
                                                    <td>
                                                        <div className="flex items-center gap-1.5 text-slate-600 text-xs">
                                                            <Clock size={13} className="text-slate-400" />
                                                            <span>{e.time_limit} mins</span>
                                                        </div>
                                                    </td>
                                                    <td className="font-semibold text-slate-800">{e.total_questions || 0} Questions</td>
                                                    <td>
                                                        <Badge variant="success" size="xs" dot>Published</Badge>
                                                    </td>
                                                    <td className="text-right space-x-1">
                                                        <button
                                                            onClick={() => viewIncidents(e.id, e.exam_name || e.name)}
                                                            className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 cursor-pointer transition-colors"
                                                            title="Inspect Proctoring Incidents"
                                                        >
                                                            <Video size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => confirmDeleteExam(e.id, e.exam_name || e.name)}
                                                            className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 cursor-pointer transition-colors"
                                                            title="Delete Examination"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </Card>
                    )}

                    {/* ──────────────────────────────────────────────────────────── */}
                    {/* TAB: STUDENTS */}
                    {/* ──────────────────────────────────────────────────────────── */}
                    {currentTab === 'students' && (
                        <Card
                            title={`Enrolled Students Roster (${filteredStudents.length})`}
                            subtitle="Manage registered student credentials, USN mappings, and portal clearance"
                            action={
                                <div className="flex items-center gap-2">
                                    <div className="relative">
                                        <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Search student or USN..."
                                            value={searchStudent}
                                            onChange={e => setSearchStudent(e.target.value)}
                                            className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg w-52 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                                        />
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="primary"
                                        icon={Plus}
                                        onClick={() => setAddStudentModal(true)}
                                    >
                                        Enroll Student
                                    </Button>
                                </div>
                            }
                        >
                            {filteredStudents.length === 0 ? (
                                <EmptyState
                                    title="No student records found"
                                    description="Enroll students individually or import an Excel/CSV roster."
                                    action={<Button size="sm" onClick={() => setAddStudentModal(true)}>Enroll Student</Button>}
                                />
                            ) : (
                                <div className="overflow-x-auto -mx-5 -mb-5">
                                    <table className="academic-table">
                                        <thead>
                                            <tr>
                                                <th>USN</th>
                                                <th>Candidate Name</th>
                                                <th>Username</th>
                                                <th>Email Address</th>
                                                <th>Role</th>
                                                <th className="text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredStudents.map(s => (
                                                <tr key={s.id}>
                                                    <td className="font-mono text-xs font-bold text-slate-800">
                                                        {s.usn || '-'}
                                                    </td>
                                                    <td className="font-semibold text-slate-900">
                                                        {s.name || s.username}
                                                    </td>
                                                    <td className="font-mono text-xs text-slate-600">
                                                        @{s.username}
                                                    </td>
                                                    <td className="text-slate-600 text-xs">
                                                        {s.email || '-'}
                                                    </td>
                                                    <td>
                                                        <Badge variant={s.role === 'Admin' ? 'purple' : 'neutral'} size="xs">
                                                            {s.role || 'Student'}
                                                        </Badge>
                                                    </td>
                                                    <td className="text-right">
                                                        <button
                                                            onClick={() => confirmDeleteStudent(s.id, s.name || s.username)}
                                                            className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 cursor-pointer transition-colors"
                                                            title="Remove Student"
                                                        >
                                                            <Trash2 size={15} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </Card>
                    )}

                    {/* ──────────────────────────────────────────────────────────── */}
                    {/* TAB: FACULTY */}
                    {/* ──────────────────────────────────────────────────────────── */}
                    {currentTab === 'faculty' && (
                        <Card
                            title={`Faculty & Evaluators Directory (${facultyList.length})`}
                            subtitle="Authorized academic instructors with assessment authoring and evaluation rights"
                            action={
                                <Button size="sm" variant="secondary" icon={Plus} onClick={() => setAddStudentModal(true)}>
                                    Add Faculty
                                </Button>
                            }
                        >
                            {facultyList.length === 0 ? (
                                <EmptyState
                                    icon={GraduationCap}
                                    title="No faculty members listed"
                                    description="Administrators and faculty accounts with role 'Admin' appear here."
                                />
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {facultyList.map(f => (
                                        <div
                                            key={f.id}
                                            className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-3"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center font-bold text-sm">
                                                    {f.name?.charAt(0) || f.username?.charAt(0) || 'F'}
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="text-xs font-bold text-slate-900 truncate">
                                                        {f.name || f.username}
                                                    </h4>
                                                    <p className="text-[11px] text-slate-500 font-mono truncate">
                                                        @{f.username}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-600 flex items-center justify-between">
                                                <span>ID: #{f.id}</span>
                                                <Badge variant="purple" size="xs">Department Admin</Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Card>
                    )}

                    {/* ──────────────────────────────────────────────────────────── */}
                    {/* TAB: SUBJECTS */}
                    {/* ──────────────────────────────────────────────────────────── */}
                    {currentTab === 'subjects' && (
                        <Card
                            title={`Academic Subjects Catalog (${filteredSubjects.length})`}
                            subtitle="Curriculum subjects, official course codes, and department syllabus mappings"
                            action={
                                <div className="flex items-center gap-2">
                                    <div className="relative">
                                        <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Search subjects..."
                                            value={searchSubject}
                                            onChange={e => setSearchSubject(e.target.value)}
                                            className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg w-52 focus:bg-white focus:outline-hidden"
                                        />
                                    </div>
                                    <Button size="sm" icon={Plus} onClick={() => setAddSubjectModal(true)}>
                                        Add Subject
                                    </Button>
                                </div>
                            }
                        >
                            {filteredSubjects.length === 0 ? (
                                <EmptyState
                                    icon={BookOpen}
                                    title="No academic subjects registered"
                                    description="Create subject courses to associate them with examinations."
                                    action={<Button size="sm" onClick={() => setAddSubjectModal(true)}>Add Subject</Button>}
                                />
                            ) : (
                                <div className="overflow-x-auto -mx-5 -mb-5">
                                    <table className="academic-table">
                                        <thead>
                                            <tr>
                                                <th>Course Code</th>
                                                <th>Subject Title</th>
                                                <th>Examinations Assigned</th>
                                                <th className="text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredSubjects.map(sub => {
                                                const examCount = exams.filter(e => e.subject_id === sub.id).length;
                                                return (
                                                    <tr key={sub.id}>
                                                        <td className="font-mono text-xs font-bold text-blue-700">
                                                            {sub.subject_code || 'N/A'}
                                                        </td>
                                                        <td className="font-semibold text-slate-900">
                                                            {sub.subject_name}
                                                        </td>
                                                        <td>
                                                            <span className="text-xs font-medium text-slate-600">
                                                                {examCount} assessment(s)
                                                            </span>
                                                        </td>
                                                        <td className="text-right">
                                                            <button
                                                                onClick={() => confirmDeleteSubject(sub.id, sub.subject_name)}
                                                                className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 cursor-pointer transition-colors"
                                                                title="Delete Subject"
                                                            >
                                                                <Trash2 size={15} />
                                                            </button>
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
                </div>
            )}

            {/* ──────────────────────────────────────────────────────────── */}
            {/* MODAL: ADD STUDENT (SINGLE FORM OR CSV IMPORT) */}
            {/* ──────────────────────────────────────────────────────────── */}
            <Modal
                isOpen={addStudentModal}
                onClose={() => setAddStudentModal(false)}
                title="Enroll Candidate Account"
                description="Create a single student credential or upload a batch CSV / Excel file"
                size="md"
            >
                <div className="space-y-4">
                    {/* Segmented Switch for Single vs CSV */}
                    <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                        <button
                            type="button"
                            onClick={() => setStudentModalTab('single')}
                            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                                studentModalTab === 'single' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            Single Enrollment
                        </button>
                        <button
                            type="button"
                            onClick={() => setStudentModalTab('csv')}
                            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                                studentModalTab === 'csv' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            Batch CSV / Excel Import
                        </button>
                    </div>

                    {studentModalTab === 'single' ? (
                        <form onSubmit={addStudent} className="space-y-3.5">
                            <Input
                                label="Full Candidate Name"
                                placeholder="e.g. Rahul Sharma"
                                value={studentName}
                                onChange={e => setStudentName(e.target.value)}
                            />
                            <div className="grid grid-cols-2 gap-3">
                                <Input
                                    label="USN / Roll Number"
                                    placeholder="e.g. 1AG21CS045"
                                    value={studentUsn}
                                    onChange={e => setStudentUsn(e.target.value)}
                                />
                                <Input
                                    label="Username"
                                    placeholder="e.g. rahul45"
                                    value={studentUsername}
                                    onChange={e => setStudentUsername(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <Input
                                    label="Email Address"
                                    type="email"
                                    placeholder="rahul@agmr.edu"
                                    value={studentEmail}
                                    onChange={e => setStudentEmail(e.target.value)}
                                />
                                <Input
                                    label="Default Password"
                                    type="password"
                                    value={studentPassword}
                                    onChange={e => setStudentPassword(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                                <Button variant="secondary" size="sm" onClick={() => setAddStudentModal(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" variant="primary" size="sm" icon={Plus}>
                                    Save & Enroll
                                </Button>
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={importStudents} className="space-y-4">
                            <div className="p-6 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 text-center space-y-2">
                                <Upload size={32} className="mx-auto text-blue-600" />
                                <h4 className="text-xs font-bold text-slate-800">
                                    Upload Candidate Roster (CSV or Excel)
                                </h4>
                                <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                                    File must contain columns: <code className="font-mono bg-slate-200 px-1 py-0.5 rounded">username, password, name, usn, email</code>
                                </p>
                                <div className="pt-2">
                                    <input
                                        type="file"
                                        id="student-csv"
                                        accept=".csv,.xlsx,.xls"
                                        onChange={e => setStudentFile(e.target.files[0] || null)}
                                        className="hidden"
                                    />
                                    <label
                                        htmlFor="student-csv"
                                        className="px-3.5 py-1.5 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs hover:bg-slate-50 cursor-pointer inline-block"
                                    >
                                        {studentFile ? studentFile.name : 'Select File'}
                                    </label>
                                </div>
                            </div>
                            <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                                <Button variant="secondary" size="sm" onClick={() => setAddStudentModal(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" variant="primary" size="sm" disabled={!studentFile} icon={Upload}>
                                    Upload & Import
                                </Button>
                            </div>
                        </form>
                    )}
                </div>
            </Modal>

            {/* ──────────────────────────────────────────────────────────── */}
            {/* MODAL: ADD SUBJECT */}
            {/* ──────────────────────────────────────────────────────────── */}
            <Modal
                isOpen={addSubjectModal}
                onClose={() => setAddSubjectModal(false)}
                title="Add Academic Subject Course"
                description="Register a new curriculum course for examination scheduling"
                size="sm"
            >
                <form onSubmit={addSubject} className="space-y-3.5">
                    <Input
                        label="Course Title"
                        placeholder="e.g. Database Management Systems"
                        value={subjectName}
                        onChange={e => setSubjectName(e.target.value)}
                        required
                    />
                    <Input
                        label="Course / Subject Code"
                        placeholder="e.g. 21CS53"
                        value={subjectCode}
                        onChange={e => setSubjectCode(e.target.value)}
                        required
                    />
                    <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                        <Button variant="secondary" size="sm" onClick={() => setAddSubjectModal(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary" size="sm" icon={Plus}>
                            Save Subject
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* ──────────────────────────────────────────────────────────── */}
            {/* MODAL: PROCTORING & SECURITY REVIEW INCIDENTS */}
            {/* ──────────────────────────────────────────────────────────── */}
            <Modal
                isOpen={incidentsModal}
                onClose={() => setIncidentsModal(false)}
                title={`Security & Proctoring Audit: ${activeExamTitle}`}
                description="Logged integrity infractions, face stability warnings, and tab switch telemetry"
                size="lg"
            >
                {incidentsLoading ? (
                    <div className="py-8 text-center text-xs text-slate-500">
                        <span className="inline-block w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2" />
                        Fetching proctoring incident records...
                    </div>
                ) : incidents.length === 0 ? (
                    <EmptyState
                        icon={ShieldCheck}
                        title="Zero security infractions logged"
                        description="All candidates completed this examination with verified face tracking and strict compliance."
                    />
                ) : (
                    <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                        {incidents.map((inc, i) => (
                            <div
                                key={i}
                                className="p-3.5 rounded-xl border border-amber-200/80 bg-amber-50/40 text-xs space-y-1.5"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <AlertTriangle size={15} className="text-amber-600 shrink-0" />
                                        <span className="font-bold text-slate-900">
                                            Candidate: {inc.student_name || inc.student_username || `ID #${inc.student_id}`}
                                        </span>
                                    </div>
                                    <Badge variant="warning" size="xs">
                                        Warning Level: {inc.warning_count || 1}
                                    </Badge>
                                </div>
                                <p className="text-slate-700">
                                    {formatIncidentDetails(inc)}
                                </p>
                                <div className="text-[10px] text-slate-400 font-mono">
                                    Logged at: {inc.created_at ? new Date(inc.created_at).toLocaleString('en-IN') : 'Session log'}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Modal>

            {/* ──────────────────────────────────────────────────────────── */}
            {/* REUSABLE CONFIRM DIALOG */}
            {/* ──────────────────────────────────────────────────────────── */}
            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmDialog.onConfirm}
                title={confirmDialog.title}
                message={confirmDialog.message}
                confirmVariant={confirmDialog.confirmVariant}
                loading={confirmDialog.loading}
            />
        </AppLayout>
    );
}

export default AdminDashboard;
