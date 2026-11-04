import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MdApartment,
  MdDoorFront,
  MdLogin,
  MdLogout,
  MdPayments,
  MdRefresh,
  MdTrendingUp,
  MdWarningAmber,
} from 'react-icons/md';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import { rentalApi } from '../../services/rentalApi.js';
import { formatCurrency, formatDate, cn } from '../../utils/format.js';
import { labelUnitType } from '../../utils/labels.js';

const DUE_KIND_LABEL = {
  RENT: 'Rent',
  OWNER_MONTHLY: 'Owner monthly',
  OTHER_CHARGE: 'Other charge',
  GUEST: 'Guest booking',
};

function nairobiToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Nairobi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function formatDayLabel(dateKey) {
  if (!dateKey) return 'Today';
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Africa/Nairobi',
  }).format(new Date(`${dateKey}T12:00:00+03:00`));
}

function formatTime(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Africa/Nairobi',
  }).format(new Date(value));
}

function KpiCard({ title, value, hint, icon: Icon, tone = 'navy' }) {
  const tones = {
    navy: 'bg-[color-mix(in_oklab,var(--primary)_12%,transparent)] text-[var(--primary)] dark:bg-sky-400/15 dark:text-sky-300',
    teal: 'bg-teal-500/12 text-teal-700 dark:bg-teal-400/15 dark:text-teal-300',
    sky: 'bg-sky-500/12 text-sky-700 dark:bg-sky-400/15 dark:text-sky-300',
    amber: 'bg-amber-500/12 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300',
    rose: 'bg-rose-500/12 text-rose-700 dark:bg-rose-400/15 dark:text-rose-300',
    emerald: 'bg-emerald-500/12 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300',
  };

  return (
    <div className="dashboard-stat-card rise-in p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
            {title}
          </p>
          <p className="mt-2 truncate text-2xl font-bold tracking-tight text-[var(--text)]">{value}</p>
          {hint ? <p className="mt-1.5 text-xs text-[var(--text-muted)]">{hint}</p> : null}
        </div>
        <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', tones[tone])}>
          <Icon className="h-[18px] w-[18px]" />
        </span>
      </div>
    </div>
  );
}

function Panel({ title, count, action, children, className }) {
  return (
    <section className={cn('dashboard-panel overflow-hidden', className)}>
      <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="truncate text-sm font-semibold text-[var(--text)]">{title}</h2>
          {typeof count === 'number' ? (
            <span className="rounded-md bg-[var(--surface-2)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--text-muted)]">
              {count}
            </span>
          ) : null}
        </div>
        {action || null}
      </div>
      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}

function EmptyRow({ colSpan, message }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">
        {message}
      </td>
    </tr>
  );
}

