import { useEffect, useId, useRef, useState } from 'react';
import { MdCloudUpload, MdClose } from 'react-icons/md';

/**
 * Multi-file image uploader with preview thumbnails.
 * onChange receives { files: File[], previews: string[] }.
 */
export default function ImageUploader({ value = [], onChange, label = 'Property images' }) {
  const inputId = useId();
  const inputRef = useRef(null);
  const [previews, setPreviews] = useState([]);
  const objectUrlsRef = useRef([]);

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  function emit(files) {
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    const nextPreviews = files.map((file) => URL.createObjectURL(file));
    objectUrlsRef.current = nextPreviews;
    setPreviews(nextPreviews);
    onChange?.({ files, previews: nextPreviews });
  }

  function handleSelect(event) {
    const selected = Array.from(event.target.files || []);
    if (!selected.length) return;
    const existing = value instanceof FileList ? Array.from(value) : Array.isArray(value) ? value : [];
    const files = [...existing.filter((f) => f instanceof File), ...selected];
    emit(files);
    event.target.value = '';
  }

  function removeAt(index) {
    const existing = value instanceof FileList ? Array.from(value) : Array.isArray(value) ? value : [];
    const files = existing.filter((_, i) => i !== index);
    emit(files);
  }

  const display = previews.length ? previews : [];

  return (
    <div className="space-y-3">
      {label ? <p className="text-sm font-medium text-[var(--text)]">{label}</p> : null}

      <label
        htmlFor={inputId}
        className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-2)] px-4 py-8 text-center transition hover:border-brand-500 hover:bg-[var(--accent-soft)]/40"
      >
        <MdCloudUpload className="text-3xl text-[var(--accent)]" />
        <span className="text-sm font-medium text-[var(--text)]">Click to upload images</span>
        <span className="text-xs text-[var(--text-muted)]">PNG, JPG up to several files</span>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={handleSelect}
        />
      </label>

      {display.length ? (
        <div className="flex flex-wrap gap-2">
          {display.map((src, index) => (
            <div key={src} className="relative h-20 w-20 overflow-hidden rounded-xl border border-[var(--border)]">
              <img src={src} alt={`Upload ${index + 1}`} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeAt(index)}
                className="absolute top-1 right-1 rounded-full bg-slate-950/70 p-0.5 text-white hover:bg-rose-600"
                aria-label="Remove image"
              >
                <MdClose className="text-sm" />
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
