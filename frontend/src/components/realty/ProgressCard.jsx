import Badge from '../ui/Badge.jsx';

export default function ProgressCard({ title, subtitle, status, percent = 0, meta }) {
  const value = Math.max(0, Math.min(100, Number(percent) || 0));
  return (
    <article className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-[var(--text)]">{title}</h3>
          {subtitle ? <p className="mt-1 text-sm text-[var(--text-muted)]">{subtitle}</p> : null}
        </div>
        {status ? <Badge status={status}>{status}</Badge> : null}
      </div>
      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="text-[var(--text-muted)]">Progress</span>
        <span className="font-semibold text-[var(--primary)]">{value}%</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--primary-light)]">
        <div className="h-full rounded-full bg-[var(--primary)] transition-all" style={{ width: `${value}%` }} />
      </div>
      {meta ? <p className="mt-3 text-xs text-[var(--text-muted)]">{meta}</p> : null}
    </article>
  );
}
