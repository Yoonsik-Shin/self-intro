'use client';

import { useEffect, useRef } from 'react';
import { zIndex, type ModalLayer } from './z-index';

const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    full: 'max-w-full h-full',
} as const;

type ModalProps = {
    open: boolean;
    onClose: () => void;
    layer?: ModalLayer;
    size?: keyof typeof sizeClasses;
    closeOnBackdropClick?: boolean;
    hideOnPrint?: boolean;
    children: React.ReactNode;
};

export function Modal({
    open,
    onClose,
    layer = 'base',
    size = 'md',
    closeOnBackdropClick = true,
    hideOnPrint = true,
    children,
}: ModalProps) {
    const dialogRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const handleKeydown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeydown);
        dialogRef.current?.focus();
        return () => window.removeEventListener('keydown', handleKeydown);
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div
            className={`fixed inset-0 flex items-center justify-center bg-slate-900/60 p-4 ${hideOnPrint ? 'print:hidden' : ''}`}
            style={{ zIndex: zIndex[layer] }}
            onClick={closeOnBackdropClick ? onClose : undefined}
        >
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                tabIndex={-1}
                className={`w-full ${sizeClasses[size]} rounded-2xl bg-white shadow-xl outline-none`}
                onClick={(event) => event.stopPropagation()}
            >
                {children}
            </div>
        </div>
    );
}
