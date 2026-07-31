import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/api';

export function AllResults() {
    const { user, logout } = useAuth();
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        apiFetch('/api/results')
            .then(data => setResults(Array.isArray(data) ? data : []))
            .catch(() => setResults([]))
            .finally(() => setLoading(false));
    }, []);

    const resultsList = Array.isArray(results) ? results : [];

    return (
        <div className="bg-surface min-h-screen flex flex-col font-body">
            {/* Header Banner */}
            <header className="w-full bg-primary text-on-primary py-3 px-6 text-center shadow-lg relative z-10">
                <h1 className="text-lg font-bold font-headline tracking-tight">AGMR College of Engineering</h1>
                <p className="text-xs opacity-80">Online Examination System — Results Database</p>
            </header>

            {/* Top Navigation */}
            <nav className="sticky top-0 z-40 bg-surface-container-lowest/90 backdrop-blur-xl border-b border-outline-variant/10 px-6 py-3 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <h2 className="text-lg font-bold font-headline text-primary">Results Database</h2>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-sm font-bold text-on-surface-variant">Welcome, {user?.username || 'Instructor'}</span>
                    <button onClick={logout} className="px-3 py-1.5 rounded-lg text-xs font-bold text-error bg-error-container/10 hover:bg-error-container/20 transition-all flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">logout</span> Logout
                    </button>
                </div>
            </nav>

            <div className="flex flex-1">
                {/* Sidebar */}
                <aside className="w-64 bg-surface-container-lowest border-r border-outline-variant/10 flex flex-col p-4 space-y-2">
                    <div className="px-3 py-2 mb-4">
                        <h3 className="text-xs font-bold text-outline uppercase tracking-widest">Instructor Portal</h3>
                        <p className="text-sm font-bold text-on-surface">AGMR College</p>
                    </div>

                    <Link to="/admin" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-on-surface-variant hover:bg-surface-container transition-all">
                        <span className="material-symbols-outlined text-xl">dashboard</span> Overview
                    </Link>
                    <Link to="/create-exam" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-on-surface-variant hover:bg-surface-container transition-all">
                        <span className="material-symbols-outlined text-xl">add_circle</span> Create Exam
                    </Link>
                    <Link to="/results" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold bg-primary text-on-primary shadow-sm">
                        <span className="material-symbols-outlined text-xl">analytics</span> View Results
                    </Link>
                    <Link to="/ai-settings" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-on-surface-variant hover:bg-surface-container transition-all">
                        <span className="material-symbols-outlined text-xl">settings_suggest</span> AI Security Settings
                    </Link>
                </aside>

                {/* Main Content */}
                <main className="flex-1 p-8 space-y-8 overflow-y-auto">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl font-bold font-headline text-on-surface">All Student Exam Results</h1>
                            <p className="text-sm text-on-surface-variant mt-1">Comprehensive record of all student exam submissions, scores, and certificates.</p>
                        </div>
                        <span className="bg-secondary-container text-primary text-xs font-bold px-3 py-1.5 rounded-full">{resultsList.length} Submissions</span>
                    </div>

                    <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/10 shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-outline-variant/10 text-xs text-outline font-bold uppercase">
                                        <th className="py-3 px-4">Username</th>
                                        <th className="py-3 px-4">Name</th>
                                        <th className="py-3 px-4">USN</th>
                                        <th className="py-3 px-4">Exam Name</th>
                                        <th className="py-3 px-4">Score</th>
                                        <th className="py-3 px-4">Total Marks</th>
                                        <th className="py-3 px-4">Percentage</th>
                                        <th className="py-3 px-4">Grade</th>
                                        <th className="py-3 px-4">Status</th>
                                        <th className="py-3 px-4">Date</th>
                                        <th className="py-3 px-4 text-right">Certificate</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-outline-variant/10">
                                    {loading ? (
                                        <tr><td colSpan="11" className="py-8 text-center text-outline">Loading results database...</td></tr>
                                    ) : resultsList.length === 0 ? (
                                        <tr><td colSpan="11" className="py-8 text-center text-outline">No results recorded yet</td></tr>
                                    ) : (
                                        resultsList.map(r => (
                                            <tr key={r.id} className="hover:bg-surface-container-low transition-all">
                                                <td className="py-3.5 px-4 font-bold text-on-surface">{r.Username}</td>
                                                <td className="py-3.5 px-4">{r.Name || '-'}</td>
                                                <td className="py-3.5 px-4"><span className="bg-secondary-container text-primary text-xs font-bold px-2 py-0.5 rounded-full">{r.USN || '-'}</span></td>
                                                <td className="py-3.5 px-4 font-bold">{r.ExamName}</td>
                                                <td className="py-3.5 px-4 font-bold">{r.Score}</td>
                                                <td className="py-3.5 px-4">{r.TotalMarks}</td>
                                                <td className="py-3.5 px-4 font-bold">{r.Percentage}%</td>
                                                <td className="py-3.5 px-4"><span className="bg-secondary-container text-primary text-xs font-bold px-2.5 py-0.5 rounded-full">{r.Grade}</span></td>
                                                <td className="py-3.5 px-4"><span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${r.Percentage >= 40 ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}>{r.Percentage >= 40 ? 'PASS' : 'FAIL'}</span></td>
                                                <td className="py-3.5 px-4 text-outline text-xs">{r.ExamDate ? new Date(r.ExamDate).toLocaleDateString('en-IN') : '-'}</td>
                                                <td className="py-3.5 px-4 text-right flex gap-1.5 justify-end">
                                                    <a href={`/api/result-pdf/${r.id}`} className="bg-secondary-container text-primary px-2.5 py-1 rounded-lg text-xs font-bold hover:bg-primary hover:text-white transition-all">Scorecard</a>
                                                    <a href={`/api/proctor/report-pdf/${r.id}`} target="_blank" rel="noreferrer" className="bg-primary/10 text-primary border border-primary/30 px-2.5 py-1 rounded-lg text-xs font-bold hover:bg-primary hover:text-white transition-all">AI Report</a>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
