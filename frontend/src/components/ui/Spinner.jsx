import { cn } from '../../utils/format.js';

/** Branded gold ring loader. `inline` renders just the ring for buttons/cells. */
export default function Spinner({ label = 'Loading…', inline = false, size = 28, className }) {
  const ring = (
    <span
      aria-hidden="true"
      className="rjk-ring block shrink-0"
      style={{ width: size, height: size }}
    />
  );
  if (inline) return <span className={cn('inline-flex', className)}>{ring}</span>;
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn('flex min-h-40 flex-col items-center justify-center gap-3 text-[var(--text-muted)]', className)}
    >
      {ring}
      {label ? <p className="text-[13px]">{label}</p> : null}
    </div>
  );
}
