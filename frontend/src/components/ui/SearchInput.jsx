import { MdSearch } from 'react-icons/md';
import { cn } from '../../utils/format.js';

export default function SearchInput({ value, onChange, placeholder = 'Search...', className }) {
  return (
    <div className={cn('relative', className)}>
      <MdSearch className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[var(--text-muted)]" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] pr-3 pl-10 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
      />
    </div>
  );
}
