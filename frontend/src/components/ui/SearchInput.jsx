import { MdClose, MdSearch } from 'react-icons/md';
import { cn } from '../../utils/format.js';
import { fieldBase } from './Field.jsx';

export default function SearchInput({ value, onChange, placeholder = 'Search…', className }) {
  return (
    <div className={cn('relative', className)}>
      <MdSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(fieldBase, 'h-10 pl-9 pr-8 [&::-webkit-search-cancel-button]:hidden')}
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
        >
          <MdClose className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}
