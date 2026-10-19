import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { MdClose, MdCloudUpload, MdDelete, MdStar } from 'react-icons/md';
import Button from './Button.jsx';
import { rentalApi } from '../../services/rentalApi.js';
import api from '../../services/api.js';
import { cn } from '../../utils/format.js';

async function blobUrlFor(urlPath) {
  const path = String(urlPath || '').replace(/^\/api\/v1/, '');
  const res = await api.get(path.startsWith('/') ? path : `/${path}`, { responseType: 'blob' });
  return URL.createObjectURL(res.data);
}

function AuthImage({ url, alt, className, onClick }) {
  const [src, setSrc] = useState('');

  useEffect(() => {
    let alive = true;
    let objectUrl = '';
    if (!url) return undefined;
    (async () => {
      try {
        objectUrl = await blobUrlFor(url);
        if (alive) setSrc(objectUrl);
      } catch {
        if (alive) setSrc('');
      }
    })();
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);

  if (!src) {
    return (
      <div className={cn('flex items-center justify-center bg-[var(--surface-2)] text-xs text-[var(--text-muted)]', className)}>
        …
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt || ''}
      className={className}
      onClick={onClick}
    />
  );
}

/**
 * Unit photo gallery.
 * - With unitId: upload / cover / delete against the API.
 * - Without unitId: collect pending Files via onPendingChange for upload after create.
 * - readOnly: click thumbnails to enlarge (customer view).
 */
export default function UnitImageGallery({
  unitId,
  images = [],
  onChange,
  readOnly = false,
  pendingFiles = [],
  onPendingChange,
}) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const list = images || [];
  const cover = list.find((i) => i.isPrimary) || list[0];
  const pending = Array.isArray(pendingFiles) ? pendingFiles : [];
  const pendingKey = pending.map((f) => `${f.name}:${f.size}:${f.lastModified}`).join('|');
  const [pendingPreviews, setPendingPreviews] = useState([]);

  useEffect(() => {
    const urls = pending.map((f) => URL.createObjectURL(f));
    setPendingPreviews(urls);
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pendingKey tracks file identity
  }, [pendingKey]);

  const upload = async (files) => {
    if (!files?.length) return;
    if (!unitId) {
      const next = [...pending, ...Array.from(files)];
      onPendingChange?.(next);
      return;
    }
    setUploading(true);
    try {
      await rentalApi.uploadUnitImages(unitId, files);
      toast.success('Images uploaded');
      onChange?.();
    } catch (err) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const remove = async (imageId) => {
    try {
      await rentalApi.deleteUnitImage(unitId, imageId);
      toast.success('Image removed');
      onChange?.();
    } catch (err) {
      toast.error(err.message || 'Could not delete image');
    }
  };

  const setPrimary = async (imageId) => {
    try {
      await rentalApi.setPrimaryUnitImage(unitId, imageId);
      toast.success('Cover image updated');
      onChange?.();
    } catch (err) {
      toast.error(err.message || 'Could not set cover');
    }
  };

  const removePending = (index) => {
    onPendingChange?.(pending.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      {cover ? (
        <button
          type="button"
          className="relative block w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]"
          onClick={() => setLightbox(cover)}
        >
          <AuthImage
            url={cover.url}
            alt={cover.originalName || 'Unit'}
            className="h-72 w-full object-cover md:h-[28rem]"
          />
          <span className="absolute bottom-2 left-2 rounded-md bg-black/55 px-2 py-1 text-[11px] font-medium text-white">
            Cover · click to enlarge
          </span>
        </button>
      ) : pendingPreviews[0] ? (
        <div className="relative overflow-hidden rounded-2xl border border-[var(--border)]">
          <img src={pendingPreviews[0]} alt="Pending cover" className="h-48 w-full object-cover" />
          <span className="absolute bottom-2 left-2 rounded-md bg-black/55 px-2 py-1 text-[11px] font-medium text-white">
            Preview (saves with unit)
          </span>
        </div>
      ) : (
        <div className="flex h-36 flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-[var(--border)] text-sm text-[var(--text-muted)]">
          <MdCloudUpload className="h-7 w-7 opacity-60" />
          <span>No photos yet — add images so customers can see the room</span>
        </div>
      )}

      {list.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {list.map((img) => (
            <div key={img.id} className="group relative">
              <button
                type="button"
                className={cn(
                  'h-20 w-28 overflow-hidden rounded-2xl border border-[var(--border)]',
                  img.isPrimary && 'ring-2 ring-brand-500',
                )}
                onClick={() => setLightbox(img)}
                title="Click to enlarge"
              >
                <AuthImage url={img.url} className="h-full w-full object-cover" />
              </button>
              {!readOnly && unitId ? (
                <div className="absolute inset-x-0 bottom-0 flex justify-center gap-0.5 opacity-0 transition group-hover:opacity-100">
                  <button
                    type="button"
                    title="Set cover"
                    className="rounded bg-black/70 p-0.5 text-white"
                    onClick={() => setPrimary(img.id)}
                  >
                    <MdStar className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    title="Delete"
                    className="rounded bg-black/70 p-0.5 text-white"
                    onClick={() => remove(img.id)}
                  >
                    <MdDelete className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {pendingPreviews.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {pendingPreviews.map((url, index) => (
            <div key={url} className="relative h-16 w-16 overflow-hidden rounded-xl border border-[var(--border)]">
              <img src={url} alt="" className="h-full w-full object-cover" />
              {!readOnly ? (
                <button
                  type="button"
                  className="absolute right-0.5 top-0.5 rounded bg-black/70 p-0.5 text-white"
                  onClick={() => removePending(index)}
                  aria-label="Remove"
                >
                  <MdClose className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {!readOnly ? (
        <div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              upload(e.target.files);
              e.target.value = '';
            }}
          />
          <Button
            variant="secondary"
            className="h-10 px-4 text-sm"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? 'Uploading…' : unitId ? 'Add photos' : 'Choose photos'}
          </Button>
          {!unitId ? (
            <p className="mt-1.5 text-xs text-[var(--text-muted)]">
              Photos are saved when you click Save Unit.
            </p>
          ) : null}
        </div>
      ) : null}

      {lightbox ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white"
            onClick={() => setLightbox(null)}
            aria-label="Close"
          >
            <MdClose className="h-6 w-6" />
          </button>
          {list.length > 1 ? (
            <button
              type="button"
              className="absolute left-4 rounded-full bg-white/15 p-2 text-white"
              aria-label="Previous photo"
              onClick={(event) => {
                event.stopPropagation();
                const index = list.findIndex((img) => img.id === lightbox.id);
                setLightbox(list[(index - 1 + list.length) % list.length]);
              }}
            >
              ‹
            </button>
          ) : null}
          {list.length > 1 ? (
            <button
              type="button"
              className="absolute right-16 rounded-full bg-white/15 px-3 py-2 text-white"
              aria-label="Next photo"
              onClick={(event) => {
                event.stopPropagation();
                const index = list.findIndex((img) => img.id === lightbox.id);
                setLightbox(list[(index + 1) % list.length]);
              }}
            >
              ›
            </button>
          ) : null}
          <div className="max-h-[85vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <AuthImage
              url={lightbox.url}
              alt={lightbox.originalName || 'Preview'}
              className="max-h-[85vh] max-w-[90vw] rounded-2xl object-contain"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
