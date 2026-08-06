import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MdHome } from 'react-icons/md';
import { APP_NAME } from '../utils/constants.js';

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--bg)] px-4">
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -20%, color-mix(in oklab, var(--accent) 28%, transparent), transparent), radial-gradient(circle at 80% 80%, color-mix(in oklab, #94a3b8 18%, transparent), transparent)',
        }}
      />
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 max-w-lg text-center"
      >
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700 dark:text-brand-300">
          {APP_NAME}
        </p>
        <h1 className="page-title mt-3 text-7xl text-[var(--text)] md:text-8xl">404</h1>
        <p className="mt-4 text-lg font-medium text-[var(--text)]">Page not found</p>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          The route you requested is not part of this REMS workspace.
        </p>
        <div className="mt-8 flex justify-center">
          <Link
            to="/dashboard"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 text-sm font-medium text-white transition hover:bg-brand-800 dark:bg-brand-400 dark:text-ink-950 dark:hover:bg-brand-300"
          >
            <MdHome className="h-4 w-4" /> Back to dashboard
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
