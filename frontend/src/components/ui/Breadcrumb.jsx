import { Link } from 'react-router-dom';
import { MdChevronRight } from 'react-icons/md';

export default function Breadcrumb({ items = [] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 flex-wrap items-center gap-1 text-[12.5px] text-[var(--text-muted)]">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span key={`${item.label}-${index}`} className="inline-flex min-w-0 items-center gap-1">
            {index > 0 ? <MdChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden="true" /> : null}
            {isLast || !item.to ? (
              <span
                aria-current={isLast ? 'page' : undefined}
                className={isLast ? 'truncate font-medium text-[var(--text-secondary)]' : 'truncate'}
              >
                {item.label}
              </span>
            ) : (
              <Link to={item.to} className="truncate transition-colors hover:text-[var(--text)]">
                {item.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
