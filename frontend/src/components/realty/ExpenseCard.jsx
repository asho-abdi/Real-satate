import { formatCurrency, formatDate } from '../../utils/format.js';

export default function ExpenseCard({
  date,
  type,
  amount,
  source,
  destination,
  reference,
  comment,
  actor,
  onDelete,
}) {
  return (
    <article className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">{formatDate(date)}</p>
          <h3 className="mt-1 text-base font-semibold text-[var(--text)]">{type}</h3>
        </div>
        <p className="text-xl font-semibold text-[var(--primary-dark)]">{formatCurrency(amount)}</p>
      </div>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-[var(--text-muted)]">Where it was spent</dt>
          <dd className="font-medium">{source || '—'} → {destination || '—'}</dd>
        </div>
        <div>
          <dt className="text-[var(--text-muted)]">Recorded by</dt>
          <dd className="font-medium">{actor || '—'}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-[var(--text-muted)]">Reference / comment</dt>
          <dd className="font-medium">{reference || comment || '—'}</dd>
        </div>
      </dl>
      {onDelete ? (
        <button type="button" onClick={onDelete} className="mt-4 text-xs font-semibold text-rose-600 hover:underline">
          Delete
        </button>
      ) : null}
    </article>
  );
}
