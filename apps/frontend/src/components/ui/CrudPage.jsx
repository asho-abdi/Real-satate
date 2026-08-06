import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDebounce } from '../../hooks/useDebounce.js';
import { usePagination } from '../../hooks/usePagination.js';
import PageHeader from './PageHeader.jsx';
import SearchInput from './SearchInput.jsx';
import Select from './Select.jsx';
import DataTable from './DataTable.jsx';
import Pagination from './Pagination.jsx';
import Button from './Button.jsx';

export default function CrudPage({
  title,
  subtitle,
  breadcrumbs,
  columns,
  rows,
  loading = false,
  searchKeys = ['name', 'title', 'email'],
  filters = [],
  primaryAction,
  headerActions,
  toolbar,
  onRowClickPath,
  sortOptions = [],
}) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState(sortOptions[0]?.value || '');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [filterValues, setFilterValues] = useState(() =>
    Object.fromEntries(filters.map((f) => [f.key, 'all'])),
  );
  const debouncedQuery = useDebounce(query);

  const filtered = useMemo(() => {
    let next = [...rows];
    filters.forEach((filter) => {
      const value = filterValues[filter.key];
      if (value && value !== 'all') {
        next = next.filter((row) => String(row[filter.key]) === value);
      }
    });
    if (debouncedQuery.trim()) {
      const q = debouncedQuery.toLowerCase();
      next = next.filter((row) =>
        searchKeys.some((key) => String(row[key] ?? '').toLowerCase().includes(q)),
      );
    }
    if (sort) {
      const [field, dir] = sort.split(':');
      next.sort((a, b) => {
        const av = a[field];
        const bv = b[field];
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        if (typeof av === 'number' && typeof bv === 'number') {
          return dir === 'desc' ? bv - av : av - bv;
        }
        return dir === 'desc'
          ? String(bv).localeCompare(String(av))
          : String(av).localeCompare(String(bv));
      });
    }
    return next;
  }, [rows, filters, filterValues, debouncedQuery, searchKeys, sort]);

  const { page, setPage, totalPages, totalItems, pagedItems } = usePagination(filtered, 8);

  const enrichedColumns = onRowClickPath
    ? columns.map((col, index) =>
        index === 0 || col.key === columns.find((c) => c.key !== '_select')?.key
          ? col.key === '_select'
            ? col
            : index === columns.findIndex((c) => c.key !== '_select')
              ? {
                  ...col,
                  render: (row) => (
                    <Link
                      to={onRowClickPath(row)}
                      className="font-medium text-brand-700 hover:underline dark:text-brand-300"
                    >
                      {col.render ? col.render(row) : row[col.key]}
                    </Link>
                  ),
                }
              : col
          : col,
      )
    : columns;

  return (
    <div>
      <PageHeader
        title={title}
        subtitle={subtitle}
        breadcrumbs={breadcrumbs}
        actions={
          headerActions ||
          (primaryAction ? (
            <Button onClick={primaryAction.onClick}>{primaryAction.label}</Button>
          ) : null)
        }
      />

      {toolbar}

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-[var(--text-muted)]">
          Advanced filters, sorting, pagination, and bulk actions enabled
        </p>
        <Button size="sm" variant="ghost" onClick={() => setShowAdvanced((v) => !v)}>
          {showAdvanced ? 'Hide filters' : 'Advanced filters'}
        </Button>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-[1.4fr_repeat(auto-fit,minmax(140px,1fr))]">
        <SearchInput
          value={query}
          onChange={(value) => {
            setQuery(value);
            setPage(1);
          }}
        />
        {(showAdvanced ? filters : filters.slice(0, 2)).map((filter) => (
          <Select
            key={filter.key}
            value={filterValues[filter.key]}
            onChange={(e) => {
              setFilterValues((prev) => ({ ...prev, [filter.key]: e.target.value }));
              setPage(1);
            }}
          >
            <option value="all">All {filter.label}</option>
            {filter.options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        ))}
        {sortOptions.length ? (
          <Select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Sort by…</option>
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        ) : null}
      </div>

      <DataTable columns={enrichedColumns} rows={pagedItems} loading={loading} />
      <div className="mt-4">
        <Pagination page={page} totalPages={totalPages} totalItems={totalItems} onPageChange={setPage} />
      </div>
    </div>
  );
}
