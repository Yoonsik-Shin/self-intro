'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { imageApi, jobPostingApi } from '@/lib/api';
import type { JobPosting } from '@/lib/api/types';

type UploadedImage = { objectKey: string; url: string; contentType: string };

type ScreenshotIngestPanelProps = {
    onSuccess: (posting: JobPosting, detectedAdditionalPositionTitles: string[]) => void;
};

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;
// vision 호출 1회의 토큰/타임아웃 한도를 넘지 않도록 백엔드(MAX_INGEST_IMAGE_COUNT)와 상한을 맞춘다.
const MAX_IMAGE_COUNT = 6;

/**
 * URL 파싱이 불가능한 공고를 JD 스크린샷으로 등록한다. 업로드 로직은
 * ImageGalleryEditor와 동일(presigned URL 발급 → 직접 PUT)하되, 그건 "저장만" 하는
 * 갤러리 편집용이라 즉시 파싱 트리거가 없어 여기서 별도로 재구성했다. 업로드 즉시
 * 목록에 쌓이고, "등록하기"를 누르면 URL 자동수집(ingestUrl)과 동일하게 파싱과 동시에
 * job_posting이 바로 저장된다 — 검토는 저장 이후 상세 드로어에서 한다.
 */
export function ScreenshotIngestPanel({ onSuccess }: ScreenshotIngestPanelProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [images, setImages] = useState<UploadedImage[]>([]);
    const [uploading, setUploading] = useState(false);
    const [ingesting, setIngesting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isDropZoneOver, setIsDropZoneOver] = useState(false);
    const [sourceUrl, setSourceUrl] = useState('');

    const handleFiles = async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        setError(null);
        if (images.length + files.length > MAX_IMAGE_COUNT) {
            setError(`스크린샷은 최대 ${MAX_IMAGE_COUNT}장까지 등록할 수 있어요.`);
            return;
        }
        setUploading(true);
        try {
            const uploaded: UploadedImage[] = [];
            for (const file of Array.from(files)) {
                if (!ACCEPTED_TYPES.includes(file.type)) {
                    throw new Error(`지원하지 않는 이미지 형식입니다: ${file.name}`);
                }
                if (file.size > MAX_FILE_SIZE_BYTES) {
                    throw new Error(`파일이 너무 큽니다(최대 8MB): ${file.name}`);
                }
                const presigned = await imageApi.requestPresignedUpload(
                    'JOB_POSTING_SCREENSHOT',
                    file.name,
                    file.type
                );
                await imageApi.uploadToPresignedUrl(presigned.uploadUrl, file);
                uploaded.push({
                    objectKey: presigned.objectKey,
                    url: presigned.publicUrl,
                    contentType: file.type,
                });
            }
            setImages((prev) => [...prev, ...uploaded]);
        } catch (err) {
            setError(err instanceof Error ? err.message : '이미지 업로드에 실패했습니다.');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const remove = (index: number) => {
        setImages((prev) => prev.filter((_, i) => i !== index));
    };

    const submit = () => {
        if (images.length === 0) return;
        setError(null);
        setIngesting(true);
        jobPostingApi.ingestImagesStream(images, sourceUrl.trim() || null, (event) => {
            if (event.type === 'error') {
                setIngesting(false);
                setError(event.message);
                return;
            }
            setIngesting(false);
            setImages([]);
            onSuccess(event.response, event.detectedAdditionalPositionTitles);
        });
    };

    return (
        <div className="space-y-3">
            <div>
                <input
                    type="url"
                    value={sourceUrl}
                    onChange={(event) => setSourceUrl(event.target.value)}
                    disabled={ingesting}
                    placeholder="원본 공고 URL (선택) — 내용은 스크린샷에서만 뽑고, 이 URL은 '원본 보기' 링크로만 저장돼요"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:border-slate-400 focus:outline-none disabled:opacity-50"
                />
            </div>
            <div className="flex flex-wrap gap-3">
                {images.map((image, index) => (
                    <div
                        key={image.objectKey}
                        className="group relative h-24 w-24 overflow-hidden rounded-xl border border-slate-200"
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={image.url} alt="" className="h-full w-full object-cover" />
                        <div className="absolute inset-0 flex justify-end bg-black/0 p-1 opacity-0 transition group-hover:bg-black/40 group-hover:opacity-100 [@media(hover:none)]:bg-black/40 [@media(hover:none)]:opacity-100">
                            <button
                                type="button"
                                onClick={() => remove(index)}
                                disabled={ingesting}
                                className="h-fit rounded-full bg-white/90 p-1 text-red-500"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </div>
                    </div>
                ))}
                {images.length < MAX_IMAGE_COUNT && (
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading || ingesting}
                        onDragOver={(event) => {
                            event.preventDefault();
                            if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
                            setIsDropZoneOver(true);
                        }}
                        onDragLeave={(event) => {
                            event.preventDefault();
                            setIsDropZoneOver(false);
                        }}
                        onDrop={(event) => {
                            event.preventDefault();
                            setIsDropZoneOver(false);
                            if (uploading || ingesting) return;
                            handleFiles(event.dataTransfer?.files ?? null);
                        }}
                        className={`flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed text-slate-400 transition hover:border-slate-400 hover:text-slate-600 disabled:opacity-50 ${
                            isDropZoneOver
                                ? 'border-blue-500 bg-blue-50 scale-[1.03]'
                                : 'border-slate-200'
                        }`}
                    >
                        {uploading ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            <ImagePlus className="h-5 w-5" />
                        )}
                        <span className="text-[10px] font-bold">
                            {uploading ? '업로드 중' : '스크린샷 추가'}
                        </span>
                        <span className="text-[9px] text-slate-300">또는 드래그해서 놓기</span>
                    </button>
                )}
            </div>
            <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_TYPES.join(',')}
                multiple
                className="hidden"
                onChange={(event) => handleFiles(event.target.files)}
            />
            {error && <p className="text-xs font-semibold text-red-500">{error}</p>}
            <button
                type="button"
                onClick={submit}
                disabled={images.length === 0 || uploading || ingesting}
                className="w-full rounded-lg bg-slate-900 py-2 text-sm font-bold text-white transition disabled:opacity-40"
            >
                {ingesting ? (
                    <span className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" /> 스크린샷 분석 중 (최대 2분)
                    </span>
                ) : (
                    '스크린샷으로 등록하기'
                )}
            </button>
        </div>
    );
}
