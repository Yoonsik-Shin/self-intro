'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, GripVertical, ListChecks, Lock } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type PrintPreviewNavSection = {
  id: string;
  label: string;
  icon: LucideIcon;
};

type PrintPreviewNavItemGroup = {
  sectionId: string;
  items: { id: string; label: string }[];
};

type PrintPreviewNavProps = {
  sections: PrintPreviewNavSection[];
  excludedIds: string[];
  itemGroups: PrintPreviewNavItemGroup[];
  lockedSectionIds: string[];
  open: boolean;
  onRequestToggle: () => void;
  onToggle: (id: string) => void;
  onReorder: (draggedId: string, targetId: string) => void;
  onNavigate: (id: string) => void;
  onToggleAll?: () => void;
  excludedCount?: number;
};

function ToggleSwitch({ on, onClick, size = 'md' }: { on: boolean; onClick: () => void; size?: 'sm' | 'md' }) {
  const track = size === 'sm' ? 'h-4 w-7' : 'h-5 w-9';
  const knob = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  const knobOn = size === 'sm' ? 'translate-x-3' : 'translate-x-4';
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-pressed={on}
      className={`relative shrink-0 rounded-full transition-colors ${track} ${on ? 'bg-blue-500' : 'bg-slate-700'}`}
    >
      <span className={`absolute top-0.5 left-0.5 rounded-full bg-white transition-transform ${knob} ${on ? knobOn : 'translate-x-0'}`} />
    </button>
  );
}

export function PrintPreviewNav({ sections, excludedIds, itemGroups, lockedSectionIds, open, onRequestToggle, onToggle, onReorder, onNavigate, onToggleAll, excludedCount = 0 }: PrintPreviewNavProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [collapsedIds, setCollapsedIds] = useState<string[]>(() => itemGroups.map((g) => g.sectionId));

  const itemsBySection = new Map(itemGroups.map((g) => [g.sectionId, g.items]));

  const toggleCollapsed = (id: string) => {
    setCollapsedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  if (!open) {
    return (
      <div className="h-full w-full bg-slate-900 flex flex-col items-center py-3 text-slate-100 select-none overflow-hidden">
        <button
          type="button"
          onClick={onRequestToggle}
          className="mb-4 grid h-9 w-9 place-items-center rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition shadow-sm shrink-0"
          title="구성 관리 펼치기"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="w-8 border-b border-slate-800 mb-3 shrink-0" />

        <div className="flex-1 w-full overflow-y-auto px-1.5 space-y-3 flex flex-col items-center">
          {sections.map((sec) => {
            const excluded = excludedIds.includes(sec.id);
            const Icon = sec.icon;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => onNavigate(sec.id)}
                title={`${sec.label}${excluded ? ' (제외됨)' : ''}`}
                className={`grid h-9 w-9 place-items-center rounded-xl border transition ${
                  excluded ? 'border-slate-800/80 bg-slate-950/40 text-slate-600' : 'border-slate-700/60 bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-slate-900 flex flex-col text-slate-100 select-none overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-800 px-3.5 py-3 bg-slate-950/60 shrink-0 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <ListChecks className="h-4 w-4 shrink-0 text-blue-400" />
          <div className="min-w-0">
            <p className="text-xs font-black text-white truncate">구성 관리</p>
            <p className="text-[10px] font-semibold text-slate-400 truncate">드래그 순서 · 포함 토글</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {onToggleAll && (
            <button
              type="button"
              onClick={onToggleAll}
              className="rounded bg-slate-800 border border-slate-700 hover:border-slate-500 hover:bg-slate-700 hover:text-white px-2 py-1 text-[10px] font-black text-slate-300 transition"
            >
              {excludedCount > 0 ? '모두 포함' : '모두 제외'}
            </button>
          )}
          <button
            type="button"
            onClick={onRequestToggle}
            className="shrink-0 rounded-lg border border-slate-700 bg-slate-800 p-1 text-slate-300 hover:bg-slate-700 hover:text-white transition"
            title="사이드바 접기"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
        {sections.map((sec) => {
          const excluded = excludedIds.includes(sec.id);
          const isLocked = lockedSectionIds.includes(sec.id);
          const items = itemsBySection.get(sec.id) || [];
          const hasItems = items.length > 0;
          const isCollapsed = collapsedIds.includes(sec.id);
          const isDraggingThis = draggedId === sec.id;
          const isOverThis = dragOverId === sec.id;

          return (
            <div
              key={sec.id}
              draggable={!isLocked}
              onDragStart={(e) => {
                if (isLocked) return;
                e.dataTransfer.setData('text/plain', sec.id);
                setDraggedId(sec.id);
              }}
              onDragEnd={() => {
                setDraggedId(null);
                setDragOverId(null);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                if (draggedId && draggedId !== sec.id) setDragOverId(sec.id);
              }}
              onDragLeave={() => {
                if (dragOverId === sec.id) setDragOverId(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                const fromId = e.dataTransfer.getData('text/plain') || draggedId;
                if (fromId && fromId !== sec.id) onReorder(fromId, sec.id);
                setDraggedId(null);
                setDragOverId(null);
              }}
              className={`group rounded-xl border transition ${
                excluded ? 'border-slate-800/80 bg-slate-950/40 opacity-60' : 'border-slate-800 bg-slate-800/60 hover:border-slate-700'
              } ${isDraggingThis ? 'opacity-30' : ''} ${isOverThis ? 'border-blue-500 ring-2 ring-blue-500/20' : ''}`}
            >
              <div onClick={() => onNavigate(sec.id)} className="flex items-center gap-1.5 px-2.5 py-2 cursor-pointer">
                {!isLocked && <GripVertical className="h-3.5 w-3.5 shrink-0 text-slate-500 group-hover:text-slate-300 cursor-grab active:cursor-grabbing" />}
                <sec.icon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span className={`flex-1 truncate text-xs font-bold ${excluded ? 'text-slate-400 line-through' : 'text-white'}`}>{sec.label}</span>
                {hasItems && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleCollapsed(sec.id);
                    }}
                    className="shrink-0 p-1 text-slate-400 hover:text-white"
                    title={isCollapsed ? '하위 항목 펼치기' : '하위 항목 접기'}
                  >
                    {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>
                )}
                {isLocked ? (
                  <span title="고정 섹션">
                    <Lock className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                  </span>
                ) : (
                  <ToggleSwitch on={!excluded} onClick={() => onToggle(sec.id)} />
                )}
              </div>

              {hasItems && !isCollapsed && (
                <div className="border-t border-slate-800/80 px-2 py-1 space-y-1 bg-slate-950/30">
                  {items.map((it) => {
                    const itemExcluded = excludedIds.includes(it.id);
                    return (
                      <div key={it.id} onClick={() => onNavigate(it.id)} className="flex items-center justify-between gap-1.5 rounded-lg px-2 py-1 hover:bg-slate-800/60 cursor-pointer text-[11px]">
                        <span className={`truncate ${itemExcluded ? 'text-slate-500 line-through' : 'text-slate-300'}`}>{it.label}</span>
                        <ToggleSwitch size="sm" on={!itemExcluded} onClick={() => onToggle(it.id)} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
