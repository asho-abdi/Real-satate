export default function StatCard({ label, value, hint }) {
  return (
    <div className="rounded-3xl border border-[var(--border)] bg-white p-5 shadow-[var(--shadow)] transition duration-300 hover:-translate-y-0.5">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">{label}</p>
      <p className="page-title mt-2 text-3xl text-[var(--primary-dark)]">{value}</p>
      {hint ? <p className="mt-1 text-sm text-[var(--text-secondary)]">{hint}</p> : null}
    </div>
  );
}
