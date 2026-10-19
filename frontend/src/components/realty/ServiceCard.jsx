export default function ServiceCard({ icon: Icon, title, text }) {
  return (
    <article className="group rounded-[1.75rem] border border-[var(--border)] bg-white p-6 shadow-[var(--shadow)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(36,31,92,0.12)]">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--primary-light)] text-[var(--primary)] transition duration-300 group-hover:bg-[var(--primary)] group-hover:text-white">
        <Icon className="h-6 w-6" />
      </span>
      <h3 className="mt-5 text-lg font-semibold text-[var(--text-primary)]">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">{text}</p>
    </article>
  );
}
