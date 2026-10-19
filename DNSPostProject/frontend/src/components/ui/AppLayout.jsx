import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
    LayoutDashboard,
    Users,
    GraduationCap,
    BookOpen,
    ClipboardList,
    FileQuestion,
    FileText,
    ShieldCheck,
    Settings,
    LogOut,
    Sparkles,
    User,
    Menu,
    X,
    ChevronRight,
    Award,
    Shield,
    ChevronLeft,
    CheckCircle2
} from 'lucide-react';

export function AppLayout({ children, activeTab, onTabChange }) {
    const { user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    const userRole = (user?.role || '').toLowerCase();
    const isAdmin = userRole === 'admin';
    const isFaculty = userRole === 'instructor' || userRole === 'faculty';
    const isStudent = !isAdmin && !isFaculty;

    // Role-specific navigation items
    const getNavItems = () => {
        if (isAdmin) {
            return [
                { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/admin', tab: 'overview' },
                { id: 'students', label: 'Students', icon: Users, path: '/admin', tab: 'students' },
                { id: 'faculty', label: 'Faculty', icon: GraduationCap, path: '/admin', tab: 'faculty' },
                { id: 'subjects', label: 'Subjects', icon: BookOpen, path: '/admin', tab: 'subjects' },
                { id: 'exams', label: 'Examinations', icon: ClipboardList, path: '/admin', tab: 'exams' },
                { id: 'questions', label: 'Questions Builder', icon: FileQuestion, path: '/create-exam' },
                { id: 'ai-eval', label: 'AI Answer Evaluation', icon: Award, path: '/ai-evaluation' },
                { id: 'results', label: 'Results Ledger', icon: FileText, path: '/results' },
                { id: 'security', label: 'Security & Proctoring', icon: ShieldCheck, path: '/ai-settings' },
                { id: 'settings', label: 'System Settings', icon: Settings, path: '/ai-settings' },
            ];
        }

        if (isFaculty) {
            return [
                { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/admin', tab: 'overview' },
                { id: 'subjects', label: 'Subjects', icon: BookOpen, path: '/admin', tab: 'subjects' },
                { id: 'exams', label: 'Examinations', icon: ClipboardList, path: '/admin', tab: 'exams' },
                { id: 'questions', label: 'Questions Builder', icon: FileQuestion, path: '/create-exam' },
                { id: 'ai-eval', label: 'AI Answer Evaluation', icon: Award, path: '/ai-evaluation' },
                { id: 'students', label: 'Students', icon: Users, path: '/admin', tab: 'students' },
                { id: 'results', label: 'Results', icon: FileText, path: '/results' },
                { id: 'ai-gen', label: 'AI Question Generator', icon: Sparkles, path: '/create-exam' },
            ];
        }

        // Student Navigation
        return [
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/student', tab: 'overview' },
            { id: 'exams', label: 'Available Exams', icon: ClipboardList, path: '/student', tab: 'exams' },
            { id: 'results', label: 'My Results', icon: FileText, path: '/student', tab: 'results' },
            { id: 'performance', label: 'Performance', icon: Award, path: '/student', tab: 'performance' },
            { id: 'ai-tutor', label: 'AI Study Assistant', icon: Sparkles, path: '/student', tab: 'ai' },
        ];
    };

    const navItems = getNavItems();

    const handleNavClick = (item) => {
        setMobileOpen(false);
        if (item.tab && onTabChange && location.pathname === item.path) {
            onTabChange(item.tab);
        } else if (item.tab && location.pathname === item.path) {
            const url = new URL(window.location);
            url.searchParams.set('tab', item.tab);
            window.history.pushState({}, '', url);
            window.dispatchEvent(new Event('popstate'));
        } else {
            navigate(item.path + (item.tab ? `?tab=${item.tab}` : ''));
        }
    };

    const isItemActive = (item) => {
        if (item.path !== location.pathname) return false;
        if (item.tab && activeTab) return activeTab === item.tab;
        return true;
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans text-slate-900">
            {/* 1. Global Institutional Top Bar (60px) */}
            <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xs border-b border-slate-200/90 h-15 flex items-center justify-between px-4 sm:px-6 shadow-2xs">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setMobileOpen(prev => !prev)}
                        className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                        aria-label="Toggle mobile navigation"
                    >
                        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>

                    <Link to={isAdmin ? '/admin' : isFaculty ? '/admin' : '/student'} className="flex items-center gap-3 group">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-bold text-sm shadow-xs group-hover:shadow-sm transition-all">
                            AG
                        </div>
                        <div className="hidden sm:block">
                            <h1 className="text-sm font-bold text-slate-900 tracking-tight leading-tight flex items-center gap-2">
                                <span>AGMR College of Engineering</span>
                                <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                    Autonomous
                                </span>
                            </h1>
                            <p className="text-[11px] text-slate-500 font-medium">
                                Smart AI Online Examination System • Portal v3.1
                            </p>
                        </div>
                    </Link>
                </div>

                {/* Right Top Bar: System Status & User Profile */}
                <div className="flex items-center gap-3">
                    {/* Live System Indicator */}
                    <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Online Secure Session</span>
                    </div>

                    <div className="h-4 w-px bg-slate-200 hidden md:block"></div>

                    {/* User Profile */}
                    <div className="flex items-center gap-2.5">
                        <div className="text-right hidden sm:block">
                            <div className="text-xs font-bold text-slate-900 leading-tight">
                                {user?.name || user?.username || 'User'}
                            </div>
                            <div className="text-[10px] text-slate-500 font-medium capitalize">
                                {user?.role || (isAdmin ? 'Administrator' : isFaculty ? 'Faculty' : 'Student')}
                                {user?.usn ? ` • ${user.usn}` : ''}
                            </div>
                        </div>

                        <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-300/80 flex items-center justify-center text-slate-700 font-bold text-xs select-none shadow-2xs">
                            {user?.username?.charAt(0)?.toUpperCase() || 'U'}
                        </div>

                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 border border-slate-200 hover:border-red-100 transition-all cursor-pointer ml-1"
                            title="Sign out of examination portal"
                        >
                            <LogOut size={14} />
                            <span className="hidden sm:inline">Logout</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* 2. Main Shell: Collapsible Sidebar + Content Workspace */}
            <div className="flex flex-1 overflow-hidden">
                {/* Desktop Sidebar */}
                <aside
                    className={`hidden lg:flex ${
                        sidebarCollapsed ? 'w-18' : 'w-60'
                    } bg-white border-r border-slate-200/90 flex-col shrink-0 transition-all duration-200 select-none`}
                >
                    {/* Collapse Toggle */}
                    <div className="px-3 pt-3 pb-2 flex items-center justify-between border-b border-slate-100">
                        {!sidebarCollapsed && (
                            <span className="px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                Navigation Menu
                            </span>
                        )}
                        <button
                            type="button"
                            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                            className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors mx-auto"
                            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                        >
                            {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                        </button>
                    </div>

                    {/* Nav Links */}
                    <div className="p-3 flex-1 overflow-y-auto space-y-1">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const active = isItemActive(item);
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => handleNavClick(item)}
                                    title={sidebarCollapsed ? item.label : undefined}
                                    className={`w-full flex items-center ${
                                        sidebarCollapsed ? 'justify-center px-2' : 'justify-between px-3'
                                    } py-2.5 rounded-lg text-xs font-medium transition-all text-left cursor-pointer ${
                                        active
                                            ? 'bg-blue-50 text-blue-700 font-semibold border-l-2 border-blue-600 shadow-2xs'
                                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <Icon size={16} className={`shrink-0 ${active ? 'text-blue-600' : 'text-slate-400'}`} />
                                        {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                                    </div>
                                    {!sidebarCollapsed && active && (
                                        <ChevronRight size={14} className="text-blue-600 shrink-0" />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Footer Info */}
                    {!sidebarCollapsed ? (
                        <div className="p-3 border-t border-slate-100 text-[11px] text-slate-400 text-center">
                            VTU Academic Year 2025–26
                        </div>
                    ) : (
                        <div className="p-2 border-t border-slate-100 text-[10px] text-slate-400 text-center font-mono">
                            v3.1
                        </div>
                    )}
                </aside>

                {/* Mobile Drawer */}
                {mobileOpen && (
                    <div className="fixed inset-0 z-50 lg:hidden flex">
                        <div
                            className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs transition-opacity"
                            onClick={() => setMobileOpen(false)}
                        />
                        <div className="relative w-72 bg-white h-full flex flex-col z-10 shadow-xl border-r border-slate-200">
                            <div className="p-4 border-b border-slate-200 flex justify-between items-center">
                                <span className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                                    Portal Navigation
                                </span>
                                <button
                                    onClick={() => setMobileOpen(false)}
                                    className="p-1 rounded-md text-slate-400 hover:text-slate-600"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="p-3 flex-1 overflow-y-auto space-y-1">
                                {navItems.map((item) => {
                                    const Icon = item.icon;
                                    const active = isItemActive(item);
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => handleNavClick(item)}
                                            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium text-left ${
                                                active
                                                    ? 'bg-blue-50 text-blue-700 font-semibold border-l-2 border-blue-600'
                                                    : 'text-slate-600 hover:bg-slate-50'
                                            }`}
                                        >
                                            <Icon size={16} className={active ? 'text-blue-600' : 'text-slate-400'} />
                                            <span>{item.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* 3. Main Content Workspace */}
                <main className="flex-1 overflow-y-auto bg-[#F8FAFC]">
                    <div className="max-w-[1500px] mx-auto p-4 sm:p-6 lg:p-8">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}

export default AppLayout;
