import React from 'react';

export function Button({
    children,
    variant = 'primary',
    size = 'md',
    icon: Icon,
    iconPosition = 'left',
    loading = false,
    disabled = false,
    fullWidth = false,
    className = '',
    type = 'button',
    ...props
}) {
    const base = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 focus:outline-hidden focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none select-none active:scale-[0.98]';

    const variants = {
        primary: 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-2xs hover:shadow-xs focus:ring-blue-500 border border-blue-600',
        secondary: 'bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 border border-slate-300 shadow-2xs hover:border-slate-400 focus:ring-slate-400',
        outline: 'bg-transparent hover:bg-blue-50/50 text-blue-600 border border-blue-300 hover:border-blue-500 focus:ring-blue-400',
        danger: 'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white shadow-2xs hover:shadow-xs focus:ring-red-500 border border-red-600',
        ghost: 'bg-transparent hover:bg-slate-100/80 active:bg-slate-200/80 text-slate-700 border-transparent',
        subtle: 'bg-blue-50 hover:bg-blue-100/80 active:bg-blue-200/60 text-blue-700 border border-blue-100',
        success: 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-2xs focus:ring-emerald-500 border border-emerald-600',
        dark: 'bg-slate-900 hover:bg-slate-800 text-white shadow-2xs focus:ring-slate-700 border border-slate-900',
    };

    const sizes = {
        xs: 'text-[11px] px-2 py-1 gap-1 rounded-md',
        sm: 'text-xs px-2.5 py-1.5 gap-1.5',
        md: 'text-xs sm:text-sm px-3.5 py-2 gap-2',
        lg: 'text-sm sm:text-base px-4 py-2.5 gap-2.5',
    };

    const iconSizes = {
        xs: 12,
        sm: 14,
        md: 16,
        lg: 18,
    };

    const currentIconSize = iconSizes[size] || 16;

    return (
        <button
            type={type}
            className={`${base} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${fullWidth ? 'w-full' : ''} ${className}`}
            disabled={disabled || loading}
            {...props}
        >
            {loading ? (
                <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
            ) : (
                Icon && iconPosition === 'left' && <Icon size={currentIconSize} className="shrink-0" />
            )}
            {children && <span>{children}</span>}
            {!loading && Icon && iconPosition === 'right' && <Icon size={currentIconSize} className="shrink-0" />}
        </button>
    );
}

export default Button;
