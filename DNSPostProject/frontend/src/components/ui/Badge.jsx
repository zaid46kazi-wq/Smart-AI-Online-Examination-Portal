import React from 'react';

export function Badge({
    children,
    variant = 'default',
    size = 'sm',
    dot = false,
    icon: Icon,
    className = ''
}) {
    const variants = {
        default: {
            badge: 'bg-slate-100 text-slate-700 border-slate-200',
            dot: 'bg-slate-400'
        },
        primary: {
            badge: 'bg-blue-50 text-blue-700 border-blue-200/80',
            dot: 'bg-blue-600'
        },
        success: {
            badge: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
            dot: 'bg-emerald-600'
        },
        warning: {
            badge: 'bg-amber-50 text-amber-700 border-amber-200/80',
            dot: 'bg-amber-500'
        },
        danger: {
            badge: 'bg-red-50 text-red-700 border-red-200/80',
            dot: 'bg-red-600'
        },
        info: {
            badge: 'bg-sky-50 text-sky-700 border-sky-200/80',
            dot: 'bg-sky-600'
        },
        purple: {
            badge: 'bg-purple-50 text-purple-700 border-purple-200/80',
            dot: 'bg-purple-600'
        },
        neutral: {
            badge: 'bg-slate-50 text-slate-600 border-slate-200',
            dot: 'bg-slate-400'
        }
    };

    const sizes = {
        xs: 'text-[10px] px-1.5 py-0.5 gap-1',
        sm: 'text-[11px] px-2 py-0.5 gap-1.5 font-medium',
        md: 'text-xs px-2.5 py-1 gap-1.5 font-semibold',
    };

    const config = variants[variant] || variants.default;

    return (
        <span
            className={`inline-flex items-center rounded-md border tracking-tight font-medium select-none ${config.badge} ${sizes[size] || sizes.sm} ${className}`}
        >
            {dot && (
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dot}`} />
            )}
            {Icon && <Icon size={size === 'xs' ? 10 : 12} className="shrink-0" />}
            <span>{children}</span>
        </span>
    );
}

export default Badge;
