import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PropertyBadge, { statusTone } from '../../components/realty/PropertyBadge.jsx';
import PropertyGallery from '../../components/realty/PropertyGallery.jsx';
import { priceLabel } from '../../components/realty/listing.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { getPublicProperty } from '../../services/publicApi.js';

export default function PublicProperty() {
  const { id } = useParams();
  const { isAuthenticated } = useAuth();
  const [property, setProperty] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getPublicProperty(id)
      .then((row) => {
        if (alive) setProperty(row);
      })
      .catch((err) => {
        if (alive) setError(err.message || 'Property not found');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [id]);

  if (loading) {
    return <p className="px-6 py-20 text-sm text-[var(--text-secondary)]">Loading property…</p>;
  }

  if (error || !property) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-20">
        <p className="text-sm text-rose-600">{error || 'Property not found'}</p>
        <Link to="/properties" className="mt-4 inline-flex text-sm font-semibold text-[var(--primary)]">
          Back to properties
        </Link>
      </div>
    );
  }

  const location = [property.address, property.buildingName, property.floorName].filter(Boolean).join(' · ');

  return (
    <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:px-6 lg:grid-cols-[1.4fr_0.8fr]">
      <div>
        <PropertyGallery images={property.images} alt={property.name} />
        <div className="mt-6 flex flex-wrap gap-2">
          <PropertyBadge tone="soft">{property.typeLabel}</PropertyBadge>
          <PropertyBadge tone={statusTone(property.status)}>{property.statusLabel}</PropertyBadge>
        </div>
        <h1 className="page-title mt-4 text-4xl text-[var(--text-primary)]">{property.name}</h1>
        <p className="mt-2 text-[var(--text-secondary)]">{location}</p>
        <p className="mt-4 text-2xl font-semibold text-[var(--primary)]">{priceLabel(property)}</p>
        <p className="mt-6 max-w-3xl text-base leading-relaxed text-[var(--text-secondary)]">
          {property.description || 'The property team has not added a written description yet. The details below come from the unit record.'}
        </p>
      </div>
      <aside className="h-fit rounded-[1.75rem] border border-[var(--border)] bg-white p-6 shadow-[var(--shadow)]">
        <h2 className="text-lg font-semibold">Property information</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <Row label="Type" value={property.typeLabel} />
          <Row label="Unit" value={property.roomNumber} />
          <Row label="Availability" value={property.statusLabel} />
          <Row label="Offer" value={offerCopy(property)} />
          {property.facts?.map((fact) => (
            <Row key={fact} label="Detail" value={fact} />
          ))}
        </dl>
        <div className="mt-6 flex flex-col gap-3">
          <Link
            to={`/contact?property=${encodeURIComponent(property.name)}`}
            className="inline-flex h-12 items-center justify-center rounded-2xl bg-[var(--primary)] text-sm font-semibold text-white"
          >
            Contact / Inquire
          </Link>
          {isAuthenticated ? (
            <Link
              to={`/units/${property.id}`}
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-[var(--border)] text-sm font-semibold text-[var(--primary-dark)]"
            >
              Open lease profile
            </Link>
          ) : null}
        </div>
      </aside>
    </div>
  );
}

function offerCopy(property) {
  if (property.category === 'commercial-sale') return 'One-time purchase. Maintenance may apply after sale.';
  if (property.category === 'commercial-rent') return 'Company-owned shop. Tenant pays monthly rent.';
  if (property.category === 'commercial-both') return 'Available to purchase or to rent monthly.';
  if (property.usage === 'GUEST') return 'Guest stay billed daily, weekly, or monthly.';
  if (property.offer === 'purchase') return 'Offered for purchase.';
  return 'Offered for rent.';
}

function Row({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] pb-3">
      <dt className="text-[var(--text-secondary)]">{label}</dt>
      <dd className="text-right font-medium text-[var(--text-primary)]">{value}</dd>
    </div>
  );
}
