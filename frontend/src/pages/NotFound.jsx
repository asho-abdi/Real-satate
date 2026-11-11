import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MdArrowBack, MdHome } from 'react-icons/md';
import Logo from '../components/brand/Logo.jsx';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg)]">
      <header className="px-6 py-6 sm:px-10">
        <Link to="/dashboard" aria-label="RJK Realty home">
          <Logo className="h-10 w-auto" />
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-6 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="max-w-md text-center"
        >
          <p className="eyebrow !text-[var(--accent)]">Error 404</p>
          <h1 className="page-title mt-3 text-[40px] leading-tight sm:text-[48px]">Page not found</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-[var(--text-muted)]">
            The page you&apos;re looking for doesn&apos;t exist or may have moved. Let&apos;s get you back to your
            workspace.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--text)] shadow-xs hover:bg-[var(--surface-2)]"
            >
              <MdArrowBack className="h-4 w-4" /> Go back
            </button>
            <Link
              to="/dashboard"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[var(--gold)] px-4 text-sm font-semibold text-[var(--on-gold)] shadow-xs hover:bg-[var(--gold-hover)]"
            >
              <MdHome className="h-4 w-4" /> Back to dashboard
            </Link>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
