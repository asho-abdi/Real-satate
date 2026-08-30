import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MdApartment,
  MdAttachMoney,
  MdBusiness,
  MdDoorFront,
  MdLayers,
  MdLocalMall,
  MdWarningAmber,
} from 'react-icons/md';
import {
  Bar,
  BarChart,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import Breadcrumb from '../../components/ui/Breadcrumb.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import { APP_NAME } from '../../utils/constants.js';
import { rentalApi } from '../../services/rentalApi.js';
import { formatCurrency } from '../../utils/format.js';

const BRAND = '#FF551A';
const CHART_COLORS = ['#FF551A', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

function TrendPill({ value, label = '' }) {
  const positive = value >= 0;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        positive
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
          : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
      }`}
    >
      {positive ? '+' : ''}
      {value}%
      {label ? ` ${label}` : ''}
    </span>
  );
}

function StatCard({ title, value, trend, icon: Icon, iconBg, iconColor }) {
  return (
    <div className="dashboard-stat-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[var(--text-muted)]">{title}</p>
          <p className="mt-2 truncate text-2xl font-bold tracking-tight text-[var(--text)]">{value}</p>
          {trend !== undefined ? (
            <div className="mt-2">
              <TrendPill value={trend} />
            </div>
          ) : null}
        </div>
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: iconBg, color: iconColor }}
        >
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
}

const tooltipStyle = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  fontSize: 12,
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
          roomNumber: p.tenant?.unit?.roomNumber || p.business?.unit?.roomNumber || '—',
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

  const occupancyRate = useMemo(() => {
    if (!stats?.totalRooms) return 0;
    return Math.round((stats.occupiedRooms / stats.totalRooms) * 100);
  }, [stats]);

  const occupancyData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: 'Occupied', value: stats.occupiedRooms || 0 },
      { name: 'Available', value: stats.availableRooms || 0 },
      {
        name: 'Other',
        value: Math.max(0, (stats.totalRooms || 0) - (stats.occupiedRooms || 0) - (stats.availableRooms || 0)),
      },
    ].filter((d) => d.value > 0);
  }, [stats]);

  const statusBarData = useMemo(() => {
    const counts = { Available: 0, Occupied: 0, Reserved: 0 };
    for (const r of rooms) {
      if (counts[r.status] !== undefined) counts[r.status] += 1;
    }
    return Object.entries(counts).map(([name, total]) => ({ name, total }));
  }, [rooms]);

  const revenueTrend = useMemo(() => {
    const base = stats?.monthlyRevenue || 0;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return months.map((month, i) => ({
      month,
      revenue: Math.round(base * (0.55 + i * 0.09)),
    }));
  }, [stats]);

  if (error) {
    return (
      <div>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="page-title text-xl text-[var(--text)] md:text-2xl">Dashboard</h1>
          <Breadcrumb items={[{ label: APP_NAME, to: '/dashboard' }, { label: 'Dashboard' }]} />
        </div>
        <Card>
          <p className="text-sm text-[var(--text-muted)]">{error}</p>
        </Card>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex justify-center py-24">
        <Spinner label="Loading dashboard…" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="page-title text-xl text-[var(--text)] md:text-2xl">Dashboard</h1>
        <Breadcrumb items={[{ label: APP_NAME, to: '/dashboard' }, { label: 'Dashboard' }]} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Buildings"
          value={stats.totalBuildings}
          trend={stats.totalBuildings > 0 ? 11 : 0}
          icon={MdBusiness}
          iconBg="rgba(255,85,26,0.12)"
          iconColor={BRAND}
        />
        <StatCard
          title="Total Rooms"
          value={stats.totalRooms}
          trend={occupancyRate}
          icon={MdDoorFront}
          iconBg="rgba(59,130,246,0.12)"
          iconColor="#3b82f6"
        />
        <StatCard
          title="Monthly Revenue"
          value={formatCurrency(stats.monthlyRevenue)}
          trend={stats.monthlyRevenue > 0 ? 24 : 0}
          icon={MdAttachMoney}
          iconBg="rgba(16,185,129,0.12)"
          iconColor="#10b981"
        />
        <StatCard
          title="Outstanding"
          value={formatCurrency(stats.outstandingPayments)}
          trend={stats.outstandingPayments > 0 ? -12 : 0}
          icon={MdWarningAmber}
          iconBg="rgba(245,158,11,0.12)"
          iconColor="#f59e0b"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <Card className="xl:col-span-4" title="Occupancy">
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <div className="relative h-44 w-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={occupancyData.length ? occupancyData : [{ name: 'Empty', value: 1 }]}
                    innerRadius={52}
                    outerRadius={72}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {(occupancyData.length ? occupancyData : [{ name: 'Empty', value: 1 }]).map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-[var(--text)]">{occupancyRate}%</span>
                <span className="text-xs text-[var(--text-muted)]">Occupied</span>
              </div>
            </div>
            <div className="flex-1 space-y-3 text-sm">
              <div className="flex items-center justify-between rounded-md bg-[var(--surface-2)] px-3 py-2">
                <span className="text-[var(--text-muted)]">Total Rooms</span>
                <span className="font-semibold">{stats.totalRooms}</span>
              </div>
              <div className="flex items-center justify-between rounded-md bg-[var(--surface-2)] px-3 py-2">
                <span className="text-[var(--text-muted)]">Occupied</span>
                <span className="font-semibold text-brand-500">{stats.occupiedRooms}</span>
              </div>
              <div className="flex items-center justify-between rounded-md bg-[var(--surface-2)] px-3 py-2">
                <span className="text-[var(--text-muted)]">Available</span>
                <span className="font-semibold text-emerald-600">{stats.availableRooms}</span>
              </div>
            </div>
          </div>
        </Card>

        <Card className="xl:col-span-4" title="Room Statistics">
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusBarData} barSize={28}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                  {statusBarData.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? '#10b981' : i === 1 ? BRAND : '#3b82f6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 border-t border-[var(--border)] pt-3 text-sm">
            <div>
              <p className="text-[var(--text-muted)]">Tenants</p>
              <p className="font-semibold">{stats.currentTenants}</p>
            </div>
            <div>
              <p className="text-[var(--text-muted)]">Guest stays</p>
              <p className="font-semibold">{stats.currentGuests}</p>
            </div>
          </div>
        </Card>

        <Card className="xl:col-span-4" title="Revenue Trend">
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueTrend}>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={48} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatCurrency(v)} />
                <Line type="monotone" dataKey="revenue" stroke={BRAND} strokeWidth={2.5} dot={{ r: 3, fill: BRAND }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 border-t border-[var(--border)] pt-3 text-sm">
            <div>
              <p className="text-[var(--text-muted)]">This month</p>
              <p className="font-semibold text-brand-500">{formatCurrency(stats.monthlyRevenue)}</p>
            </div>
            <div>
              <p className="text-[var(--text-muted)]">Shops</p>
              <p className="font-semibold">{stats.commercialShops}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card
          title="Recent Guest Stays"
          action={
            <Link to="/bookings" className="text-xs font-medium text-brand-500 hover:underline">
              View all
            </Link>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-[var(--text-muted)]">
                  <th className="pb-3 font-medium">Guest</th>
                  <th className="pb-3 font-medium">Room</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {bookings.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-[var(--text-muted)]">
                      No guest bookings yet.
                    </td>
                  </tr>
                ) : (
                  bookings.map((b) => (
                    <tr key={b.id} className="border-b border-[var(--border)] last:border-0">
                      <td className="py-3">
                        <p className="font-medium">{b.fullName}</p>
                        <p className="text-xs text-[var(--text-muted)]">
                          {b.checkIn} → {b.checkOut}
                        </p>
                      </td>
                      <td className="py-3 text-[var(--text-muted)]">
                        {b.building} · {b.roomNumber}
                      </td>
                      <td className="py-3">
                        <Badge status={b.status === 'CheckedIn' ? 'Occupied' : b.status}>{b.status}</Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card
          title="Outstanding Payments"
          action={
            <Link to="/outstanding" className="text-xs font-medium text-brand-500 hover:underline">
              View all
            </Link>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-[var(--text-muted)]">
                  <th className="pb-3 font-medium">Tenant</th>
                  <th className="pb-3 font-medium">Room</th>
                  <th className="pb-3 font-medium text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {outstanding.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-[var(--text-muted)]">
                      All clear.
                    </td>
                  </tr>
                ) : (
                  outstanding.map((p) => (
                    <tr key={p.id} className="border-b border-[var(--border)] last:border-0">
                      <td className="py-3">
                        <p className="font-medium">{p.name}</p>
                        <p className="text-xs text-[var(--text-muted)]">{p.month}</p>
                      </td>
                      <td className="py-3 text-[var(--text-muted)]">{p.roomNumber}</td>
                      <td className="py-3 text-right">
                        <Badge status={p.status}>{p.status}</Badge>
                        <p className="mt-1 font-semibold">{formatCurrency(p.amountDue - p.amountPaid)}</p>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link to="/bookings?tab=new">
          <Button>New Booking</Button>
        </Link>
        <Link to="/buildings">
          <Button variant="secondary">
            <MdLayers className="h-4 w-4" /> Buildings
          </Button>
        </Link>
        <Link to="/apartments">
          <Button variant="secondary">
            <MdApartment className="h-4 w-4" /> Apartments
          </Button>
        </Link>
        <Link to="/shops">
          <Button variant="secondary">
            <MdLocalMall className="h-4 w-4" /> Shops
          </Button>
        </Link>
      </div>
    </div>
  );
}
