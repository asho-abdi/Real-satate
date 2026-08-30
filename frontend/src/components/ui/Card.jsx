import { cn } from '../../utils/format.js';

export default function Card({ children, className, title, action }) {
  return (
    <section className={cn('app-surface p-5', className)}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title ? <h3 className="text-base font-semibold text-[var(--text)]">{title}</h3> : <div />}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
