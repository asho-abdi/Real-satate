import { Link } from 'react-router-dom';
import { formatCurrency, formatDate } from '../../utils/format.js';
import { labelStatus } from '../../utils/labels.js';
import { cn } from '../../utils/format.js';

export default function MaintenanceCard({
  subject,
  code,
  property,
  unitLabel,
  unitTo,
  date,
  amount,
  status,
  notes,
  onOpen,
  onEdit,
  onDelete,
}) {
  return (
    <article className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <button type="button" onClick={onOpen} className="text-left text-base font-semibold text-[var(--primary)] hover:underline">
            {subject}
          </button>
          {code ? <p className="mt-0.5 text-xs text-[var(--text-muted)]">{code}</p> : null}
        </div>
        <span className={cn('rounded-full bg-[var(--primary-light)] px-3 py-1 text-xs font-semibold text-[var(--primary-dark)]')}>
          {labelStatus(status)}
        </span>
      </div>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-[var(--text-muted)]">Property</dt>
          <dd className="font-medium">{property || '—'}</dd>
        </div>
        <div>
          <dt className="text-[var(--text-muted)]">Unit</dt>
          <dd className="font-medium">
            {unitTo ? <Link to={unitTo} className="text-[var(--primary)] hover:underline">{unitLabel}</Link> : unitLabel || 'Building-wide'}
          </dd>
        </div>
        <div>
          <dt className="text-[var(--text-muted)]">Date</dt>
          <dd className="font-medium">{formatDate(date)}</dd>
        </div>
        <div>
          <dt className="text-[var(--text-muted)]">Expense</dt>
          <dd className="font-semibold text-rose-600">{formatCurrency(amount)}</dd>
        </div>
      </dl>
      {notes ? <p className="mt-3 text-sm text-[var(--text-secondary)]">{notes}</p> : null}
      <div className="mt-4 flex gap-2">
        <button type="button" onClick={onEdit} className="rounded-xl border border-[var(--border)] px-3 py-1.5 text-xs font-medium">
          Edit
        </button>
        <button type="button" onClick={onDelete} className="rounded-xl border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600">
          Delete
        </button>
      </div>
    </article>
  );
}
