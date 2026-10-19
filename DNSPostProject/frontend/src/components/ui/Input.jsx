import React, { forwardRef } from 'react';

export const Input = forwardRef(function Input(
    {
        label,
        type = 'text',
        placeholder,
        value,
        onChange,
        error,
        helperText,
        icon: Icon,
        rightElement,
        required = false,
        disabled = false,
        className = '',
        inputClassName = '',
        id,
        name,
        ...props
    },
    ref
) {
    const inputId = id || (name ? `input-${name}` : undefined);

    return (
        <div className={`space-y-1.5 ${className}`}>
            {label && (
                <div className="flex items-center justify-between">
                    <label
                        htmlFor={inputId}
                        className="block text-xs font-semibold text-slate-700 tracking-tight"
                    >
                        {label} {required && <span className="text-red-500">*</span>}
                    </label>
                </div>
            )}
            <div className="relative">
                {Icon && (
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Icon size={16} />
                    </div>
                )}
                <input
                    ref={ref}
                    id={inputId}
                    name={name}
                    type={type}
                    value={value}
                    onChange={onChange}
                    disabled={disabled}
                    placeholder={placeholder}
                    required={required}
                    className={`w-full text-xs sm:text-sm py-2 rounded-lg border transition-all duration-150 focus:outline-hidden disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed ${
                        Icon ? 'pl-9' : 'pl-3'
                    } ${rightElement ? 'pr-10' : 'pr-3'} ${
                        error
                            ? 'border-red-400 bg-red-50/20 text-red-900 focus:border-red-500 focus:ring-2 focus:ring-red-100'
                            : 'border-slate-300 bg-white text-slate-900 hover:border-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100'
                    } ${inputClassName}`}
                    {...props}
                />
                {rightElement && (
                    <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center">
                        {rightElement}
                    </div>
                )}
            </div>
            {error && (
                <p className="text-[11px] text-red-600 font-medium flex items-center gap-1">
                    <span>{error}</span>
                </p>
            )}
            {!error && helperText && (
                <p className="text-[11px] text-slate-500">
                    {helperText}
                </p>
            )}
        </div>
    );
});

export default Input;
