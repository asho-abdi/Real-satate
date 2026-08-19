import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  MdAdd,
  MdCheckCircle,
  MdEventAvailable,
  MdFilterList,
  MdHotel,
  MdLogout,
  MdPayments,
  MdVisibility,
} from 'react-icons/md';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Modal from '../../components/ui/Modal.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import SearchInput from '../../components/ui/SearchInput.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';
import { PAYMENT_METHODS } from '../../utils/constants.js';
import { calcBookingTotal } from '../../utils/rentCalc.js';
import { formatCurrency, formatDate, formatRoomLocation, cn } from '../../utils/format.js';
import { rentalApi } from '../../services/rentalApi.js';
import NewBooking from './NewBooking.jsx';

const STAY_FILTERS = ['', 'Confirmed', 'Reserved', 'CheckedIn', 'CheckedOut', 'Cancelled'];

function stayLabel(status) {
  if (status === 'CheckedIn') return 'Checked In';
  if (status === 'CheckedOut') return 'Checked Out';
  return status || '—';
}

function SummaryStatCard({ label, value, sub, icon: Icon, iconClass }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          {label}
        </span>
        <span
          className={cn(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-2)]',
            iconClass,
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>
      <p className="text-xl font-bold tabular-nums text-[var(--text)]">{value}</p>
      {sub ? <p className="text-[11px] text-[var(--text-muted)]">{sub}</p> : null}
    </div>
  );
}

function BookingsLoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-[88px] rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-32 rounded-2xl" />
      <div className="app-surface space-y-3 rounded-2xl p-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[var(--border)]/60 py-2.5 text-sm last:border-0">
      <span className="text-[var(--text-muted)]">{label}</span>
      <span className="max-w-[60%] text-right font-medium text-[var(--text)]">{value ?? '—'}</span>
    </div>
  );
}

