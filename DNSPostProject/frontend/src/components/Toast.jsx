import React, { useState, useEffect } from 'react';

let toastListener = null;

export function showToast(message, type = 'info', duration = 4000) {
    if (toastListener) {
        toastListener({ message, type, duration, id: Date.now() });
    }
}

export function ToastContainer() {
    const [toasts, setToasts] = useState([]);

    useEffect(() => {
        toastListener = (newToast) => {
            setToasts(prev => [...prev, newToast]);
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== newToast.id));
            }, newToast.duration || 4000);
        };
        return () => { toastListener = null; };
    }, []);

    const colors = {
        success: { bg: 'var(--color-success)', icon: 'check_circle' },
        error: { bg: 'var(--color-error)', icon: 'error' },
        warning: { bg: 'var(--color-warning)', icon: 'warning' },
        info: { bg: 'var(--color-primary)', icon: 'info' }
    };

    return (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 10000, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {toasts.map(t => {
                const conf = colors[t.type] || colors.info;
                return (
                    <div key={t.id} style={{
                        background: conf.bg, color: 'white', padding: '12px 20px', borderRadius: 12,
                        fontSize: 13, fontWeight: 600, boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
                        display: 'flex', alignItems: 'center', gap: 8, animation: 'fadeIn 0.3s ease'
                    }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{conf.icon}</span>
                        <span>{t.message}</span>
                    </div>
                );
            })}
        </div>
    );
}
