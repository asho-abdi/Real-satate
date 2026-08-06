import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MdClose, MdChevronLeft, MdChevronRight } from 'react-icons/md';
import { cn } from '../../utils/format.js';

export default function PropertyGallery({ images = [], title = 'Property' }) {
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  if (!images.length) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-2)] text-sm text-[var(--text-muted)]">
        No images available
      </div>
    );
  }

  const safeIndex = Math.min(active, images.length - 1);
  const current = images[safeIndex];

  function go(delta) {
    setActive((prev) => (prev + delta + images.length) % images.length);
  }

  return (
    <>
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setLightbox(true)}
          className="group relative block w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]"
        >
          <img
            src={current}
            alt={`${title} — photo ${safeIndex + 1}`}
            className="aspect-[16/10] w-full object-cover transition duration-300 group-hover:scale-[1.02]"
          />
          <span className="absolute bottom-3 right-3 rounded-lg bg-slate-950/60 px-2.5 py-1 text-xs text-white">
            {safeIndex + 1} / {images.length}
          </span>
        </button>

        {images.length > 1 ? (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {images.map((src, index) => (
              <button
                key={src}
                type="button"
                onClick={() => setActive(index)}
                className={cn(
                  'h-16 w-20 shrink-0 overflow-hidden rounded-xl border-2 transition',
                  index === safeIndex
                    ? 'border-brand-600'
                    : 'border-transparent opacity-70 hover:opacity-100',
                )}
              >
                <img src={src} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <AnimatePresence>
        {lightbox ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.button
              type="button"
              aria-label="Close lightbox"
              className="absolute inset-0 bg-slate-950/80"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setLightbox(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="relative z-10 flex max-h-[90vh] w-full max-w-5xl flex-col items-center"
            >
              <img
                src={current}
                alt={`${title} — enlarged`}
                className="max-h-[80vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl"
              />
              <div className="mt-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => go(-1)}
                  className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
                  aria-label="Previous image"
                >
                  <MdChevronLeft className="text-2xl" />
                </button>
                <button
                  type="button"
                  onClick={() => setLightbox(false)}
                  className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
                  aria-label="Close"
                >
                  <MdClose className="text-2xl" />
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
                  aria-label="Next image"
                >
                  <MdChevronRight className="text-2xl" />
                </button>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
