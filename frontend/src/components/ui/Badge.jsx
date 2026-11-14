import { STATUS_COLORS } from '../../utils/constants.js';
import { cn } from '../../utils/format.js';

const NEUTRAL =
  'bg-slate-100 text-slate-700 ring-slate-500/15 dark:bg-slate-500/15 dark:text-slate-300 dark:ring-slate-400/20';

/** 'CheckedIn' -> 'Checked in', 'IN_PROGRESS' -> 'In progress'; leaves normal labels alone. */
function humanize(value) {
  if (typeof value !== 'string') return value;
  if (/^[A-Z0-9_]+$/.test(value) && value.includes('_')) {
    const t = value.toLowerCase().replace(/_/g, ' ');
    return t.charAt(0).toUpperCase() + t.slice(1);
  }
  if (/^[A-Z][a-z]+[A-Z]/.test(value) && !value.includes(' ')) {
    const t = value.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
    return t.charAt(0).toUpperCase() + t.slice(1);
  }
  return value;
}

export default function Badge({ children, status, className, dot = true }) {
  const tone = STATUS_COLORS[status || children] || NEUTRAL;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-[11.5px] font-semibold leading-5 ring-1 ring-inset',
        tone,
        className,
      )}
    >
      {dot ? <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-80" /> : null}
      {humanize(children)}
    </span>
  );
}
