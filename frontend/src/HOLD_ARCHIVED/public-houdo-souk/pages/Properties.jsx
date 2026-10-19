import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import PropertyCard from '../../components/realty/PropertyCard.jsx';
import PropertySearch from '../../components/realty/PropertySearch.jsx';
import SectionHeader from '../../components/realty/SectionHeader.jsx';
import { filterListings } from '../../components/realty/listing.js';
import { useCatalog } from './useCatalog.js';

function readFilters(params) {
  return {
    q: params.get('q') || '',
    location: params.get('location') || '',
    type: params.get('type') || '',
    status: params.get('status') || '',
    minPrice: params.get('minPrice') || '',
    maxPrice: params.get('maxPrice') || '',
  };
}

export default function PropertiesPage() {
  const [params, setParams] = useSearchParams();
  const filters = readFilters(params);
  const [draft, setDraft] = useState(filters);
  const { data, error, loading } = useCatalog();

  const locations = useMemo(
    () => [...new Set((data?.buildings || []).map((building) => building.address || building.name).filter(Boolean))],
    [data],
  );

  const listings = useMemo(() => filterListings(data?.listings || [], filters), [data, filters]);
  const showBuildings = !filters.type || filters.type === 'building';
  const buildings = (data?.buildings || []).filter((building) => {
    if (filters.location) {
      const hay = `${building.name} ${building.address}`.toLowerCase();
      if (!hay.includes(filters.location.toLowerCase())) return false;
    }
    if (filters.q) {
      const hay = `${building.name} ${building.address} ${building.code}`.toLowerCase();
      if (!hay.includes(filters.q.toLowerCase())) return false;
    }
    return true;
  });

  const apply = (value) => {
    const next = new URLSearchParams();
    Object.entries(value).forEach(([key, entry]) => {
      if (entry) next.set(key, entry);
    });
    setParams(next);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-6">
      <SectionHeader
        eyebrow="Portfolio"
        title="Houdo Souk"
        text="Guest and Airbnb stays are listed first. Apartments, rental shops, and purchased shops in this building stay in their own groups."
      />
      <PropertySearch value={draft} onChange={setDraft} onSubmit={apply} locations={locations} />
      {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}
      {loading ? <p className="mt-8 text-sm text-[var(--text-secondary)]">Loading properties…</p> : null}

      {showBuildings && filters.type === 'building' ? (
        <div className="mt-10 grid gap-x-4 gap-y-10 md:grid-cols-2 xl:grid-cols-3">
          {buildings.map((building) => (
            <PropertyCard
              key={building.id}
              property={{
                ...building,
                typeLabel: 'Building',
                statusLabel: `${building.unitCount} units`,
                priceLabel: building.address || 'Portfolio property',
                href: `/properties?location=${encodeURIComponent(building.address || building.name)}`,
                facts: [`${building.unitCount} units`],
                images: building.image ? [{ url: building.image }] : [],
              }}
            />
          ))}
        </div>
      ) : null}

      {filters.type !== 'building' ? (
        <div className="mt-10 grid gap-x-4 gap-y-10 md:grid-cols-2 xl:grid-cols-3">
          {listings.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      ) : null}

      {!loading && filters.type !== 'building' && listings.length === 0 ? (
        <p className="mt-8 text-sm text-[var(--text-secondary)]">No properties match this search.</p>
      ) : null}
      {!loading && filters.type === 'building' && buildings.length === 0 ? (
        <p className="mt-8 text-sm text-[var(--text-secondary)]">No buildings match this search.</p>
      ) : null}
    </div>
  );
}
