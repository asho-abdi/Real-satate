import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { MdRefresh, MdToday } from 'react-icons/md';
import PageHeader from '../components/ui/PageHeader.jsx';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import Badge from '../components/ui/Badge.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import { rentalApi } from '../services/rentalApi.js';
import { formatCurrency, formatDate } from '../utils/format.js';
import { labelUnitType } from '../utils/labels.js';

const DUE_KIND_LABEL = {
  RENT: 'Rent',
  OWNER_MONTHLY: 'Owner monthly',
  OTHER_CHARGE: 'Other charge',
  GUEST: 'Guest booking',
};

function formatTime(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Africa/Nairobi',
  }).format(new Date(value));
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

function SummaryStat({ label, value, accent }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">{label}</p>
      <p className={`mt-1 text-xl font-bold tracking-tight ${accent || 'text-[var(--text)]'}`}>{value}</p>
    </div>
  );
}

function Section({ title, count, children, action }) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-[var(--text)]">{title}</h2>
          {typeof count === 'number' ? (
            <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-xs font-semibold text-[var(--text-muted)]">
              {count}
            </span>
          ) : null}
        </div>
        {action || null}
      </div>
      <div className="overflow-x-auto">{children}</div>
    </Card>
  );
}

export default function Today() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async ({ soft } = {}) => {
    if (soft) setRefreshing(true);
    else setLoading(true);
    try {
      const board = await rentalApi.getTodayBoard();
      setData(board);
    } catch (err) {
      toast.error(err.message || 'Failed to load Today board');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !data) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const summary = data?.summary || {};
  const dateLabel = data?.date
    ? new Intl.DateTimeFormat('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'Africa/Nairobi',
      }).format(new Date(`${data.date}T12:00:00+03:00`))
    : 'Today';

  return (
    <div>
      <PageHeader
        title="Today"
        subtitle={`Office board for ${dateLabel}`}
        breadcrumbs={[{ label: 'Home', to: '/dashboard' }, { label: 'Today' }]}
        actions={
          <Button
            type="button"
            variant="secondary"
            onClick={() => load({ soft: true })}
            disabled={refreshing}
          >
            <MdRefresh className={`mr-1.5 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        }
      />

      <div className="mb-5 flex items-center gap-2 text-sm text-[var(--text-muted)]">
        <MdToday className="h-4 w-4" />
        <span>Auto-dated to today · Africa/Nairobi</span>
        {data?.generatedAt ? (
          <span className="text-[var(--text-muted)]">· Updated {formatTime(data.generatedAt)}</span>
        ) : null}
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <SummaryStat label="Available units" value={summary.availableUnits ?? 0} />
        <SummaryStat label="Check-ins" value={summary.checkIns ?? 0} accent="text-sky-600 dark:text-sky-400" />
        <SummaryStat label="Check-outs" value={summary.checkOuts ?? 0} accent="text-amber-600 dark:text-amber-400" />
        <SummaryStat label="Total amount due" value={formatCurrency(summary.totalDue ?? 0)} accent="text-rose-600 dark:text-rose-400" />
        <SummaryStat
          label="Received today"
          value={formatCurrency(summary.totalReceivedToday ?? 0)}
          accent="text-emerald-600 dark:text-emerald-400"
        />
      </div>

      <div className="space-y-5">
        <Section title="Available Today" count={(data?.available || []).length}>
          <table className="min-w-full text-sm">
            <thead className="bg-[var(--surface-2)] text-left text-xs uppercase tracking-wide text-[var(--text-muted)]">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Unit</th>
                <th className="px-4 py-2.5 font-semibold">Type</th>
                <th className="px-4 py-2.5 font-semibold">Building</th>
                <th className="px-4 py-2.5 font-semibold">Status</th>
                <th className="px-4 py-2.5 font-semibold">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {(data?.available || []).length === 0 ? (
                <EmptyRow colSpan={5} message="No units available or freeing up today." />
              ) : (
                (data.available || []).map((row) => (
                  <tr key={`${row.availability}-${row.unitId}`} className="hover:bg-[var(--surface-2)]/60">
                    <td className="px-4 py-3 font-medium">
                      {row.unitId ? (
                        <Link to={`/units/${row.unitId}`} className="text-brand-600 hover:underline dark:text-brand-400">
                          {row.roomNumber}
                        </Link>
                      ) : (
                        row.roomNumber
                      )}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-muted)]">
                      {labelUnitType(row.unitType) || row.unitType || '—'}
                    </td>
                    <td className="px-4 py-3">{row.building || '—'}</td>
                    <td className="px-4 py-3">
                      <Badge status={row.badge}>{row.badge}</Badge>
                    </td>
                    <td className="px-4 py-3 text-[var(--text-muted)]">{row.note || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Section>

        <Section title="Check-ins Today" count={(data?.checkIns || []).length}>
          <table className="min-w-full text-sm">
            <thead className="bg-[var(--surface-2)] text-left text-xs uppercase tracking-wide text-[var(--text-muted)]">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Guest</th>
                <th className="px-4 py-2.5 font-semibold">Unit</th>
                <th className="px-4 py-2.5 font-semibold">Check-in</th>
                <th className="px-4 py-2.5 font-semibold">Booking</th>
                <th className="px-4 py-2.5 font-semibold">Payment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {(data?.checkIns || []).length === 0 ? (
                <EmptyRow colSpan={5} message="No check-ins scheduled for today." />
              ) : (
                (data.checkIns || []).map((row) => (
                  <tr key={row.id} className="hover:bg-[var(--surface-2)]/60">
                    <td className="px-4 py-3">
                      <p className="font-medium">{row.guest}</p>
                      <p className="text-xs text-[var(--text-muted)]">{row.phone || '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">
                        {row.unitId ? (
                          <Link to={`/units/${row.unitId}`} className="text-brand-600 hover:underline dark:text-brand-400">
                            {row.roomNumber}
                          </Link>
                        ) : (
                          row.roomNumber
                        )}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">{row.building}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge status="Check-in">Check-in</Badge>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">{formatTime(row.checkIn)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Link to="/bookings" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
                        {row.code || 'Booking'}
                      </Link>
                      <p className="text-xs text-[var(--text-muted)]">
                        {formatDate(row.checkIn)} → {formatDate(row.checkOut)} · {formatCurrency(row.totalAmount)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge status={row.paymentBadge}>{row.paymentBadge}</Badge>
                      {row.balance > 0 ? (
                        <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                          Due {formatCurrency(row.balance)}
                        </p>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Section>

        <Section title="Check-outs Today" count={(data?.checkOuts || []).length}>
          <table className="min-w-full text-sm">
            <thead className="bg-[var(--surface-2)] text-left text-xs uppercase tracking-wide text-[var(--text-muted)]">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Guest</th>
                <th className="px-4 py-2.5 font-semibold">Unit</th>
                <th className="px-4 py-2.5 font-semibold">Check-out</th>
                <th className="px-4 py-2.5 font-semibold">Booking</th>
                <th className="px-4 py-2.5 font-semibold">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {(data?.checkOuts || []).length === 0 ? (
                <EmptyRow colSpan={5} message="No check-outs scheduled for today." />
              ) : (
                (data.checkOuts || []).map((row) => (
                  <tr key={row.id} className="hover:bg-[var(--surface-2)]/60">
                    <td className="px-4 py-3">
                      <p className="font-medium">{row.guest}</p>
                      <p className="text-xs text-[var(--text-muted)]">{row.phone || '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">
                        {row.unitId ? (
                          <Link to={`/units/${row.unitId}`} className="text-brand-600 hover:underline dark:text-brand-400">
                            {row.roomNumber}
                          </Link>
                        ) : (
                          row.roomNumber
                        )}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">{row.building}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge status="Check-out">Check-out</Badge>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">{formatTime(row.checkOut)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Link to="/bookings" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
                        {row.code || 'Booking'}
                      </Link>
                      <p className="text-xs text-[var(--text-muted)]">
                        Paid {formatCurrency(row.amountPaid)} of {formatCurrency(row.totalAmount)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {row.balance > 0 ? (
                        <>
                          <Badge status="Outstanding">Outstanding</Badge>
                          <p className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
                            {formatCurrency(row.balance)}
                          </p>
                        </>
                      ) : (
                        <Badge status="Paid">Paid</Badge>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Section>

        <Section title="Due Today" count={(data?.due || []).length}>
          <table className="min-w-full text-sm">
            <thead className="bg-[var(--surface-2)] text-left text-xs uppercase tracking-wide text-[var(--text-muted)]">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Type</th>
                <th className="px-4 py-2.5 font-semibold">Who</th>
                <th className="px-4 py-2.5 font-semibold">Unit</th>
                <th className="px-4 py-2.5 font-semibold">Description</th>
                <th className="px-4 py-2.5 font-semibold text-right">Due</th>
                <th className="px-4 py-2.5 font-semibold text-right">Paid</th>
                <th className="px-4 py-2.5 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {(data?.due || []).length === 0 ? (
                <EmptyRow colSpan={7} message="Nothing due for today." />
              ) : (
                (data.due || []).map((row) => (
                  <tr key={`${row.kind}-${row.id}`} className="hover:bg-[var(--surface-2)]/60">
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge status="Due">Due</Badge>
                        <Badge status={DUE_KIND_LABEL[row.kind] || row.kind}>
                          {DUE_KIND_LABEL[row.kind] || row.kind}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{row.name}</p>
                      <p className="text-xs text-[var(--text-muted)]">{row.phone || '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      {row.unitId ? (
                        <Link to={`/units/${row.unitId}`} className="text-brand-600 hover:underline dark:text-brand-400">
                          {row.roomNumber}
                        </Link>
                      ) : (
                        row.roomNumber
                      )}
                      <p className="text-xs text-[var(--text-muted)]">{row.building}</p>
                    </td>
                    <td className="px-4 py-3 text-[var(--text-muted)]">{row.description || '—'}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatCurrency(row.amountDue)}</td>
                    <td className="px-4 py-3 text-right text-[var(--text-muted)]">
                      {formatCurrency(row.amountPaid)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge status={row.paymentBadge}>{row.paymentBadge}</Badge>
                      {row.balance > 0 ? (
                        <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                          {formatCurrency(row.balance)} left
                        </p>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Section>
      </div>
    </div>
  );
}
