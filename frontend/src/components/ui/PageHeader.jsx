import Breadcrumb from './Breadcrumb.jsx';

export default function PageHeader({ title, subtitle, breadcrumbs, actions, eyebrow, icon }) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0 space-y-2">
        {breadcrumbs ? <Breadcrumb items={breadcrumbs} /> : null}
        {eyebrow && !breadcrumbs ? <p className="eyebrow">{eyebrow}</p> : null}
        <div className="flex items-start gap-3">
          {icon ? (
            <span className="mt-0.5 hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--navy)] text-[var(--gold)] shadow-sm sm:flex [&_svg]:h-5 [&_svg]:w-5">
              {icon}
            </span>
          ) : null}
          <div className="min-w-0">
            <h1 className="page-title text-[22px] leading-tight md:text-[26px]">{title}</h1>
            {subtitle ? (
              <p className="mt-1 max-w-2xl text-[13.5px] leading-relaxed text-[var(--text-muted)]">{subtitle}</p>
            ) : null}
          </div>
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2 md:justify-end">{actions}</div> : null}
    </div>
  );
}
