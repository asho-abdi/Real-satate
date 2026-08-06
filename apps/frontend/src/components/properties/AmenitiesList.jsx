import { MdCheck } from 'react-icons/md';

export default function AmenitiesList({ amenities = [] }) {
  if (!amenities.length) {
    return <p className="text-sm text-[var(--text-muted)]">No amenities listed.</p>;
  }

  return (
    <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {amenities.map((item) => (
        <li
          key={item}
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)]"
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
            <MdCheck className="text-sm" />
          </span>
          {item}
        </li>
      ))}
    </ul>
  );
}
