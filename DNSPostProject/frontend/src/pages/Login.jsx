import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { showToast } from '../components/Toast';

export function Login() {
    const [role, setRole] = useState('student');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login, loading } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        setError('');

        if (!username.trim()) {
            showToast('Please enter username', 'warning');
            return;
        }
        if (!password.trim()) {
            showToast('Please enter password', 'warning');
            return;
        }

        try {
            const data = await login(username, password, role);
            showToast('Login successful!', 'success');
            if (data.role === 'Admin' || data.role === 'Instructor' || data.role === 'instructor') {
                navigate('/admin');
            } else {
                navigate('/student');
            }
        } catch (err) {
            setError(err.message || 'Invalid credentials');
        }
    };

    return (
        <div className="bg-surface min-h-screen flex flex-col">
            {/* Header */}
            <header className="w-full bg-primary text-on-primary py-3 px-6 text-center shadow-lg relative z-10">
                <h1 className="text-lg font-bold font-headline tracking-tight">AGMR College of Engineering</h1>
                <p className="text-xs opacity-80">Online Examination System</p>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex items-center justify-center px-4 py-12 relative overflow-hidden">
                {/* Background decorative elements */}
                <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl float-anim"></div>
                <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary-container/5 rounded-full blur-3xl float-anim" style={{ animationDelay: '-3s' }}></div>

                <div className="relative z-10 w-full max-w-md">
                    {/* Login Card */}
                    <div className="bg-surface-container-lowest rounded-2xl shadow-[0_20px_60px_rgba(47,86,200,0.08)] border border-outline-variant/10 overflow-hidden">
                        
                        {/* Card Header */}
                        <div className="bg-gradient-to-br from-primary to-primary-container p-8 text-on-primary text-center relative overflow-hidden">
                            <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                            <div className="relative z-10">
                                <div className="w-16 h-16 bg-white/20 backdrop-blur-lg rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20">
                                    <span className="material-symbols-outlined text-3xl">school</span>
                                </div>
                                <h2 className="text-2xl font-bold font-headline tracking-tight">Welcome Back</h2>
                                <p className="text-sm opacity-80 mt-1">Sign in to continue to your portal</p>
                            </div>
                        </div>

                        {/* Login Form */}
                        <form onSubmit={handleSubmit} className="p-8 space-y-5">
                            {/* Role Selector */}
                            <div className="flex bg-surface-container-high rounded-xl p-1 gap-1">
                                <button
                                    type="button"
                                    onClick={() => setRole('student')}
                                    className={role === 'student'
                                        ? 'flex-1 py-2.5 rounded-lg text-sm font-bold transition-all bg-primary text-on-primary shadow-sm'
                                        : 'flex-1 py-2.5 rounded-lg text-sm font-bold transition-all text-on-surface-variant hover:bg-surface-container'}
                                >
                                    <span className="material-symbols-outlined text-base align-middle mr-1">person</span> Student
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setRole('instructor')}
                                    className={role === 'instructor'
                                        ? 'flex-1 py-2.5 rounded-lg text-sm font-bold transition-all bg-primary text-on-primary shadow-sm'
                                        : 'flex-1 py-2.5 rounded-lg text-sm font-bold transition-all text-on-surface-variant hover:bg-surface-container'}
                                >
                                    <span className="material-symbols-outlined text-base align-middle mr-1">admin_panel_settings</span> Instructor
                                </button>
                            </div>

                            {/* Username */}
                            <div>
                                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">Username</label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-3 flex items-center material-symbols-outlined text-on-surface-variant text-xl">person</span>
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={e => setUsername(e.target.value)}
                                        className="w-full bg-surface-container-high border-none rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all placeholder:text-outline"
                                        placeholder="Enter your username"
                                        required
                                        autoComplete="username"
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div>
                                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">Password</label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-3 flex items-center material-symbols-outlined text-on-surface-variant text-xl">lock</span>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        className="w-full bg-surface-container-high border-none rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all placeholder:text-outline"
                                        placeholder="Enter your password"
                                        required
                                        autoComplete="current-password"
                                    />
                                </div>
                            </div>

                            {/* Error Message */}
                            {error && (
                                <div className="bg-error-container/10 border border-error/20 text-error text-sm font-medium rounded-xl px-4 py-3 text-center">
                                    {error}
                                </div>
                            )}

                            {/* Login Button */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-primary text-on-primary py-3.5 rounded-xl font-bold text-sm hover:bg-primary-dim transition-all shadow-lg shadow-primary/20 active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-lg">login</span>
                                {loading ? 'Signing in...' : 'Sign In'}
                            </button>
                        </form>
                    </div>

                    {/* Info */}
                    <div className="text-center mt-6 space-y-1">
                        <p className="text-xs text-on-surface-variant">Default credentials: <span className="font-bold">admin/admin123</span> or <span className="font-bold">student1/pass1</span></p>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="w-full bg-primary text-on-primary py-4 px-6 text-center mt-12">
                <p className="text-xs font-medium">Online Examination System</p>
                <p className="text-[10px] mt-0.5 opacity-80">Developer: Sayed Zaid Kazi | AGMR College of Engineering</p>
            </footer>
        </div>
    );
}
