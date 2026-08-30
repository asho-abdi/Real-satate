import { Link } from 'react-router-dom';
import { MdChevronRight } from 'react-icons/md';

export default function Breadcrumb({ items = [] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-sm text-[var(--text-muted)]">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span key={`${item.label}-${index}`} className="inline-flex items-center gap-1">
            {index > 0 ? <MdChevronRight className="opacity-60" /> : null}
            {isLast || !item.to ? (
              <span className={isLast ? 'font-medium text-[var(--text)]' : ''}>{item.label}</span>
            ) : (
              <Link to={item.to} className="hover:text-brand-700 dark:hover:text-brand-300">
                {item.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
