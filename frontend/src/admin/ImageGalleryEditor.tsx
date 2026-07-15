import { useRef, useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { imageApi, type GalleryImage, type ImageScope } from '../lib/api';

type ImageGalleryEditorProps = {
  scope: ImageScope;
  images: GalleryImage[];
  onChange: (images: GalleryImage[]) => void;
};

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;

export function ImageGalleryEditor({ scope, images, onChange }: ImageGalleryEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    setUploading(true);
    try {
      const uploaded: GalleryImage[] = [];
      for (const file of Array.from(files)) {
        if (!ACCEPTED_TYPES.includes(file.type)) {
          throw new Error(`지원하지 않는 이미지 형식입니다: ${file.name}`);
        }
        if (file.size > MAX_FILE_SIZE_BYTES) {
          throw new Error(`파일이 너무 큽니다(최대 8MB): ${file.name}`);
        }
        const presigned = await imageApi.requestPresignedUpload(scope, file.name, file.type);
        await imageApi.uploadToPresignedUrl(presigned.uploadUrl, file);
        uploaded.push({
          objectKey: presigned.objectKey,
          url: presigned.publicUrl,
          displayOrder: images.length + uploaded.length,
        });
      }
      onChange([...images, ...uploaded]);
    } catch (err) {
      setError(err instanceof Error ? err.message : '이미지 업로드에 실패했습니다.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next.map((image, i) => ({ ...image, displayOrder: i })));
  };

  const remove = (index: number) => {
    onChange(images.filter((_, i) => i !== index).map((image, i) => ({ ...image, displayOrder: i })));
  };

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {images.map((image, index) => (
          <div key={image.objectKey} className="group relative h-24 w-24 overflow-hidden rounded-xl border border-slate-200">
            <img src={image.url} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 flex flex-col justify-between bg-black/0 p-1 opacity-0 transition group-hover:bg-black/40 group-hover:opacity-100">
              <div className="flex w-full justify-end">
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="rounded-full bg-white/90 p-1 text-red-500"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              <div className="flex w-full items-center justify-center gap-1">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  className="rounded-full bg-white/90 px-1.5 py-0.5 text-[10px] font-bold text-slate-700 disabled:opacity-30"
                >
                  ◀
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === images.length - 1}
                  className="rounded-full bg-white/90 px-1.5 py-0.5 text-[10px] font-bold text-slate-700 disabled:opacity-30"
                >
                  ▶
                </button>
              </div>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 transition hover:border-slate-400 hover:text-slate-600 disabled:opacity-50"
        >
          {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
          <span className="text-[10px] font-bold">{uploading ? '업로드 중' : '이미지 추가'}</span>
        </button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        multiple
        className="hidden"
        onChange={(event) => handleFiles(event.target.files)}
      />
      {error && <p className="mt-2 text-xs font-semibold text-red-500">{error}</p>}
    </div>
  );
}