function OccupancyBar({ label, value, total, color }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
        <span className="font-medium text-[var(--text)]">{label}</span>
        <span className="tabular-nums text-[var(--text-muted)]">
          {value} · {pct}%
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-2)]">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [date, setDate] = useState(nairobiToday);
  const [stats, setStats] = useState(null);
  const [board, setBoard] = useState(null);
  const [payments, setPayments] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(
    async ({ soft } = {}) => {
      if (soft) setRefreshing(true);
      else setLoading(true);
      setError('');
      try {
        const [dash, todayBoard, pays, unitRows] = await Promise.all([
          rentalApi.getDashboard(),
          rentalApi.getTodayBoard(date),
          rentalApi.listPayments().catch(() => []),
          rentalApi.listUnits().catch(() => []),
        ]);
        setStats(dash);
        setBoard(todayBoard);
        setPayments(Array.isArray(pays) ? pays : []);
        setUnits(Array.isArray(unitRows) ? unitRows : []);
      } catch (err) {
        setError(err.message || 'Failed to load dashboard');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [date],
  );

  useEffect(() => {
    load();
  }, [load]);

  const summary = board?.summary || {};
  const occupancyRate = useMemo(() => {
    if (!stats?.totalRooms) return 0;
    return Math.round(((stats.occupiedRooms || 0) / stats.totalRooms) * 100);
  }, [stats]);

  const occupancyBreakdown = useMemo(() => {
    const counts = {
      Available: 0,
      Occupied: 0,
      Reserved: 0,
      Maintenance: 0,
      Sold: 0,
    };
    for (const u of units) {
      const key = u.status === 'Rented' ? 'Occupied' : u.status;
      if (counts[key] !== undefined) counts[key] += 1;
      else if (u.status === 'Occupied') counts.Occupied += 1;
    }
    const total = units.length || stats?.totalRooms || 0;
    return { counts, total };
  }, [units, stats]);

  const recentPayments = useMemo(() => {
    return [...payments]
      .filter((p) => p.paymentDate || p.amountPaid > 0)
      .sort((a, b) => {
        const da = a.paymentDate ? new Date(a.paymentDate).getTime() : 0;
        const db = b.paymentDate ? new Date(b.paymentDate).getTime() : 0;
        return db - da;
      })
      .slice(0, 8);
  }, [payments]);

  const dayLabel = formatDayLabel(board?.date || date);

  if (loading && !stats && !board) {
    return (
      <div className="flex justify-center py-24">
        <Spinner label="Loading dashboard…" />
      </div>
    );
  }

  if (error && !stats && !board) {
    return (
      <div className="dashboard-panel p-6">
        <p className="text-sm text-[var(--text-muted)]">{error}</p>
        <Button type="button" className="mt-4" onClick={() => load()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5 md:space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
            Operations
          </p>
          <h1 className="page-title mt-1 text-2xl text-[var(--text)] md:text-[1.75rem]">Today</h1>
          <p className="mt-1.5 max-w-xl text-sm text-[var(--text-muted)]">
            Property board for {dayLabel}. Track availability, guest movement, and collections.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value || nairobiToday())}
            className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
            aria-label="Select date"
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => load({ soft: true })}
            disabled={refreshing}
          >
            <MdRefresh className={cn('mr-1.5 h-4 w-4', refreshing && 'animate-spin')} />
            Refresh
          </Button>
          <Link
            to="/today"
            className="inline-flex h-10 items-center rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-medium text-[var(--text)] hover:bg-[var(--surface-2)]"
          >
            Full board
          </Link>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <KpiCard
          title="Available Units"
          value={summary.availableUnits ?? stats?.availableRooms ?? 0}
          hint={summary.becomingAvailable ? `${summary.becomingAvailable} freeing today` : 'Ready to assign'}
          icon={MdDoorFront}
          tone="teal"
        />
        <KpiCard
          title="Occupied Units"
          value={stats?.occupiedRooms ?? 0}
          hint={`${occupancyRate}% occupancy`}
          icon={MdApartment}
          tone="navy"
        />
        <KpiCard
          title="Check-ins Today"
          value={summary.checkIns ?? stats?.todayCheckIns ?? 0}
          hint="Guest arrivals"
          icon={MdLogin}
          tone="sky"
        />
        <KpiCard
          title="Check-outs Today"
          value={summary.checkOuts ?? stats?.todayCheckOuts ?? 0}
          hint="Units freeing"
          icon={MdLogout}
          tone="amber"
        />
        <KpiCard
          title="Amount Due"
          value={formatCurrency(summary.totalDue ?? stats?.outstandingPayments ?? 0)}
          hint={`${summary.dueCount ?? 0} items`}
          icon={MdWarningAmber}
          tone="rose"
        />
        <KpiCard
          title="Received Today"
          value={formatCurrency(summary.totalReceivedToday ?? 0)}
          hint="Collections"
          icon={MdPayments}
          tone="emerald"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Panel
            title="Available Units"
            count={(board?.available || []).length}
            action={
              <Link to="/availability" className="text-xs font-semibold text-[var(--accent)] hover:underline">
                View all
              </Link>
            }
          >
            <table className="dashboard-table min-w-full">
              <thead className="bg-[var(--surface-2)]/80 text-left">
                <tr>
                  <th className="px-4 py-2.5">Unit</th>
                  <th className="px-4 py-2.5">Type</th>
                  <th className="px-4 py-2.5">Building</th>
                  <th className="px-4 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {(board?.available || []).length === 0 ? (
                  <EmptyRow colSpan={4} message="No units available or freeing up for this day." />
                ) : (
                  (board.available || []).slice(0, 8).map((row) => (
                    <tr key={`${row.availability}-${row.unitId}`} className="hover:bg-[var(--surface-2)]/50">
                      <td className="px-4 py-2.5 font-medium text-[var(--text)]">
                        {row.unitId ? (
                          <Link to={`/units/${row.unitId}`} className="text-[var(--accent)] hover:underline">
                            {row.roomNumber}
                          </Link>
                        ) : (
                          row.roomNumber
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-[var(--text-muted)]">
                        {labelUnitType(row.unitType) || row.unitType || '—'}
                      </td>
                      <td className="px-4 py-2.5 text-[var(--text)]">{row.building || '—'}</td>
                      <td className="px-4 py-2.5">
                        <Badge status={row.badge}>{row.badge}</Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Panel>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel
              title="Check-ins Today"
              count={(board?.checkIns || []).length}
              action={
                <Link to="/bookings" className="text-xs font-semibold text-[var(--accent)] hover:underline">
                  Bookings
                </Link>
              }
            >
              <table className="dashboard-table min-w-full">
                <thead className="bg-[var(--surface-2)]/80 text-left">
                  <tr>
                    <th className="px-4 py-2.5">Guest</th>
                    <th className="px-4 py-2.5">Unit</th>
                    <th className="px-4 py-2.5">Time</th>
                    <th className="px-4 py-2.5">Payment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {(board?.checkIns || []).length === 0 ? (
                    <EmptyRow colSpan={4} message="No check-ins for this day." />
                  ) : (
                    (board.checkIns || []).slice(0, 6).map((row) => (
                      <tr key={row.id} className="hover:bg-[var(--surface-2)]/50">
                        <td className="px-4 py-2.5">
                          <p className="font-medium text-[var(--text)]">{row.guest}</p>
                          <p className="text-[11px] text-[var(--text-muted)]">{row.code || '—'}</p>
                        </td>
                        <td className="px-4 py-2.5">
                          <p className="font-medium">{row.roomNumber}</p>
                          <p className="text-[11px] text-[var(--text-muted)]">{row.building}</p>
                        </td>
                        <td className="px-4 py-2.5 text-[var(--text-muted)]">{formatTime(row.checkIn)}</td>
                        <td className="px-4 py-2.5">
                          <Badge status={row.paymentBadge}>{row.paymentBadge}</Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </Panel>

            <Panel title="Check-outs Today" count={(board?.checkOuts || []).length}>
              <table className="dashboard-table min-w-full">
                <thead className="bg-[var(--surface-2)]/80 text-left">
                  <tr>
                    <th className="px-4 py-2.5">Guest</th>
                    <th className="px-4 py-2.5">Unit</th>
                    <th className="px-4 py-2.5">Time</th>
                    <th className="px-4 py-2.5">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {(board?.checkOuts || []).length === 0 ? (
                    <EmptyRow colSpan={4} message="No check-outs for this day." />
                  ) : (
                    (board.checkOuts || []).slice(0, 6).map((row) => (
                      <tr key={row.id} className="hover:bg-[var(--surface-2)]/50">
                        <td className="px-4 py-2.5">
                          <p className="font-medium text-[var(--text)]">{row.guest}</p>
                          <p className="text-[11px] text-[var(--text-muted)]">{row.code || '—'}</p>
                        </td>
                        <td className="px-4 py-2.5">
                          <p className="font-medium">{row.roomNumber}</p>
                          <p className="text-[11px] text-[var(--text-muted)]">{row.building}</p>
                        </td>
                        <td className="px-4 py-2.5 text-[var(--text-muted)]">{formatTime(row.checkOut)}</td>
                        <td className="px-4 py-2.5">
                          {row.balance > 0 ? (
                            <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                              {formatCurrency(row.balance)}
                            </span>
                          ) : (
                            <Badge status="Paid">Paid</Badge>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </Panel>
          </div>

          <Panel
            title="Due Today"
            count={(board?.due || []).length}
            action={
              <Link to="/outstanding" className="text-xs font-semibold text-[var(--accent)] hover:underline">
                Outstanding
              </Link>
            }
          >
            <table className="dashboard-table min-w-full">
              <thead className="bg-[var(--surface-2)]/80 text-left">
                <tr>
                  <th className="px-4 py-2.5">Who</th>
                  <th className="px-4 py-2.5">Unit</th>
                  <th className="px-4 py-2.5">Type</th>
                  <th className="px-4 py-2.5 text-right">Balance</th>
                  <th className="px-4 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {(board?.due || []).length === 0 ? (
                  <EmptyRow colSpan={5} message="Nothing due for this day." />
                ) : (
                  (board.due || []).slice(0, 8).map((row) => (
                    <tr key={`${row.kind}-${row.id}`} className="hover:bg-[var(--surface-2)]/50">
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-[var(--text)]">{row.name}</p>
                        <p className="text-[11px] text-[var(--text-muted)]">{row.description || '—'}</p>
                      </td>
                      <td className="px-4 py-2.5">
                        {row.unitId ? (
                          <Link to={`/units/${row.unitId}`} className="text-[var(--accent)] hover:underline">
                            {row.roomNumber}
                          </Link>
                        ) : (
                          row.roomNumber || '—'
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge status={DUE_KIND_LABEL[row.kind] || row.kind}>
                          {DUE_KIND_LABEL[row.kind] || row.kind}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-rose-600 dark:text-rose-400">
                        {formatCurrency(row.balance)}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge status={row.paymentBadge}>{row.paymentBadge}</Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Panel>
        </div>

        <div className="space-y-4">
          <section className="dashboard-panel p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-[var(--text)]">Occupancy overview</h2>
                <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                  {stats?.totalBuildings ?? 0} buildings · {stats?.totalRooms ?? occupancyBreakdown.total} units
                </p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-lg bg-[var(--accent-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--accent)]">
                <MdTrendingUp className="h-3.5 w-3.5" />
                {occupancyRate}%
              </span>
            </div>

            <div className="space-y-3.5">
              <OccupancyBar
                label="Occupied"
                value={occupancyBreakdown.counts.Occupied || stats?.occupiedRooms || 0}
                total={occupancyBreakdown.total || stats?.totalRooms || 1}
                color="var(--primary)"
              />
              <OccupancyBar
                label="Available"
                value={occupancyBreakdown.counts.Available || stats?.availableRooms || 0}
                total={occupancyBreakdown.total || stats?.totalRooms || 1}
                color="#0f9f6e"
              />
              <OccupancyBar
                label="Reserved"
                value={occupancyBreakdown.counts.Reserved || stats?.reservedUnits || 0}
                total={occupancyBreakdown.total || stats?.totalRooms || 1}
                color="#d97706"
              />
              <OccupancyBar
                label="Maintenance"
                value={occupancyBreakdown.counts.Maintenance || stats?.maintenanceUnits || 0}
                total={occupancyBreakdown.total || stats?.totalRooms || 1}
                color="#ea580c"
              />
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/60 px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Shops</p>
                <p className="mt-1 text-lg font-bold text-[var(--text)]">{stats?.commercialShops ?? 0}</p>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/60 px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Offices</p>
                <p className="mt-1 text-lg font-bold text-[var(--text)]">{stats?.commercialOffices ?? 0}</p>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/60 px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">For rent</p>
                <p className="mt-1 text-lg font-bold text-[var(--text)]">{stats?.forRent ?? 0}</p>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/60 px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">For sale</p>
                <p className="mt-1 text-lg font-bold text-[var(--text)]">{stats?.forSale ?? 0}</p>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/60 px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Guests</p>
                <p className="mt-1 text-lg font-bold text-[var(--text)]">{stats?.currentGuests ?? 0}</p>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/60 px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Bookings</p>
                <p className="mt-1 text-lg font-bold text-[var(--text)]">{stats?.activeBookings ?? 0}</p>
              </div>
            </div>
          </section>

          <Panel
            title="Recent Payments"
            count={recentPayments.length}
            action={
              <Link to="/payments" className="text-xs font-semibold text-[var(--accent)] hover:underline">
                All payments
              </Link>
            }
          >
            <table className="dashboard-table min-w-full">
              <thead className="bg-[var(--surface-2)]/80 text-left">
                <tr>
                  <th className="px-4 py-2.5">Tenant</th>
                  <th className="px-4 py-2.5 text-right">Paid</th>
                  <th className="px-4 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {recentPayments.length === 0 ? (
                  <EmptyRow colSpan={3} message="No recent payments." />
                ) : (
                  recentPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-[var(--surface-2)]/50">
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-[var(--text)]">{p.name || '—'}</p>
                        <p className="text-[11px] text-[var(--text-muted)]">
                          {p.roomNumber || '—'}
                          {p.month ? ` · ${p.month}` : ''}
                          {p.paymentDate ? ` · ${formatDate(p.paymentDate)}` : ''}
                        </p>
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-[var(--text)]">
                        {formatCurrency(p.amountPaid)}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge status={p.status}>{p.status}</Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Panel>

          <section className="dashboard-panel overflow-hidden">
            <div className="relative min-h-[140px] bg-gradient-to-br from-[var(--primary-dark)] via-[var(--primary)] to-[var(--accent)] p-5 text-white">
              <div
                className="pointer-events-none absolute inset-0 opacity-30"
                style={{
                  backgroundImage:
                    'radial-gradient(circle at 20% 20%, rgba(125,211,192,0.45), transparent 45%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.18), transparent 40%)',
                }}
              />
              <div className="relative">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/70">Portfolio</p>
                <p className="mt-2 text-lg font-bold tracking-tight">RJK REALTY</p>
                <p className="mt-1 max-w-[220px] text-xs leading-relaxed text-white/75">
                  {stats?.totalBuildings ?? 0} properties · {formatCurrency(stats?.monthlyRevenue || 0)} monthly collections
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    to="/buildings"
                    className="rounded-lg bg-white/15 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur hover:bg-white/25"
                  >
                    Buildings
                  </Link>
                  <Link
                    to="/reports"
                    className="rounded-lg bg-[var(--sidebar-active)] px-3 py-1.5 text-xs font-semibold text-[var(--primary-dark)] hover:brightness-105"
                  >
                    Reports
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
