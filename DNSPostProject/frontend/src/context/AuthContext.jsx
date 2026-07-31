import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiFetch, getCookie } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        const username = localStorage.getItem('username') || getCookie('user');
        const role = localStorage.getItem('role') || getCookie('role');
        return username ? { username, role: role || 'Admin' } : null;
    });

    const [loading, setLoading] = useState(false);

    const login = async (username, password, role) => {
        setLoading(true);
        try {
            const data = await apiFetch('/api/login', {
                method: 'POST',
                body: JSON.stringify({ username, password, role })
            });
            if (data.token) {
                localStorage.setItem('token', data.token);
            }
            const normalizedRole = (data.role === 'Admin' || data.role === 'instructor' || data.role === 'Instructor') ? 'Admin' : 'Student';
            localStorage.setItem('username', data.username);
            localStorage.setItem('role', normalizedRole);
            setUser({ username: data.username, role: normalizedRole });
            return { ...data, role: normalizedRole };
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        try {
            await apiFetch('/api/logout', { method: 'POST' });
        } catch (_) {}
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        localStorage.removeItem('role');
        setUser(null);
        window.location.href = '/login';
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
