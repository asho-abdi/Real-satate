import { cn } from '../../utils/format.js';

export default function Skeleton({ className, ...props }) {
  return <div aria-hidden="true" className={cn('skeleton rounded-md', className)} {...props} />;
}

export function SkeletonText({ lines = 3, className }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn('h-3', i === lines - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  );
}

export function SkeletonCard({ className }) {
  return (
    <div className={cn('app-surface p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-3 w-40" />
        </div>
        <Skeleton className="h-10 w-10 rounded-lg" />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 6, columns = 5, className }) {
  return (
    <div className={cn('overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]', className)}>
      <div className="flex gap-4 border-b border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 border-b border-[var(--border)] px-4 py-3.5 last:border-0">
          {Array.from({ length: columns }).map((__, c) => (
            <Skeleton key={c} className={cn('h-3.5 flex-1', c === 0 && 'max-w-[40%]')} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Generic page skeleton: header + stat row + table. */
export function SkeletonPage({ stats = 4 }) {
  return (
    <div className="space-y-6" role="status" aria-label="Loading">
      <div className="space-y-2">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-7 w-64" />
      </div>
      {stats ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: stats }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : null}
      <SkeletonTable />
    </div>
  );
}
