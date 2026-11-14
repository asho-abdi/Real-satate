import { MdErrorOutline } from 'react-icons/md';

export const fieldBase =
  'w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--text)] shadow-xs outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-[color-mix(in_oklab,var(--text-muted)_75%,transparent)] hover:border-[var(--border-strong)] focus:border-[var(--navy)] focus:ring-[3px] focus:ring-[var(--ring)] disabled:cursor-not-allowed disabled:bg-[var(--surface-2)] disabled:opacity-70 dark:focus:border-[var(--gold)]';

export const fieldError = 'border-rose-400 hover:border-rose-400 focus:border-rose-500 focus:ring-rose-500/20';

export function FieldLabel({ children, required }) {
  if (!children) return null;
  return (
    <span className="block text-[13px] font-medium text-[var(--text-secondary)]">
      {children}
      {required ? <span className="ml-0.5 text-rose-500">*</span> : null}
    </span>
  );
}

export function FieldMessage({ error, hint }) {
  if (error) {
    return (
      <span role="alert" className="flex items-center gap-1 text-xs font-medium text-rose-600 dark:text-rose-400">
        <MdErrorOutline className="h-3.5 w-3.5 shrink-0" />
        {error}
      </span>
    );
  }
  if (hint) return <span className="block text-xs text-[var(--text-muted)]">{hint}</span>;
  return null;
}
