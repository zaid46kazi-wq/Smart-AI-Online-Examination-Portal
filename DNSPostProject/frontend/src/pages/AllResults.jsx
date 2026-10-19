import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/api';
import { AppLayout } from '../components/ui/AppLayout';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { StatCard } from '../components/ui/StatCard';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';
import { 
    Search, 
    Download, 
    FileText, 
    CheckCircle2, 
    XCircle,
    Award,
    TrendingUp,
    Users,
    FileSpreadsheet,
    ShieldAlert
} from 'lucide-react';

export function AllResults() {
    const { user } = useAuth();
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'passed' | 'failed'

    useEffect(() => {
        apiFetch('/api/results')
            .then(data => setResults(Array.isArray(data) ? data : []))
            .catch(() => setResults([]))
            .finally(() => setLoading(false));
    }, []);

    const resultsList = Array.isArray(results) ? results : [];

    // Computed Stats
    const totalCount = resultsList.length;
    const passedCount = resultsList.filter(r => (r.Percentage || 0) >= 40).length;
    const passRate = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0;
    const avgScore = totalCount > 0 
        ? Math.round(resultsList.reduce((acc, r) => acc + (r.Percentage || 0), 0) / totalCount) 
        : 0;
    const distinctionCount = resultsList.filter(r => (r.Percentage || 0) >= 75).length;

    // Filtered records
    const filtered = resultsList.filter(r => {
        const query = searchTerm.toLowerCase();
        const matchesQuery = 
            (r.Username || '').toLowerCase().includes(query) ||
            (r.Name || '').toLowerCase().includes(query) ||
            (r.USN || '').toLowerCase().includes(query) ||
            (r.ExamName || '').toLowerCase().includes(query);

        if (!matchesQuery) return false;

        const isPassed = (r.Percentage || 0) >= 40;
        if (statusFilter === 'passed') return isPassed;
        if (statusFilter === 'failed') return !isPassed;
        return true;
    });

    // CSV Export for university record audits
    const exportCSV = () => {
        if (filtered.length === 0) return;
        const headers = ['Candidate', 'Username', 'USN', 'Examination', 'Score', 'TotalMarks', 'Percentage', 'Grade', 'Result', 'ExamDate'];
        const rows = filtered.map(r => [
            `"${(r.Name || r.Username || '').replace(/"/g, '""')}"`,
            `"${(r.Username || '').replace(/"/g, '""')}"`,
            `"${(r.USN || '').replace(/"/g, '""')}"`,
            `"${(r.ExamName || '').replace(/"/g, '""')}"`,
            r.Score ?? 0,
            r.TotalMarks ?? 100,
            r.Percentage ?? 0,
            `"${r.Grade || ''}"`,
            (r.Percentage || 0) >= 40 ? 'PASS' : 'FAIL',
            `"${r.ExamDate ? new Date(r.ExamDate).toISOString().split('T')[0] : ''}"`
        ]);

        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `AGMR_Exam_Results_Ledger_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <AppLayout activeTab="results">
            <div className="space-y-6">
                <PageHeader
                    title="Master Examination Results Ledger"
                    description="Official institutional registry of student examination submissions, grades, and AI proctoring audits."
                    badge={<Badge variant="primary" dot>{totalCount} Total Attempts</Badge>}
                    action={
                        <Button
                            variant="outline"
                            icon={FileSpreadsheet}
                            onClick={exportCSV}
                            disabled={filtered.length === 0}
                        >
                            Export Ledger (.CSV)
                        </Button>
                    }
                />

                {/* 1. Summary Statistics KPIs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        title="Total Submissions"
                        value={totalCount}
                        description="Verified exam sessions"
                        icon={Users}
                        iconColor="blue"
                    />
                    <StatCard
                        title="Pass Rate"
                        value={`${passRate}%`}
                        description={`${passedCount} of ${totalCount} candidates qualified`}
                        icon={CheckCircle2}
                        iconColor="emerald"
                    />
                    <StatCard
                        title="Average Score"
                        value={`${avgScore}%`}
                        description="Cohort-wide aggregated score"
                        icon={TrendingUp}
                        iconColor="indigo"
                    />
                    <StatCard
                        title="Distinction (>=75%)"
                        value={distinctionCount}
                        description="Top academic percentile"
                        icon={Award}
                        iconColor="amber"
                    />
                </div>

                {/* 2. Main Ledger Card */}
                <Card
                    title="Submissions Ledger"
                    subtitle={`Displaying ${filtered.length} of ${totalCount} recorded attempts`}
                    action={
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                            {/* Segmented Filter Tabs */}
                            <div className="flex p-0.5 bg-slate-100 rounded-lg border border-slate-200 text-xs">
                                <button
                                    type="button"
                                    onClick={() => setStatusFilter('all')}
                                    className={`px-3 py-1 rounded-md font-medium transition-colors ${
                                        statusFilter === 'all'
                                            ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    All ({totalCount})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setStatusFilter('passed')}
                                    className={`px-3 py-1 rounded-md font-medium transition-colors ${
                                        statusFilter === 'passed'
                                            ? 'bg-white text-emerald-700 shadow-2xs font-semibold'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    Passed ({passedCount})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setStatusFilter('failed')}
                                    className={`px-3 py-1 rounded-md font-medium transition-colors ${
                                        statusFilter === 'failed'
                                            ? 'bg-white text-red-700 shadow-2xs font-semibold'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    Failed ({totalCount - passedCount})
                                </button>
                            </div>

                            {/* Search Field */}
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Filter by USN, name, exam..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-colors"
                                />
                            </div>
                        </div>
                    }
                >
                    {loading ? (
                        <div className="py-6">
                            <LoadingSkeleton type="table" count={5} />
                        </div>
                    ) : filtered.length === 0 ? (
                        <EmptyState
                            title="No records matching filter"
                            description="Try adjusting your search criteria or switch filter tabs to view available submissions."
                            icon={FileText}
                            action={
                                searchTerm ? (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setSearchTerm('')}
                                    >
                                        Clear Search Filter
                                    </Button>
                                ) : null
                            }
                        />
                    ) : (
                        <div className="overflow-x-auto -mx-5 -mb-5">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/80 border-y border-slate-200 text-slate-500 uppercase tracking-wider text-[11px] font-semibold">
                                        <th className="py-3 px-5">Candidate</th>
                                        <th className="py-3 px-4">USN</th>
                                        <th className="py-3 px-4">Examination</th>
                                        <th className="py-3 px-4">Score</th>
                                        <th className="py-3 px-4">Score %</th>
                                        <th className="py-3 px-3 text-center">Grade</th>
                                        <th className="py-3 px-4">Result</th>
                                        <th className="py-3 px-4">Exam Date</th>
                                        <th className="py-3 px-5 text-right">Audit Documents</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filtered.map(r => {
                                        const passed = (r.Percentage || 0) >= 40;
                                        return (
                                            <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                                                <td className="py-3 px-5">
                                                    <div className="font-semibold text-slate-900">{r.Name || r.Username}</div>
                                                    <div className="text-[11px] text-slate-400 font-mono">@{r.Username}</div>
                                                </td>
                                                <td className="py-3 px-4 font-mono text-xs font-semibold text-slate-700">
                                                    {r.USN || '—'}
                                                </td>
                                                <td className="py-3 px-4 font-medium text-slate-900">
                                                    {r.ExamName}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className="font-bold text-slate-900">{r.Score}</span>
                                                    <span className="text-slate-400"> / {r.TotalMarks}</span>
                                                </td>
                                                <td className="py-3 px-4 font-semibold text-slate-800">
                                                    {r.Percentage}%
                                                </td>
                                                <td className="py-3 px-3 text-center">
                                                    <span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
                                                        {r.Grade || '-'}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <Badge variant={passed ? 'success' : 'danger'} dot>
                                                        {passed ? 'PASS' : 'FAIL'}
                                                    </Badge>
                                                </td>
                                                <td className="py-3 px-4 text-slate-500 text-xs">
                                                    {r.ExamDate ? new Date(r.ExamDate).toLocaleDateString('en-IN') : '—'}
                                                </td>
                                                <td className="py-3 px-5 text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <a
                                                            href={`/api/result-pdf/${r.id}`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="px-2.5 py-1 rounded-md text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors inline-flex items-center gap-1 shadow-2xs"
                                                            title="Download Official Scorecard PDF"
                                                        >
                                                            <Download size={12} /> Scorecard
                                                        </a>
                                                        <a
                                                            href={`/api/proctor/report-pdf/${r.id}`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="px-2.5 py-1 rounded-md text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors inline-flex items-center gap-1"
                                                            title="Download AI Proctoring Audit Report"
                                                        >
                                                            <FileText size={12} /> AI Audit
                                                        </a>
                                                    </div>
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
        </AppLayout>
    );
}

export default AllResults;
