import React from 'react';
import { Inbox } from 'lucide-react';

export function EmptyState({
    title = 'No records found',
    description,
    action,
    icon: Icon = Inbox,
    className = ''
}) {
    return (
        <div className={`py-12 px-4 text-center flex flex-col items-center justify-center ${className}`}>
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3 border border-slate-200/80 shadow-2xs">
                <Icon size={22} className="text-slate-400" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 mb-1 tracking-tight">
                {title}
            </h4>
            {description && (
                <p className="text-xs text-slate-500 max-w-sm mb-4 leading-relaxed">
                    {description}
                </p>
            )}
            {action && <div className="mt-1">{action}</div>}
        </div>
    );
}

export default EmptyState;
