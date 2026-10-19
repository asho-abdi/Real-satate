import { Link } from 'react-router-dom';
import {
  MdApartment,
  MdHotel,
  MdStorefront,
  MdVpnKey,
} from 'react-icons/md';
import CategoryCard from '../../components/realty/CategoryCard.jsx';
import PropertyCard from '../../components/realty/PropertyCard.jsx';
import SectionHeader from '../../components/realty/SectionHeader.jsx';
import ServiceCard from '../../components/realty/ServiceCard.jsx';
import StatCard from '../../components/realty/StatCard.jsx';
import { mediaUrl } from '../../services/publicApi.js';

const SERVICES = [
  {
    icon: MdHotel,
    title: 'Guest / Airbnb',
    text: 'The main way to stay at Houdo Souk. Book a guest room by the day, the week, or the month.',
  },
  {
    icon: MdApartment,
    title: 'Apartments',
    text: 'Homes inside Houdo Souk for longer residential leases, from studios to larger flats.',
  },
  {
    icon: MdStorefront,
    title: 'Rental Shops',
    text: 'Shops in the building that stay with the owner. Tenants pay monthly rent.',
  },
  {
    icon: MdVpnKey,
    title: 'Purchased Shops',
    text: 'Commercial units in Houdo Souk that a buyer purchases once, with maintenance after the sale.',
  },
];

export function categoryCards(data) {
  const listings = data?.listings || [];
  const stats = data?.stats || {};
  const imageFor = (predicate) => listings.find((item) => predicate(item) && item.images?.[0])?.images?.[0]?.url;
  return [
    {
      title: 'Guest / Airbnb',
      description: 'Daily, weekly, and monthly stays at Houdo Souk',
      count: `${stats.guest || 0} guest stays`,
      image: imageFor((item) => item.category === 'guest'),
      to: '/properties?type=guest',
      featured: true,
    },
    {
      title: 'Apartments',
      description: 'Residential homes in the building',
      count: `${stats.apartments || 0} apartments`,
      image: imageFor((item) => item.category === 'apartment'),
      to: '/properties?type=apartment',
    },
    {
      title: 'Rental Shops',
      description: 'Company-owned shops, leased monthly',
      count: `${stats.rentalShops || 0} shops`,
      image: imageFor((item) => item.category === 'commercial-rent' || item.category === 'commercial-both'),
      to: '/properties?type=commercial-rent',
    },
    {
      title: 'Commercial Shops',
      description: 'Buy the unit, then pay maintenance',
      count: `${stats.purchasedShops || 0} units`,
      image: imageFor((item) => item.category === 'commercial-sale' || item.category === 'commercial-both'),
      to: '/properties?type=commercial-sale',
    },
  ];
}

export function CategorySection({ data }) {
  return (
    <section id="categories" className="mx-auto max-w-7xl px-4 py-16 md:px-6">
      <SectionHeader
        eyebrow="Houdo Souk"
        title="Find the right stay in the building"
        text="Guest and Airbnb stays come first. Apartments and shops in Houdo Souk are listed separately."
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {categoryCards(data).map((category) => (
          <div key={category.title} className={category.featured ? 'md:col-span-2 xl:col-span-2 xl:row-span-2' : ''}>
            <CategoryCard {...category} />
          </div>
        ))}
      </div>
    </section>
  );
}

