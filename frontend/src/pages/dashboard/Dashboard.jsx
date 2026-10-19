import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MdApartment,
  MdAttachMoney,
  MdBusiness,
  MdDoorFront,
  MdLayers,
  MdBuild,
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

const BRAND = '#3B3486';
const CHART_COLORS = ['#3B3486', '#5B4DB8', '#0F9F6E', '#D97706', '#241F5C'];

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
  const [workSummary, setWorkSummary] = useState(null);
  const [shopSales, setShopSales] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [dash, guests, out, units, work, sales] = await Promise.all([
          rentalApi.getDashboard(),
          rentalApi.listBookings(),
          rentalApi.getOutstandingReport(),
          rentalApi.listUnits(),
          rentalApi.getWorkProjectSummary().catch(() => null),
          rentalApi.listShopSales().catch(() => []),
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
        setWorkSummary(work);
        setShopSales(sales || []);
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
    const counts = { Available: 0, Rented: 0, Reserved: 0, Sold: 0, Maintenance: 0 };
    for (const r of rooms) {
      const key = r.status === 'Occupied' ? 'Rented' : r.status;
      if (counts[key] !== undefined) counts[key] += 1;
    }
    return Object.entries(counts)
      .filter(([, total]) => total > 0)
      .map(([name, total]) => ({ name, total }));
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
          title="Total Properties"
          value={stats.totalBuildings}
          icon={MdBusiness}
          iconBg="rgba(59,52,134,0.12)"
          iconColor={BRAND}
        />
        <StatCard
          title="For Sale"
          value={stats.forSale ?? 0}
          icon={MdLocalMall}
          iconBg="rgba(139,92,246,0.12)"
          iconColor="#8b5cf6"
        />
        <StatCard
          title="For Rent"
          value={stats.forRent ?? 0}
          icon={MdApartment}
          iconBg="rgba(59,130,246,0.12)"
          iconColor="#3b82f6"
        />
        <StatCard
          title="Available Units"
          value={stats.availableRooms}
          icon={MdDoorFront}
          iconBg="rgba(16,185,129,0.12)"
          iconColor="#10b981"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Rental Income"
          value={formatCurrency(stats.totalRentalIncome || stats.monthlyRevenue || 0)}
          icon={MdAttachMoney}
          iconBg="rgba(16,185,129,0.12)"
          iconColor="#10b981"
        />
        <StatCard
          title="Total Sales"
          value={formatCurrency(stats.totalSales || 0)}
          icon={MdLocalMall}
          iconBg="rgba(139,92,246,0.12)"
          iconColor="#8b5cf6"
        />
        <StatCard
          title="Maintenance spent"
          value={formatCurrency(stats.maintenanceSpent || 0)}
          icon={MdBuild}
          iconBg="rgba(244,63,94,0.12)"
          iconColor="#f43f5e"
        />
        <StatCard
          title="Net revenue"
          value={formatCurrency(
            stats.netRevenue ??
              (stats.totalRentalIncome || stats.monthlyRevenue || 0) - (stats.maintenanceSpent || 0),
          )}
          icon={MdAttachMoney}
          iconBg="rgba(16,185,129,0.12)"
          iconColor="#10b981"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Expenses"
          value={formatCurrency(stats.totalExpenses || 0)}
          icon={MdLayers}
          iconBg="rgba(245,158,11,0.12)"
          iconColor="#f59e0b"
        />
        <StatCard
          title="Outstanding"
          value={formatCurrency(stats.outstandingPayments)}
          icon={MdWarningAmber}
          iconBg="rgba(244,63,94,0.12)"
          iconColor="#f43f5e"
        />
        <StatCard title="Current Guests" value={stats.currentGuests} icon={MdApartment} iconBg="rgba(59,130,246,0.12)" iconColor="#3b82f6" />
        <StatCard title="Active Bookings" value={stats.activeBookings ?? 0} icon={MdDoorFront} iconBg="rgba(59,52,134,0.12)" iconColor={BRAND} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Upcoming Check-ins" value={stats.upcomingCheckIns ?? stats.todayCheckIns} icon={MdBusiness} iconBg="rgba(16,185,129,0.12)" iconColor="#10b981" />
        <StatCard title="Upcoming Check-outs" value={stats.upcomingCheckOuts ?? stats.todayCheckOuts} icon={MdWarningAmber} iconBg="rgba(245,158,11,0.12)" iconColor="#f59e0b" />
        <StatCard title="Sold Shops" value={shopSales.length} icon={MdLocalMall} iconBg="rgba(139,92,246,0.12)" iconColor="#8b5cf6" />
        <StatCard title="Maintenance jobs" value={stats.maintenanceCount ?? 0} icon={MdBuild} iconBg="rgba(59,52,134,0.12)" iconColor={BRAND} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard title="WP Active" value={workSummary?.inProgress ?? 0} icon={MdLayers} iconBg="rgba(59,52,134,0.12)" iconColor={BRAND} />
        <StatCard title="WP Planning" value={workSummary?.planning ?? 0} icon={MdBusiness} iconBg="rgba(59,130,246,0.12)" iconColor="#3b82f6" />
        <StatCard title="WP Completed" value={workSummary?.completed ?? 0} icon={MdApartment} iconBg="rgba(16,185,129,0.12)" iconColor="#10b981" />
      </div>

      <div className="mb-1 grid gap-4 sm:grid-cols-2">
        <Card
          title="Property maintenance"
          action={
            <Link to="/maintenance" className="text-xs font-medium text-brand-500 hover:underline">
              Open Maintenance
            </Link>
          }
        >
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-lg bg-[var(--surface-2)] p-2">
              <p className="font-bold text-[var(--text)]">{stats.maintenanceCount ?? 0}</p>
              <p className="text-[var(--text-muted)]">Jobs</p>
            </div>
            <div className="rounded-lg bg-[var(--surface-2)] p-2">
              <p className="font-bold text-rose-600">{formatCurrency(stats.maintenanceSpent || 0)}</p>
              <p className="text-[var(--text-muted)]">Spent</p>
            </div>
            <div className="rounded-lg bg-[var(--surface-2)] p-2">
              <p className="font-bold text-rose-600">{formatCurrency(stats.maintenanceThisMonth || 0)}</p>
              <p className="text-[var(--text-muted)]">This month</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-[var(--text-muted)]">
            Net revenue after maintenance:{' '}
            <span className="font-semibold text-emerald-600">
              {formatCurrency(
                stats.netRevenue ??
                  (stats.totalRentalIncome || stats.monthlyRevenue || 0) - (stats.maintenanceSpent || 0),
              )}
            </span>
          </p>
        </Card>
        <Card
          title="Money movements"
          action={
            <Link to="/expenses" className="text-xs font-medium text-brand-500 hover:underline">
              View all
            </Link>
          }
        >
          <p className="text-2xl font-bold text-[var(--text)]">{formatCurrency(stats.totalExpenses || 0)}</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            This month: {formatCurrency(stats.expensesThisMonth || 0)} · Includes maintenance linked as
            finance spend
          </p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card
          title="Working Progress"
          className="lg:col-span-1"
          action={
            <Link to="/work-progress" className="text-xs font-medium text-brand-500 hover:underline">
              View all
            </Link>
          }
        >
          {(workSummary?.recent || []).length === 0 && !(stats.activeWork || []).length ? (
            <p className="text-sm text-[var(--text-muted)]">No projects yet. Open Working Progress to create one.</p>
          ) : (
            <ul className="space-y-3">
              {(workSummary?.recent || []).length
                ? workSummary.recent.map((w) => (
                    <li key={w.id} className="flex items-center justify-between gap-2 text-sm">
                      <Link to={`/work-progress/${w.id}`} className="font-medium text-[var(--text)] hover:text-brand-500">
                        {w.name}
                      </Link>
                      <Badge status={w.status}>{String(w.status || '').replace(/_/g, ' ')}</Badge>
                    </li>
                  ))
                : (stats.activeWork || []).map((w) => (
                    <li key={w.id}>
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="font-medium text-[var(--text)]">
                          {w.unit ? `Unit ${w.unit}` : w.building} — {w.title}
                        </span>
                        <span className="text-[var(--text-muted)]">{w.progressPercent || 0}%</span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--primary-light)]">
                        <div
                          className="h-full rounded-full bg-[var(--primary)]"
                          style={{ width: `${Math.min(100, Number(w.progressPercent) || 0)}%` }}
                        />
                      </div>
                    </li>
                  ))}
            </ul>
          )}
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-lg bg-[var(--surface-2)] p-2">
              <p className="font-bold text-[var(--text)]">{workSummary?.inProgress ?? stats.workActive ?? 0}</p>
              <p className="text-[var(--text-muted)]">Active</p>
            </div>
            <div className="rounded-lg bg-[var(--surface-2)] p-2">
              <p className="font-bold text-[var(--text)]">{workSummary?.completed ?? stats.workCompleted ?? 0}</p>
              <p className="text-[var(--text-muted)]">Done</p>
            </div>
            <div className="rounded-lg bg-[var(--surface-2)] p-2">
              <p className="font-bold text-[var(--text)]">{workSummary?.planning ?? stats.workPending ?? 0}</p>
              <p className="text-[var(--text-muted)]">Planning</p>
            </div>
          </div>
        </Card>

        <Card title="Unit Status" className="lg:col-span-2">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusBarData}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="total" fill={BRAND} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
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
