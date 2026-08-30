import Button from './Button.jsx';
import Select from './Select.jsx';

const DEFAULT_BULK = [
  { value: 'export', label: 'Export' },
  { value: 'print', label: 'Print' },
  { value: 'archive', label: 'Archive' },
  { value: 'restore', label: 'Restore' },
  { value: 'delete', label: 'Delete' },
  { value: 'changeStatus', label: 'Change Status' },
  { value: 'assignUser', label: 'Assign User' },
];

export default function BulkActionBar({
  selectedCount,
  onClear,
  onApply,
  actions = DEFAULT_BULK,
  statusOptions = [],
  assignOptions = [],
}) {
  if (!selectedCount) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-brand-500/30 bg-brand-500/5 px-4 py-3">
      <p className="text-sm font-medium text-[var(--text)]">
        {selectedCount} selected
      </p>
      <Select
        className="min-w-[180px]"
        defaultValue=""
        onChange={(e) => {
          const value = e.target.value;
          if (!value) return;
          onApply?.(value);
          e.target.value = '';
        }}
      >
        <option value="">Bulk actions…</option>
        {actions.map((action) => (
          <option key={action.value} value={action.value}>
            {action.label}
          </option>
        ))}
        {statusOptions.length
          ? statusOptions.map((status) => (
              <option key={`status:${status}`} value={`status:${status}`}>
                Status → {status}
              </option>
            ))
          : null}
        {assignOptions.length
          ? assignOptions.map((user) => (
              <option key={`assign:${user}`} value={`assign:${user}`}>
                Assign → {user}
              </option>
            ))
          : null}
      </Select>
      <Button size="sm" variant="ghost" onClick={onClear}>
        Clear
      </Button>
    </div>
  );
}
