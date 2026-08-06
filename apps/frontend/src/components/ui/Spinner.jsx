export default function Spinner({ label = 'Loading...' }) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center gap-3 text-[var(--text-muted)]">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-r-transparent" />
      <p className="text-sm">{label}</p>
    </div>
  );
}
