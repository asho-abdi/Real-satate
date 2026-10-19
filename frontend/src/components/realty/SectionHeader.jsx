export default function SectionHeader({ eyebrow, title, text, action, align = 'left' }) {
  return (
    <div
      className={`mb-8 flex flex-col gap-4 md:mb-10 ${
        align === 'center' ? 'items-center text-center' : 'md:flex-row md:items-end md:justify-between'
      }`}
    >
      <div className={align === 'center' ? 'max-w-2xl' : 'max-w-2xl'}>
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--primary)]">{eyebrow}</p>
        ) : null}
        <h2 className="page-title mt-2 text-3xl text-[var(--text-primary)] md:text-4xl">{title}</h2>
        {text ? <p className="mt-3 text-base leading-relaxed text-[var(--text-secondary)]">{text}</p> : null}
      </div>
      {action}
    </div>
  );
}
