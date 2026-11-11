import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  MdAdd,
  MdApartment,
  MdArrowForward,
  MdBusiness,
  MdCheckCircle,
  MdDoorFront,
  MdEventAvailable,
  MdHotel,
  MdLogin,
  MdLogout,
  MdMeetingRoom,
  MdPayments,
  MdPendingActions,
  MdRefresh,
  MdReceiptLong,
  MdTrendingUp,
  MdWarningAmber,
} from 'react-icons/md';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import Skeleton, { SkeletonCard } from '../../components/ui/Skeleton.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import { rentalApi } from '../../services/rentalApi.js';
import { formatCurrency, formatDate, cn, getAppCurrency } from '../../utils/format.js';
import { labelUnitType } from '../../utils/labels.js';

const DUE_KIND_LABEL = {
  RENT: 'Rent',
  OWNER_MONTHLY: 'Owner monthly',
  OTHER_CHARGE: 'Other charge',
  GUEST: 'Guest booking',
};

/* Validated with the dataviz palette checks (light vs #fff, dark vs #0d1b2b). */
const CHART = {
  light: { occupied: '#2E6299', available: '#1A9470', reserved: '#CF8C00', maintenance: '#8D6BC8', line: '#2E6299', grid: '#e3e8ef', axis: '#64748b' },
  dark: { occupied: '#5E8FCB', available: '#2BA67C', reserved: '#C08A12', maintenance: '#9A78D0', line: '#5E8FCB', grid: '#1d324a', axis: '#8a9db2' },
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

function greeting() {
  const h = Number(
    new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Africa/Nairobi' }).format(new Date()),
  );
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function compactMoney(v) {
  const n = Number(v) || 0;
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}K`;
  return String(Math.round(n));
}

function monthKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Last 6 calendar months of collected amounts, built from recorded payments. */
function buildRevenueSeries(payments) {
  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: monthKey(d),
      label: new Intl.DateTimeFormat('en-GB', { month: 'short' }).format(d),
      full: new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(d),
      value: 0,
    });
  }
  const index = Object.fromEntries(months.map((m, i) => [m.key, i]));
  for (const p of payments) {
    const paid = Number(p.amountPaid) || 0;
    if (!paid) continue;
    const key = p.paymentDate ? String(p.paymentDate).slice(0, 7) : String(p.month || '').slice(0, 7);
    if (index[key] !== undefined) months[index[key]].value += paid;
  }
  return months;
}

/* ------------------------------------------------------------------ pieces */

function StatCard({ label, value, hint, icon: Icon, accent = false, to, trend }) {
  const body = (
    <div
      className={cn(
        'dashboard-stat-card group relative h-full overflow-hidden p-3.5 sm:p-5',
        to && 'hover:-translate-y-px',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[12px] font-medium leading-tight text-[var(--text-muted)] sm:text-[12.5px]">{label}</p>
        <span
          className={cn(
            'hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:flex',
            accent
              ? 'bg-[var(--gold-soft)] text-[var(--accent)]'
              : 'bg-[var(--primary-light)] text-[var(--navy)] dark:text-[var(--primary)]',
          )}
        >
          <Icon className="h-[18px] w-[18px]" />
        </span>
      </div>
      <p className="mt-2 truncate font-display text-[17px] font-bold sm:text-[26px] leading-none tracking-[-0.02em] text-[var(--text)] tabular">
        {value}
      </p>
      <div className="mt-2.5 flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
        {trend ? (
          <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-50 px-1.5 py-0.5 font-semibold text-emerald-700 dark:bg-emerald-500/12 dark:text-emerald-300">
            <MdTrendingUp className="h-3.5 w-3.5" />
            {trend}
          </span>
        ) : null}
        <span className="truncate">{hint}</span>
      </div>
      {accent ? <span className="absolute inset-x-0 bottom-0 h-[3px] bg-[var(--gold)]" aria-hidden="true" /> : null}
    </div>
  );
  return to ? (
    <Link to={to} className="block h-full rounded-xl focus-visible:outline-offset-2">
      {body}
    </Link>
  ) : (
    body
  );
}

function Panel({ title, description, action, children, className, bodyClassName }) {
  return (
    <section className={cn('dashboard-panel flex flex-col overflow-hidden', className)}>
      <header className="flex items-start justify-between gap-3 px-5 pb-3 pt-4">
        <div className="min-w-0">
          <h2 className="font-display text-[15px] font-bold tracking-[-0.01em] text-[var(--text)]">{title}</h2>
          {description ? <p className="mt-0.5 text-[12.5px] text-[var(--text-muted)]">{description}</p> : null}
        </div>
        {action || null}
      </header>
      <div className={cn('min-h-0 flex-1', bodyClassName)}>{children}</div>
    </section>
  );
}

function PanelLink({ to, children }) {
  return (
    <Link
      to={to}
      className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-[var(--navy)] transition-colors hover:bg-[var(--surface-2)] dark:text-[var(--accent)]"
    >
      {children}
      <MdArrowForward className="h-3.5 w-3.5" />
    </Link>
  );
}

function RevenueTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 shadow-[var(--shadow-pop)]">
      <p className="text-[11px] font-medium text-[var(--text-muted)]">{p.full}</p>
      <p className="mt-0.5 text-sm font-bold text-[var(--text)] tabular">{formatCurrency(p.value)}</p>
    </div>
  );
}

function RevenueChart({ series, colors }) {
  const total = series.reduce((s, m) => s + m.value, 0);
  if (!total) {
    return (
      <div className="flex h-[240px] flex-col items-center justify-center gap-2 px-6 text-center">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--text-muted)]">
          <MdTrendingUp className="h-5 w-5" />
        </span>
        <p className="text-[13px] font-medium text-[var(--text)]">No collections recorded in the last 6 months</p>
        <p className="text-xs text-[var(--text-muted)]">Recorded payments will chart here month by month.</p>
      </div>
    );
  }
  return (
    <div className="h-[240px] w-full px-2 pb-2">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={series} margin={{ top: 8, right: 16, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id="rev-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors.line} stopOpacity={0.18} />
              <stop offset="100%" stopColor={colors.line} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={colors.grid} strokeDasharray="0" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: colors.axis, fontSize: 12 }}
            dy={6}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fill: colors.axis, fontSize: 12 }}
            tickFormatter={compactMoney}
            width={44}
          />
          <Tooltip
            content={<RevenueTooltip />}
            cursor={{ stroke: colors.axis, strokeWidth: 1, strokeDasharray: '3 3' }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={colors.line}
            strokeWidth={2}
            fill="url(#rev-fill)"
            dot={{ r: 0 }}
            activeDot={{ r: 5, strokeWidth: 2, stroke: 'var(--surface)', fill: colors.line }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function OccupancyBreakdown({ parts, total, rate, colors }) {
  return (
    <div className="px-5 pb-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="font-display text-[34px] font-bold leading-none tracking-[-0.03em] text-[var(--text)] tabular">
            {rate}%
          </p>
          <p className="mt-1.5 text-xs text-[var(--text-muted)]">of {total} units occupied</p>
        </div>
      </div>
      {/* Segmented bar: 2px surface gaps between segments; identity also given by the labelled legend below */}
      <div className="mt-4 flex h-2.5 w-full gap-[2px] overflow-hidden rounded-full bg-[var(--surface-3)]" role="img" aria-label="Unit status breakdown">
        {total > 0
          ? parts
              .filter((p) => p.value > 0)
              .map((p) => (
                <span
                  key={p.key}
                  title={`${p.label}: ${p.value}`}
                  className="h-full first:rounded-l-full last:rounded-r-full"
                  style={{ width: `${(p.value / total) * 100}%`, background: colors[p.key] }}
                />
              ))
          : null}
      </div>
      <ul className="mt-4 space-y-2.5">
        {parts.map((p) => {
          const pct = total > 0 ? Math.round((p.value / total) * 100) : 0;
          return (
            <li key={p.key} className="flex items-center gap-2.5 text-[13px]">
              <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: colors[p.key] }} />
              <span className="flex-1 text-[var(--text-secondary)]">{p.label}</span>
              <span className="font-semibold text-[var(--text)] tabular">{p.value}</span>
              <span className="w-10 text-right text-xs text-[var(--text-muted)] tabular">{pct}%</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SegmentBars({ stats }) {
  const rows = [
    { label: 'Residential', value: stats?.residentialOccupancy },
    { label: 'Commercial', value: stats?.commercialOccupancy },
    { label: 'Guest / Airbnb', value: stats?.airbnbOccupancy },
  ].filter((r) => typeof r.value === 'number');
  if (!rows.length) return null;
  return (
    <div className="space-y-3 border-t border-[var(--border)] px-5 py-4">
      <p className="eyebrow">Occupancy by segment</p>
      {rows.map((r) => (
        <div key={r.label}>
          <div className="mb-1 flex justify-between text-xs">
            <span className="text-[var(--text-secondary)]">{r.label}</span>
            <span className="font-semibold text-[var(--text)] tabular">{Math.round(r.value)}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-3)]">
            <div className="h-full rounded-full bg-[var(--navy)] dark:bg-[var(--primary)]" style={{ width: `${Math.min(100, r.value)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

const QUICK_ACTIONS = [
  { to: '/bookings?tab=new', label: 'New guest booking', hint: 'Check a guest in', icon: MdHotel },
  { to: '/payments', label: 'Record payment', hint: 'Rent & charges', icon: MdPayments },
  { to: '/availability', label: 'Check availability', hint: 'Rooms & units', icon: MdMeetingRoom },
  { to: '/apartments', label: 'Add tenant', hint: 'Apartments', icon: MdApartment },
  { to: '/expenses', label: 'Log expense', hint: 'Money movements', icon: MdReceiptLong },
  { to: '/buildings', label: 'Manage buildings', hint: 'Portfolio setup', icon: MdBusiness },
];

function QuickActions() {
  return (
    <div className="grid grid-cols-2 gap-2 px-5 pb-5">
      {QUICK_ACTIONS.map(({ to, label, hint, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          className="group flex flex-col gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 transition-colors hover:border-[var(--gold)] hover:bg-[var(--gold-soft)]/40"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary-light)] text-[var(--navy)] transition-colors group-hover:bg-[var(--gold)] group-hover:text-[var(--on-gold)] dark:text-[var(--primary)]">
            <Icon className="h-4 w-4" />
          </span>
          <span>
            <span className="block text-[13px] font-semibold leading-tight text-[var(--text)]">{label}</span>
            <span className="mt-0.5 block text-[11.5px] text-[var(--text-muted)]">{hint}</span>
          </span>
        </Link>
      ))}
    </div>
  );
}

const BOARD_TABS = [
  { key: 'available', label: 'Available', icon: MdDoorFront },
  { key: 'checkIns', label: 'Check-ins', icon: MdLogin },
  { key: 'checkOuts', label: 'Check-outs', icon: MdLogout },
  { key: 'due', label: 'Due', icon: MdPendingActions },
];

function Th({ children, right }) {
  return (
    <th className={cn('whitespace-nowrap px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]', right && 'text-right')}>
      {children}
    </th>
  );
}

function UnitLink({ unitId, children }) {
  return unitId ? (
    <Link to={`/units/${unitId}`} className="font-semibold text-[var(--navy)] hover:underline dark:text-[var(--primary)]">
      {children}
    </Link>
  ) : (
    <span className="font-semibold">{children || '—'}</span>
  );
}

function TodayBoard({ board }) {
  const [tab, setTab] = useState('available');
  const rows = board?.[tab] || [];
  const empty = {
    available: 'No units available or freeing up for this day.',
    checkIns: 'No check-ins for this day.',
    checkOuts: 'No check-outs for this day.',
    due: 'Nothing due for this day.',
  }[tab];

  return (
    <>
      <div className="flex gap-1 overflow-x-auto border-b border-[var(--border)] px-4" role="tablist">
        {BOARD_TABS.map(({ key, label, icon: Icon }) => {
          const count = (board?.[key] || []).length;
          const active = tab === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(key)}
              className={cn(
                'relative inline-flex shrink-0 items-center gap-1.5 px-2.5 py-2.5 text-[13px] font-medium transition-colors',
                active ? 'text-[var(--text)]' : 'text-[var(--text-muted)] hover:text-[var(--text)]',
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
              <span
                className={cn(
                  'rounded-md px-1.5 text-[11px] font-semibold tabular',
                  active ? 'bg-[var(--navy)] text-white dark:bg-[var(--gold)] dark:text-[var(--on-gold)]' : 'bg-[var(--surface-2)] text-[var(--text-muted)]',
                )}
              >
                {count}
              </span>
              {active ? <span className="absolute inset-x-1 -bottom-px h-[2px] rounded-full bg-[var(--gold)]" /> : null}
            </button>
          );
        })}
      </div>
      {rows.length === 0 ? (
        <div className="px-5 py-10 text-center text-[13px] text-[var(--text-muted)]">{empty}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table-plain min-w-full text-left text-[13px]">
            <thead className="bg-[var(--surface-2)]">
              {tab === 'available' ? (
                <tr><Th>Unit</Th><Th>Type</Th><Th>Building</Th><Th>Status</Th></tr>
              ) : tab === 'due' ? (
                <tr><Th>Who</Th><Th>Unit</Th><Th>Type</Th><Th right>Balance</Th><Th>Status</Th></tr>
              ) : (
                <tr><Th>Guest</Th><Th>Unit</Th><Th>Time</Th><Th>{tab === 'checkIns' ? 'Payment' : 'Balance'}</Th></tr>
              )}
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {rows.slice(0, 8).map((row) => (
                <tr key={`${tab}-${row.kind || ''}-${row.id || row.unitId}-${row.availability || ''}`} className="hover:bg-[var(--surface-2)]/60">
                  {tab === 'available' ? (
                    <>
                      <td className="px-5 py-2.5"><UnitLink unitId={row.unitId}>{row.roomNumber}</UnitLink></td>
                      <td className="px-5 py-2.5 text-[var(--text-muted)]">{labelUnitType(row.unitType) || row.unitType || '—'}</td>
                      <td className="px-5 py-2.5">{row.building || '—'}</td>
                      <td className="px-5 py-2.5"><Badge status={row.badge}>{row.badge}</Badge></td>
                    </>
                  ) : tab === 'due' ? (
                    <>
                      <td className="px-5 py-2.5">
                        <p className="font-medium">{row.name}</p>
                        <p className="text-[11.5px] text-[var(--text-muted)]">{row.description || '—'}</p>
                      </td>
                      <td className="px-5 py-2.5"><UnitLink unitId={row.unitId}>{row.roomNumber}</UnitLink></td>
                      <td className="px-5 py-2.5">
                        <Badge status={DUE_KIND_LABEL[row.kind] || row.kind}>{DUE_KIND_LABEL[row.kind] || row.kind}</Badge>
                      </td>
                      <td className="px-5 py-2.5 text-right font-semibold text-rose-600 tabular dark:text-rose-400">{formatCurrency(row.balance)}</td>
                      <td className="px-5 py-2.5"><Badge status={row.paymentBadge}>{row.paymentBadge}</Badge></td>
                    </>
                  ) : (
                    <>
                      <td className="px-5 py-2.5">
                        <p className="font-medium">{row.guest}</p>
                        <p className="text-[11.5px] text-[var(--text-muted)]">{row.code || '—'}</p>
                      </td>
                      <td className="px-5 py-2.5">
                        <p className="font-medium">{row.roomNumber}</p>
                        <p className="text-[11.5px] text-[var(--text-muted)]">{row.building}</p>
                      </td>
                      <td className="px-5 py-2.5 text-[var(--text-muted)] tabular">
                        {formatTime(tab === 'checkIns' ? row.checkIn : row.checkOut)}
                      </td>
                      <td className="px-5 py-2.5">
                        {tab === 'checkIns' ? (
                          <Badge status={row.paymentBadge}>{row.paymentBadge}</Badge>
                        ) : row.balance > 0 ? (
                          <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">{formatCurrency(row.balance)}</span>
                        ) : (
                          <Badge status="Paid">Paid</Badge>
                        )}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function ActivityFeed({ items }) {
  if (!items.length) {
    return <EmptyState compact title="No recent activity" description="Payments and guest bookings will appear here." className="mx-5 mb-5" />;
  }
  return (
    <ol className="relative px-5 pb-5">
      {items.map((it, i) => {
        const Icon = it.icon;
        return (
          <li key={it.id} className="relative flex gap-3 pb-4 last:pb-0">
            {i < items.length - 1 ? (
              <span className="absolute left-[15px] top-8 h-[calc(100%-28px)] w-px bg-[var(--border)]" aria-hidden="true" />
            ) : null}
            <span className={cn('relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-4 ring-[var(--surface)]', it.tone)}>
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-[13px] leading-snug text-[var(--text)]">
                <span className="font-semibold">{it.title}</span> <span className="text-[var(--text-secondary)]">{it.detail}</span>
              </p>
              <p className="mt-0.5 text-[11.5px] text-[var(--text-muted)]">{it.when}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading dashboard">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-7 w-72" />
          <Skeleton className="h-3 w-56" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-36 rounded-lg" />
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <Skeleton className="h-[320px] rounded-xl xl:col-span-2" />
        <Skeleton className="h-[320px] rounded-xl" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ page */

export default function Dashboard() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const colors = isDark ? CHART.dark : CHART.light;
  const [date, setDate] = useState(nairobiToday);
  const [stats, setStats] = useState(null);
  const [board, setBoard] = useState(null);
  const [payments, setPayments] = useState([]);
  const [units, setUnits] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(
    async ({ soft } = {}) => {
      if (soft) setRefreshing(true);
      else setLoading(true);
      setError('');
      try {
        const [dash, todayBoard, pays, unitRows, bookingRows] = await Promise.all([
          rentalApi.getDashboard(),
          rentalApi.getTodayBoard(date),
          rentalApi.listPayments().catch(() => []),
          rentalApi.listUnits().catch(() => []),
          rentalApi.listBookings().catch(() => []),
        ]);
        setStats(dash);
        setBoard(todayBoard);
        setPayments(Array.isArray(pays) ? pays : []);
        setUnits(Array.isArray(unitRows) ? unitRows : []);
        setBookings(Array.isArray(bookingRows) ? bookingRows : []);
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

  // The API reports totalUnits/occupiedUnits; older builds used *Rooms — accept both.
  const totals = useMemo(() => {
    const counts = { Available: 0, Occupied: 0, Reserved: 0, Maintenance: 0 };
    for (const u of units) {
      const key = u.status === 'Rented' ? 'Occupied' : u.status;
      if (counts[key] !== undefined) counts[key] += 1;
    }
    const totalUnits = stats?.totalUnits ?? stats?.totalRooms ?? units.length ?? 0;
    const occupied = stats?.occupiedUnits ?? stats?.occupiedRooms ?? counts.Occupied;
    const available = stats?.availableUnits ?? stats?.availableRooms ?? counts.Available;
    const reserved = stats?.reservedUnits ?? counts.Reserved;
    const maintenance = (stats?.maintenanceUnits ?? counts.Maintenance) + (stats?.cleaningUnits ?? 0);
    const rate =
      typeof stats?.occupancyRate === 'number'
        ? Math.round(stats.occupancyRate)
        : totalUnits
          ? Math.round((occupied / totalUnits) * 100)
          : 0;
    return { totalUnits, occupied, available, reserved, maintenance, rate };
  }, [stats, units]);

  const revenueSeries = useMemo(() => buildRevenueSeries(payments), [payments]);
  const thisMonth = revenueSeries[revenueSeries.length - 1]?.value || 0;
  const lastMonth = revenueSeries[revenueSeries.length - 2]?.value || 0;
  const revenueTrend =
    lastMonth > 0 && thisMonth > lastMonth ? `${Math.round(((thisMonth - lastMonth) / lastMonth) * 100)}%` : null;
  const sixMonthTotal = revenueSeries.reduce((s, m) => s + m.value, 0);

  const recentPayments = useMemo(
    () =>
      [...payments]
        .filter((p) => p.paymentDate || p.amountPaid > 0)
        .sort((a, b) => new Date(b.paymentDate || 0) - new Date(a.paymentDate || 0))
        .slice(0, 6),
    [payments],
  );

  const recentBookings = useMemo(
    () => [...bookings].sort((a, b) => new Date(b.checkIn || 0) - new Date(a.checkIn || 0)).slice(0, 5),
    [bookings],
  );

  const pendingCount = useMemo(() => payments.filter((p) => p.status === 'Unpaid' || p.status === 'Partial').length, [payments]);

  const activity = useMemo(() => {
    const items = [];
    for (const p of payments) {
      if (!p.paymentDate || !(p.amountPaid > 0)) continue;
      items.push({
        id: `pay-${p.id}`,
        at: new Date(p.paymentDate),
        icon: MdPayments,
        tone: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
        title: formatCurrency(p.amountPaid),
        detail: `received from ${p.name || 'tenant'}${p.roomNumber ? ` · ${p.roomNumber}` : ''}`,
      });
    }
    for (const b of bookings) {
      if (!b.checkIn) continue;
      items.push({
        id: `bk-${b.id}`,
        at: new Date(b.checkIn),
        icon: MdEventAvailable,
        tone: 'bg-[var(--primary-light)] text-[var(--navy)] dark:text-[var(--primary)]',
        title: b.fullName || 'Guest',
        detail: `booked ${b.roomNumber || 'a unit'}${b.nights ? ` for ${b.nights} night${b.nights === 1 ? '' : 's'}` : ''}`,
      });
    }
    return items
      .filter((i) => !Number.isNaN(i.at.getTime()))
      .sort((a, b) => b.at - a.at)
      .slice(0, 6)
      .map((i) => ({ ...i, when: formatDate(i.at) }));
  }, [payments, bookings]);

  const dayLabel = formatDayLabel(board?.date || date);
  const firstName = user?.name?.split(' ')[0] || 'there';

  if (loading && !stats && !board) return <DashboardSkeleton />;

  if (error && !stats && !board) {
    return (
      <EmptyState
        icon={MdWarningAmber}
        title="We couldn't load your dashboard"
        description={error}
        action={
          <Button variant="secondary" onClick={() => load()}>
            <MdRefresh className="h-4 w-4" /> Try again
          </Button>
        }
      />
    );
  }

  const occupancyParts = [
    { key: 'occupied', label: 'Occupied', value: totals.occupied },
    { key: 'available', label: 'Vacant / available', value: totals.available },
    { key: 'reserved', label: 'Reserved', value: totals.reserved },
    { key: 'maintenance', label: 'Maintenance & cleaning', value: totals.maintenance },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="eyebrow">{dayLabel}</p>
          <h1 className="page-title mt-1.5 text-[24px] leading-tight md:text-[28px]">
            {greeting()}, {firstName}
          </h1>
          <p className="mt-1 text-[13.5px] text-[var(--text-muted)]">
            Here&apos;s how your portfolio is performing today.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value || nairobiToday())}
            className="h-10 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)] shadow-xs outline-none focus:border-[var(--navy)] focus:ring-[3px] focus:ring-[var(--ring)]"
            aria-label="Select date"
          />
          <Button variant="secondary" onClick={() => load({ soft: true })} disabled={refreshing} aria-label="Refresh">
            <MdRefresh className={cn('h-4 w-4', refreshing && 'animate-spin')} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Link
            to="/today"
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--text)] shadow-xs hover:bg-[var(--surface-2)]"
          >
            Today board
          </Link>
          <Link
            to="/bookings?tab=new"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--gold)] px-4 text-sm font-semibold text-[var(--on-gold)] shadow-xs hover:bg-[var(--gold-hover)]"
          >
            <MdAdd className="h-4 w-4" /> New booking
          </Link>
        </div>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard label="Total properties" value={stats?.totalBuildings ?? 0} hint={`${stats?.totalFloors ?? 0} floors managed`} icon={MdBusiness} to="/buildings" />
        <StatCard label="Total units" value={totals.totalUnits} hint="Across all buildings" icon={MdMeetingRoom} to="/availability" />
        <StatCard label="Occupied units" value={totals.occupied} hint={`${totals.rate}% occupancy`} icon={MdApartment} />
        <StatCard
          label="Vacant units"
          value={totals.available}
          hint={summary.becomingAvailable ? `${summary.becomingAvailable} freeing today` : 'Ready to assign'}
          icon={MdDoorFront}
          to="/availability"
        />
        <StatCard
          label="Revenue this month"
          value={formatCurrency(stats?.monthlyRevenue ?? thisMonth)}
          hint="Collected payments"
          trend={revenueTrend}
          icon={MdPayments}
          accent
          to="/reports"
        />
        <StatCard
          label="Pending payments"
          value={formatCurrency(summary.totalDue ?? stats?.outstandingBalance ?? 0)}
          hint={`${summary.dueCount ?? pendingCount} open item${(summary.dueCount ?? pendingCount) === 1 ? '' : 's'}`}
          icon={MdWarningAmber}
          to="/outstanding"
        />
      </div>

      {/* Today strip */}
      <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow)] lg:grid-cols-4">
        {[
          { label: 'Check-ins today', value: summary.checkIns ?? 0, icon: MdLogin },
          { label: 'Check-outs today', value: summary.checkOuts ?? 0, icon: MdLogout },
          { label: 'Received today', value: formatCurrency(summary.totalReceivedToday ?? 0), icon: MdCheckCircle },
          { label: 'Due today', value: formatCurrency(summary.totalDue ?? 0), icon: MdPendingActions },
        ].map(({ label, value, icon: Icon }, i) => (
          <div
            key={label}
            className={cn(
              'flex items-center gap-3 px-4 py-3.5 sm:px-5',
              i % 2 === 1 && 'border-l border-[var(--border)]',
              i >= 2 && 'border-t border-[var(--border)] lg:border-t-0',
              i === 2 && 'lg:border-l',
            )}
          >
            <Icon className="h-5 w-5 shrink-0 text-[var(--accent)]" />
            <div className="min-w-0">
              <p className="truncate text-[11.5px] text-[var(--text-muted)]">{label}</p>
              <p className="break-words text-[14px] font-bold leading-snug text-[var(--text)] tabular sm:text-[15px]">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Revenue + occupancy */}
      <div className="grid gap-4 xl:grid-cols-3">
        <Panel
          className="xl:col-span-2"
          title="Monthly revenue"
          description={`Collections over the last 6 months · ${formatCurrency(sixMonthTotal)} total (${getAppCurrency()})`}
          action={<PanelLink to="/reports">Reports</PanelLink>}
        >
          <RevenueChart series={revenueSeries} colors={colors} />
        </Panel>
        <Panel title="Property occupancy" description={`${stats?.totalBuildings ?? 0} buildings · ${totals.totalUnits} units`}>
          <OccupancyBreakdown parts={occupancyParts} total={totals.totalUnits} rate={totals.rate} colors={colors} />
          <SegmentBars stats={stats} />
        </Panel>
      </div>

      {/* Today board + quick actions */}
      <div className="grid gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2" title="Today's board" description={dayLabel} action={<PanelLink to="/today">Full board</PanelLink>}>
          <TodayBoard board={board} />
        </Panel>
        <Panel title="Quick actions" description="Jump into everyday tasks">
          <QuickActions />
        </Panel>
      </div>

      {/* Transactions, bookings, activity */}
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Panel title="Recent transactions" action={<PanelLink to="/payments">All payments</PanelLink>}>
          {recentPayments.length === 0 ? (
            <EmptyState compact title="No transactions yet" description="Recorded payments show up here." className="mx-5 mb-5" />
          ) : (
            <ul className="divide-y divide-[var(--border)] border-t border-[var(--border)]">
              {recentPayments.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--surface-2)] text-xs font-bold text-[var(--text-secondary)]">
                    {(p.name || '?').slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium text-[var(--text)]">{p.name || '—'}</p>
                    <p className="truncate text-[11.5px] text-[var(--text-muted)]">
                      {[p.roomNumber, p.month, p.paymentDate ? formatDate(p.paymentDate) : null].filter(Boolean).join(' · ') || '—'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[13.5px] font-semibold text-[var(--text)] tabular">{formatCurrency(p.amountPaid)}</p>
                    <Badge status={p.status} dot={false} className="mt-0.5">
                      {p.status}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Recent bookings" action={<PanelLink to="/bookings">Bookings</PanelLink>}>
          {recentBookings.length === 0 ? (
            <EmptyState compact icon={MdHotel} title="No bookings yet" description="Guest stays will appear here." className="mx-5 mb-5" />
          ) : (
            <ul className="divide-y divide-[var(--border)] border-t border-[var(--border)]">
              {recentBookings.map((b) => (
                <li key={b.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--primary-light)] text-[var(--navy)] dark:text-[var(--primary)]">
                    <MdHotel className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium text-[var(--text)]">{b.fullName || 'Guest'}</p>
                    <p className="truncate text-[11.5px] text-[var(--text-muted)]">
                      {b.roomNumber || '—'} · {formatDate(b.checkIn)} → {formatDate(b.checkOut)}
                    </p>
                  </div>
                  <Badge status={b.status}>{b.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Recent activity" description="Latest payments and bookings" className="lg:col-span-2 xl:col-span-1">
          <ActivityFeed items={activity} />
        </Panel>
      </div>
    </div>
  );
}
