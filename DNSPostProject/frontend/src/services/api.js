/**
 * API Service Client
 * Handles HTTP requests with JWT tokens and error handling.
 */

export function getCookie(name) {
    const v = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
    return v ? decodeURIComponent(v.pop()) : '';
}

export async function apiFetch(url, options = {}) {
    const token = localStorage.getItem('token') || getCookie('token');
    
    const headers = {
        ...(options.headers || {})
    };

    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
        ...options,
        headers,
        credentials: 'include'
    };

    const res = await fetch(url, config);
    
    if (res.status === 401 && !url.includes('/api/login')) {
        localStorage.removeItem('token');
        window.location.href = '/login';
        throw new Error('Unauthorized');
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status} Error`);
    }

    return data;
}
