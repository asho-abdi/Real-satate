import { forwardRef } from 'react';
import { cn } from '../../utils/format.js';

const Input = forwardRef(function Input(
  { label, error, className, hint, ...props },
  ref,
) {
  return (
    <label className="block space-y-1.5">
      {label ? <span className="text-sm font-medium text-[var(--text)]">{label}</span> : null}
      <input
        ref={ref}
        className={cn(
          'h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20',
          error && 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20',
          className,
        )}
        {...props}
      />
      {error ? <span className="text-xs text-rose-500">{error}</span> : null}
      {!error && hint ? <span className="text-xs text-[var(--text-muted)]">{hint}</span> : null}
    </label>
  );
});

export default Input;
