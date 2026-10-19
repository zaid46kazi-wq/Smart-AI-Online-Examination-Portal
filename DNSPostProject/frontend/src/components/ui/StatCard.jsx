import React from 'react';

export function StatCard({
    label,
    value,
    description,
    icon: Icon,
    badgeText,
    badgeColor = 'blue',
    trend,
    className = ''
}) {
    const badgeStyles = {
        blue: 'text-blue-700 bg-blue-50 border-blue-200/80',
        green: 'text-emerald-700 bg-emerald-50 border-emerald-200/80',
        amber: 'text-amber-700 bg-amber-50 border-amber-200/80',
        red: 'text-red-700 bg-red-50 border-red-200/80',
    };

    return (
        <div className={`bg-white p-5 rounded-xl border border-slate-200 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all duration-200 flex items-start justify-between gap-4 ${className}`}>
            <div className="space-y-1.5 min-w-0">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
                    {label}
                </p>
                <div className="flex items-baseline gap-2.5 flex-wrap">
                    <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
                        {value}
                    </h3>
                    {badgeText && (
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border tracking-tight ${badgeStyles[badgeColor] || badgeStyles.blue}`}>
                            {badgeText}
                        </span>
                    )}
                </div>
                {description && (
                    <p className="text-xs text-slate-500 font-medium truncate">
                        {description}
                    </p>
                )}
            </div>
            {Icon && (
                <div className="w-10 h-10 rounded-xl bg-blue-50/80 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100/60 shadow-2xs">
                    <Icon size={18} />
                </div>
            )}
        </div>
    );
}

export default StatCard;
