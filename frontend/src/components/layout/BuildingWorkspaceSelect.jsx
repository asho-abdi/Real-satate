import { cn } from '../../utils/format.js';
import { useBuildingWorkspaceOptional } from '../../context/BuildingWorkspaceContext.jsx';

/**
 * Global building switcher — drives feature-gated navigation and page filters.
 */
export default function BuildingWorkspaceSelect({ tone = 'default', className }) {
  const workspace = useBuildingWorkspaceOptional();
  if (!workspace) return null;

  const { buildings, selectedBuildingId, setSelectedBuildingId, loading } = workspace;
  if (!buildings.length && !loading) return null;

  const onDark = tone === 'onDark';

  return (
    <label className={cn('block space-y-1', className)}>
      <span
        className={cn(
          'block text-[10px] font-semibold uppercase tracking-[0.14em]',
          onDark ? 'text-white/45' : 'text-[var(--text-muted)]',
        )}
      >
        Working building
      </span>
      <select
        value={selectedBuildingId || ''}
        disabled={loading || buildings.length === 0}
        onChange={(e) => setSelectedBuildingId(e.target.value)}
        className={cn(
          'h-9 w-full rounded-lg border px-2.5 text-sm font-medium outline-none transition',
          onDark
            ? 'border-white/15 bg-white/10 text-white focus:border-[var(--gold)]'
            : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text)] focus:border-[var(--navy)] focus:ring-[3px] focus:ring-[var(--ring)]',
        )}
      >
        {buildings.map((b) => (
          <option key={b.id} value={b.id} className="text-ink-900">
            {b.name}
            {b.code ? ` (${b.code})` : ''}
          </option>
        ))}
      </select>
    </label>
  );
}
