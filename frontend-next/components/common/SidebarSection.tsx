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
    onExpandSidebar?: () => void;
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
    onExpandSidebar,
    children,
    className = '',
}: SidebarSectionProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className={`shrink-0 ${className}`}>
            {/* 펼침 모드 (isNavCollapsed === false) 헤더 */}
            <div
                className={`hidden ${
                    isNavCollapsed
                        ? ''
                        : 'min-[900px]:flex min-[900px]:items-center min-[900px]:justify-between gap-2 overflow-hidden'
                }`}
            >
                <div
                    onClick={() => setIsOpen((prev) => !prev)}
                    className="flex-1 min-w-0 flex items-center justify-between cursor-pointer select-none group py-0.5"
                    title={isOpen ? `${title} 접기` : `${title} 펼치기`}
                >
                    <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-black tracking-wider text-slate-700 flex items-center gap-1.5 whitespace-nowrap group-hover:text-blue-600 transition-colors">
                            <ChevronDown
                                className={`h-3.5 w-3.5 shrink-0 ${iconColor} transition-transform duration-200 ${
                                    isOpen ? '' : '-rotate-90'
                                }`}
                            />
                            {Icon && <Icon className={`h-3.5 w-3.5 shrink-0 ${iconColor}`} />}
                            <span className="truncate">{title}</span>
                            {badge !== undefined && (
                                <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-extrabold text-blue-600">
                                    {badge}
                                </span>
                            )}
                        </h3>
                        {description && (
                            <p className="mt-0.5 text-xs leading-normal text-slate-400 pl-5 truncate">
                                {description}
                            </p>
                        )}
                    </div>
                </div>

                {extraAction && (
                    <div className="shrink-0 whitespace-nowrap pl-1">{extraAction}</div>
                )}
            </div>

            {/* 접힘 모드 (isNavCollapsed === true) 미니 아이콘 버튼 */}
            {isNavCollapsed && Icon && (
                <div className="hidden min-[900px]:flex flex-col items-center justify-center my-1">
                    <button
                        type="button"
                        onClick={onExpandSidebar}
                        className="group relative grid h-9 w-9 place-items-center rounded-xl border border-slate-200/80 bg-slate-50 text-slate-600 transition-all hover:scale-105 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 shadow-2xs"
                        title={`${title}${badge !== undefined ? ` (${badge})` : ''} - 클릭하여 펼치기`}
                        aria-label={`${title} 펼치기`}
                    >
                        <Icon
                            className={`h-4 w-4 ${iconColor} group-hover:scale-110 transition-transform`}
                        />
                        {badge !== undefined && (
                            <span className="absolute -right-1 -top-1 grid min-w-4 h-4 place-items-center rounded-full bg-blue-600 px-1 font-mono text-[9px] font-extrabold text-white shadow-2xs">
                                {badge}
                            </span>
                        )}
                    </button>
                </div>
            )}

            {/* 접힘 모드가 아닐 때의 컨텐츠 영역 */}
            <div
                className={`hidden grid transition-[grid-template-rows,opacity,margin] duration-300 ease-in-out ${
                    isOpen
                        ? 'grid-rows-[1fr] opacity-100 mt-2'
                        : 'grid-rows-[0fr] opacity-0 mt-0 pointer-events-none'
                } ${isNavCollapsed ? '' : 'min-[900px]:grid'}`}
            >
                <div className="overflow-hidden space-y-1.5 min-h-0">{children}</div>
            </div>
        </div>
    );
}
