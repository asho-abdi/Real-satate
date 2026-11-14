import EmptyState from './EmptyState.jsx';
import { SkeletonTable } from './Skeleton.jsx';
import { cn } from '../../utils/format.js';

export default function DataTable({
  columns,
  rows,
  loading,
  emptyTitle = 'No records found',
  emptyDescription,
  emptyAction,
  onRowClick,
  className,
}) {
  if (loading) return <SkeletonTable columns={Math.min(columns?.length || 5, 6)} />;
  if (!rows?.length) return <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />;

  return (
    <div className={cn('overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-xs', className)}>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-[13.5px]">
          <thead>
            <tr className="border-b border-[var(--border)]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={cn(
                    'whitespace-nowrap bg-[var(--surface-2)] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]',
                    col.align === 'right' && 'text-right',
                    col.headerClassName,
                  )}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {rows.map((row, index) => (
              <tr
                key={row.id ?? index}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn('transition-colors hover:bg-[var(--surface-2)]/70', onRowClick && 'cursor-pointer')}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      'whitespace-nowrap px-4 py-3 align-middle text-[var(--text)]',
                      col.align === 'right' && 'text-right tabular-nums',
                      col.className,
                    )}
                  >
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
