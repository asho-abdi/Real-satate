import { MdInbox } from 'react-icons/md';

export default function EmptyState({ title = 'Nothing here yet', description, action }) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-2)] p-8 text-center">
      <MdInbox className="text-3xl text-[var(--text-muted)]" />
      <div>
        <h3 className="font-semibold text-[var(--text)]">{title}</h3>
        {description ? <p className="mt-1 text-sm text-[var(--text-muted)]">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
