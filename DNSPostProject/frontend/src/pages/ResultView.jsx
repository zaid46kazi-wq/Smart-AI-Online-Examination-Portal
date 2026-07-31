import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Footer } from '../components/Footer';
import { ThemeManager } from '../utils/theme';

export function ResultView() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const score = parseInt(searchParams.get('score') || '0');
    const total = parseInt(searchParams.get('total') || '0');
    const rid = searchParams.get('rid');

    const pct = total > 0 ? Math.round((score / total) * 100) : 0;
    const passed = pct >= 40;

    let grade = 'F';
    if (pct >= 90) grade = 'A+';
    else if (pct >= 80) grade = 'A';
    else if (pct >= 70) grade = 'B+';
    else if (pct >= 60) grade = 'B';
    else if (pct >= 50) grade = 'C';
    else if (pct >= 40) grade = 'D';

    return (
        <div className="min-h-screen flex flex-col">
            <div className="college-banner">
                AGMR College of Engineering
                <small>Online Examination System • Official Performance Report</small>
            </div>

            <main className="flex-1 flex items-center justify-center p-8">
                <div className="card" style={{ maxWidth: 500, width: '100%', overflow: 'hidden' }}>
                    <div id="scoreHero" className="p-12 text-center relative overflow-hidden" style={{ background: passed ? 'linear-gradient(135deg, #059669 0%, #10B981 100%)' : 'linear-gradient(135deg, #DC2626 0%, #EF4444 100%)', color: 'white' }}>
                        <div className="relative z-10 animate-slideUp">
                            <h1 className="text-6xl font-black mb-2" style={{ fontSize: 64 }}>{score} / {total}</h1>
                            <p className="text-lg font-bold opacity-90">{passed ? '🎉 PASSED — Congratulations!' : '⚠️ FAIL — Keep trying!'}</p>
                        </div>
                        <button onClick={() => ThemeManager.toggle()} className="theme-toggle absolute top-4 right-4 bg-white/10 border-white/20 text-white hover:bg-white/20" title="Toggle Theme">
                            <span className="material-symbols-outlined text-sm">dark_mode</span>
                        </button>
                    </div>

                    <div className="card-body space-y-4">
                        <div className="flex justify-between items-center py-2 border-b" style={{ borderColor: 'var(--color-border-light)' }}>
                            <span className="text-sm text-secondary font-medium">Obtained Score</span>
                            <span className="text-sm font-bold">{score}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b" style={{ borderColor: 'var(--color-border-light)' }}>
                            <span className="text-sm text-secondary font-medium">Total Exam Marks</span>
                            <span className="text-sm font-bold">{total}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b" style={{ borderColor: 'var(--color-border-light)' }}>
                            <span className="text-sm text-secondary font-medium">Percentage</span>
                            <span className="text-sm font-bold">{pct}%</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b" style={{ borderColor: 'var(--color-border-light)' }}>
                            <span className="text-sm text-secondary font-medium">Performance Grade</span>
                            <span className="badge badge-info">{grade}</span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                            <span className="text-sm text-secondary font-medium">Submission Status</span>
                            <span className={`badge ${passed ? 'badge-success' : 'badge-error'}`}>{passed ? 'PASS' : 'FAIL'}</span>
                        </div>

                        <div className="space-y-2 pt-4">
                            {rid && rid !== 'null' && (
                                <a href={`/api/result-pdf/${rid}`} className="btn btn-secondary btn-block">
                                    <span className="material-symbols-outlined">download</span> Download Certificate PDF
                                </a>
                            )}
                            <button onClick={() => navigate('/student')} className="btn btn-primary btn-block">
                                <span className="material-symbols-outlined">arrow_back</span> Return to Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
