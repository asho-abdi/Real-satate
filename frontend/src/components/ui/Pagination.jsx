import { MdChevronLeft, MdChevronRight } from 'react-icons/md';
import { cn } from '../../utils/format.js';

function pageList(page, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const set = new Set([1, total, page, page - 1, page + 1]);
  const pages = [...set].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out = [];
  pages.forEach((p, i) => {
    if (i > 0 && p - pages[i - 1] > 1) out.push('…');
    out.push(p);
  });
  return out;
}

const btn =
  'inline-flex h-8 min-w-8 items-center justify-center rounded-lg border px-2 text-[13px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40';

export default function Pagination({ page, totalPages, totalItems, onPageChange }) {
  const countLabel = `${totalItems} ${totalItems === 1 ? 'record' : 'records'}`;
  if (totalPages <= 1) {
    return <p className="text-[13px] text-[var(--text-muted)]">{countLabel}</p>;
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-[13px] text-[var(--text-muted)]">
        Page <span className="font-semibold text-[var(--text)]">{page}</span> of {totalPages} · {countLabel}
      </p>
      <nav className="flex items-center gap-1" aria-label="Pagination">
        <button
          type="button"
          className={cn(btn, 'border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-2)]')}
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <MdChevronLeft className="h-4 w-4" />
        </button>
        {pageList(page, totalPages).map((p, i) =>
          p === '…' ? (
            <span key={`gap-${i}`} className="px-1 text-[13px] text-[var(--text-muted)]">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              aria-current={p === page ? 'page' : undefined}
              className={cn(
                btn,
                'hidden sm:inline-flex',
                p === page
                  ? 'border-[var(--navy)] bg-[var(--navy)] text-white dark:border-[var(--gold)] dark:bg-[var(--gold)] dark:text-[var(--on-gold)]'
                  : 'border-transparent text-[var(--text-secondary)] hover:bg-[var(--surface-2)]',
              )}
            >
              {p}
            </button>
          ),
        )}
        <button
          type="button"
          className={cn(btn, 'border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-2)]')}
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          <MdChevronRight className="h-4 w-4" />
        </button>
      </nav>
    </div>
  );
}
