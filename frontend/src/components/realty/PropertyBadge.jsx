import { cn } from '../../utils/format.js';

const tones = {
  light: 'bg-white/95 text-[var(--text-primary)] shadow-sm',
  brand: 'bg-[var(--primary)] text-white',
  soft: 'bg-[var(--primary-light)] text-[var(--primary-dark)]',
  success: 'bg-emerald-600 text-white',
  warning: 'bg-amber-500 text-white',
  danger: 'bg-rose-600 text-white',
  muted: 'bg-white/90 text-[var(--text-secondary)]',
};

export default function PropertyBadge({ children, tone = 'light', className }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold tracking-wide',
        tones[tone] || tones.light,
        className,
      )}
    >
      {children}
    </span>
  );
}

export function statusTone(status) {
  if (status === 'AVAILABLE') return 'success';
  if (status === 'RESERVED') return 'warning';
  if (status === 'SOLD') return 'brand';
  if (status === 'MAINTENANCE') return 'warning';
  return 'muted';
}
