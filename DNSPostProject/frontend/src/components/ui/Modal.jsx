import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export function Modal({
    isOpen,
    onClose,
    title,
    description,
    children,
    footer,
    size = 'md',
    maxWidth,
    className = ''
}) {
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen) onClose();
        };
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            window.addEventListener('keydown', handleKeyDown);
        }
        return () => {
            document.body.style.overflow = '';
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const sizes = {
        sm: 'max-w-md',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
        '2xl': 'max-w-5xl',
        full: 'max-w-7xl',
    };

    const resolvedMaxWidth = maxWidth || sizes[size] || 'max-w-lg';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            {/* Backdrop with soft blur */}
            <div
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-200"
                onClick={onClose}
            />

            {/* Modal Dialog Card */}
            <div
                role="dialog"
                aria-modal="true"
                className={`relative w-full ${resolvedMaxWidth} bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] z-10 transition-all duration-200 ${className}`}
            >
                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-200/80 flex items-center justify-between gap-3 shrink-0">
                    <div className="min-w-0">
                        <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate">
                            {title}
                        </h3>
                        {description && (
                            <p className="text-xs text-slate-500 mt-0.5 truncate">
                                {description}
                            </p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
                        aria-label="Close dialog"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 overflow-y-auto flex-1 text-slate-800 text-xs sm:text-sm">
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200/80 flex items-center justify-end gap-2.5 shrink-0">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}

export default Modal;
