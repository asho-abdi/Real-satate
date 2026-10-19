import { useEffect, useState } from 'react';
import { MdChevronLeft, MdChevronRight, MdClose } from 'react-icons/md';
import { mediaUrl } from '../../services/publicApi.js';
import { cn } from '../../utils/format.js';

export default function PropertyGallery({ images = [], alt = 'Property' }) {
  const list = images.filter((image) => image?.url);
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const current = list[active] || list[0];

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
      if (event.key === 'ArrowRight') setActive((index) => (index + 1) % list.length);
      if (event.key === 'ArrowLeft') setActive((index) => (index - 1 + list.length) % list.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, list.length]);

  if (!current) {
    return (
      <div className="flex aspect-[16/10] items-center justify-center rounded-[1.75rem] bg-[var(--primary-light)] text-sm text-[var(--primary)]">
        No photos uploaded yet
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative block w-full overflow-hidden rounded-[1.75rem] bg-[var(--primary-light)]"
      >
        <img src={mediaUrl(current.url)} alt={alt} className="aspect-[16/10] w-full object-cover" />
        <span className="absolute bottom-4 left-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-[var(--text-primary)]">
          View photos
        </span>
      </button>
      {list.length > 1 ? (
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
          {list.map((image, index) => (
            <button
              key={image.id || image.url}
              type="button"
              onClick={() => {
                setActive(index);
                setOpen(true);
              }}
              className={cn(
                'overflow-hidden rounded-2xl border border-[var(--border)]',
                index === active && 'ring-2 ring-[var(--primary)]',
              )}
            >
              <img src={mediaUrl(image.url)} alt="" className="aspect-[4/3] w-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#120f24]/88 p-4" onClick={() => setOpen(false)}>
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white"
            onClick={() => setOpen(false)}
            aria-label="Close gallery"
          >
            <MdClose className="h-6 w-6" />
          </button>
          {list.length > 1 ? (
            <>
              <button
                type="button"
                className="absolute left-3 rounded-full bg-white/15 p-2 text-white md:left-6"
                aria-label="Previous photo"
                onClick={(event) => {
                  event.stopPropagation();
                  setActive((index) => (index - 1 + list.length) % list.length);
                }}
              >
                <MdChevronLeft className="h-7 w-7" />
              </button>
              <button
                type="button"
                className="absolute right-3 rounded-full bg-white/15 p-2 text-white md:right-6"
                aria-label="Next photo"
                onClick={(event) => {
                  event.stopPropagation();
                  setActive((index) => (index + 1) % list.length);
                }}
              >
                <MdChevronRight className="h-7 w-7" />
              </button>
            </>
          ) : null}
          <img
            src={mediaUrl(list[active]?.url)}
            alt={alt}
            className="max-h-[86vh] max-w-[92vw] rounded-2xl object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      ) : null}
    </div>
  );
}
