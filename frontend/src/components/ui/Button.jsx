import { cn } from '../../utils/format.js';

const variants = {
  primary:
    'bg-brand-700 text-white hover:bg-brand-800 dark:bg-brand-400 dark:text-ink-950 dark:hover:bg-brand-300',
  secondary:
    'bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)] hover:bg-[var(--border)]',
  ghost: 'bg-transparent text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]',
  danger: 'bg-rose-600 text-white hover:bg-rose-700',
};

const sizes = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-5 text-base',
};

export default function Button({
  children,
  className,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition disabled:cursor-not-allowed disabled:opacity-60',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
      ) : null}
      {children}
    </button>
  );
}