export function AboutSection({ data }) {
  const stats = data?.stats;
  const photos = (data?.listings || []).flatMap((item) => item.images || []).slice(0, 4);
  const cards = [
    { label: 'Guest stays', value: stats ? stats.guest : '—', hint: 'Airbnb-style units' },
    { label: 'Available', value: stats ? stats.availableUnits : '—', hint: 'Open in Houdo Souk' },
    { label: 'Apartments', value: stats ? stats.apartments : '—', hint: 'Residential homes' },
    { label: 'Shops', value: stats ? (stats.rentalShops || 0) + (stats.purchasedShops || 0) : '—', hint: 'Rental and purchased' },
  ];

  return (
    <section id="about" className="bg-[var(--primary-light)]/70">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 md:px-6 lg:grid-cols-2 lg:py-20">
        <div>
          <SectionHeader
            eyebrow="About the building"
            title="Houdo Souk"
            text="This site is Houdo Souk in Nairobi. Most of what you can book here is a guest or Airbnb stay, by the day, week, or month. The same building also has apartments and shops."
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {cards.map((card) => (
              <StatCard key={card.label} {...card} />
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {photos.length ? (
            photos.map((photo, index) => (
              <img
                key={photo.id || photo.url}
                src={mediaUrl(photo.url)}
                alt=""
                className={`h-40 w-full rounded-[1.5rem] object-cover shadow-[var(--shadow)] md:h-52 ${
                  index === 0 ? 'sm:row-span-2 sm:h-full' : ''
                }`}
              />
            ))
          ) : (
            <div className="col-span-2 flex min-h-64 items-center justify-center rounded-[1.75rem] bg-white text-sm text-[var(--text-secondary)]">
              Property photos appear here once units have images.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export function ServicesSection() {
  return (
    <section id="services" className="mx-auto max-w-7xl px-4 py-16 md:px-6">
      <SectionHeader
        eyebrow="Houdo Souk"
        title="Our services"
        text="Guest stays are the main offer. Apartments and shops in the same building are available alongside them."
        align="center"
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {SERVICES.map((service) => (
          <ServiceCard key={service.title} {...service} />
        ))}
      </div>
    </section>
  );
}

export function DiscoverSection({ listings = [] }) {
  const guest = listings.filter((item) => item.category === 'guest');
  const rest = listings.filter((item) => item.category !== 'guest');
  return (
    <section id="discover" className="bg-white">
      <div className="mx-auto max-w-7xl px-4 py-16 md:px-6">
        <SectionHeader
          eyebrow="Guest / Airbnb"
          title="Stay at Houdo Souk"
          text="Guest rooms are the focus of this building. Rates can be daily, weekly, or monthly, and every card is a real unit."
          action={
            <Link
              to="/properties?type=guest"
              className="inline-flex h-11 items-center rounded-2xl bg-[var(--primary)] px-5 text-sm font-semibold text-white"
            >
              Explore guest stays
            </Link>
          }
        />
        {guest.length === 0 ? (
          <p className="rounded-[1.5rem] border border-dashed border-[var(--border)] bg-[var(--primary-light)] px-6 py-12 text-center text-sm text-[var(--text-secondary)]">
            Guest stays at Houdo Souk will appear here as soon as a unit is marked Guest / Airbnb.
          </p>
        ) : (
          <div className="grid gap-x-4 gap-y-10 md:grid-cols-2 xl:grid-cols-3">
            {guest.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        )}

        <div className="mt-16">
          <SectionHeader
            eyebrow="The rest of the building"
            title="Apartments and shops"
            text="Houdo Souk is more than guest rooms. These are the apartments and shops in the same building."
            action={
              <Link to="/properties" className="text-sm font-semibold text-[var(--primary)]">
                View all units
              </Link>
            }
          />
          {rest.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)]">No other units are listed in Houdo Souk yet.</p>
          ) : (
            <div className="grid gap-x-4 gap-y-10 md:grid-cols-2 xl:grid-cols-3">
              {rest.slice(0, 6).map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export function ContactSection({ buildings = [], preset = '' }) {
  return (
    <section id="contact" className="mx-auto max-w-7xl px-4 py-16 md:px-6">
      <div className="grid gap-8 rounded-[2rem] bg-[var(--primary-dark)] px-6 py-10 text-white md:px-10 lg:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">Contact</p>
          <h2 className="page-title mt-2 text-3xl md:text-4xl">Visit Houdo Souk</h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-white/75">
            Ask about a guest stay, an apartment, or a shop in Houdo Souk. Sign in if you already manage a booking or lease.
            {preset ? ` You were looking at ${preset}.` : ''}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/login" className="inline-flex h-11 items-center rounded-2xl bg-white px-5 text-sm font-semibold text-[var(--primary-dark)]">
              Login
            </Link>
            <Link to="/properties?type=guest" className="inline-flex h-11 items-center rounded-2xl border border-white/30 px-5 text-sm font-semibold text-white">
              Explore guest stays
            </Link>
          </div>
        </div>
        <div className="space-y-3">
          {buildings.length === 0 ? (
            <p className="text-sm text-white/70">Property addresses will appear when buildings are added.</p>
          ) : (
            buildings.map((building) => (
              <div key={building.id} className="rounded-2xl bg-white/10 px-4 py-3">
                <p className="font-semibold">{building.name}</p>
                <p className="mt-1 text-sm text-white/75">{building.address || 'Address on file with the property team'}</p>
                <p className="mt-1 text-xs text-white/60">{building.unitCount} units</p>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
