import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastContainer } from './components/Toast';

import { Login } from './pages/Login';

// Lazy load heavy dashboard and exam pages for bundle size optimization
const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const StudentDashboard = lazy(() => import('./pages/StudentDashboard').then(m => ({ default: m.StudentDashboard })));
const ExamPage = lazy(() => import('./pages/ExamPage').then(m => ({ default: m.ExamPage })));
const CreateExam = lazy(() => import('./pages/CreateExam').then(m => ({ default: m.CreateExam })));
const ResultView = lazy(() => import('./pages/ResultView').then(m => ({ default: m.ResultView })));
const AllResults = lazy(() => import('./pages/AllResults').then(m => ({ default: m.AllResults })));
const AISettings = lazy(() => import('./pages/AISettings').then(m => ({ default: m.AISettings })));
const AIEvaluation = lazy(() => import('./pages/AIEvaluation').then(m => ({ default: m.AIEvaluation })));

import './css/app.css';

function ProtectedRoute({ children, role }) {
    const { user } = useAuth();
    if (!user) return <Navigate to="/login" replace />;
    
    if (role) {
        const userRole = (user.role || '').toLowerCase();
        const targetRole = role.toLowerCase();
        if (targetRole === 'admin' && userRole !== 'admin' && userRole !== 'instructor') {
            return <Navigate to="/student" replace />;
        }
        if (targetRole === 'student' && userRole === 'admin') {
            return <Navigate to="/admin" replace />;
        }
    }
    return children;
}

const PageFallback = () => (
    <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="text-center">
            <div className="inline-block w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-3"></div>
            <p className="text-xs font-bold text-muted uppercase tracking-widest">Loading Page...</p>
        </div>
    </div>
);

export function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <ToastContainer />
                <Suspense fallback={<PageFallback />}>
                    <Routes>
                        <Route path="/" element={<Navigate to="/login" replace />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/admin" element={<ProtectedRoute role="Admin"><AdminDashboard /></ProtectedRoute>} />
                        <Route path="/instructor/dashboard" element={<ProtectedRoute role="Admin"><AdminDashboard /></ProtectedRoute>} />
                        <Route path="/student" element={<ProtectedRoute role="Student"><StudentDashboard /></ProtectedRoute>} />
                        <Route path="/student/dashboard" element={<ProtectedRoute role="Student"><StudentDashboard /></ProtectedRoute>} />
                        <Route path="/create-exam" element={<ProtectedRoute role="Admin"><CreateExam /></ProtectedRoute>} />
                        <Route path="/ai-evaluation" element={<ProtectedRoute role="Admin"><AIEvaluation /></ProtectedRoute>} />
                        <Route path="/results" element={<ProtectedRoute role="Admin"><AllResults /></ProtectedRoute>} />
                        <Route path="/ai-settings" element={<ProtectedRoute role="Admin"><AISettings /></ProtectedRoute>} />
                        <Route path="/admin/settings" element={<ProtectedRoute role="Admin"><AISettings /></ProtectedRoute>} />
                        <Route path="/exam" element={<ProtectedRoute role="Student"><ExamPage /></ProtectedRoute>} />
                        <Route path="/result" element={<ProtectedRoute role="Student"><ResultView /></ProtectedRoute>} />
                        <Route path="*" element={<Navigate to="/login" replace />} />
                    </Routes>
                </Suspense>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;
