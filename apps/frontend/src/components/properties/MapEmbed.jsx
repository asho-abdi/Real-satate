export default function MapEmbed({ lat, lng, address, height = 280 }) {
  if (lat == null || lng == null) {
    return (
      <div
        className="flex items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-2)] text-sm text-[var(--text-muted)]"
        style={{ height }}
      >
        Location unavailable
      </div>
    );
  }

  const query = encodeURIComponent(`${lat},${lng}`);
  const src = `https://maps.google.com/maps?q=${query}&z=15&output=embed`;

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)]">
      <iframe
        title={address || 'Property location'}
        src={src}
        width="100%"
        height={height}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="block border-0"
        allowFullScreen
      />
      {address ? (
        <p className="border-t border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 text-sm text-[var(--text-muted)]">
          {address}
        </p>
      ) : null}
    </div>
  );
}
