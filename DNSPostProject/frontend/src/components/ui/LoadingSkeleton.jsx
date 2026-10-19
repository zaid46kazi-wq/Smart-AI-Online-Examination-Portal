import React from 'react';

export function LoadingSkeleton({ variant = 'table', rows = 4, className = '' }) {
    if (variant === 'cards') {
        return (
            <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
                {Array.from({ length: rows }).map((_, i) => (
                    <div key={i} className="p-5 bg-white rounded-xl border border-slate-200 animate-pulse space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                            <div className="h-4 bg-slate-100 rounded-full w-12"></div>
                        </div>
                        <div className="h-6 bg-slate-100 rounded w-2/3"></div>
                        <div className="h-3 bg-slate-100 rounded w-full"></div>
                        <div className="pt-2 flex justify-end">
                            <div className="h-8 bg-slate-200 rounded w-20"></div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (variant === 'stats') {
        return (
            <div className={`grid grid-cols-2 sm:grid-cols-4 gap-4 ${className}`}>
                {Array.from({ length: rows }).map((_, i) => (
                    <div key={i} className="p-5 bg-white rounded-xl border border-slate-200 animate-pulse space-y-2">
                        <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                        <div className="h-7 bg-slate-100 rounded w-3/4"></div>
                        <div className="h-2 bg-slate-100 rounded w-1/3"></div>
                    </div>
                ))}
            </div>
        );
    }

    // Default: Table skeleton
    return (
        <div className={`space-y-3 p-4 bg-white rounded-xl border border-slate-200 ${className}`}>
            <div className="flex items-center gap-4 pb-3 border-b border-slate-100">
                <div className="h-3.5 bg-slate-200 rounded w-1/6"></div>
                <div className="h-3.5 bg-slate-200 rounded w-1/4"></div>
                <div className="h-3.5 bg-slate-200 rounded w-1/4"></div>
                <div className="h-3.5 bg-slate-200 rounded w-1/6 ml-auto"></div>
            </div>
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 py-2 animate-pulse">
                    <div className="h-4 bg-slate-100 rounded w-1/6"></div>
                    <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                    <div className="h-4 bg-slate-100 rounded w-1/4"></div>
                    <div className="h-4 bg-slate-100 rounded w-1/12 ml-auto"></div>
                </div>
            ))}
        </div>
    );
}

export default LoadingSkeleton;
