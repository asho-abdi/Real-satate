import { CATEGORY_FILTERS, STATUS_FILTERS } from './listing.js';

export default function PropertySearch({ value, onChange, onSubmit, locations = [], compact = false }) {
  const set = (key) => (event) => onChange({ ...value, [key]: event.target.value });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit?.(value);
      }}
      className="rounded-[1.75rem] border border-[var(--border)] bg-white p-4 shadow-[var(--shadow)] md:p-5"
    >
      <div className={`grid gap-3 ${compact ? 'md:grid-cols-2 xl:grid-cols-6' : 'md:grid-cols-2 xl:grid-cols-6'}`}>
        <label className="block xl:col-span-2">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
            Property name
          </span>
          <input
            value={value.q || ''}
            onChange={set('q')}
            placeholder="Search by name or unit"
            className="h-10 w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 text-sm outline-none focus:border-[var(--primary)]"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
            Location
          </span>
          <select
            value={value.location || ''}
            onChange={set('location')}
            className="h-10 w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--primary)]"
          >
            <option value="">All locations</option>
            {locations.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
            Property type
          </span>
          <select
            value={value.type || ''}
            onChange={set('type')}
            className="h-10 w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--primary)]"
          >
            {CATEGORY_FILTERS.map((option) => (
              <option key={option.value || 'all'} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
            Availability
          </span>
          <select
            value={value.status || ''}
            onChange={set('status')}
            className="h-10 w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--primary)]"
          >
            {STATUS_FILTERS.map((option) => (
              <option key={option.value || 'any'} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
            Min price
          </span>
          <input
            type="number"
            min="0"
            value={value.minPrice || ''}
            onChange={set('minPrice')}
            placeholder="0"
            className="h-10 w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 text-sm outline-none focus:border-[var(--primary)]"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
            Max price
          </span>
          <input
            type="number"
            min="0"
            value={value.maxPrice || ''}
            onChange={set('maxPrice')}
            placeholder="Any"
            className="h-10 w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 text-sm outline-none focus:border-[var(--primary)]"
          />
        </label>
        <div className="flex items-end xl:col-span-1">
          <button
            type="submit"
            className="h-10 w-full rounded-2xl bg-[var(--primary)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--primary-dark)]"
          >
            Search
          </button>
        </div>
      </div>
    </form>
  );
}
