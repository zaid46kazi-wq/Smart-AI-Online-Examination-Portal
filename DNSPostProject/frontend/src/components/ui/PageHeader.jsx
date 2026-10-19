import React from 'react';
import { ChevronRight } from 'lucide-react';

export function PageHeader({
    title,
    description,
    badge,
    breadcrumbs = [],
    action,
    className = ''
}) {
    return (
        <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 mb-6 border-b border-slate-200/90 ${className}`}>
            <div className="space-y-1">
                {breadcrumbs.length > 0 && (
                    <nav className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                        {breadcrumbs.map((crumb, idx) => (
                            <React.Fragment key={idx}>
                                {crumb.href ? (
                                    <a href={crumb.href} className="hover:text-blue-600 transition-colors">
                                        {crumb.label}
                                    </a>
                                ) : (
                                    <span className="font-medium text-slate-700">{crumb.label}</span>
                                )}
                                {idx < breadcrumbs.length - 1 && (
                                    <ChevronRight size={12} className="text-slate-400" />
                                )}
                            </React.Fragment>
                        ))}
                    </nav>
                )}
                <div className="flex items-center gap-2.5 flex-wrap">
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-tight">
                        {title}
                    </h1>
                    {badge && <div>{badge}</div>}
                </div>
                {description && (
                    <p className="text-xs sm:text-sm text-slate-500 max-w-3xl">
                        {description}
                    </p>
                )}
            </div>
            {action && (
                <div className="shrink-0 flex items-center gap-2 flex-wrap">
                    {action}
                </div>
            )}
        </div>
    );
}

export default PageHeader;
