'use client';

import { useState, type ReactNode } from 'react';
import { ChevronDown, type LucideIcon } from 'lucide-react';

type SidebarSectionProps = {
    title: string;
    icon?: LucideIcon;
    iconColor?: string;
    description?: string;
    badge?: string | number;
    extraAction?: ReactNode;
    defaultOpen?: boolean;
    isNavCollapsed?: boolean;
    children: ReactNode;
    className?: string;
};

export function SidebarSection({
    title,
    icon: Icon,
    iconColor = 'text-blue-600',
    description,
    badge,
    extraAction,
    defaultOpen = true,
    isNavCollapsed = false,
    children,
    className = '',
}: SidebarSectionProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className={`shrink-0 ${className}`}>
            <div
                className={`hidden ${
                    isNavCollapsed
                        ? ''
                        : 'min-[900px]:flex min-[900px]:items-center min-[900px]:justify-between'
                }`}
            >
                <div
                    onClick={() => setIsOpen((prev) => !prev)}
                    className="flex-1 flex items-center justify-between cursor-pointer select-none group py-0.5"
                    title={isOpen ? `${title} 접기` : `${title} 펼치기`}
                >
                    <div>
                        <h3 className="text-sm font-black tracking-wider text-slate-700 flex items-center gap-1.5 group-hover:text-blue-600 transition-colors">
                            <ChevronDown
                                className={`h-3.5 w-3.5 ${iconColor} transition-transform duration-200 ${
                                    isOpen ? '' : '-rotate-90'
                                }`}
                            />
                            {Icon && <Icon className={`h-3.5 w-3.5 ${iconColor}`} />}
                            <span>{title}</span>
                            {badge !== undefined && (
                                <span className="ml-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-extrabold text-blue-600">
                                    {badge}
                                </span>
                            )}
                        </h3>
                        {description && (
                            <p className="mt-0.5 text-xs leading-normal text-slate-400 pl-5">
                                {description}
                            </p>
                        )}
                    </div>
                </div>

                {extraAction && <div className="shrink-0 pl-2">{extraAction}</div>}
            </div>

            {isOpen && (
                <div
                    className={`hidden mt-2 space-y-1.5 ${isNavCollapsed ? '' : 'min-[900px]:block'}`}
                >
                    {children}
                </div>
            )}
        </div>
    );
}
