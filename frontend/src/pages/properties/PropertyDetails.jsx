import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  MdArrowBack,
  MdBathtub,
  MdBed,
  MdSquareFoot,
  MdLocationOn,
} from 'react-icons/md';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import PropertyGallery from '../../components/properties/PropertyGallery.jsx';
import AmenitiesList from '../../components/properties/AmenitiesList.jsx';
import PriceHistoryChart from '../../components/properties/PriceHistoryChart.jsx';
import MapEmbed from '../../components/properties/MapEmbed.jsx';
import { getProperty, getOwner, getAgent } from '../../services/dataService.js';
import { formatCurrency, formatDate } from '../../utils/format.js';

export default function PropertyDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [property, setProperty] = useState(null);
  const [owner, setOwner] = useState(null);
  const [agent, setAgent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await getProperty(id);
        if (cancelled) return;
        setProperty(data);

        const [ownerData, agentData] = await Promise.all([
          data.ownerId ? getOwner(data.ownerId).catch(() => null) : null,
          data.agentId ? getAgent(data.agentId).catch(() => null) : null,
        ]);
        if (cancelled) return;
        setOwner(ownerData);
        setAgent(agentData);
      } catch (err) {
        if (!cancelled) {
          setError(err.status === 404 ? 'Property not found' : err.message || 'Failed to load property');
          setProperty(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) return <Spinner label="Loading property..." />;

  if (error || !property) {
    return (
      <EmptyState
        title={error || 'Property not found'}
        description="The listing may have been removed or the link is invalid."
        action={
          <Button onClick={() => navigate('/properties')}>
            <MdArrowBack /> Back to properties
          </Button>
        }
      />
    );
  }

  return (
    <div>
      <PageHeader
        title={property.title}
        subtitle={`${property.code} · ${property.city}`}
        breadcrumbs={[
          { label: 'Inventory', to: '/properties' },
          { label: 'Properties', to: '/properties' },
          { label: property.code },
        ]}
        actions={
          <Button variant="secondary" onClick={() => navigate('/properties')}>
            <MdArrowBack /> Back
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <PropertyGallery images={property.images} title={property.title} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="space-y-4"
        >
          <Card>
            <div className="flex flex-wrap items-center gap-2">
              <Badge status={property.status}>{property.status}</Badge>
              <span className="rounded-full bg-[var(--surface-2)] px-2.5 py-1 text-xs text-[var(--text-muted)]">
                {property.category}
              </span>
              <span className="rounded-full bg-[var(--surface-2)] px-2.5 py-1 text-xs text-[var(--text-muted)]">
                {property.type}
              </span>
            </div>

            <div className="mt-4">
              <p className="text-sm text-[var(--text-muted)]">Sale price</p>
              <p className="page-title text-3xl text-[var(--text)]">
                {formatCurrency(property.price)}
              </p>
              {property.rent > 0 ? (
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Rent: {formatCurrency(property.rent)}/yr
                </p>
              ) : null}
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-[var(--surface-2)] p-3 text-center">
                <MdBed className="mx-auto text-[var(--accent)]" />
                <p className="mt-1 text-sm font-semibold">{property.bedrooms || '—'}</p>
                <p className="text-xs text-[var(--text-muted)]">Beds</p>
              </div>
              <div className="rounded-xl bg-[var(--surface-2)] p-3 text-center">
                <MdBathtub className="mx-auto text-[var(--accent)]" />
                <p className="mt-1 text-sm font-semibold">{property.bathrooms || '—'}</p>
                <p className="text-xs text-[var(--text-muted)]">Baths</p>
              </div>
              <div className="rounded-xl bg-[var(--surface-2)] p-3 text-center">
                <MdSquareFoot className="mx-auto text-[var(--accent)]" />
                <p className="mt-1 text-sm font-semibold">{property.area?.toLocaleString() || '—'}</p>
                <p className="text-xs text-[var(--text-muted)]">Sqft</p>
              </div>
            </div>

            <p className="mt-4 flex items-start gap-2 text-sm text-[var(--text-muted)]">
              <MdLocationOn className="mt-0.5 shrink-0 text-[var(--accent)]" />
              {property.address}
            </p>
            <p className="mt-2 text-xs text-[var(--text-muted)]">Listed {formatDate(property.createdAt)}</p>
          </Card>

          <Card title="People">
            <div className="space-y-4">
              <PersonRow
                label="Owner"
                name={owner?.name || property.owner}
                email={owner?.email}
                phone={owner?.phone}
                avatar={owner?.avatar}
                link={owner ? `/owners/${owner.id}` : null}
              />
              <PersonRow
                label="Agent"
                name={agent?.name || property.agent}
                email={agent?.email}
                phone={agent?.phone}
                avatar={agent?.avatar}
                meta={agent?.specialization}
                link={agent ? `/agents/${agent.id}` : null}
              />
            </div>
          </Card>
        </motion.div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card title="Description">
          <p className="text-sm leading-relaxed text-[var(--text-muted)]">{property.description}</p>
        </Card>
        <Card title="Amenities">
          <AmenitiesList amenities={property.amenities} />
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card title="Price history">
          <PriceHistoryChart priceHistory={property.priceHistory} />
        </Card>
        <Card title="Location">
          <MapEmbed lat={property.lat} lng={property.lng} address={property.address} />
        </Card>
      </div>
    </div>
  );
}

function PersonRow({ label, name, email, phone, avatar, meta, link }) {
  const content = (
    <div className="flex items-center gap-3">
      {avatar ? (
        <img src={avatar} alt="" className="h-11 w-11 rounded-full object-cover" />
      ) : (
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--accent-soft)] text-sm font-semibold text-[var(--accent)]">
          {(name || '?').charAt(0)}
        </div>
      )}
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">{label}</p>
        <p className="truncate font-medium text-[var(--text)]">{name || '—'}</p>
        {meta ? <p className="truncate text-xs text-[var(--text-muted)]">{meta}</p> : null}
        {email ? <p className="truncate text-xs text-[var(--text-muted)]">{email}</p> : null}
        {phone ? <p className="truncate text-xs text-[var(--text-muted)]">{phone}</p> : null}
      </div>
    </div>
  );

  if (link) {
    return (
      <Link to={link} className="block rounded-xl p-2 transition hover:bg-[var(--surface-2)]">
        {content}
      </Link>
    );
  }
  return content;
}
