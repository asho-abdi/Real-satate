import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  MdApartment,
  MdBolt,
  MdHotel,
  MdSearch,
  MdShield,
  MdStorefront,
  MdWifi,
} from 'react-icons/md';
import { mediaUrl } from '../../services/publicApi.js';
import { CATEGORY_FILTERS, STATUS_FILTERS } from '../../components/realty/listing.js';
import { ContactSection } from './sections.jsx';
import { useCatalog } from './useCatalog.js';

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1800&q=80';
const ROOM_IMAGE =
  'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=1200&q=80';
const FACADE_IMAGE =
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80';

const SERVICES = [
  {
    icon: MdHotel,
    title: 'Guest stays',
    text: 'Airbnb-style rooms at Houdo Souk, booked by the day, week, or month.',
  },
  {
    icon: MdShield,
    title: 'Clear terms',
    text: 'Each unit shows its real price, status, and whether it is a stay, home, or shop.',
  },
  {
    icon: MdBolt,
    title: 'Quick booking',
    text: 'Search the building, open a guest room, and send an inquiry the same day.',
    active: true,
  },
  {
    icon: MdApartment,
    title: 'Whole building',
    text: 'Apartments and shops sit in the same address when you want more than a short stay.',
  },
];

const FEATURES = [
  { icon: MdHotel, label: 'Daily stays' },
  { icon: MdWifi, label: 'Weekly stays' },
  { icon: MdApartment, label: 'Monthly stays' },
  { icon: MdShield, label: 'On-site support' },
];

