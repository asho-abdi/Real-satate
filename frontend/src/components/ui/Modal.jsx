import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MdClose } from 'react-icons/md';
import { cn } from '../../utils/format.js';

const widths = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-xl',
  lg: 'sm:max-w-3xl',
  xl: 'sm:max-w-5xl',
  full: 'sm:max-w-[min(1200px,95vw)]',
};

export default function Modal({ open, onClose, title, description, children, footer, size = 'md', icon }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6">
          <motion.button
            type="button"
            aria-label="Close dialog"
            tabIndex={-1}
            className="absolute inset-0 cursor-default bg-[rgba(0,17,31,0.55)] backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={typeof title === 'string' ? title : undefined}
            initial={{ opacity: 0, y: 28, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.985 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            className={cn(
              'relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl sm:max-h-[88vh] sm:rounded-2xl',
              widths[size] || widths.md,
            )}
          >
            <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-[var(--border-strong)] sm:hidden" aria-hidden="true" />
            <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-5 py-4 sm:px-6">
              <div className="flex min-w-0 items-start gap-3">
                {icon ? (
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--gold-soft)] text-[var(--accent)] [&_svg]:h-5 [&_svg]:w-5">
                    {icon}
                  </span>
                ) : null}
                <div className="min-w-0">
                  <h2 className="font-display text-[17px] font-bold tracking-[-0.01em] text-[var(--text)]">{title}</h2>
                  {description ? <p className="mt-0.5 text-[13px] text-[var(--text-muted)]">{description}</p> : null}
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="-mr-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] transition hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
              >
                <MdClose className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
            {footer ? (
              <div className="border-t border-[var(--border)] bg-[var(--surface-2)] px-5 py-3.5 sm:px-6">{footer}</div>
            ) : null}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
