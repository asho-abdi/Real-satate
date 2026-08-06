import { useEffect, useMemo, useState } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import { formatCurrency, formatDate, cn } from '../../utils/format.js';
import { rentalApi } from '../../services/rentalApi.js';
import NewBooking from './NewBooking.jsx';

export default function Bookings() {
  const { globalSearch = '' } = useOutletContext() || {};
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'new' ? 'new' : 'list';
  const [tab, setTab] = useState(initialTab);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (globalSearch !== undefined) setSearch(globalSearch);
  }, [globalSearch]);

  useEffect(() => {
    const next = searchParams.get('tab') === 'new' ? 'new' : 'list';
    setTab(next);
  }, [searchParams]);

  const load = async (q) => {
    setLoading(true);
    try {
      setBookings(await rentalApi.listBookings(q || undefined));
    } catch (err) {
      toast.error(err.message || 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const switchTab = (id) => {
    setTab(id);
    if (id === 'new') setSearchParams({ tab: 'new' }, { replace: true });
    else setSearchParams({}, { replace: true });
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return bookings;
    return bookings.filter(
      (b) =>
        b.fullName.toLowerCase().includes(q) ||
        b.phone.toLowerCase().includes(q) ||
        String(b.roomNumber || '')
          .toLowerCase()
          .includes(q) ||
        String(b.building || '')
          .toLowerCase()
          .includes(q),
    );
  }, [bookings, search]);

  const runAction = async (id, action) => {
    try {
      if (action === 'checkin') await rentalApi.checkInBooking(id);
      if (action === 'checkout') await rentalApi.checkOutBooking(id);
      if (action === 'cancel') {
        if (!window.confirm('Cancel this booking?')) return;
        await rentalApi.cancelBooking(id);
      }
      toast.success('Booking updated');
      await load();
    } catch (err) {
      toast.error(err.message || 'Action failed');
    }
  };

  const onBookingCreated = async () => {
    switchTab('list');
    await load();
  };

  return (
    <div>
      <PageHeader
        title="Guest Bookings"
        subtitle="Create stays, check in, check out, or cancel guest bookings."
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {[
          { id: 'list', label: 'All Bookings' },
          { id: 'new', label: 'New Booking' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => switchTab(t.id)}
            className={cn(
              'h-12 rounded-xl px-5 text-base font-medium transition',
              tab === t.id
                ? 'bg-brand-700 text-white dark:bg-brand-400 dark:text-ink-950'
                : 'bg-[var(--surface)] text-[var(--text-muted)] ring-1 ring-[var(--border)]',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'new' ? (
        <NewBooking onSuccess={onBookingCreated} />
      ) : (
        <>
          <Card className="mb-4">
            <Input
              label="Search"
              placeholder="Customer name, phone, building, or room…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </Card>

          <Card>
            {loading ? (
              <div className="flex justify-center py-12">
                <Spinner />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-[var(--text-muted)]">
                      <th className="pb-2 font-medium">Code</th>
                      <th className="pb-2 font-medium">Guest</th>
                      <th className="pb-2 font-medium">Room</th>
                      <th className="pb-2 font-medium">Dates</th>
                      <th className="pb-2 font-medium">Nights</th>
                      <th className="pb-2 font-medium">Total</th>
                      <th className="pb-2 font-medium">Status</th>
                      <th className="pb-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((b) => (
                      <tr key={b.id} className="border-b border-[var(--border)]/60 align-top">
                        <td className="py-3 font-medium">{b.code}</td>
                        <td className="py-3">
                          <p className="font-medium">{b.fullName}</p>
                          <p className="text-xs text-[var(--text-muted)]">{b.phone}</p>
                        </td>
                        <td className="py-3">
                          {b.roomNumber}
                          <span className="block text-xs text-[var(--text-muted)]">{b.building}</span>
                        </td>
                        <td className="py-3">
                          {formatDate(b.checkIn)} → {formatDate(b.checkOut)}
                        </td>
                        <td className="py-3">{b.nights}</td>
                        <td className="py-3 font-medium">{formatCurrency(b.total)}</td>
                        <td className="py-3">
                          <Badge status={b.status === 'CheckedIn' ? 'Occupied' : b.status}>
                            {b.status}
                          </Badge>
                        </td>
                        <td className="py-3">
                          <div className="flex flex-wrap gap-1">
                            {b.status === 'Confirmed' || b.status === 'Reserved' ? (
                              <Button
                                className="h-9 px-3 text-xs"
                                onClick={() => runAction(b.id, 'checkin')}
                              >
                                Check In
                              </Button>
                            ) : null}
                            {b.status === 'CheckedIn' ? (
                              <Button
                                className="h-9 px-3 text-xs"
                                onClick={() => runAction(b.id, 'checkout')}
                              >
                                Check Out
                              </Button>
                            ) : null}
                            {b.status !== 'Cancelled' && b.status !== 'CheckedOut' ? (
                              <Button
                                variant="secondary"
                                className="h-9 px-3 text-xs"
                                onClick={() => runAction(b.id, 'cancel')}
                              >
                                Cancel
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filtered.length === 0 ? (
                  <p className="py-6 text-sm text-[var(--text-muted)]">No bookings found.</p>
                ) : null}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
