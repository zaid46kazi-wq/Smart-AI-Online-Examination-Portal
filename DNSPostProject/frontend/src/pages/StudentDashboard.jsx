import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { showToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/api';

export function StudentDashboard() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [exams, setExams] = useState([]);
    const [results, setResults] = useState([]);
    const [leaderboard, setLeaderboard] = useState([]);
    const [rankInfo, setRankInfo] = useState({ rank: '-', desc: 'Complete exams to rank up' });

    const loadData = async () => {
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
                const idx = lbArray.findIndex(l => (l.Username || l.username || '').toLowerCase() === user.username.toLowerCase());
                if (idx !== -1) {
                    setRankInfo({ rank: `#${idx + 1}`, desc: `Top ${idx + 1} student!` });
                }
            }
        } catch (err) {
            console.error('Load student error:', err);
        }
    };

    useEffect(() => { loadData(); }, []);

    const startExam = async (examId) => {
        try {
            const statusData = await apiFetch(`/api/exam-status/${examId}`);
            if (statusData && statusData.already_attempted) {
                showToast('You have already attempted this exam.', 'warning');
                loadData();
                return;
            }
            navigate(`/exam?id=${examId}&autoProctor=true`);
        } catch (err) {
            showToast('Error starting exam: ' + err.message, 'error');
        }
    };

    const resultsArray = Array.isArray(results) ? results : [];
    const examsArray = Array.isArray(exams) ? exams : [];
    const leaderboardArray = Array.isArray(leaderboard) ? leaderboard : [];

    const scores = resultsArray.map(r => r.total_marks > 0 ? Math.round((r.score / r.total_marks) * 100) : 0);
    const bestScore = scores.length > 0 ? Math.max(...scores) + '%' : '-';
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) + '%' : '0%';

    return (
        <div className="bg-surface min-h-screen flex flex-col font-body">
            {/* Header Banner */}
            <header className="w-full bg-primary text-on-primary py-3 px-6 text-center shadow-lg relative z-10">
                <h1 className="text-lg font-bold font-headline tracking-tight">AGMR College of Engineering</h1>
                <p className="text-xs opacity-80">Online Examination System — Student Portal</p>
            </header>

            {/* Top Navigation */}
            <nav className="sticky top-0 z-40 bg-surface-container-lowest/90 backdrop-blur-xl border-b border-outline-variant/10 px-6 py-3 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <h2 className="text-lg font-bold font-headline text-primary">Student Dashboard</h2>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-sm font-bold text-on-surface-variant">Welcome, {user?.username || 'Student'}</span>
                    <button onClick={logout} className="px-3 py-1.5 rounded-lg text-xs font-bold text-error bg-error-container/10 hover:bg-error-container/20 transition-all flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">logout</span> Logout
                    </button>
                </div>
            </nav>

            <div className="flex flex-1">
                {/* Main Content */}
                <main className="flex-1 p-8 space-y-8 max-w-6xl mx-auto overflow-y-auto">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl font-bold font-headline text-on-surface">Welcome back, {user?.username || 'Student'}</h1>
                            <p className="text-sm text-on-surface-variant mt-1">Your exams, performance metrics, and certificates at a glance.</p>
                        </div>
                    </div>

                    {/* Metrics Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/10 shadow-sm relative overflow-hidden">
                            <span className="material-symbols-outlined absolute top-4 right-4 text-primary opacity-20 text-4xl">task_alt</span>
                            <p className="text-xs font-bold text-outline uppercase tracking-widest">Exams Completed</p>
                            <h3 className="text-3xl font-extrabold font-headline text-on-surface mt-2">{resultsArray.length}</h3>
                            <p className="text-xs text-on-surface-variant mt-1">Best Score: <span className="font-bold">{bestScore}</span></p>
                        </div>
                        <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/10 shadow-sm relative overflow-hidden">
                            <span className="material-symbols-outlined absolute top-4 right-4 text-primary opacity-20 text-4xl">analytics</span>
                            <p className="text-xs font-bold text-outline uppercase tracking-widest">Average Score</p>
                            <h3 className="text-3xl font-extrabold font-headline text-on-surface mt-2">{avgScore}</h3>
                            <p className="text-xs text-on-surface-variant mt-1">Available Exams: <span className="font-bold">{examsArray.length}</span></p>
                        </div>
                        <div className="bg-gradient-to-br from-primary to-primary-container p-6 rounded-2xl text-on-primary shadow-lg relative overflow-hidden">
                            <span className="material-symbols-outlined absolute top-4 right-4 text-white opacity-30 text-4xl">emoji_events</span>
                            <p className="text-xs font-bold opacity-80 uppercase tracking-widest">Global Leaderboard</p>
                            <h3 className="text-3xl font-extrabold font-headline mt-2">{rankInfo.rank}</h3>
                            <p className="text-xs opacity-80 mt-1">{rankInfo.desc}</p>
                        </div>
                    </div>

                    {/* Available Examinations Section */}
                    <section className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-bold font-headline text-on-surface">Available Examinations</h2>
                        </div>

                        <div className="space-y-4">
                            {examsArray.length === 0 ? (
                                <div className="bg-surface-container-lowest p-8 rounded-2xl border border-outline-variant/10 text-center text-outline">No exams available at this time</div>
                            ) : (
                                examsArray.map(e => {
                                    const isAttempted = e.already_attempted === true;
                                    return (
                                        <div key={e.id} className={`bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/10 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-l-4 ${isAttempted ? 'border-l-warning' : 'border-l-primary'}`}>
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isAttempted ? 'bg-warning/10 text-warning' : 'bg-secondary-container text-primary'}`}>
                                                    <span className="material-symbols-outlined text-2xl">{isAttempted ? 'task_alt' : 'quiz'}</span>
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="text-base font-bold text-on-surface">{e.exam_name || e.name}</h3>
                                                        {isAttempted ? (
                                                            <span className="bg-warning/10 text-warning text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">ATTEMPTED</span>
                                                        ) : (
                                                            <span className="bg-secondary-container text-primary text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">AVAILABLE</span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-4 mt-1 text-xs text-outline font-medium">
                                                        <span>📚 {e.subjects?.subject_name || 'General'}</span>
                                                        <span>⏱️ {e.time_limit} mins</span>
                                                        <span>📝 {e.total_questions || '?'} questions</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <a href={`/api/hall-ticket/${e.id}`} className="bg-surface-container-high text-on-surface-variant px-4 py-2 rounded-xl text-xs font-bold hover:bg-surface-container transition-all">Hall Ticket</a>
                                                {isAttempted ? (
                                                    <button disabled className="bg-surface-container text-outline px-4 py-2 rounded-xl text-xs font-bold opacity-60 cursor-not-allowed">Attempted</button>
                                                ) : (
                                                    <button onClick={() => startExam(e.id)} className="bg-primary text-on-primary px-5 py-2 rounded-xl text-xs font-bold hover:bg-primary-dim transition-all shadow-md">Start Exam</button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </section>

                    {/* Results History */}
                    <section className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/10 shadow-sm space-y-4">
                        <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider">My Exam Results</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-outline-variant/10 text-xs text-outline font-bold uppercase">
                                        <th className="py-2 px-3">Exam Name</th><th className="py-2 px-3">Score</th><th className="py-2 px-3">Total Marks</th><th className="py-2 px-3">Percentage</th><th className="py-2 px-3">Grade</th><th className="py-2 px-3">Status</th><th className="py-2 px-3 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-outline-variant/10">
                                    {resultsArray.length === 0 ? (
                                        <tr><td colSpan="7" className="py-6 text-center text-outline">No exam results recorded yet</td></tr>
                                    ) : (
                                        resultsArray.map(r => {
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
                                                <tr key={r.id} className="hover:bg-surface-container-low transition-all">
                                                    <td className="py-3 px-3 font-bold text-on-surface">{r.exams?.exam_name || 'Exam'}</td>
                                                    <td className="py-3 px-3 font-bold">{r.score}</td>
                                                    <td className="py-3 px-3">{r.total_marks}</td>
                                                    <td className="py-3 px-3 font-bold">{pct}%</td>
                                                    <td className="py-3 px-3"><span className="bg-secondary-container text-primary text-xs font-bold px-2 py-0.5 rounded-full">{grade}</span></td>
                                                    <td className="py-3 px-3"><span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${passed ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}>{passed ? 'PASS' : 'FAIL'}</span></td>
                                                    <td className="py-3 px-3 text-right"><a href={`/api/result-pdf/${r.id}`} className="bg-secondary-container text-primary px-3 py-1 rounded-lg text-xs font-bold hover:bg-primary hover:text-white transition-all">PDF</a></td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* Leaderboard Section */}
                    <section className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/10 shadow-sm space-y-4">
                        <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider">🏆 Global Leaderboard (Top 5)</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-outline-variant/10 text-xs text-outline font-bold uppercase">
                                        <th className="py-2 px-3">Rank</th><th className="py-2 px-3">Student</th><th className="py-2 px-3 text-right">Best Score</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-outline-variant/10">
                                    {leaderboardArray.length === 0 ? (
                                        <tr><td colSpan="3" className="py-6 text-center text-outline">No leaderboard data available</td></tr>
                                    ) : (
                                        leaderboardArray.map((l, i) => {
                                            const isMe = user && l.Username === user.username;
                                            return (
                                                <tr key={i} className={`hover:bg-surface-container-low transition-all ${isMe ? 'bg-secondary-container/30' : ''}`}>
                                                    <td className="py-3 px-3 font-bold">{i === 0 ? '🥇 1' : i === 1 ? '🥈 2' : i === 2 ? '🥉 3' : `#${i + 1}`}</td>
                                                    <td className="py-3 px-3 font-bold text-on-surface">{l.Username}{isMe && <span className="ml-2 bg-primary text-on-primary text-[10px] px-2 py-0.5 rounded-full">You</span>}</td>
                                                    <td className="py-3 px-3 font-bold text-right text-primary">{l.Score}</td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </main>
            </div>
        </div>
    );
}
