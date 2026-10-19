import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { AlertTriangle, AlertCircle, HelpCircle, CheckCircle2 } from 'lucide-react';

export function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title = 'Confirm Action',
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    confirmVariant = 'danger',
    loading = false,
    severity = 'danger', // 'danger' | 'warning' | 'info' | 'success'
    children
}) {
    const icons = {
        danger: { Icon: AlertCircle, color: 'bg-red-50 text-red-600 border-red-100' },
        warning: { Icon: AlertTriangle, color: 'bg-amber-50 text-amber-600 border-amber-100' },
        info: { Icon: HelpCircle, color: 'bg-blue-50 text-blue-600 border-blue-100' },
        success: { Icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
    };

    const { Icon, color } = icons[severity] || icons.danger;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="sm"
            title=""
            footer={
                <>
                    <Button
                        variant="secondary"
                        size="sm"
                        disabled={loading}
                        onClick={onClose}
                    >
                        {cancelText}
                    </Button>
                    <Button
                        variant={confirmVariant}
                        size="sm"
                        loading={loading}
                        onClick={onConfirm}
                    >
                        {confirmText}
                    </Button>
                </>
            }
        >
            <div className="flex items-start gap-3.5 pt-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border ${color}`}>
                    <Icon size={20} />
                </div>
                <div className="space-y-1.5 flex-1">
                    <h4 className="text-sm font-bold text-slate-900 tracking-tight">
                        {title}
                    </h4>
                    {message && (
                        <p className="text-xs text-slate-600 leading-relaxed">
                            {message}
                        </p>
                    )}
                    {children}
                </div>
            </div>
        </Modal>
    );
}

export default ConfirmDialog;