export default function Home() {
  const navigate = useNavigate();
  const { data, error, loading } = useCatalog();
  const [query, setQuery] = useState('');
  const [type, setType] = useState('guest');
  const [status, setStatus] = useState('');
  const [area, setArea] = useState('');

  const stats = data?.stats;
  const photos = (data?.listings || []).flatMap((item) => item.images || []);
  const hero = photos[0]?.url ? mediaUrl(photos[0].url) : HERO_IMAGE;
  const room = photos[1]?.url ? mediaUrl(photos[1].url) : ROOM_IMAGE;
  const facade = photos[2]?.url ? mediaUrl(photos[2].url) : FACADE_IMAGE;
  const areas = [...new Set((data?.buildings || []).map((building) => building.address || building.name).filter(Boolean))];

  const search = (event) => {
    event?.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (type) params.set('type', type);
    if (status) params.set('status', status);
    if (area) params.set('location', area);
    navigate(`/properties${params.toString() ? `?${params}` : ''}`);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pb-8 md:px-6">
      <section className="relative overflow-hidden rounded-[28px] bg-[#2f6fed] text-white shadow-[0_20px_50px_rgba(47,111,237,0.18)]">
        <img src={hero} alt="Houdo Souk" className="absolute inset-0 h-full w-full object-cover" />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(100deg, #2f6fed 0%, rgba(47,111,237,0.92) 28%, rgba(47,111,237,0.45) 58%, rgba(47,111,237,0.05) 100%)',
          }}
        />
        <div className="relative px-6 py-10 sm:px-10 sm:py-14 lg:min-h-[460px] lg:px-12 lg:py-16">
          <h1 className="max-w-md text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
            Find Your
            <br />
            Dream Stay
            <br />
            at Houdo Souk
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-white/85 sm:text-base">
            Guest and Airbnb rooms come first. Stay by the day, the week, or the month, then look through the apartments and shops in the same building.
          </p>
          <form onSubmit={search} className="mt-8 flex max-w-xl flex-col gap-2 rounded-2xl bg-white p-2 shadow-lg sm:flex-row sm:items-center">
            <Link
              to="/contact"
              className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-[#2f6fed] px-4 text-sm font-semibold text-white"
            >
              Schedule a visit
            </Link>
            <select
              value={type}
              onChange={(event) => setType(event.target.value)}
              className="h-11 rounded-xl bg-transparent px-2 text-sm font-medium text-[#1c2434] outline-none"
              aria-label="Stay type"
            >
              {CATEGORY_FILTERS.filter((option) => option.value !== 'building').map((option) => (
                <option key={option.value || 'all'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Find a guest room"
              className="h-11 min-w-0 flex-1 bg-transparent px-2 text-sm text-[#1c2434] outline-none placeholder:text-[#98a2b3]"
            />
            <button type="submit" className="grid h-11 w-11 place-items-center rounded-xl text-[#2f6fed]" aria-label="Search">
              <MdSearch className="h-5 w-5" />
            </button>
          </form>
        </div>
      </section>

      <form onSubmit={search} className="mt-4 grid gap-3 rounded-[24px] bg-white px-4 py-4 shadow-[0_10px_30px_rgba(28,36,52,0.05)] sm:grid-cols-2 lg:grid-cols-4 lg:items-center">
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-[#98a2b3]">Choose area</span>
          <select value={area} onChange={(event) => setArea(event.target.value)} className="h-10 w-full bg-transparent font-medium text-[#1c2434] outline-none">
            <option value="">Nairobi</option>
            {areas.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-[#98a2b3]">Availability</span>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 w-full bg-transparent font-medium text-[#1c2434] outline-none">
            {STATUS_FILTERS.map((option) => (
              <option key={option.value || 'any'} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-semibold text-[#2f6fed]">Property type</span>
          <select value={type} onChange={(event) => setType(event.target.value)} className="h-10 w-full rounded-xl bg-[#e8f1ff] px-3 font-semibold text-[#2f6fed] outline-none">
            {CATEGORY_FILTERS.filter((option) => option.value !== 'building').map((option) => (
              <option key={option.value || 'all'} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <button type="submit" className="h-11 rounded-xl text-sm font-semibold text-[#2f6fed] lg:justify-self-end">
          Find now
        </button>
      </form>
      {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
      {loading ? <p className="mt-3 text-sm text-[#667085]">Loading Houdo Souk…</p> : null}

      <section id="services" className="py-14">
        <h2 className="text-center text-3xl font-bold tracking-tight text-[#1c2434]">What we do?</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map((item) => (
            <article
              key={item.title}
              className={`rounded-[22px] px-5 py-6 text-center shadow-[0_8px_24px_rgba(28,36,52,0.04)] ${
                item.active ? 'bg-[#2f6fed] text-white' : 'bg-[#f7f8fb] text-[#1c2434]'
              }`}
            >
              <span className={`mx-auto grid h-12 w-12 place-items-center rounded-full ${item.active ? 'bg-white/15' : 'bg-white text-[#2f6fed]'}`}>
                <item.icon className="h-6 w-6" />
              </span>
              <h3 className="mt-4 text-base font-semibold">{item.title}</h3>
              <p className={`mt-2 text-sm leading-relaxed ${item.active ? 'text-white/80' : 'text-[#667085]'}`}>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid items-center gap-8 pb-14 lg:grid-cols-2">
        <img src={room} alt="A room at Houdo Souk" className="h-72 w-full rounded-[24px] object-cover sm:h-96" />
        <div>
          <h2 className="text-3xl font-bold leading-tight tracking-tight text-[#1c2434] sm:text-4xl">
            Guest stays at Houdo Souk
          </h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-[#667085]">
            Most of this building is offered as a guest stay. Pick a period, check availability, and keep apartments and shops nearby when you need them.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            {FEATURES.map((feature) => (
              <div key={feature.label} className="flex items-center gap-2 rounded-2xl bg-[#e8f1ff] px-3 py-3 text-sm font-semibold text-[#2f6fed]">
                <feature.icon className="h-5 w-5 shrink-0" />
                {feature.label}
              </div>
            ))}
          </div>
          <Link to="/services" className="mt-6 inline-flex h-11 items-center rounded-xl bg-[#2f6fed] px-5 text-sm font-semibold text-white">
            Our services
          </Link>
        </div>
      </section>

      <section id="about" className="grid items-center gap-8 pb-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <h2 className="max-w-md text-3xl font-bold leading-tight tracking-tight text-[#1c2434] sm:text-4xl">
            We are ready to make your stay come true
          </h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-[#667085]">
            Houdo Souk is one building in Nairobi. These numbers come from the units already on record.
          </p>
          <Link to="/properties?type=guest" className="mt-5 inline-flex h-11 items-center rounded-xl bg-[#2f6fed] px-5 text-sm font-semibold text-white">
            See more
          </Link>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Stat label="Guest stays" value={stats ? stats.guest : '—'} />
            <Stat label="Open units" value={stats ? stats.availableUnits : '—'} />
            <Stat label="Apartments and shops" value={stats ? (stats.apartments || 0) + (stats.rentalShops || 0) + (stats.purchasedShops || 0) : '—'} />
          </div>
        </div>
        <div className="relative">
          <img src={facade} alt="Houdo Souk exterior" className="h-72 w-full rounded-[24px] object-cover sm:h-80" />
          <div className="absolute bottom-4 left-4 right-4 rounded-2xl bg-white/95 p-4 text-sm text-[#667085] shadow-lg sm:right-auto sm:max-w-xs">
            <MdStorefront className="mb-2 h-5 w-5 text-[#2f6fed]" />
            Guest rooms, apartments, and shops share this address. Start with a stay.
          </div>
        </div>
      </section>

      <ContactSection buildings={data?.buildings || []} />
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl bg-white px-3 py-3 shadow-[0_8px_24px_rgba(28,36,52,0.05)]">
      <p className="text-lg font-bold text-[#1c2434]">{value}</p>
      <p className="mt-1 text-xs leading-snug text-[#667085]">{label}</p>
    </div>
  );
}
