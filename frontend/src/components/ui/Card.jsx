import { cn } from '../../utils/format.js';

export default function Card({ children, className, title, description, icon, action, bodyClassName }) {
  const hasHeader = title || action || description;
  return (
    <section className={cn('app-surface p-5', className)}>
      {hasHeader ? (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            {icon ? (
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--primary-light)] text-[var(--navy)] dark:text-[var(--primary)] [&_svg]:h-[18px] [&_svg]:w-[18px]">
                {icon}
              </span>
            ) : null}
            <div className="min-w-0">
              {title ? (
                <h3 className="font-display text-[15px] font-bold tracking-[-0.01em] text-[var(--text)]">{title}</h3>
              ) : null}
              {description ? <p className="mt-0.5 text-[13px] text-[var(--text-muted)]">{description}</p> : null}
            </div>
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
      {bodyClassName ? <div className={bodyClassName}>{children}</div> : children}
    </section>
  );
}
