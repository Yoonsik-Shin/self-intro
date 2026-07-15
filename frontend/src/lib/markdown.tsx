import type { Components } from 'react-markdown';
import { MarkdownCode, type CodeLanguageChange } from './MarkdownCode';

const baseMarkdownComponents: Components = {
  h1: ({ children }) => <h1 className="mt-10 mb-5 text-3xl sm:text-4xl font-black text-slate-950 border-b border-slate-100 pb-3">{children}</h1>,
  h2: ({ children }) => <h2 className="mt-8 mb-4 text-2xl sm:text-3xl font-black text-slate-900 border-b border-slate-100 pb-2">{children}</h2>,
  h3: ({ children }) => <h3 className="mt-6 mb-3 text-xl sm:text-2xl font-bold text-slate-900">{children}</h3>,
  p: ({ children }) => <p className="mb-4 text-base sm:text-lg leading-relaxed text-slate-700">{children}</p>,
  ul: ({ children }) => <ul className="list-disc pl-6 my-4 space-y-2 text-base sm:text-lg leading-relaxed text-slate-700">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-6 my-4 space-y-2 text-base sm:text-lg leading-relaxed text-slate-700">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed text-slate-700">{children}</li>,
  strong: ({ children }) => <strong className="font-bold text-slate-950">{children}</strong>,
  blockquote: ({ children }) => <blockquote className="my-6 border-l-4 border-blue-500 bg-blue-50/30 px-5 py-3 text-slate-600 italic rounded-r-xl text-base sm:text-lg leading-relaxed">{children}</blockquote>,
  a: ({ children, href }) => <a href={href} className="font-semibold text-blue-600 hover:text-blue-800 underline decoration-2 transition" target="_blank" rel="noreferrer">{children}</a>,
  pre: ({ children }) => <>{children}</>,
};

export function createMarkdownComponents(onLanguageChange?: CodeLanguageChange): Components {
  return {
    ...baseMarkdownComponents,
    code: (props) => <MarkdownCode {...props} onLanguageChange={onLanguageChange} />,
  };
}

export const markdownComponents = createMarkdownComponents();

export const experienceMarkdownComponents: Components = {
  ...baseMarkdownComponents,
  p: ({ children }) => <p className="mb-2.5 text-[13.5px] sm:text-sm leading-relaxed text-slate-600">{children}</p>,
  ul: ({ children }) => <ul className="list-disc pl-5 my-2.5 space-y-1.5 text-[13.5px] sm:text-sm leading-relaxed text-slate-600">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5 my-2.5 space-y-1.5 text-[13.5px] sm:text-sm leading-relaxed text-slate-600">{children}</ol>,
  blockquote: ({ children }) => <blockquote className="my-3 border-l-4 border-slate-300 bg-slate-50/50 px-4 py-2 text-slate-500 italic rounded-r-lg text-[13.5px] sm:text-sm leading-relaxed">{children}</blockquote>,
};
