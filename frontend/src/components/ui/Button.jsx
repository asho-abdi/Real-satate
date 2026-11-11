import { cn } from '../../utils/format.js';

const variants = {
  // Gold = the primary call to action across RJK Realty
  primary:
    'bg-[var(--gold)] text-[var(--on-gold)] shadow-[0_1px_0_rgba(0,27,53,0.08),inset_0_-1px_0_rgba(0,27,53,0.12)] hover:bg-[var(--gold-hover)] active:brightness-95',
  // Navy = strong but secondary emphasis
  navy:
    'bg-[var(--navy)] text-white shadow-xs hover:bg-[var(--navy-dark)] dark:bg-[#1f4a75] dark:hover:bg-[#28588a]',
  secondary:
    'bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] shadow-xs hover:bg-[var(--surface-2)] hover:border-[var(--border-strong)]',
  outline:
    'bg-transparent text-[var(--navy)] border border-[color-mix(in_oklab,var(--navy)_30%,var(--border))] hover:bg-[var(--primary-light)] dark:text-[var(--text)]',
  ghost: 'bg-transparent text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]',
  danger: 'bg-[var(--danger)] text-white shadow-xs hover:brightness-95',
  'danger-soft':
    'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30',
};

const sizes = {
  xs: 'h-7 px-2.5 text-xs gap-1.5 rounded-md',
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-lg',
  lg: 'h-11 px-5 text-[15px] gap-2 rounded-[10px]',
  icon: 'h-9 w-9 p-0 rounded-lg',
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
      aria-busy={loading || undefined}
      className={cn(
        'relative inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap font-semibold transition-[background-color,border-color,color,box-shadow,filter] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--surface)] disabled:cursor-not-allowed disabled:opacity-55 [&_svg]:shrink-0',
        variants[variant] || variants.primary,
        sizes[size] || sizes.md,
        className,
      )}
      {...props}
    >
      {loading ? (
        <span
          aria-hidden="true"
          className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent opacity-80"
        />
      ) : null}
      {children}
    </button>
  );
}
