import { STATUS_COLORS } from '../../utils/constants.js';
import { cn } from '../../utils/format.js';

export default function Badge({ children, status, className }) {
  const tone = STATUS_COLORS[status || children] || 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
  return (
    <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-medium', tone, className)}>
      {children}
    </span>
  );
}
