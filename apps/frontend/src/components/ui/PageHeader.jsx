import Breadcrumb from './Breadcrumb.jsx';

export default function PageHeader({ title, subtitle, breadcrumbs, actions }) {
  return (
    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="space-y-2">
        {breadcrumbs ? <Breadcrumb items={breadcrumbs} /> : null}
        <div>
          <h1 className="page-title text-3xl text-[var(--text)] md:text-4xl">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-[var(--text-muted)] md:text-base">{subtitle}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
