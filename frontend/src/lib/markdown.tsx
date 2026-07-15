import type { Components } from 'react-markdown';
import { MarkdownCode, type CodeLanguageChange } from './MarkdownCode';

const baseMarkdownComponents: Components = {
  h1: ({ children }) => <h1 className="mt-8 mb-4 text-3xl font-black text-slate-950">{children}</h1>,
  h2: ({ children }) => <h2 className="mt-7 mb-3 text-2xl font-black text-slate-900">{children}</h2>,
  h3: ({ children }) => <h3 className="mt-6 mb-2 text-xl font-bold text-slate-900">{children}</h3>,
  p: ({ children }) => <p className="leading-relaxed">{children}</p>,
  ul: ({ children }) => <ul className="list-disc pl-4 space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-4 space-y-1">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => <strong className="font-bold text-slate-800">{children}</strong>,
  blockquote: ({ children }) => <blockquote className="border-l-4 border-slate-300 bg-slate-50 px-4 py-2 text-slate-600">{children}</blockquote>,
  a: ({ children, href }) => <a href={href} className="font-semibold text-blue-700 underline" target="_blank" rel="noreferrer">{children}</a>,
  pre: ({ children }) => <>{children}</>,
};

export function createMarkdownComponents(onLanguageChange?: CodeLanguageChange): Components {
  return {
    ...baseMarkdownComponents,
    code: (props) => <MarkdownCode {...props} onLanguageChange={onLanguageChange} />,
  };
}

export const markdownComponents = createMarkdownComponents();
