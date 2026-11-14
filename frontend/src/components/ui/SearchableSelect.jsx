import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { MdExpandMore, MdClose } from 'react-icons/md';
import { cn } from '../../utils/format.js';

/**
 * Searchable single-select dropdown.
 * @param {{ value: string, label?: string, options: { value: string, label: string, searchText?: string }[], onChange: (value: string) => void, placeholder?: string, searchPlaceholder?: string, disabled?: boolean, error?: string, className?: string, allowClear?: boolean }} props
 */
export default function SearchableSelect({
  label,
  value = '',
  options = [],
  onChange,
  placeholder = 'Select',
  searchPlaceholder = 'Type to search…',
  disabled = false,
  error,
  className,
  allowClear = false,
}) {
  const listId = useId();
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = useMemo(
    () => options.find((o) => String(o.value) === String(value)) || null,
    [options, value],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => {
      const hay = `${o.label || ''} ${o.searchText || ''} ${o.value || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [options, query]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (!rootRef.current?.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const pick = (next) => {
    onChange?.(next);
    setOpen(false);
    setQuery('');
  };

  return (
    <label className={cn('relative block space-y-1.5', className)} ref={rootRef}>
      {label ? <span className="text-sm font-medium text-[var(--text)]">{label}</span> : null}

      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => {
          if (disabled) return;
          setOpen((v) => !v);
          setQuery('');
        }}
        className={cn(
          'flex h-11 w-full items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-left text-sm outline-none transition',
          'focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20',
          disabled && 'cursor-not-allowed opacity-60',
          error && 'border-rose-500',
          open && 'border-brand-500 ring-2 ring-brand-500/20',
        )}
      >
        <span
          className={cn(
            'min-w-0 flex-1 truncate',
            selected ? 'text-[var(--text)]' : 'text-[var(--text-muted)]',
          )}
        >
          {selected?.label || placeholder}
        </span>
        {allowClear && value ? (
          <span
            role="button"
            tabIndex={-1}
            className="rounded p-0.5 text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
            onClick={(e) => {
              e.stopPropagation();
              pick('');
            }}
          >
            <MdClose className="h-4 w-4" />
          </span>
        ) : null}
        <MdExpandMore
          className={cn('h-5 w-5 shrink-0 text-[var(--text-muted)] transition', open && 'rotate-180')}
        />
      </button>

      {open && !disabled ? (
        <div
          className="absolute z-40 mt-1 w-full overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-lg"
          role="listbox"
          id={listId}
        >
          <div className="border-b border-[var(--border)] p-2">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)] outline-none focus:border-brand-500"
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setOpen(false);
                  setQuery('');
                }
                if (e.key === 'Enter' && filtered[0]) {
                  e.preventDefault();
                  pick(String(filtered[0].value));
                }
              }}
            />
          </div>
          <ul className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-[var(--text-muted)]">No matches</li>
            ) : (
              filtered.map((o) => {
                const active = String(o.value) === String(value);
                return (
                  <li key={`${o.value}-${o.label}`}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      className={cn(
                        'flex w-full px-3 py-2 text-left text-sm transition',
                        active
                          ? 'bg-brand-50 font-medium text-brand-800 dark:bg-brand-950/40 dark:text-brand-100'
                          : 'text-[var(--text)] hover:bg-[var(--surface-2)]',
                      )}
                      onClick={() => pick(String(o.value))}
                    >
                      {o.label}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}

      {error ? <span className="text-xs text-rose-500">{error}</span> : null}
    </label>
  );
}
