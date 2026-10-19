import { Link } from 'react-router-dom';
import { mediaUrl } from '../../services/publicApi.js';
import { priceLabel } from './listing.js';
import PropertyBadge, { statusTone } from './PropertyBadge.jsx';

export default function PropertyCard({ property }) {
  const image = property.images?.[0]?.url || property.image;
  const location = [property.address, property.buildingName].filter(Boolean).join(' · ');
  const href = property.href || (property.id && property.roomNumber ? `/properties/${property.id}` : '/properties');

  return (
    <article className="group rise-in">
      <div className="relative overflow-hidden rounded-[1.75rem] bg-[var(--primary-light)]">
        <div className="aspect-[4/3]">
          {image ? (
            <img src={mediaUrl(image)} alt={property.name} className="img-zoom h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-[var(--primary-light)] to-[#ddd8f3] text-sm font-medium text-[var(--primary)]">
              Photo coming soon
            </div>
          )}
        </div>
        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          {property.typeLabel ? <PropertyBadge tone="brand">{property.typeLabel}</PropertyBadge> : null}
          {property.statusLabel ? (
            <PropertyBadge tone={statusTone(property.status)}>{property.statusLabel}</PropertyBadge>
          ) : null}
        </div>
      </div>
      <div className="relative z-10 mx-4 -mt-14 rounded-[1.5rem] border border-[var(--border)] bg-white p-5 shadow-[var(--shadow)]">
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">{property.name}</h3>
        {location ? <p className="mt-1 text-sm text-[var(--text-secondary)]">{location}</p> : null}
        <p className="mt-3 text-base font-semibold text-[var(--primary)]">{property.priceLabel || priceLabel(property)}</p>
        {property.facts?.length ? (
          <p className="mt-2 text-sm text-[var(--text-secondary)]">{property.facts.slice(0, 3).join(' · ')}</p>
        ) : property.meta ? (
          <p className="mt-2 text-sm text-[var(--text-secondary)]">{property.meta}</p>
        ) : null}
        <Link
          to={href}
          className="mt-4 inline-flex h-11 items-center justify-center rounded-2xl bg-[var(--primary)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--primary-dark)]"
        >
          View Property
        </Link>
      </div>
    </article>
  );
}
