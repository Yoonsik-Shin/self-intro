import type { Components } from 'react-markdown';

export const markdownComponents: Components = {
  p: ({ children }) => <p className="leading-relaxed">{children}</p>,
  ul: ({ children }) => <ul className="list-disc pl-4 space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-4 space-y-1">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => <strong className="font-bold text-slate-800">{children}</strong>,
  code: ({ children }) => <code className="rounded bg-slate-100 px-1 py-0.5 text-[0.85em] font-mono">{children}</code>,
};
