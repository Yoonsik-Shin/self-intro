'use client';

import { Loader2 } from 'lucide-react';

const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-500 disabled:bg-blue-300',
    secondary:
        'bg-slate-100 text-slate-900 hover:bg-slate-200 disabled:bg-slate-50 disabled:text-slate-400',
    ghost: 'bg-transparent text-slate-700 hover:bg-slate-100 disabled:text-slate-300',
    danger: 'bg-red-600 text-white hover:bg-red-500 disabled:bg-red-300',
} as const;

const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
} as const;

type ButtonProps = {
    variant?: keyof typeof variantClasses;
    size?: keyof typeof sizeClasses;
    loading?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled,
    className = '',
    children,
    ...rest
}: ButtonProps) {
    return (
        <button
            className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
            disabled={disabled || loading}
            {...rest}
        >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {children}
        </button>
    );
}
