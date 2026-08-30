import EmptyState from './EmptyState.jsx';
import Spinner from './Spinner.jsx';

export default function DataTable({ columns, rows, loading, emptyTitle = 'No records found' }) {
  if (loading) return <Spinner />;
  if (!rows?.length) return <EmptyState title={emptyTitle} />;

  return (
    <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-[var(--surface-2)] text-[var(--text-muted)]">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="px-4 py-3 font-medium whitespace-nowrap">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-[var(--border)] hover:bg-[var(--surface-2)]/70">
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3 align-middle whitespace-nowrap">
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