function BookingActions({ booking, onCheckIn, onCheckOut, onCancel, onView, onExtend, compact = false }) {
  const btn = compact ? 'h-8 px-2.5 text-[11px]' : 'h-8 px-3 text-xs';
  const isUpcoming = booking.status === 'Confirmed' || booking.status === 'Reserved';
  const isActive = booking.status === 'CheckedIn';
  const isDone = booking.status === 'CheckedOut';
  const isCancelled = booking.status === 'Cancelled';

  if (isUpcoming) {
    return (
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        <Button variant="secondary" className={btn} onClick={() => onExtend(booking)}>
          Extend
        </Button>
        <Button className={btn} onClick={() => onCheckIn(booking)}>
          Check In
        </Button>
        <Button variant="secondary" className={btn} onClick={() => onCancel(booking.id)}>
          Cancel
        </Button>
      </div>
    );
  }
  if (isActive) {
    return (
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        <Button variant="secondary" className={btn} onClick={() => onExtend(booking)}>
          Extend
        </Button>
        <Button className={btn} onClick={() => onCheckOut(booking)}>
          Check Out
        </Button>
      </div>
    );
  }
  if (isDone || isCancelled) {
    return (
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        <Button variant="secondary" className={btn} onClick={() => onView(booking)}>
          <MdVisibility className="h-3.5 w-3.5" />
          View
        </Button>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      <Button variant="secondary" className={btn} onClick={() => onView(booking)}>
        View
      </Button>
    </div>
  );
}

function PaymentCell({ booking }) {
  const balance = Math.max(0, Number(booking.total) - Number(booking.amountPaid || 0));
  const status = booking.paymentStatus || 'Unpaid';
  return (
    <div>
      <Badge status={status}>{status}</Badge>
      <p className="mt-1 text-xs text-[var(--text-muted)]">
        Paid {formatCurrency(booking.amountPaid || 0)}
        {balance > 0 ? ` · Due ${formatCurrency(balance)}` : ''}
      </p>
      {booking.paymentMethod ? (
        <p className="text-xs text-[var(--text-muted)]">{booking.paymentMethod}</p>
      ) : null}
    </div>
  );
}

function BookingTableRow({ booking, onCheckIn, onCheckOut, onCancel, onView, onExtend }) {
  return (
    <tr
      className="group cursor-pointer border-b border-[var(--border)]/50 transition-colors hover:bg-[var(--surface-2)]/60"
      onClick={() => onView(booking)}
    >
      <td className="px-4 py-3.5">
        <span className="font-semibold text-[var(--text)]">{booking.code}</span>
      </td>
      <td className="px-4 py-3.5">
        <p className="font-medium text-[var(--text)]">{booking.fullName}</p>
        <p className="text-xs text-[var(--text-muted)]">{booking.phone}</p>
      </td>
      <td className="px-4 py-3.5">
        <p className="font-medium text-[var(--text)]">{booking.roomNumber}</p>
        <p className="text-xs text-[var(--text-muted)]">
          {formatRoomLocation({ building: booking.building, floor: booking.floor })}
        </p>
      </td>
      <td className="px-4 py-3.5 text-[var(--text-muted)]">
        {formatDate(booking.checkIn)} → {formatDate(booking.checkOut)}
      </td>
      <td className="px-4 py-3.5 text-[var(--text-muted)]">
        {booking.nights} {Number(booking.nights) === 1 ? 'night' : 'nights'}
      </td>
      <td className="px-4 py-3.5 font-semibold tabular-nums text-[var(--text)]">
        {formatCurrency(booking.total)}
      </td>
      <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
        <PaymentCell booking={booking} />
      </td>
      <td className="px-4 py-3.5">
        <Badge status={booking.status === 'CheckedIn' ? 'CheckedIn' : booking.status}>
          {stayLabel(booking.status)}
        </Badge>
      </td>
      <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
        <BookingActions
          booking={booking}
          onCheckIn={onCheckIn}
          onCheckOut={onCheckOut}
          onCancel={onCancel}
          onView={onView}
          onExtend={onExtend}
        />
      </td>
    </tr>
  );
}

function BookingMobileCard({ booking, onCheckIn, onCheckOut, onCancel, onView, onExtend }) {
  return (
    <div
      className="cursor-pointer rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm transition hover:border-brand-400/40"
      onClick={() => onView(booking)}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-[var(--text)]">{booking.code}</p>
          <p className="mt-0.5 font-medium">{booking.fullName}</p>
          <p className="text-xs text-[var(--text-muted)]">{booking.phone}</p>
        </div>
        <Badge status={booking.status === 'CheckedIn' ? 'CheckedIn' : booking.status}>
          {stayLabel(booking.status)}
        </Badge>
      </div>
      <div className="mb-3 grid grid-cols-2 gap-2 text-xs">
        <div>
          <p className="text-[var(--text-muted)]">Room</p>
          <p className="font-medium text-[var(--text)]">{booking.roomNumber}</p>
          <p className="text-[var(--text-muted)]">
            {formatRoomLocation({ building: booking.building, floor: booking.floor })}
          </p>
        </div>
        <div>
          <p className="text-[var(--text-muted)]">Amount</p>
          <p className="font-semibold text-[var(--text)]">{formatCurrency(booking.total)}</p>
          <p className="text-[var(--text-muted)]">
            {booking.nights} {Number(booking.nights) === 1 ? 'night' : 'nights'}
          </p>
        </div>
        <div className="col-span-2">
          <p className="text-[var(--text-muted)]">Stay dates</p>
          <p className="font-medium text-[var(--text)]">
            {formatDate(booking.checkIn)} → {formatDate(booking.checkOut)}
          </p>
        </div>
      </div>
      <div className="mb-3 border-t border-[var(--border)]/60 pt-3" onClick={(e) => e.stopPropagation()}>
        <PaymentCell booking={booking} />
      </div>
      <div onClick={(e) => e.stopPropagation()}>
        <BookingActions
          booking={booking}
          onCheckIn={onCheckIn}
          onCheckOut={onCheckOut}
          onCancel={onCancel}
          onView={onView}
          onExtend={onExtend}
          compact
        />
      </div>
    </div>
  );
}

export default function Bookings() {
  const { globalSearch = '' } = useOutletContext() || {};
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'new' ? 'new' : 'list';
  const [tab, setTab] = useState(initialTab);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stayStatus, setStayStatus] = useState('');
  const [floorFilter, setFloorFilter] = useState('');
  const [buildingFilter, setBuildingFilter] = useState('');
  const [roomFilter, setRoomFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [payModal, setPayModal] = useState(null);
  const [detailModal, setDetailModal] = useState(null);
  const [editBooking, setEditBooking] = useState(null);
  const [extendModal, setExtendModal] = useState(null);
  const [extendForm, setExtendForm] = useState({ checkIn: '', checkOut: '' });
  const [savingExtend, setSavingExtend] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: '',
    phone: '',
    idNumber: '',
    nationality: '',
    gender: '',
    emergencyContact: '',
    checkIn: '',
    checkOut: '',
    discount: 0,
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [payForm, setPayForm] = useState({ amountPaid: '', paymentMethod: 'Cash' });
  const [savingPay, setSavingPay] = useState(false);

  useEffect(() => {
    if (globalSearch !== undefined) setSearch(globalSearch);
  }, [globalSearch]);

  useEffect(() => {
    const next = searchParams.get('tab') === 'new' ? 'new' : 'list';
    setTab(next);
  }, [searchParams]);

  const load = useCallback(async (q) => {
    setLoading(true);
    try {
      setBookings(await rentalApi.listBookings(q || undefined));
    } catch (err) {
      toast.error(err.message || 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const switchTab = (id) => {
    setTab(id);
    if (id === 'new') setSearchParams({ tab: 'new' }, { replace: true });
    else setSearchParams({}, { replace: true });
  };

  const buildingOptions = useMemo(() => {
    const set = new Set(bookings.map((b) => b.building).filter(Boolean));
    return [...set].sort();
  }, [bookings]);

  const floorOptions = useMemo(() => {
    const filtered = buildingFilter
      ? bookings.filter((b) => b.building === buildingFilter)
      : bookings;
    const set = new Set(filtered.map((b) => b.floor).filter(Boolean));
    return [...set].sort();
  }, [bookings, buildingFilter]);

  const roomOptions = useMemo(() => {
    let filtered = bookings;
    if (buildingFilter) filtered = filtered.filter((b) => b.building === buildingFilter);
    if (floorFilter) filtered = filtered.filter((b) => b.floor === floorFilter);
    const set = new Set(filtered.map((b) => b.roomNumber).filter(Boolean));
    return [...set].sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
  }, [bookings, buildingFilter, floorFilter]);

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcoming = bookings.filter((b) => {
      if (b.status !== 'Confirmed' && b.status !== 'Reserved') return false;
      const checkIn = new Date(`${b.checkIn}T00:00:00`);
      return checkIn >= today;
    }).length;
    const checkedIn = bookings.filter((b) => b.status === 'CheckedIn').length;
    const checkedOut = bookings.filter((b) => b.status === 'CheckedOut').length;
    const revenue = bookings
      .filter((b) => b.status !== 'Cancelled')
      .reduce((sum, b) => sum + (Number(b.total) || 0), 0);
    return {
      total: bookings.length,
      upcoming,
      checkedIn,
      checkedOut,
      revenue,
    };
  }, [bookings]);

  const hasFilters =
    Boolean(search.trim()) ||
    Boolean(stayStatus) ||
    Boolean(floorFilter) ||
    Boolean(buildingFilter) ||
    Boolean(roomFilter) ||
    Boolean(dateFrom) ||
    Boolean(dateTo);

  const clearFilters = () => {
    setSearch('');
    setStayStatus('');
    setFloorFilter('');
    setBuildingFilter('');
    setRoomFilter('');
    setDateFrom('');
    setDateTo('');
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return bookings.filter((b) => {
      if (stayStatus && b.status !== stayStatus) return false;
      if (floorFilter && b.floor !== floorFilter) return false;
      if (buildingFilter && b.building !== buildingFilter) return false;
      if (roomFilter && String(b.roomNumber) !== roomFilter) return false;
      if (dateFrom && b.checkOut < dateFrom) return false;
      if (dateTo && b.checkIn > dateTo) return false;
      if (!q) return true;
      return (
        String(b.code || '').toLowerCase().includes(q) ||
        b.fullName.toLowerCase().includes(q) ||
        b.phone.toLowerCase().includes(q) ||
        String(b.roomNumber || '').toLowerCase().includes(q) ||
        String(b.building || '').toLowerCase().includes(q) ||
        String(b.floor || '').toLowerCase().includes(q)
      );
    });
  }, [bookings, search, stayStatus, floorFilter, buildingFilter, roomFilter, dateFrom, dateTo]);

  const openPayModal = (booking, action) => {
    const balance = Math.max(0, Number(booking.total) - Number(booking.amountPaid || 0));
    setPayModal({ booking, action });
    setPayForm({
      amountPaid: String(action === 'checkout' ? booking.total : balance || booking.total),
      paymentMethod: booking.paymentMethod || 'Cash',
    });
  };

  const submitPaymentAction = async () => {
    if (!payModal) return;
    const { booking, action } = payModal;
    const amountPaid = Number(payForm.amountPaid);
    if (Number.isNaN(amountPaid) || amountPaid < 0) {
      toast.error('Enter a valid amount paid');
      return;
    }

    setSavingPay(true);
    try {
      const payload = {
        amountPaid,
        paymentMethod: payForm.paymentMethod,
      };
      if (action === 'checkin') {
        await rentalApi.checkInBooking(booking.id, payload);
        toast.success('Guest checked in');
      } else {
        await rentalApi.checkOutBooking(booking.id, payload);
        toast.success('Guest checked out');
      }
      setPayModal(null);
      await load();
    } catch (err) {
      toast.error(err.message || 'Action failed');
    } finally {
      setSavingPay(false);
    }
  };

  const runAction = async (id, action) => {
    try {
      if (action === 'cancel') {
        if (!window.confirm('Cancel this booking?')) return;
        await rentalApi.cancelBooking(id);
        toast.success('Booking updated');
        await load();
      }
    } catch (err) {
      toast.error(err.message || 'Action failed');
    }
  };

  const onBookingCreated = async () => {
    switchTab('list');
    await load();
  };

  const openEditBooking = (booking) => {
    setEditBooking(booking);
    setEditForm({
      fullName: booking.fullName || '',
      phone: booking.phone || '',
      idNumber: booking.idNumber || '',
      nationality: booking.nationality || '',
      gender: booking.gender || '',
      emergencyContact: booking.emergencyContact || '',
      checkIn: booking.checkIn || '',
      checkOut: booking.checkOut || '',
      discount: booking.discount ?? 0,
    });
  };

  const openExtendStay = (booking) => {
    setExtendModal(booking);
    setExtendForm({
      checkIn: booking.checkIn || '',
      checkOut: booking.checkOut || '',
    });
  };

  const extendPreview = useMemo(() => {
    if (!extendModal || !extendForm.checkIn || !extendForm.checkOut) return null;
    return calcBookingTotal({
      monthlyRent: extendModal.monthlyRent,
      checkIn: extendForm.checkIn,
      checkOut: extendForm.checkOut,
      discount: extendModal.discount || 0,
    });
  }, [extendModal, extendForm]);

  const saveExtendStay = async () => {
    if (!extendModal) return;
    if (!extendForm.checkOut) {
      toast.error('Choose a new checkout date');
      return;
    }
    if (extendModal.status === 'CheckedIn') {
      const currentOut = new Date(`${extendModal.checkOut}T00:00:00`);
      const nextOut = new Date(`${extendForm.checkOut}T00:00:00`);
      if (nextOut < currentOut) {
        toast.error('New checkout must be on or after the current checkout date');
        return;
      }
    }
    setSavingExtend(true);
    try {
      const payload =
        extendModal.status === 'CheckedIn'
          ? { checkOut: extendForm.checkOut }
          : { checkIn: extendForm.checkIn, checkOut: extendForm.checkOut };
      await rentalApi.updateBooking(extendModal.id, payload);
      toast.success('Stay extended');
      setExtendModal(null);
      setDetailModal(null);
      await load();
    } catch (err) {
      toast.error(err.message || 'Could not extend stay');
    } finally {
      setSavingExtend(false);
    }
  };

  const saveEditBooking = async () => {
    if (!editBooking) return;
    setSavingEdit(true);
    try {
      const canEditDates = editBooking.status === 'Confirmed' || editBooking.status === 'Reserved';
      await rentalApi.updateBooking(editBooking.id, {
        fullName: editForm.fullName,
        phone: editForm.phone,
        idNumber: editForm.idNumber,
        nationality: editForm.nationality,
        gender: editForm.gender,
        emergencyContact: editForm.emergencyContact,
        ...(canEditDates
          ? {
              checkIn: editForm.checkIn,
              checkOut: editForm.checkOut,
              discount: Number(editForm.discount) || 0,
            }
          : {}),
      });
      toast.success('Booking updated');
      setEditBooking(null);
      setDetailModal(null);
      await load();
    } catch (err) {
      toast.error(err.message || 'Could not update booking');
    } finally {
      setSavingEdit(false);
    }
  };

  const balanceDue = payModal
    ? Math.max(0, Number(payModal.booking.total) - Number(payForm.amountPaid || 0))
    : 0;

  const detailBalance = detailModal
    ? Math.max(0, Number(detailModal.total) - Number(detailModal.amountPaid || 0))
    : 0;

  return (
    <div>
      <PageHeader
        title="Guest Bookings"
        subtitle="Manage reservations, guest stays, payments, and check-in/check-out."
        actions={
          tab === 'list' ? (
            <Button className="h-11 px-5" onClick={() => switchTab('new')}>
              <MdAdd className="h-4 w-4" />
              New Booking
            </Button>
          ) : (
            <Button variant="secondary" className="h-11 px-5" onClick={() => switchTab('list')}>
              Back to Bookings
            </Button>
          )
        }
      />

      {tab === 'new' ? (
        <NewBooking onSuccess={onBookingCreated} />
      ) : (
        <>
          {loading ? (
            <BookingsLoadingSkeleton />
          ) : (
            <>
              {/* Summary cards */}
              <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                <SummaryStatCard
                  label="Total Bookings"
                  value={stats.total}
                  icon={MdHotel}
                  iconClass="text-brand-600 dark:text-brand-400"
                />
                <SummaryStatCard
                  label="Upcoming"
                  value={stats.upcoming}
                  sub="Confirmed & reserved"
                  icon={MdEventAvailable}
                  iconClass="text-sky-600 dark:text-sky-400"
                />
                <SummaryStatCard
                  label="Checked In"
                  value={stats.checkedIn}
                  sub="Active stays"
                  icon={MdCheckCircle}
                  iconClass="text-emerald-600 dark:text-emerald-400"
                />
                <SummaryStatCard
                  label="Checked Out"
                  value={stats.checkedOut}
                  sub="Completed"
                  icon={MdLogout}
                  iconClass="text-slate-600 dark:text-slate-400"
                />
                <SummaryStatCard
                  label="Revenue"
                  value={formatCurrency(stats.revenue)}
                  sub="Non-cancelled bookings"
                  icon={MdPayments}
                  iconClass="text-amber-600 dark:text-amber-400"
                />
              </div>

              {/* Filters */}
              <Card className="mb-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium text-[var(--text)]">
                  <MdFilterList className="h-4 w-4 text-[var(--text-muted)]" />
                  Filters
                </div>
                <div className="grid gap-3 lg:grid-cols-12">
                  <div className="lg:col-span-4">
                    <span className="mb-1.5 block text-sm font-medium text-[var(--text)]">Search</span>
                    <SearchInput
                      placeholder="Search booking, guest, phone, room…"
                      value={search}
                      onChange={setSearch}
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <Select label="Stay Status" value={stayStatus} onChange={(e) => setStayStatus(e.target.value)}>
                      <option value="">All stays</option>
                      {STAY_FILTERS.filter(Boolean).map((s) => (
                        <option key={s} value={s}>
                          {stayLabel(s)}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="lg:col-span-2">
                    <Select label="Floor" value={floorFilter} onChange={(e) => {
                      setFloorFilter(e.target.value);
                      setRoomFilter('');
                    }}>
                      <option value="">All floors</option>
                      {floorOptions.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="lg:col-span-2">
                    <Select
                      label="Building"
                      value={buildingFilter}
                      onChange={(e) => {
                        setBuildingFilter(e.target.value);
                        setFloorFilter('');
                        setRoomFilter('');
                      }}
                    >
                      <option value="">All buildings</option>
                      {buildingOptions.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="lg:col-span-2">
                    <Select label="Room" value={roomFilter} onChange={(e) => setRoomFilter(e.target.value)}>
                      <option value="">All rooms</option>
                      {roomOptions.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="lg:col-span-3">
                    <Input label="From date" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                  </div>
                  <div className="lg:col-span-3">
                    <Input label="To date" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                  </div>
                  <div className="flex items-end lg:col-span-6">
                    {hasFilters ? (
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="h-11 rounded-xl border border-[var(--border)] px-4 text-sm font-medium text-[var(--text-muted)] transition hover:bg-[var(--surface-2)]"
                      >
                        Clear filters
                      </button>
                    ) : null}
                  </div>
                </div>
              </Card>

              {/* Table / cards */}
              <Card className="overflow-hidden p-0">
                {filtered.length === 0 ? (
                  <div className="p-5">
                    <EmptyState
                      title={bookings.length === 0 ? 'No guest bookings yet' : 'No bookings match your filters'}
                      description={
                        bookings.length === 0
                          ? 'Bookings will appear here when guests make reservations.'
                          : 'Try adjusting your search or filter criteria.'
                      }
                      action={
                        bookings.length === 0 ? (
                          <Button className="mt-2 h-11 px-5" onClick={() => switchTab('new')}>
                            <MdAdd className="h-4 w-4" />
                            New Booking
                          </Button>
                        ) : (
                          <Button variant="secondary" className="mt-2 h-11 px-5" onClick={clearFilters}>
                            Clear filters
                          </Button>
                        )
                      }
                    />
                  </div>
                ) : (
                  <>
                    {/* Desktop table */}
                    <div className="hidden overflow-x-auto md:block">
                      <table className="w-full min-w-[980px] text-left text-sm">
                        <thead className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--surface)]">
                          <tr className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                            <th className="px-4 py-3">Booking</th>
                            <th className="px-4 py-3">Guest</th>
                            <th className="px-4 py-3">Room</th>
                            <th className="px-4 py-3">Stay Dates</th>
                            <th className="px-4 py-3">Nights</th>
                            <th className="px-4 py-3">Amount</th>
                            <th className="px-4 py-3">Payment</th>
                            <th className="px-4 py-3">Stay Status</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.map((b) => (
                            <BookingTableRow
                              key={b.id}
                              booking={b}
                              onCheckIn={(booking) => openPayModal(booking, 'checkin')}
                              onCheckOut={(booking) => openPayModal(booking, 'checkout')}
                              onCancel={(id) => runAction(id, 'cancel')}
                              onView={setDetailModal}
                              onExtend={openExtendStay}
                            />
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile cards */}
                    <div className="space-y-3 p-4 md:hidden">
                      {filtered.map((b) => (
                        <BookingMobileCard
                          key={b.id}
                          booking={b}
                          onCheckIn={(booking) => openPayModal(booking, 'checkin')}
                          onCheckOut={(booking) => openPayModal(booking, 'checkout')}
                          onCancel={(id) => runAction(id, 'cancel')}
                          onView={setDetailModal}
                          onExtend={openExtendStay}
                        />
                      ))}
                    </div>
                  </>
                )}
              </Card>
            </>
          )}
        </>
      )}

      {/* Check-in / Check-out payment modal */}
      <Modal
        open={Boolean(payModal)}
        onClose={() => !savingPay && setPayModal(null)}
        title={
          payModal?.action === 'checkout'
            ? `Collect payment · ${payModal.booking.code}`
            : `Check in & payment · ${payModal?.booking.code}`
        }
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" className="h-11 px-4" onClick={() => setPayModal(null)} disabled={savingPay}>
              Cancel
            </Button>
            <Button className="h-11 px-4" onClick={submitPaymentAction} disabled={savingPay} loading={savingPay}>
              {payModal?.action === 'checkout' ? 'Confirm paid & check out' : 'Confirm paid & check in'}
            </Button>
          </div>
        }
      >
        {payModal ? (
          <div className="grid gap-4">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm">
              <p className="font-medium text-[var(--text)]">{payModal.booking.fullName}</p>
              <p className="mt-1 text-[var(--text-muted)]">
                Room {payModal.booking.roomNumber} · Total {formatCurrency(payModal.booking.total)} · Already
                paid {formatCurrency(payModal.booking.amountPaid || 0)}
              </p>
            </div>
            <Input
              label="Amount paid (total collected)"
              type="number"
              min={0}
              value={payForm.amountPaid}
              onChange={(e) => setPayForm({ ...payForm, amountPaid: e.target.value })}
            />
            <Select
              label="Payment method"
              value={payForm.paymentMethod}
              onChange={(e) => setPayForm({ ...payForm, paymentMethod: e.target.value })}
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm">
              Balance after this payment: <strong>{formatCurrency(balanceDue)}</strong>
              {payModal.action === 'checkout' && balanceDue > 0 ? (
                <span className="mt-1 block text-amber-700 dark:text-amber-300">
                  Full payment is required before check-out.
                </span>
              ) : null}
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Booking details modal */}
      <Modal
        open={Boolean(detailModal)}
        onClose={() => setDetailModal(null)}
        title={detailModal ? `Booking · ${detailModal.code}` : 'Booking details'}
        size="lg"
        footer={
          detailModal ? (
            <div className="flex flex-wrap justify-end gap-2">
              {(detailModal.status === 'Confirmed' ||
                detailModal.status === 'Reserved' ||
                detailModal.status === 'CheckedIn') && (
                <>
                  <Button variant="secondary" className="h-10 px-4" onClick={() => openExtendStay(detailModal)}>
                    Extend Stay
                  </Button>
                  <Button variant="secondary" className="h-10 px-4" onClick={() => openEditBooking(detailModal)}>
                    Edit
                  </Button>
                </>
              )}
              {detailModal.status === 'Confirmed' || detailModal.status === 'Reserved' ? (
                <>
                  <Button
                    variant="secondary"
                    className="h-10 px-4"
                    onClick={() => {
                      runAction(detailModal.id, 'cancel');
                      setDetailModal(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="h-10 px-4"
                    onClick={() => {
                      setDetailModal(null);
                      openPayModal(detailModal, 'checkin');
                    }}
                  >
                    Check In
                  </Button>
                </>
              ) : null}
              {detailModal.status === 'CheckedIn' ? (
                <Button
                  className="h-10 px-4"
                  onClick={() => {
                    setDetailModal(null);
                    openPayModal(detailModal, 'checkout');
                  }}
                >
                  Check Out
                </Button>
              ) : null}
              <Button variant="secondary" className="h-10 px-4" onClick={() => setDetailModal(null)}>
                Close
              </Button>
            </div>
          ) : null
        }
      >
        {detailModal ? (
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="rounded-xl border border-[var(--border)] p-4">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Guest Information
              </h4>
              <DetailRow label="Name" value={detailModal.fullName} />
              <DetailRow label="Phone" value={detailModal.phone} />
              {detailModal.idNumber ? <DetailRow label="ID / Passport" value={detailModal.idNumber} /> : null}
              {detailModal.nationality ? <DetailRow label="Nationality" value={detailModal.nationality} /> : null}
            </div>
            <div className="rounded-xl border border-[var(--border)] p-4">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Room Information
              </h4>
              <DetailRow label="Building" value={detailModal.building} />
              <DetailRow label="Floor" value={detailModal.floor || '—'} />
              <DetailRow label="Room" value={detailModal.roomNumber} />
            </div>
            <div className="rounded-xl border border-[var(--border)] p-4">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Booking Information
              </h4>
              <DetailRow label="Booking Code" value={detailModal.code} />
              <DetailRow label="Check-in" value={formatDate(detailModal.checkIn)} />
              <DetailRow label="Check-out" value={formatDate(detailModal.checkOut)} />
              <DetailRow
                label="Nights"
                value={`${detailModal.nights} ${Number(detailModal.nights) === 1 ? 'night' : 'nights'}`}
              />
            </div>
            <div className="rounded-xl border border-[var(--border)] p-4">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Payment Information
              </h4>
              <DetailRow label="Total amount" value={formatCurrency(detailModal.total)} />
              <DetailRow label="Amount paid" value={formatCurrency(detailModal.amountPaid || 0)} />
              <DetailRow label="Balance" value={formatCurrency(detailBalance)} />
              <DetailRow label="Payment method" value={detailModal.paymentMethod || '—'} />
              <div className="flex items-center justify-between gap-4 pt-2.5">
                <span className="text-sm text-[var(--text-muted)]">Payment status</span>
                <Badge status={detailModal.paymentStatus || 'Unpaid'}>
                  {detailModal.paymentStatus || 'Unpaid'}
                </Badge>
              </div>
            </div>
            <div className="rounded-xl border border-[var(--border)] p-4 sm:col-span-2">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Stay Status
              </h4>
              <div className="flex items-center gap-2">
                <Badge status={detailModal.status === 'CheckedIn' ? 'CheckedIn' : detailModal.status}>
                  {stayLabel(detailModal.status)}
                </Badge>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(editBooking)}
        onClose={() => !savingEdit && setEditBooking(null)}
        title={editBooking ? `Edit Booking · ${editBooking.code}` : 'Edit Booking'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" className="h-10 px-4" onClick={() => setEditBooking(null)} disabled={savingEdit}>
              Cancel
            </Button>
            <Button className="h-10 px-4" onClick={saveEditBooking} disabled={savingEdit}>
              {savingEdit ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        }
      >
        {editBooking ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Guest name" value={editForm.fullName} onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })} />
            <Input label="Phone" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
            <Input label="ID / Passport" value={editForm.idNumber} onChange={(e) => setEditForm({ ...editForm, idNumber: e.target.value })} />
            <Input label="Nationality" value={editForm.nationality} onChange={(e) => setEditForm({ ...editForm, nationality: e.target.value })} />
            <Select label="Gender" value={editForm.gender} onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}>
              <option value="">Select</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </Select>
            <Input label="Emergency contact" value={editForm.emergencyContact} onChange={(e) => setEditForm({ ...editForm, emergencyContact: e.target.value })} />
            <Input
              label="Check-in"
              type="date"
              value={editForm.checkIn}
              disabled={editBooking.status === 'CheckedIn'}
              onChange={(e) => setEditForm({ ...editForm, checkIn: e.target.value })}
            />
            <Input
              label="Check-out"
              type="date"
              value={editForm.checkOut}
              disabled={editBooking.status === 'CheckedIn'}
              onChange={(e) => setEditForm({ ...editForm, checkOut: e.target.value })}
            />
            <Input
              label="Discount"
              type="number"
              value={editForm.discount}
              disabled={editBooking.status === 'CheckedIn'}
              onChange={(e) => setEditForm({ ...editForm, discount: e.target.value })}
            />
            {editBooking.status === 'CheckedIn' ? (
              <p className="sm:col-span-2 text-sm text-[var(--text-muted)]">
                Dates and discount cannot be changed while the guest is checked in.
              </p>
            ) : null}
          </div>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(extendModal)}
        onClose={() => !savingExtend && setExtendModal(null)}
        title={extendModal ? `Extend Stay · ${extendModal.code}` : 'Extend Stay'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" className="h-10 px-4" onClick={() => setExtendModal(null)} disabled={savingExtend}>
              Cancel
            </Button>
            <Button className="h-10 px-4" onClick={saveExtendStay} disabled={savingExtend}>
              {savingExtend ? 'Saving…' : 'Save Extension'}
            </Button>
          </div>
        }
      >
        {extendModal ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm">
              <p className="font-medium text-[var(--text)]">{extendModal.fullName}</p>
              <p className="mt-1 text-[var(--text-muted)]">
                Room {extendModal.roomNumber} · {formatRoomLocation({ building: extendModal.building, floor: extendModal.floor })}
              </p>
              <p className="mt-1 text-[var(--text-muted)]">
                Current stay: {formatDate(extendModal.checkIn)} → {formatDate(extendModal.checkOut)} (
                {extendModal.nights} {Number(extendModal.nights) === 1 ? 'night' : 'nights'})
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Check-in"
                type="date"
                value={extendForm.checkIn}
                disabled={extendModal.status === 'CheckedIn'}
                onChange={(e) => setExtendForm({ ...extendForm, checkIn: e.target.value })}
              />
              <Input
                label="New checkout date"
                type="date"
                value={extendForm.checkOut}
                min={extendModal.status === 'CheckedIn' ? extendModal.checkOut : extendForm.checkIn}
                onChange={(e) => setExtendForm({ ...extendForm, checkOut: e.target.value })}
              />
            </div>
            {extendPreview ? (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm">
                <p className="font-medium text-[var(--text)]">Updated stay preview</p>
                <p className="mt-2 text-[var(--text-muted)]">
                  {extendPreview.nights} {extendPreview.nights === 1 ? 'night' : 'nights'} · New total{' '}
                  {formatCurrency(extendPreview.total)}
                </p>
                <p className="mt-1 text-[var(--text-muted)]">
                  Currently paid {formatCurrency(extendModal.amountPaid || 0)} · Balance after extension{' '}
                  <strong className="text-[var(--text)]">
                    {formatCurrency(Math.max(0, extendPreview.total - (extendModal.amountPaid || 0)))}
                  </strong>
                </p>
              </div>
            ) : null}
            {extendModal.status === 'CheckedIn' ? (
              <p className="text-sm text-[var(--text-muted)]">
                While checked in, you can only extend the checkout date — not shorten the stay.
              </p>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
