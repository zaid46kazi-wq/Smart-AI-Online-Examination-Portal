import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { showToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/api';

export function AdminDashboard() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [analytics, setAnalytics] = useState({ totalStudents: 0, totalExams: 0, avgScore: 0, totalResults: 0 });
    const [exams, setExams] = useState([]);
    const [students, setStudents] = useState([]);
    const [subjects, setSubjects] = useState([]);

    const [subjectName, setSubjectName] = useState('');
    const [subjectCode, setSubjectCode] = useState('');

    const [studentName, setStudentName] = useState('');
    const [studentUsn, setStudentUsn] = useState('');
    const [studentEmail, setStudentEmail] = useState('');
    const [studentUsername, setStudentUsername] = useState('');
    const [studentPassword, setStudentPassword] = useState('pass123');
    const [studentFile, setStudentFile] = useState(null);

    const [modalActive, setModalActive] = useState(false);
    const [settingsModalActive, setSettingsModalActive] = useState(false);
    const [incidents, setIncidents] = useState([]);

    const [aiSettings, setAiSettings] = useState({
        max_warnings: 3,
        auto_submit_enabled: 1,
        face_timeout_seconds: 5,
        head_yaw_threshold_deg: 22,
        head_pitch_threshold_deg: 18,
        eye_gaze_threshold: 0.12,
        phone_confidence_threshold: 0.50
    });

    const loadData = async () => {
        try {
            const [a, e, sub, st, setts] = await Promise.all([
                apiFetch('/api/analytics').catch(() => ({ totalStudents: 0, totalExams: 0, avgScore: 0, totalResults: 0 })),
                apiFetch('/api/exams').catch(() => []),
                apiFetch('/api/subjects').catch(() => []),
                apiFetch('/api/students').catch(() => []),
                apiFetch('/api/proctor/settings').catch(() => ({}))
            ]);
            setAnalytics(a || { totalStudents: 0, totalExams: 0, avgScore: 0, totalResults: 0 });
            setExams(Array.isArray(e) ? e : []);
            setSubjects(Array.isArray(sub) ? sub : []);
            setStudents(Array.isArray(st) ? st : []);
            if (setts && typeof setts === 'object' && Object.keys(setts).length > 0) {
                setAiSettings(prev => ({ ...prev, ...setts }));
            }
        } catch (err) {
            console.error('Load data error:', err);
        }
    };

    useEffect(() => { loadData(); }, []);

    const addSubject = async () => {
        if (!subjectName.trim()) { showToast('Enter subject name', 'warning'); return; }
        try {
            await apiFetch('/api/subjects', {
                method: 'POST',
                body: JSON.stringify({ subject_name: subjectName, subject_code: subjectCode })
            });
            showToast('Subject added successfully', 'success');
            setSubjectName(''); setSubjectCode('');
            loadData();
        } catch (err) { showToast(err.message, 'error'); }
    };

    const deleteSubject = async (id) => {
        if (!confirm('Delete this subject?')) return;
        try {
            await apiFetch(`/api/subjects/${id}`, { method: 'DELETE' });
            showToast('Subject deleted', 'success');
            loadData();
        } catch (err) { showToast(err.message, 'error'); }
    };

    const addStudent = async () => {
        if (!studentUsername.trim()) { showToast('Enter username', 'warning'); return; }
        if (!studentPassword.trim()) { showToast('Enter password', 'warning'); return; }
        try {
            await apiFetch('/api/students', {
                method: 'POST',
                body: JSON.stringify({
                    name: studentName, usn: studentUsn, email: studentEmail,
                    username: studentUsername, password: studentPassword
                })
            });
            showToast('Student added successfully', 'success');
            setStudentName(''); setStudentUsn(''); setStudentEmail(''); setStudentUsername('');
            loadData();
        } catch (err) { showToast(err.message, 'error'); }
    };

    const importStudents = async () => {
        if (!studentFile) { showToast('Select an Excel file first', 'warning'); return; }
        const form = new FormData();
        form.append('file', studentFile);
        try {
            const data = await apiFetch('/api/students/import', { method: 'POST', body: form });
            showToast(`Imported ${data.inserted || 0} students successfully!`, 'success');
            setStudentFile(null);
            loadData();
        } catch (err) { showToast(err.message, 'error'); }
    };

    const deleteStudent = async (id) => {
        if (!confirm('Are you sure you want to delete this student?')) return;
        try {
            await apiFetch(`/api/students/${id}`, { method: 'DELETE' });
            showToast('Student deleted', 'success');
            loadData();
        } catch (err) { showToast(err.message, 'error'); }
    };

    const deleteExam = async (id) => {
        if (!confirm('Are you sure you want to delete this exam?')) return;
        try {
            await apiFetch(`/api/exams/${id}`, { method: 'DELETE' });
            showToast('Exam deleted successfully', 'success');
            loadData();
        } catch (err) { showToast(err.message, 'error'); }
    };

    const doFactoryReset = async () => {
        if (!confirm('EXTREME DANGER: Deletes all data. Proceed?')) return;
        try {
            await apiFetch('/api/factory-reset', { method: 'POST' });
            showToast('System reset complete', 'success');
            loadData();
        } catch (err) { showToast(err.message, 'error'); }
    };

    const viewIncidents = async (examId) => {
        setModalActive(true);
        try {
            const data = await apiFetch(`/api/incidents/${examId}`);
            setIncidents(Array.isArray(data) ? data : []);
        } catch (err) {
            setIncidents([]);
        }
    };

    return (
        <div className="bg-surface min-h-screen flex flex-col font-body">
            <header className="w-full bg-primary text-on-primary py-3 px-6 text-center shadow-lg relative z-10">
                <h1 className="text-lg font-bold font-headline tracking-tight">AGMR College of Engineering</h1>
                <p className="text-xs opacity-80">Online Examination System — Instructor Panel</p>
            </header>

            <nav className="sticky top-0 z-40 bg-surface-container-lowest/90 backdrop-blur-xl border-b border-outline-variant/10 px-6 py-3 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <h2 className="text-lg font-bold font-headline text-primary">Instructor Panel</h2>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-sm font-bold text-on-surface-variant">Welcome, {user?.username || 'Instructor'}</span>
                    <button onClick={logout} className="px-3 py-1.5 rounded-lg text-xs font-bold text-error bg-error-container/10 hover:bg-error-container/20 transition-all flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">logout</span> Logout
                    </button>
                </div>
            </nav>

            <div className="flex flex-1">
                <aside className="w-64 bg-surface-container-lowest border-r border-outline-variant/10 flex flex-col p-4 space-y-2">
                    <div className="px-3 py-2 mb-4">
                        <h3 className="text-xs font-bold text-outline uppercase tracking-widest">Instructor Portal</h3>
                        <p className="text-sm font-bold text-on-surface">AGMR College</p>
                    </div>

                    <Link to="/admin" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold bg-primary text-on-primary shadow-sm">
                        <span className="material-symbols-outlined text-xl">dashboard</span> Overview
                    </Link>
                    <Link to="/create-exam" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-on-surface-variant hover:bg-surface-container transition-all">
                        <span className="material-symbols-outlined text-xl">add_circle</span> Create Exam
                    </Link>
                    <Link to="/results" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-on-surface-variant hover:bg-surface-container transition-all">
                        <span className="material-symbols-outlined text-xl">analytics</span> View Results
                    </Link>

                    <Link to="/ai-settings" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-on-surface-variant hover:bg-surface-container transition-all">
                        <span className="material-symbols-outlined text-xl">settings_suggest</span> AI Security Settings
                    </Link>

                    <div className="mt-auto pt-6 border-t border-outline-variant/10">
                        <Link to="/create-exam" className="w-full bg-primary text-on-primary py-3 rounded-xl font-bold text-sm hover:bg-primary-dim transition-all shadow-md flex items-center justify-center gap-2">
                            <span className="material-symbols-outlined text-lg">add</span> New Assessment
                        </Link>
                    </div>
                </aside>

                <main className="flex-1 p-8 space-y-8 overflow-y-auto">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl font-bold font-headline text-on-surface">Instructor Command Center</h1>
                            <p className="text-sm text-on-surface-variant mt-1">Manage assessments, student rosters, subjects, and view security incidents.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/10 shadow-sm relative overflow-hidden">
                            <span className="material-symbols-outlined absolute top-4 right-4 text-primary opacity-20 text-4xl">groups</span>
                            <p className="text-xs font-bold text-outline uppercase tracking-widest">Registered Students</p>
                            <h3 className="text-3xl font-extrabold font-headline text-on-surface mt-2">{analytics.totalStudents || 0}</h3>
                            <p className="text-xs text-on-surface-variant mt-1">Active student accounts</p>
                        </div>
                        <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/10 shadow-sm relative overflow-hidden">
                            <span className="material-symbols-outlined absolute top-4 right-4 text-primary opacity-20 text-4xl">assignment</span>
                            <p className="text-xs font-bold text-outline uppercase tracking-widest">Total Exams</p>
                            <h3 className="text-3xl font-extrabold font-headline text-on-surface mt-2">{analytics.totalExams || 0}</h3>
                            <p className="text-xs text-on-surface-variant mt-1">Assessments in system</p>
                        </div>
                        <div className="bg-gradient-to-br from-primary to-primary-container p-6 rounded-2xl text-on-primary shadow-lg relative overflow-hidden">
                            <span className="material-symbols-outlined absolute top-4 right-4 text-white opacity-30 text-4xl">stars</span>
                            <p className="text-xs font-bold opacity-80 uppercase tracking-widest">Average Score</p>
                            <h3 className="text-3xl font-extrabold font-headline mt-2">{analytics.avgScore || 0}%</h3>
                            <p className="text-xs opacity-80 mt-1">Total submissions: {analytics.totalResults || 0}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* Forms Column */}
                        <div className="lg:col-span-4 space-y-6">
                            {/* Add Subject Card */}
                            <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/10 shadow-sm space-y-4">
                                <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider">Add Subject</h3>
                                <div className="space-y-3">
                                    <input type="text" value={subjectName} onChange={e => setSubjectName(e.target.value)} placeholder="Subject Name" className="w-full bg-surface-container-high border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary" />
                                    <input type="text" value={subjectCode} onChange={e => setSubjectCode(e.target.value)} placeholder="Subject Code" className="w-full bg-surface-container-high border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary" />
                                    <button onClick={addSubject} className="w-full bg-primary text-on-primary py-2.5 rounded-xl font-bold text-sm hover:bg-primary-dim transition-all">Save Subject</button>
                                </div>
                            </div>

                            {/* Add Student Card */}
                            <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/10 shadow-sm space-y-4">
                                <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider">Add Student</h3>
                                <div className="space-y-3">
                                    <input type="text" value={studentName} onChange={e => setStudentName(e.target.value)} placeholder="Full Name" className="w-full bg-surface-container-high border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary" />
                                    <input type="text" value={studentUsn} onChange={e => setStudentUsn(e.target.value)} placeholder="USN" className="w-full bg-surface-container-high border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary" />
                                    <input type="email" value={studentEmail} onChange={e => setStudentEmail(e.target.value)} placeholder="Email" className="w-full bg-surface-container-high border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary" />
                                    <input type="text" value={studentUsername} onChange={e => setStudentUsername(e.target.value)} placeholder="Username" className="w-full bg-surface-container-high border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary" />
                                    <input type="password" value={studentPassword} onChange={e => setStudentPassword(e.target.value)} placeholder="Password" className="w-full bg-surface-container-high border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary" />
                                    <button onClick={addStudent} className="w-full bg-primary text-on-primary py-2.5 rounded-xl font-bold text-sm hover:bg-primary-dim transition-all">Save Student</button>

                                    <div className="pt-3 border-t border-outline-variant/10 space-y-2">
                                        <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">Import Excel Roster</label>
                                        <input type="file" onChange={e => setStudentFile(e.target.files[0])} accept=".xlsx,.xls" className="w-full text-xs text-on-surface-variant file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-secondary-container file:text-primary hover:file:bg-primary hover:file:text-white transition-all cursor-pointer" />
                                        <button onClick={importStudents} className="w-full bg-secondary-container text-primary py-2 rounded-xl font-bold text-xs hover:bg-primary hover:text-white transition-all">Import File</button>
                                    </div>
                                </div>
                            </div>

                            {/* Danger Zone */}
                            <div className="bg-error-container/10 border border-error/20 p-6 rounded-2xl space-y-3">
                                <div className="flex items-center gap-2 text-error font-bold text-xs uppercase tracking-wider">
                                    <span className="material-symbols-outlined text-sm">warning</span> Danger Zone
                                </div>
                                <p className="text-xs text-on-surface-variant">Reset all database tables to factory defaults.</p>
                                <button onClick={doFactoryReset} className="w-full bg-error text-white py-2.5 rounded-xl font-bold text-xs hover:bg-error/90 transition-all">Factory Reset</button>
                            </div>
                        </div>

                        {/* Tables Column */}
                        <div className="lg:col-span-8 space-y-6">
                            {/* All Exams Card */}
                            <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/10 shadow-sm space-y-4">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider">All Exams</h3>
                                    <Link to="/create-exam" className="bg-primary text-on-primary px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-primary-dim transition-all">+ Create Exam</Link>
                                </div>
                                <div className="overflow-x-auto max-h-72">
                                    <table className="w-full text-left text-sm">
                                        <thead>
                                            <tr className="border-b border-outline-variant/10 text-xs text-outline font-bold uppercase">
                                                <th className="py-2 px-3">ID</th><th className="py-2 px-3">Title</th><th className="py-2 px-3">Subject</th><th className="py-2 px-3">Questions</th><th className="py-2 px-3 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-outline-variant/10">
                                            {exams.length === 0 ? (
                                                <tr><td colSpan="5" className="py-6 text-center text-outline">No exams created yet</td></tr>
                                            ) : (
                                                exams.map(e => (
                                                    <tr key={e.id} className="hover:bg-surface-container-low transition-all">
                                                        <td className="py-3 px-3 font-bold text-outline">{e.id}</td>
                                                        <td className="py-3 px-3 font-bold text-on-surface">{e.exam_name || e.name}</td>
                                                        <td className="py-3 px-3"><span className="bg-secondary-container text-primary text-xs font-bold px-2.5 py-1 rounded-full">{e.subjects?.subject_name || 'General'}</span></td>
                                                        <td className="py-3 px-3">{e.total_questions}</td>
                                                        <td className="py-3 px-3 text-right space-x-1">
                                                            <button onClick={() => viewIncidents(e.id)} className="p-1 text-warning hover:bg-warning/10 rounded-lg" title="View Incidents"><span className="material-symbols-outlined text-sm">videocam</span></button>
                                                            <button onClick={() => deleteExam(e.id)} className="p-1 text-error hover:bg-error/10 rounded-lg" title="Delete"><span className="material-symbols-outlined text-sm">delete</span></button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Registered Students Table */}
                            <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/10 shadow-sm space-y-4">
                                <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider">Registered Students</h3>
                                <div className="overflow-x-auto max-h-64">
                                    <table className="w-full text-left text-sm">
                                        <thead>
                                            <tr className="border-b border-outline-variant/10 text-xs text-outline font-bold uppercase">
                                                <th className="py-2 px-3">ID</th><th className="py-2 px-3">Username</th><th className="py-2 px-3">Name</th><th className="py-2 px-3">USN</th><th className="py-2 px-3 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-outline-variant/10">
                                            {students.length === 0 ? (
                                                <tr><td colSpan="5" className="py-6 text-center text-outline">No student records</td></tr>
                                            ) : (
                                                students.map(s => (
                                                    <tr key={s.id} className="hover:bg-surface-container-low transition-all">
                                                        <td className="py-3 px-3 font-bold text-outline">{s.id}</td>
                                                        <td className="py-3 px-3 font-bold text-on-surface">{s.username}</td>
                                                        <td className="py-3 px-3">{s.name || '-'}</td>
                                                        <td className="py-3 px-3"><span className="bg-secondary-container text-primary text-xs font-bold px-2 py-0.5 rounded-full">{s.usn || '-'}</span></td>
                                                        <td className="py-3 px-3 text-right">
                                                            <button onClick={() => deleteStudent(s.id)} className="p-1 text-error hover:bg-error/10 rounded-lg"><span className="material-symbols-outlined text-sm">person_remove</span></button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Subjects Table */}
                            <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/10 shadow-sm space-y-4">
                                <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider">Subjects</h3>
                                <div className="overflow-x-auto max-h-48">
                                    <table className="w-full text-left text-sm">
                                        <thead>
                                            <tr className="border-b border-outline-variant/10 text-xs text-outline font-bold uppercase">
                                                <th className="py-2 px-3">ID</th><th className="py-2 px-3">Subject Name</th><th className="py-2 px-3">Code</th><th className="py-2 px-3 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-outline-variant/10">
                                            {subjects.length === 0 ? (
                                                <tr><td colSpan="4" className="py-6 text-center text-outline">No subjects added</td></tr>
                                            ) : (
                                                subjects.map(sub => (
                                                    <tr key={sub.id} className="hover:bg-surface-container-low transition-all">
                                                        <td className="py-3 px-3 font-bold text-outline">{sub.id}</td>
                                                        <td className="py-3 px-3 font-bold text-on-surface">{sub.subject_name}</td>
                                                        <td className="py-3 px-3"><span className="bg-secondary-container text-primary text-xs font-bold px-2 py-0.5 rounded-full">{sub.subject_code || '-'}</span></td>
                                                        <td className="py-3 px-3 text-right">
                                                            <button onClick={() => deleteSubject(sub.id)} className="p-1 text-error hover:bg-error/10 rounded-lg"><span className="material-symbols-outlined text-sm">delete</span></button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>

            {/* Incidents Modal */}
            {modalActive && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-surface-container-lowest rounded-2xl max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
                        <div className="p-4 border-b border-outline-variant/10 flex justify-between items-center">
                            <div className="flex items-center gap-2 text-error font-bold text-sm">
                                <span className="material-symbols-outlined">policy</span> Security Incidents Log
                            </div>
                            <button onClick={() => setModalActive(false)} className="p-1 hover:bg-surface-container rounded-lg"><span className="material-symbols-outlined">close</span></button>
                        </div>
                        <div className="p-6 overflow-y-auto max-h-[70vh]">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {incidents.length === 0 ? (
                                    <div className="col-span-full text-center py-12 text-outline">No security incidents reported for this exam! ✅</div>
                                ) : (
                                    incidents.map(inc => (
                                        <div key={inc.id} className="border border-outline-variant/10 rounded-xl overflow-hidden bg-surface-container-low">
                                            {inc.image_url ? (
                                                <img src={inc.image_url} alt="Snapshot" className="w-full h-32 object-cover" />
                                            ) : (
                                                <div className="w-full h-32 flex items-center justify-center text-outline text-xs bg-surface-container-high">No Image Snapshot</div>
                                            )}
                                            <div className="p-3 space-y-1">
                                                <span className="bg-error/10 text-error font-bold text-[10px] uppercase px-2 py-0.5 rounded-full">{inc.type?.replace('_', ' ')}</span>
                                                <p className="font-bold text-xs text-on-surface">{inc.students?.name || inc.user_id}</p>
                                                <p className="text-[10px] text-outline">USN: {inc.students?.usn || 'N/A'}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
