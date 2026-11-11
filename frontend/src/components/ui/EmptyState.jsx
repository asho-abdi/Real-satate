import { MdInbox } from 'react-icons/md';
import { cn } from '../../utils/format.js';

export default function EmptyState({ title = 'Nothing here yet', description, action, icon: Icon = MdInbox, className, compact = false }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--surface)] text-center',
        compact ? 'min-h-32 p-6' : 'min-h-52 p-10',
        className,
      )}
    >
      <span className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary-light)] text-[var(--navy)] dark:text-[var(--primary)]">
        <Icon className="h-6 w-6" />
        <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-[var(--surface)] bg-[var(--gold)]" />
      </span>
      <div className="max-w-sm">
        <h3 className="font-display text-[15px] font-bold text-[var(--text)]">{title}</h3>
        {description ? <p className="mt-1 text-[13px] leading-relaxed text-[var(--text-muted)]">{description}</p> : null}
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
