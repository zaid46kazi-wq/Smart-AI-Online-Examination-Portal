import React from 'react';

export function Card({
    children,
    title,
    subtitle,
    icon: Icon,
    badge,
    action,
    footer,
    className = '',
    headerClassName = '',
    noPadding = false,
    hover = false,
    ...props
}) {
    return (
        <div
            className={`bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden transition-all duration-200 ${
                hover ? 'hover:border-slate-300 hover:shadow-xs' : ''
            } ${className}`}
            {...props}
        >
            {(title || action || Icon || badge) && (
                <div className={`px-5 py-4 border-b border-slate-200/80 flex items-center justify-between gap-3 ${headerClassName}`}>
                    <div className="flex items-center gap-3 min-w-0">
                        {Icon && (
                            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100/60">
                                <Icon size={16} />
                            </div>
                        )}
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                {title && (
                                    <h3 className="text-sm font-semibold text-slate-900 tracking-tight truncate">
                                        {title}
                                    </h3>
                                )}
                                {badge && <div>{badge}</div>}
                            </div>
                            {subtitle && (
                                <p className="text-xs text-slate-500 mt-0.5 truncate">
                                    {subtitle}
                                </p>
                            )}
                        </div>
                    </div>
                    {action && <div className="shrink-0 flex items-center gap-2">{action}</div>}
                </div>
            )}
            <div className={noPadding ? '' : 'p-5'}>
                {children}
            </div>
            {footer && (
                <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200/80 text-xs text-slate-600">
                    {footer}
                </div>
            )}
        </div>
    );
}

export default Card;
