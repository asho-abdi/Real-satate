import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  MdApartment,
  MdBusiness,
  MdDoorFront,
  MdEventAvailable,
  MdHotel,
  MdPayments,
  MdPeople,
  MdStorefront,
  MdWarningAmber,
} from 'react-icons/md';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import { rentalApi } from '../../services/rentalApi.js';
import { formatCurrency } from '../../utils/format.js';

const ICONS = {
  totalBuildings: MdBusiness,
  totalRooms: MdDoorFront,
  occupiedRooms: MdHotel,
  availableRooms: MdDoorFront,
  currentGuests: MdPeople,
  currentTenants: MdApartment,
  commercialShops: MdStorefront,
  monthlyRevenue: MdPayments,
  outstandingPayments: MdWarningAmber,
  todayCheckIns: MdEventAvailable,
  todayCheckOuts: MdEventAvailable,
};

const LABELS = {
  totalBuildings: 'Buildings',
  totalRooms: 'Rooms',
  occupiedRooms: 'Occupied',
  availableRooms: 'Available',
  currentGuests: 'Current Guests',
  currentTenants: 'Current Tenants',
  commercialShops: 'Shops',
  monthlyRevenue: 'Monthly Revenue',
  outstandingPayments: 'Outstanding',
  todayCheckIns: "Today's Check-ins",
  todayCheckOuts: "Today's Check-outs",
};

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [outstanding, setOutstanding] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [dash, guests, out, units] = await Promise.all([
          rentalApi.getDashboard(),
          rentalApi.listBookings(),
          rentalApi.getOutstandingReport(),
          rentalApi.listUnits(),
        ]);
        if (!alive) return;
        setStats(dash);
        setBookings(guests.slice(0, 5));
        setOutstanding((out.items || []).slice(0, 5).map((p) => ({
          id: p.id,
          name: p.tenant?.fullName || p.business?.businessName || '—',
          roomNumber:
            p.tenant?.unit?.roomNumber || p.business?.unit?.roomNumber || '—',
          month: p.month,
          amountDue: p.amountDue,
          amountPaid: p.amountPaid,
          status: p.status === 'UNPAID' ? 'Unpaid' : p.status === 'PARTIAL' ? 'Partial' : p.status,
        })));
        setRooms(units);
      } catch (err) {
        if (alive) setError(err.message || 'Failed to load dashboard');
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (error) {
    return (
      <div>
        <PageHeader title="Dashboard" subtitle={error} />
        <Card>
          <p className="text-sm text-[var(--text-muted)]">
            Start the API (`npm run dev:backend`) and sign in with{' '}
            <strong>admin@estateops.com</strong> / <strong>Admin@12345</strong>.
          </p>
        </Card>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Simple overview of your two buildings."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link to="/bookings?tab=new">
              <Button className="h-12 px-5 text-base">New Booking</Button>
            </Link>
            <Link to="/apartments">
              <Button variant="secondary" className="h-12 px-5 text-base">
                Apartments
              </Button>
            </Link>
            <Link to="/shops">
              <Button variant="secondary" className="h-12 px-5 text-base">
                Shops
              </Button>
            </Link>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Object.entries(LABELS).map(([key, label], index) => {
          const Icon = ICONS[key] || MdBusiness;
          const value = stats[key];
          const display =
            key.toLowerCase().includes('revenue') || key.toLowerCase().includes('outstanding')
              ? formatCurrency(value)
              : value;
          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
            >
              <Card className="h-full">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-[var(--text-muted)]">{label}</p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight">{display}</p>
                  </div>
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
                    <Icon className="text-xl" />
                  </span>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card title="Guest stays">
          <ul className="divide-y divide-[var(--border)]">
            {bookings.length === 0 ? (
              <li className="py-4 text-sm text-[var(--text-muted)]">No guest bookings yet.</li>
            ) : (
              bookings.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-medium">{b.fullName}</p>
                    <p className="text-sm text-[var(--text-muted)]">
                      {b.building} · {b.roomNumber} · {b.checkIn} → {b.checkOut}
                    </p>
                  </div>
                  <Badge status={b.status === 'CheckedIn' ? 'Occupied' : b.status}>
                    {b.status}
                  </Badge>
                </li>
              ))
            )}
          </ul>
        </Card>

        <Card
          title="Outstanding payments"
          action={
            <Link to="/outstanding" className="text-sm text-brand-700 dark:text-brand-300">
              View all
            </Link>
          }
        >
          <ul className="divide-y divide-[var(--border)]">
            {outstanding.length === 0 ? (
              <li className="py-4 text-sm text-[var(--text-muted)]">All clear.</li>
            ) : (
              outstanding.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-sm text-[var(--text-muted)]">
                      {p.roomNumber} · {p.month}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge status={p.status}>{p.status}</Badge>
                    <p className="mt-1 text-sm font-medium">
                      {formatCurrency(p.amountDue - p.amountPaid)}
                    </p>
                  </div>
                </li>
              ))
            )}
          </ul>
        </Card>
      </div>

      <Card className="mt-4" title="Room status snapshot">
        <div className="grid gap-2 sm:grid-cols-3">
          {['Available', 'Occupied', 'Reserved'].map((status) => (
            <div key={status} className="rounded-xl border border-[var(--border)] p-4">
              <p className="text-sm text-[var(--text-muted)]">{status}</p>
              <p className="mt-1 text-3xl font-semibold">
                {rooms.filter((r) => r.status === status).length}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
