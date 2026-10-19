import React, { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

export const Select = forwardRef(function Select(
    {
        label,
        value,
        onChange,
        options = [],
        children,
        error,
        helperText,
        icon: Icon,
        required = false,
        disabled = false,
        placeholder,
        className = '',
        selectClassName = '',
        id,
        name,
        ...props
    },
    ref
) {
    const selectId = id || (name ? `select-${name}` : undefined);

    return (
        <div className={`space-y-1.5 ${className}`}>
            {label && (
                <label
                    htmlFor={selectId}
                    className="block text-xs font-semibold text-slate-700 tracking-tight"
                >
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}
            <div className="relative">
                {Icon && (
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Icon size={16} />
                    </div>
                )}
                <select
                    ref={ref}
                    id={selectId}
                    name={name}
                    value={value}
                    onChange={onChange}
                    disabled={disabled}
                    required={required}
                    className={`w-full text-xs sm:text-sm py-2 rounded-lg border appearance-none transition-all duration-150 focus:outline-hidden disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed ${
                        Icon ? 'pl-9' : 'pl-3'
                    } pr-8 ${
                        error
                            ? 'border-red-400 bg-red-50/20 text-red-900 focus:border-red-500 focus:ring-2 focus:ring-red-100'
                            : 'border-slate-300 bg-white text-slate-900 hover:border-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100'
                    } ${selectClassName}`}
                    {...props}
                >
                    {placeholder && (
                        <option value="" disabled>
                            {placeholder}
                        </option>
                    )}
                    {children ? children : (
                        options.map((opt) => {
                            const val = typeof opt === 'object' ? opt.value : opt;
                            const text = typeof opt === 'object' ? opt.label : opt;
                            return (
                                <option key={val} value={val}>
                                    {text}
                                </option>
                            );
                        })
                    )}
                </select>
                <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-slate-400">
                    <ChevronDown size={16} />
                </div>
            </div>
            {error && (
                <p className="text-[11px] text-red-600 font-medium">
                    {error}
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

export default Select;
