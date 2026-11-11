import { useEffect } from 'react';
import { motion } from 'framer-motion';
import Logo from './Logo.jsx';

/** Fade out the static splash that ships in index.html once React has painted. */
export function hideBootSplash() {
  const el = typeof document !== 'undefined' ? document.getElementById('boot-splash') : null;
  if (!el || el.dataset.hiding) return;
  el.dataset.hiding = '1';
  el.classList.add('is-hidden');
  window.setTimeout(() => el.remove(), 400);
}

/**
 * Full-screen branded loading experience. Visually identical to the boot
 * splash in index.html so the hand-off from HTML → React is seamless.
 */
export default function BrandLoader({ message = 'Preparing your property management workspace…' }) {
  useEffect(() => {
    hideBootSplash();
  }, []);

  return (
    <motion.div
      role="status"
      aria-live="polite"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-[90] flex flex-col items-center justify-center gap-7 bg-white px-6 dark:bg-[var(--bg)]"
    >
      <div className="rjk-breathe">
        <Logo className="h-auto w-[220px]" />
      </div>
      <div className="rjk-loader-track" />
      <p className="-mt-3 text-center text-[13px] tracking-[0.01em] text-[var(--text-muted)]">{message}</p>
    </motion.div>
  );
}

/** In-content loader for lazily loaded pages: keeps the shell visible. */
export function PageLoader({ label = 'Loading…' }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4" role="status" aria-live="polite">
      <Logo variant="mark" className="h-10 w-auto opacity-90 rjk-breathe" />
      <div className="rjk-loader-track" />
      <p className="text-xs text-[var(--text-muted)]">{label}</p>
    </div>
  );
}
