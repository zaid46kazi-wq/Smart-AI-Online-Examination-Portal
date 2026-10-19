import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react';

let toastListener = null;

export function showToast(message, type = 'info', duration = 3500) {
    if (toastListener) {
        toastListener({ message, type, duration, id: Date.now() });
    }
}

export function ToastContainer() {
    const [toasts, setToasts] = useState([]);

    useEffect(() => {
        toastListener = (newToast) => {
            setToasts(prev => [...prev.slice(-3), newToast]); // keep max 4 toasts
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== newToast.id));
            }, newToast.duration || 3500);
        };
        return () => { toastListener = null; };
    }, []);

    const config = {
        success: {
            icon: CheckCircle2,
            iconClass: 'text-emerald-600',
            border: 'border-emerald-200',
            bg: 'bg-white',
        },
        error: {
            icon: XCircle,
            iconClass: 'text-red-600',
            border: 'border-red-200',
            bg: 'bg-white',
        },
        warning: {
            icon: AlertTriangle,
            iconClass: 'text-amber-600',
            border: 'border-amber-200',
            bg: 'bg-white',
        },
        info: {
            icon: Info,
            iconClass: 'text-blue-600',
            border: 'border-blue-200',
            bg: 'bg-white',
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-[10000] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
            {toasts.map(t => {
                const conf = config[t.type] || config.info;
                const Icon = conf.icon;
                return (
                    <div
                        key={t.id}
                        className={`pointer-events-auto p-3.5 rounded-xl border ${conf.border} ${conf.bg} text-slate-800 shadow-md flex items-center gap-3 transition-all animate-in fade-in slide-in-from-bottom-2`}
                    >
                        <Icon size={18} className={`${conf.iconClass} shrink-0`} />
                        <span className="text-xs font-medium text-slate-800 leading-snug flex-1">
                            {t.message}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

export default ToastContainer;
