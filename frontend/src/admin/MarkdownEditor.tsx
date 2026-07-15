import { useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Bold, Code2, Eye, Heading2, ImagePlus, Italic, Link, List, ListOrdered, Loader2, Workflow } from 'lucide-react';
import { createMarkdownComponents } from '../lib/markdown';
import { imageApi } from '../lib/api';

type Props = {
  value: string;
  onChange: (value: string) => void;
  // Study의 본문 편집기에서만 켜는 기능 — 이 컴포넌트는 Experience의 summary/takeaway/
  // situation/actionDetail/outcome 편집에도 재사용되므로 기본값은 꺼짐.
  enableImageUpload?: boolean;
};

const IMAGE_ACCEPT_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

const tools = [
  { label: '제목', icon: Heading2, before: '## ', after: '', placeholder: '제목' },
  { label: '굵게', icon: Bold, before: '**', after: '**', placeholder: '강조할 내용' },
  { label: '기울임', icon: Italic, before: '_', after: '_', placeholder: '내용' },
  { label: '목록', icon: List, before: '- ', after: '', placeholder: '항목' },
  { label: '번호 목록', icon: ListOrdered, before: '1. ', after: '', placeholder: '항목' },
  { label: '코드', icon: Code2, before: '```\n', after: '\n```', placeholder: 'code' },
  { label: 'Mermaid', icon: Workflow, before: '```mermaid\n', after: '\n```', placeholder: 'graph TD\n  A[시작] --> B[완료]' },
  { label: '링크', icon: Link, before: '[', after: '](https://)', placeholder: '링크 이름' },
];

export function MarkdownEditor({ value, onChange, enableImageUpload }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const editorMarkdownComponents = useMemo(() => createMarkdownComponents(({ start, end }, language) => {
    const codeBlock = value.slice(start, end);
    const nextCodeBlock = codeBlock.replace(
      /^(`{3,}|~{3,})[^\r\n]*/,
      (_, fence: string) => `${fence}${language === 'text' ? '' : language}`,
    );
    if (nextCodeBlock !== codeBlock) {
      onChange(`${value.slice(0, start)}${nextCodeBlock}${value.slice(end)}`);
    }
  }), [onChange, value]);

  const insert = (before: string, after: string, placeholder: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const rawSelected = value.slice(start, end);
    const selected = rawSelected.trim() ? rawSelected : placeholder;
    const next = `${value.slice(0, start)}${before}${selected}${after}${value.slice(end)}`;
    onChange(next);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  };

  const insertAtCursor = (text: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const next = `${value.slice(0, start)}${text}${value.slice(end)}`;
    onChange(next);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + text.length, start + text.length);
    });
  };

  const handleImageSelected = async (file: File | undefined) => {
    if (!file) return;
    if (!IMAGE_ACCEPT_TYPES.includes(file.type)) {
      window.alert(`지원하지 않는 이미지 형식입니다: ${file.name}`);
      return;
    }
    setUploadingImage(true);
    try {
      const presigned = await imageApi.requestPresignedUpload('STUDY_MARKDOWN', file.name, file.type);
      await imageApi.uploadToPresignedUrl(presigned.uploadUrl, file);
      insertAtCursor(`![](${presigned.publicUrl})`);
    } catch {
      window.alert('이미지 업로드에 실패했습니다.');
    } finally {
      setUploadingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50 px-3 py-2">
        {tools.map(({ label, icon: Icon, before, after, placeholder }) => (
          <button
            key={label}
            type="button"
            title={label}
            onClick={() => insert(before, after, placeholder)}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition hover:bg-white hover:text-slate-900 hover:shadow-sm"
          >
            <Icon className="h-4 w-4" />
          </button>
        ))}
        {enableImageUpload && (
          <>
            <button
              type="button"
              title="이미지 삽입"
              disabled={uploadingImage}
              onClick={() => imageInputRef.current?.click()}
              className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition hover:bg-white hover:text-slate-900 hover:shadow-sm disabled:opacity-50"
            >
              {uploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            </button>
            <input
              ref={imageInputRef}
              type="file"
              accept={IMAGE_ACCEPT_TYPES.join(',')}
              className="hidden"
              onChange={(event) => handleImageSelected(event.target.files?.[0])}
            />
          </>
        )}
        <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-bold text-slate-400">
          <Eye className="h-3.5 w-3.5" /> 실시간 미리보기
        </span>
      </div>
      <div className="grid min-h-[420px] grid-cols-1 lg:grid-cols-2">
        <textarea
          ref={textareaRef}
          required
          value={value}
          onChange={(event) => onChange(event.target.value)}
          spellCheck={false}
          placeholder="# 학습 내용\n\nMarkdown으로 기록해 보세요."
          className="min-h-[420px] resize-y border-0 bg-slate-950 p-5 font-mono text-sm leading-7 text-slate-100 outline-none lg:border-r lg:border-slate-200"
        />
        <article className="min-h-[420px] space-y-4 overflow-auto p-5 text-sm text-slate-700">
          {value ? (
            <ReactMarkdown components={editorMarkdownComponents}>{value}</ReactMarkdown>
          ) : (
            <p className="text-slate-400">작성한 Markdown이 여기에 표시됩니다.</p>
          )}
        </article>
      </div>
    </div>
  );
}
