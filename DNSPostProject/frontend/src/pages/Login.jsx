import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { showToast } from '../components/Toast';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import {
    GraduationCap,
    ShieldCheck,
    User,
    Lock,
    Eye,
    EyeOff,
    ArrowRight,
    Sparkles,
    Shield,
    CheckCircle2
} from 'lucide-react';

export function Login() {
    const [role, setRole] = useState('student');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const { login, loading } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        setError('');

        if (!username.trim()) {
            showToast('Please enter your username or USN', 'warning');
            return;
        }
        if (!password.trim()) {
            showToast('Please enter your password', 'warning');
            return;
        }

        try {
            const data = await login(username, password, role);
            showToast('Authentication successful', 'success');
            if (data.role === 'Admin' || data.role === 'Instructor' || data.role === 'instructor') {
                navigate('/admin');
            } else {
                navigate('/student');
            }
        } catch (err) {
            setError(err.message || 'Invalid username or password. Please try again.');
        }
    };

    const handleQuickFill = (u, p, r) => {
        setUsername(u);
        setPassword(p);
        setRole(r);
        setError('');
        showToast(`Auto-filled ${r.toUpperCase()} credentials`, 'info');
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans text-slate-900 justify-between">
            {/* 1. Institutional Top Bar */}
            <header className="w-full bg-white/95 backdrop-blur-xs border-b border-slate-200 py-3.5 px-6 shadow-2xs">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                            AG
                        </div>
                        <div>
                            <h1 className="text-sm font-bold text-slate-900 leading-tight flex items-center gap-2">
                                <span>AGMR College of Engineering</span>
                                <Badge variant="primary" size="xs">Autonomous</Badge>
                            </h1>
                            <p className="text-[11px] text-slate-500 font-medium">
                                Department of Computer Science & Engineering
                            </p>
                        </div>
                    </div>
                    <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-100/80 px-3 py-1 rounded-lg border border-slate-200">
                        <Shield size={14} className="text-blue-600" />
                        <span>Examination Controller Portal</span>
                    </div>
                </div>
            </header>

            {/* 2. Main Login Area */}
            <main className="flex-1 flex items-center justify-center px-4 py-12">
                <div className="w-full max-w-md">
                    {/* Portal Card */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
                        {/* Header */}
                        <div className="text-center space-y-1">
                            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                                Examination Portal Sign In
                            </h2>
                            <p className="text-xs text-slate-500">
                                Secure access for students, examiners, and faculty evaluators
                            </p>
                        </div>

                        {/* Role Segmented Switch */}
                        <div className="flex bg-slate-100/90 p-1 rounded-xl border border-slate-200/80">
                            <button
                                type="button"
                                onClick={() => { setRole('student'); setError(''); }}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                    role === 'student'
                                        ? 'bg-white text-blue-700 shadow-xs border border-slate-200/50'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <GraduationCap size={15} />
                                <span>Student</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => { setRole('instructor'); setError(''); }}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                    role === 'instructor'
                                        ? 'bg-white text-blue-700 shadow-xs border border-slate-200/50'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <ShieldCheck size={15} />
                                <span>Faculty / Admin</span>
                            </button>
                        </div>

                        {/* Login Form */}
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <Input
                                label={role === 'student' ? 'Student USN / Username' : 'Faculty ID / Username'}
                                placeholder={role === 'student' ? 'e.g. 1AG21CS001 or student1' : 'e.g. admin or faculty_cs'}
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                icon={User}
                                required
                                autoComplete="username"
                            />

                            <Input
                                label="Password"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="••••••••••••"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                icon={Lock}
                                required
                                autoComplete="current-password"
                                rightElement={
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
                                        tabIndex={-1}
                                        title={showPassword ? 'Hide password' : 'Show password'}
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                }
                            />

                            {error && (
                                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-medium leading-relaxed">
                                    {error}
                                </div>
                            )}

                            <Button
                                type="submit"
                                variant="primary"
                                fullWidth
                                size="md"
                                loading={loading}
                                icon={ArrowRight}
                                iconPosition="right"
                            >
                                Sign In to Examination Portal
                            </Button>
                        </form>

                        {/* Viva / Demonstration Quick Sign-In Buttons */}
                        <div className="pt-4 border-t border-slate-100 space-y-2">
                            <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
                                <span>Quick Demo Credentials</span>
                                <span className="text-[10px] text-blue-600 font-normal">Click to fill</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleQuickFill('admin', 'admin123', 'instructor')}
                                    className="p-2 rounded-lg bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 text-left transition-colors cursor-pointer"
                                >
                                    <div className="text-[11px] font-bold text-slate-800">Admin / Faculty</div>
                                    <div className="text-[10px] font-mono text-slate-500">admin / admin123</div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleQuickFill('student1', 'pass1', 'student')}
                                    className="p-2 rounded-lg bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 text-left transition-colors cursor-pointer"
                                >
                                    <div className="text-[11px] font-bold text-slate-800">Student (Rahul)</div>
                                    <div className="text-[10px] font-mono text-slate-500">student1 / pass1</div>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* 3. Clean Institutional Footer */}
            <footer className="w-full bg-white border-t border-slate-200 py-4 px-6 text-center text-xs text-slate-500">
                <p>© 2026 AGMR College of Engineering. Online Examination System.</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Autonomous Academic Assessment Infrastructure</p>
            </footer>
        </div>
    );
}

export default Login;
