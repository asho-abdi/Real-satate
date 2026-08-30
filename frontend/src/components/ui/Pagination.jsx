import Button from './Button.jsx';

export default function Pagination({ page, totalPages, totalItems, onPageChange }) {
  if (totalPages <= 1) {
    return (
      <p className="text-sm text-[var(--text-muted)]">
        {totalItems} item{totalItems === 1 ? '' : 's'}
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-[var(--text-muted)]">
        Page {page} of {totalPages} · {totalItems} items
      </p>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Previous
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
