import { forwardRef } from 'react';
import { cn } from '../../utils/format.js';

const Select = forwardRef(function Select({ label, error, children, className, ...props }, ref) {
  return (
    <label className="block space-y-1.5">
      {label ? <span className="text-sm font-medium text-[var(--text)]">{label}</span> : null}
      <select
        ref={ref}
        className={cn(
          'h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)] outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20',
          error && 'border-rose-500',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      {error ? <span className="text-xs text-rose-500">{error}</span> : null}
    </label>
  );
});

export default Select;
