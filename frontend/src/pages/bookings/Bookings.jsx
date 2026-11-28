import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useOutletContext, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import { calcBookingFinancials, calcBookingTotal, roundMoney } from '../../utils/rentCalc.js';
import { formatCurrency, formatDate, formatRoomLocation, cn } from '../../utils/format.js';
import { rentalApi, resolveIdentityAttachment } from '../../services/rentalApi.js';
import IdentityDocumentField from '../../components/ui/IdentityDocumentField.jsx';
import PaymentMethodFields from '../../components/payments/PaymentMethodFields.jsx';
import FinanceDocActions from '../../components/finance/FinanceDocActions.jsx';
import { bookingDocPayload, bookingDepositDocPayload } from '../../utils/financeDocs.js';
import PaymentStatusBadge from '../../components/realty/PaymentStatusBadge.jsx';
import NewBooking from './NewBooking.jsx';
import AvailabilityCalendar from './AvailabilityCalendar.jsx';
import { useBuildingWorkspaceOptional } from '../../context/BuildingWorkspaceContext.jsx';

const ACTIVE_STATUSES = new Set(['Confirmed', 'Reserved', 'CheckedIn']);
const PAST_STATUSES = new Set(['CheckedOut', 'Cancelled']);

function stayLabel(status) {
  if (status === 'CheckedIn') return 'Checked In';
  if (status === 'CheckedOut') return 'Checked Out';
  return status || '—';
}

function DetailRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[var(--border)]/60 py-2.5 text-sm last:border-0">
      <span className="text-[var(--text-muted)]">{label}</span>
      <span className="max-w-[60%] text-right font-medium text-[var(--text)]">{value ?? '—'}</span>
    </div>
  );
}

export default function Bookings() {
  const { globalSearch = '' } = useOutletContext() || {};
  const workspace = useBuildingWorkspaceOptional();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const initialTab =
    tabFromUrl === 'new'
      ? 'new'
      : tabFromUrl === 'past'
        ? 'past'
        : tabFromUrl === 'active'
          ? 'active'
          : 'calendar';

  const [tab, setTab] = useState(initialTab);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [buildingFilter, setBuildingFilter] = useState('');
  const [floorFilter, setFloorFilter] = useState('');
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
    identityDocument: null,
    identityDocumentName: null,
  });
  const [editIdentityFile, setEditIdentityFile] = useState(null);
  const [clearIdentity, setClearIdentity] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [payForm, setPayForm] = useState({
    amountPaid: '',
    method: 'CASH',
    reference: '',
    receivedByName: '',
    agentName: '',
    officeMpesaNumber: '',
    comment: '',
    deductAmount: '0',
    depositReason: '',
    depositNotes: '',
    refundDeposit: true,
  });
  const [payDepositHeld, setPayDepositHeld] = useState(0);
  const [savingPay, setSavingPay] = useState(false);

  useEffect(() => {
    if (String(globalSearch || '').trim()) setTab('active');
  }, [globalSearch]);

  useEffect(() => {
    const t = searchParams.get('tab');
    const next =
      t === 'new' ? 'new' : t === 'past' ? 'past' : t === 'active' ? 'active' : 'calendar';
    setTab(next);
  }, [searchParams]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setBookings(await rentalApi.listBookings());
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
    else if (id === 'past') setSearchParams({ tab: 'past' }, { replace: true });
    else if (id === 'active') setSearchParams({ tab: 'active' }, { replace: true });
    else setSearchParams({}, { replace: true });
  };

  const openBookingFromCalendar = async (bookingId) => {
    let row = bookings.find((b) => b.id === bookingId);
    if (!row) {
      try {
        const rows = await rentalApi.listBookings();
        setBookings(rows);
        row = rows.find((b) => b.id === bookingId);
      } catch (err) {
        toast.error(err.message || 'Failed to open booking');
        return;
      }
    }
    if (row) setDetailModal(row);
  };

  const scopedBookings = useMemo(() => {
    const bid = workspace?.selectedBuildingId;
    if (!bid) return bookings;
    return bookings.filter((b) => b.buildingId === bid || b.unit?.building?.id === bid);
  }, [bookings, workspace?.selectedBuildingId]);

  const activeBookings = useMemo(
    () => scopedBookings.filter((b) => ACTIVE_STATUSES.has(b.status)),
    [scopedBookings],
  );
  const pastBookings = useMemo(
    () => scopedBookings.filter((b) => PAST_STATUSES.has(b.status)),
    [scopedBookings],
  );

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

  const displayedBookings = useMemo(() => {
    const base = tab === 'past' ? pastBookings : activeBookings;
    const globalQ = String(globalSearch || '').trim().toLowerCase();
    const localQ = search.trim().toLowerCase();
    const q = globalQ || localQ;

    return base.filter((b) => {
      if (buildingFilter && b.building !== buildingFilter) return false;
      if (floorFilter && b.floor !== floorFilter) return false;
      if (!q) return true;
      return [b.code, b.fullName, b.phone, b.roomNumber, b.building, b.floor, b.idNumber]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [
    tab,
    pastBookings,
    activeBookings,
    globalSearch,
    search,
    buildingFilter,
    floorFilter,
  ]);

  const bookingFin = (booking) => booking?.financials || calcBookingFinancials(booking || {});

  const openPayModal = (booking, action) => {
    const fin = bookingFin(booking);
    const expected = Number(fin.expectedAccommodation ?? booking.total);
    const paid = Number(fin.accommodationPaid ?? booking.amountPaid ?? 0);
    const balance = Math.max(0, roundMoney(expected - paid));
    const depositHeld = Number(
      booking.depositSummary?.remaining ?? booking.deposit?.remainingAmount ?? 0,
    );
    // Close booking details so the payment modal is not hidden underneath it
    setDetailModal(null);
    setPayModal({ booking, action });
    setPayForm({
      // check-in / check-out: absolute accommodation total collected; payment: delta
      amountPaid: String(action === 'payment' ? balance : expected),
      method: 'CASH',
      reference: '',
      receivedByName: '',
      agentName: '',
      officeMpesaNumber: '',
      comment: '',
      deductAmount: '0',
      depositReason: '',
      depositNotes: '',
      refundDeposit: true,
    });
    setPayDepositHeld(depositHeld);
  };

  const submitPaymentAction = async () => {
    if (!payModal) return;
    const { booking, action } = payModal;
    const fin = bookingFin(booking);
    const expectedTotal = Number(fin.expectedAccommodation ?? booking.total);
    const amountPaid = Number(payForm.amountPaid);
    if (Number.isNaN(amountPaid) || amountPaid < 0) {
      toast.error('Enter a valid accommodation amount');
      return;
    }

    const methodPayload = {
      paymentMethod: payForm.method || 'CASH',
      reference: payForm.reference || null,
      receivedByName: payForm.receivedByName || null,
      agentName: payForm.agentName || null,
      officeMpesaNumber: payForm.officeMpesaNumber || null,
    };

    setSavingPay(true);
    try {
      if (action === 'payment') {
        await rentalApi.addBookingPayment(booking.id, {
          amount: amountPaid,
          comment: payForm.comment || null,
          ...methodPayload,
        });
        toast.success('Accommodation payment recorded');
      } else if (action === 'checkin') {
        await rentalApi.checkInBooking(booking.id, {
          amountPaid: Math.min(amountPaid, expectedTotal),
          ...methodPayload,
        });
        toast.success('Guest checked in');
      } else {
        const requestedDeduct = Math.max(0, Number(payForm.deductAmount) || 0);
        const held = payDepositHeld;
        if (requestedDeduct > 0 && !String(payForm.depositReason || '').trim()) {
          toast.error('Enter a reason for the maintenance deduction');
          setSavingPay(false);
          return;
        }
        const appliedDeduct = Math.min(requestedDeduct, held);
        const additionalMaintenanceOwed = Math.max(0, roundMoney(requestedDeduct - held));
        const refund = payForm.refundDeposit
          ? Math.max(0, roundMoney(held - appliedDeduct))
          : 0;
        const depositNoteParts = [
          payForm.depositNotes || payForm.depositReason || null,
          additionalMaintenanceOwed > 0
            ? `Additional maintenance owed beyond deposit: ${additionalMaintenanceOwed}`
            : null,
        ].filter(Boolean);
        await rentalApi.checkOutBooking(booking.id, {
          amountPaid: Math.min(amountPaid, expectedTotal),
          returnAmount: refund,
          deductAmount: appliedDeduct,
          reason: payForm.depositReason || null,
          depositNotes: depositNoteParts.join(' · ') || null,
          skipDepositRefund: !payForm.refundDeposit && appliedDeduct <= 0,
          ...methodPayload,
        });
        toast.success(
          additionalMaintenanceOwed > 0
            ? `Checked out · additional maintenance owed ${formatCurrency(additionalMaintenanceOwed)}`
            : 'Guest checked out',
        );
      }
      setPayModal(null);
      setDetailModal(null);
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
    switchTab('active');
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
      identityDocument: booking.identityDocument || null,
      identityDocumentName: booking.identityDocumentName || null,
    });
    setEditIdentityFile(null);
    setClearIdentity(false);
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
      const identity = await resolveIdentityAttachment(editIdentityFile, {
        clear: clearIdentity,
        identityDocument: editForm.identityDocument,
        identityDocumentName: editForm.identityDocumentName,
      });
      await rentalApi.updateBooking(editBooking.id, {
        fullName: editForm.fullName,
        phone: editForm.phone,
        idNumber: editForm.idNumber,
        nationality: editForm.nationality,
        gender: editForm.gender,
        emergencyContact: editForm.emergencyContact,
        ...identity,
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
      setEditIdentityFile(null);
      setClearIdentity(false);
      await load();
    } catch (err) {
      toast.error(err.message || 'Could not update booking');
    } finally {
      setSavingEdit(false);
    }
  };

  const payFin = payModal ? bookingFin(payModal.booking) : null;
  const balanceDue = payModal
    ? Math.max(
        0,
        roundMoney(
          Number(payFin?.expectedAccommodation ?? payModal.booking.total) -
            Number(payForm.amountPaid || 0),
        ),
      )
    : 0;
  const checkoutDeduct = Math.max(0, Number(payForm.deductAmount) || 0);
  const checkoutRefund = payForm.refundDeposit
    ? Math.max(0, roundMoney(payDepositHeld - checkoutDeduct))
    : 0;

  const detailFin = detailModal
    ? detailModal.financials || calcBookingFinancials(detailModal)
    : null;
  const detailDeposit = detailModal?.depositSummary || null;
  const detailBalance = detailFin
    ? Number(detailFin.outstandingExpected ?? 0)
    : detailModal
      ? Math.max(0, Number(detailModal.total) - Number(detailModal.amountPaid || 0))
      : 0;

  if (workspace?.selectedBuilding && !workspace.hasGuestBookings) {
    return <Navigate to="/dashboard" replace />;
  }

  if (loading && tab !== 'calendar' && tab !== 'new') {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={
          workspace?.selectedBuilding
            ? `Guest Bookings · ${workspace.shortLabel || workspace.selectedBuilding.name}`
            : 'Guest Bookings'
        }
        subtitle="Availability calendar, short stays, and check-in / check-out."
      />

      {/* tab strip — calendar is the primary PMS view */}
      <div className="mb-6 flex flex-wrap gap-2">
        {[
          { id: 'calendar', label: 'Availability Calendar' },
          { id: 'active', label: `Active Bookings (${activeBookings.length})` },
          { id: 'past', label: `Past Bookings (${pastBookings.length})` },
          { id: 'new', label: 'New Booking' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => switchTab(t.id)}
            className={cn(
              'h-10 rounded-lg px-4 text-sm font-semibold transition-colors',
              tab === t.id
                ? 'bg-brand-700 text-white dark:bg-brand-400 dark:text-ink-950'
                : 'bg-[var(--surface)] text-[var(--text-secondary)] shadow-xs ring-1 ring-[var(--border)] hover:text-[var(--text)] hover:ring-[var(--border-strong)]',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'calendar' ? (
        <AvailabilityCalendar
          onOpenBooking={openBookingFromCalendar}
          onBookingsChanged={load}
        />
      ) : tab === 'new' ? (
        <NewBooking onSuccess={onBookingCreated} />
      ) : (
        <>
          <Card className="mb-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Input
                label="Search"
                placeholder="Guest, phone, room, booking…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Select
                label="Building"
                value={buildingFilter}
                onChange={(e) => {
                  setBuildingFilter(e.target.value);
                  setFloorFilter('');
                }}
              >
                <option value="">All Buildings</option>
                {buildingOptions.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </Select>
              <Select
                label="Floor"
                value={floorFilter}
                onChange={(e) => setFloorFilter(e.target.value)}
                disabled={floorOptions.length === 0}
              >
                <option value="">All Floors</option>
                {floorOptions.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </Select>
              <div className="flex items-end">
                {search || buildingFilter || floorFilter ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch('');
                      setBuildingFilter('');
                      setFloorFilter('');
                    }}
                    className="h-10 rounded-xl border border-[var(--border)] px-4 text-sm text-[var(--text-muted)] hover:bg-[var(--surface-2)]"
                  >
                    Clear filters
                  </button>
                ) : null}
              </div>
            </div>
          </Card>

          <div className="space-y-4">
            {displayedBookings.length === 0 ? (
              <Card>
                <p className="text-sm text-[var(--text-muted)]">
                  {tab === 'past'
                    ? 'No past bookings.'
                    : 'No active bookings match your filters.'}
                </p>
              </Card>
            ) : (
              displayedBookings.map((b) => {
                const fin = bookingFin(b);
                const balance = Number(
                  fin.outstandingExpected ??
                    Math.max(0, Number(b.total) - Number(b.amountPaid || 0)),
                );
                const depositHeld = Number(b.depositSummary?.remaining ?? 0);
                const isUpcoming = b.status === 'Confirmed' || b.status === 'Reserved';
                const isActive = b.status === 'CheckedIn';

                return (
                  <Card
                    key={b.id}
                    title={`${b.fullName} · ${b.roomNumber}`}
                    action={
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge status={b.status === 'CheckedIn' ? 'CheckedIn' : b.status}>
                          {stayLabel(b.status)}
                        </Badge>
                        <button
                          type="button"
                          onClick={() => setDetailModal(b)}
                          className="rounded-xl border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] transition hover:bg-[var(--surface-2)]"
                        >
                          View
                        </button>
                        {isUpcoming || isActive ? (
                          <button
                            type="button"
                            onClick={() => openEditBooking(b)}
                            className="rounded-xl border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] transition hover:bg-[var(--surface-2)]"
                          >
                            Edit
                          </button>
                        ) : null}
                        {isUpcoming || isActive ? (
                          <button
                            type="button"
                            onClick={() => openExtendStay(b)}
                            className="rounded-xl border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] transition hover:bg-[var(--surface-2)]"
                          >
                            Extend
                          </button>
                        ) : null}
                        {isUpcoming ? (
                          <>
                            <Button size="sm" onClick={() => openPayModal(b, 'checkin')}>
                              Check In
                            </Button>
                            <button
                              type="button"
                              onClick={() => runAction(b.id, 'cancel')}
                              className="rounded-xl border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/30"
                            >
                              Cancel
                            </button>
                          </>
                        ) : null}
                        {isActive ? (
                          <Button size="sm" onClick={() => openPayModal(b, 'checkout')}>
                            Check Out
                          </Button>
                        ) : null}
                      </div>
                    }
                  >
                    <p className="mb-1 text-sm text-[var(--text-muted)]">
                      {b.code} · {formatRoomLocation({ building: b.building, floor: b.floor })} ·{' '}
                      {b.phone} · {formatDate(b.checkIn)} → {formatDate(b.checkOut)} ·{' '}
                      {fin.nightsStayed ?? 0}/{fin.expectedNights ?? b.nights} nights · Rate{' '}
                      {formatCurrency(fin.nightlyRate ?? b.periodRate ?? b.dailyRent ?? 0)}
                      /night · Accrued {formatCurrency(fin.accruedAccommodation ?? 0)} · Expected{' '}
                      {formatCurrency(fin.expectedAccommodation ?? b.total)}
                      {b.discount ? ` (−${formatCurrency(b.discount)})` : ''} · Paid{' '}
                      {formatCurrency(fin.accommodationPaid ?? b.amountPaid ?? 0)}
                      {balance > 0 ? ` · Due ${formatCurrency(balance)}` : ''}
                      {depositHeld > 0 ? ` · Deposit held ${formatCurrency(depositHeld)}` : ''}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="inline-flex rounded-full bg-[var(--primary-light)] px-3 py-1 text-xs font-semibold text-[var(--primary-dark)]">
                        {b.bookingPeriodLabel || 'Daily'}
                      </span>
                      <PaymentStatusBadge status={b.paymentStatus || 'Unpaid'} />
                      <span className="text-sm text-[var(--text-muted)]">
                        {formatCurrency(fin.nightlyRate ?? b.periodRate ?? b.dailyRent ?? 0)} per
                        night
                      </span>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </>
      )}

      {/* Check-in / Check-out payment modal */}
      <Modal
        open={Boolean(payModal)}
        onClose={() => !savingPay && setPayModal(null)}
        title={
          payModal?.action === 'checkout'
            ? `Checkout settlement · ${payModal.booking.code}`
            : payModal?.action === 'payment'
              ? `Accommodation payment · ${payModal.booking.code}`
              : `Check in · ${payModal?.booking.code}`
        }
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setPayModal(null)} disabled={savingPay}>
              Cancel
            </Button>
            <Button onClick={submitPaymentAction} disabled={savingPay}>
              {payModal?.action === 'checkout'
                ? 'Confirm checkout'
                : payModal?.action === 'payment'
                  ? 'Save accommodation payment'
                  : 'Confirm check in'}
            </Button>
          </div>
        }
      >
        {payModal ? (
          <div className="grid gap-4">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm">
              <p className="font-medium text-[var(--text)]">{payModal.booking.fullName}</p>
              <p className="mt-1 text-[var(--text-muted)]">
                Room {payModal.booking.roomNumber} · {payFin?.nightsStayed ?? 0}/
                {payFin?.expectedNights ?? payModal.booking.nights} nights · Rate{' '}
                {formatCurrency(payFin?.nightlyRate ?? payModal.booking.periodRate ?? 0)}/night
              </p>
              <p className="mt-1 text-[var(--text-muted)]">
                Accrued {formatCurrency(payFin?.accruedAccommodation ?? 0)} · Expected stay{' '}
                {formatCurrency(payFin?.expectedAccommodation ?? payModal.booking.total)} · Paid{' '}
                {formatCurrency(payFin?.accommodationPaid ?? payModal.booking.amountPaid ?? 0)}
              </p>
              {payDepositHeld > 0 ? (
                <p className="mt-1 text-[var(--text-muted)]">
                  Security deposit held {formatCurrency(payDepositHeld)} (not accommodation revenue)
                </p>
              ) : null}
            </div>
            <Input
              label={
                payModal.action === 'payment'
                  ? 'Accommodation payment amount'
                  : 'Accommodation paid (total collected)'
              }
              type="number"
              min={0}
              step="0.01"
              value={payForm.amountPaid}
              onChange={(e) => setPayForm({ ...payForm, amountPaid: e.target.value })}
            />
            <PaymentMethodFields
              value={payForm}
              onChange={(next) => setPayForm({ ...payForm, ...next })}
            />
            {payModal.action === 'payment' ? (
              <Input
                label="Comment"
                value={payForm.comment || ''}
                onChange={(e) => setPayForm({ ...payForm, comment: e.target.value })}
              />
            ) : null}
            {payModal.action === 'checkout' && payDepositHeld > 0 ? (
              <div className="grid gap-3 rounded-xl border border-[var(--border)] p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Security deposit settlement
                </p>
                <Input
                  label="Maintenance deduction"
                  type="number"
                  min={0}
                  step="0.01"
                  value={payForm.deductAmount}
                  onChange={(e) => setPayForm({ ...payForm, deductAmount: e.target.value })}
                />
                {checkoutDeduct > 0 ? (
                  <>
                    <Input
                      label="Reason for deduction"
                      value={payForm.depositReason}
                      onChange={(e) => setPayForm({ ...payForm, depositReason: e.target.value })}
                    />
                    <Input
                      label="Maintenance / damage description"
                      value={payForm.depositNotes}
                      onChange={(e) => setPayForm({ ...payForm, depositNotes: e.target.value })}
                    />
                  </>
                ) : null}
                <label className="inline-flex items-center gap-2 text-sm text-[var(--text)]">
                  <input
                    type="checkbox"
                    checked={Boolean(payForm.refundDeposit)}
                    onChange={(e) =>
                      setPayForm({ ...payForm, refundDeposit: e.target.checked })
                    }
                  />
                  Refund remaining deposit after deductions
                </label>
                <p className="text-xs text-[var(--text-muted)]">
                  Refundable after settlement: {formatCurrency(checkoutRefund)}
                  {checkoutDeduct > payDepositHeld
                    ? ` · Additional maintenance owed: ${formatCurrency(checkoutDeduct - payDepositHeld)}`
                    : ''}
                </p>
              </div>
            ) : null}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm">
              {payModal.action === 'payment' ? (
                <>
                  Remaining accommodation balance:{' '}
                  <strong>
                    {formatCurrency(
                      Math.max(
                        0,
                        roundMoney(
                          Number(payFin?.expectedAccommodation ?? payModal.booking.total) -
                            Number(payFin?.accommodationPaid ?? payModal.booking.amountPaid ?? 0) -
                            Number(payForm.amountPaid || 0),
                        ),
                      ),
                    )}
                  </strong>
                </>
              ) : (
                <>
                  Outstanding accommodation after this:{' '}
                  <strong>{formatCurrency(balanceDue)}</strong>
                  {payModal.action === 'checkout' && balanceDue > 0 ? (
                    <span className="mt-1 block text-amber-700 dark:text-amber-300">
                      Full accommodation payment is required before check-out. The security deposit
                      cannot cover this automatically.
                    </span>
                  ) : null}
                </>
              )}
            </div>
          </div>
        ) : null}
      </Modal>

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
                  <Button variant="secondary" onClick={() => openExtendStay(detailModal)}>
                    Extend Stay
                  </Button>
                  <Button variant="secondary" onClick={() => openEditBooking(detailModal)}>
                    Edit
                  </Button>
                </>
              )}
              {detailModal.status === 'Confirmed' || detailModal.status === 'Reserved' ? (
                <>
                  <Button
                    variant="secondary"

                    onClick={() => {
                      runAction(detailModal.id, 'cancel');
                      setDetailModal(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button

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

                  onClick={() => {
                    setDetailModal(null);
                    openPayModal(detailModal, 'checkout');
                  }}
                >
                  Check Out
                </Button>
              ) : null}
              <Button variant="secondary" onClick={() => setDetailModal(null)}>
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
              {detailModal.identityDocument ? (
                <div className="border-b border-[var(--border)]/60 py-2.5 last:border-0">
                  <IdentityDocumentField
                    label="ID document"
                    hint=""
                    readOnly
                    value={{
                      identityDocument: detailModal.identityDocument,
                      identityDocumentName: detailModal.identityDocumentName,
                    }}
                  />
                </div>
              ) : null}
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
            <div className="rounded-xl border border-[var(--border)] p-4 sm:col-span-2">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Booking Information
              </h4>
              <div className="grid gap-x-6 sm:grid-cols-2">
                <DetailRow label="Booking Code" value={detailModal.code} />
                <DetailRow label="Booking Type" value={detailModal.bookingPeriodLabel || 'Daily'} />
                <DetailRow label="Check-in" value={formatDate(detailModal.checkIn)} />
                <DetailRow label="Check-out" value={formatDate(detailModal.checkOut)} />
                <DetailRow
                  label="Rate per Night"
                  value={formatCurrency(detailFin?.nightlyRate ?? detailModal.periodRate ?? detailModal.dailyRent ?? 0)}
                />
                <DetailRow
                  label="Expected Nights"
                  value={`${detailFin?.expectedNights ?? detailModal.nights} nights`}
                />
                <DetailRow
                  label="Nights Stayed"
                  value={`${detailFin?.nightsStayed ?? 0} nights`}
                />
                <DetailRow
                  label="Accumulated Accommodation"
                  value={formatCurrency(detailFin?.accruedAccommodation ?? 0)}
                />
              </div>
            </div>

            <div className="rounded-xl border border-[var(--border)] p-4">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Accommodation Payment
              </h4>
              <DetailRow
                label="Total Accrued Accommodation"
                value={formatCurrency(detailFin?.accruedAccommodation ?? 0)}
              />
              <DetailRow
                label="Expected Full-Stay Total"
                value={formatCurrency(detailFin?.expectedAccommodation ?? detailModal.total)}
              />
              <DetailRow
                label="Accommodation Payments Received"
                value={formatCurrency(detailFin?.accommodationPaid ?? detailModal.amountPaid ?? 0)}
              />
              <DetailRow
                label="Outstanding Accommodation"
                value={formatCurrency(detailBalance)}
              />
              <DetailRow label="Payment method" value={detailModal.paymentMethod || '—'} />
              <div className="flex items-center justify-between gap-4 pt-2.5">
                <span className="text-sm text-[var(--text-muted)]">Payment status</span>
                <Badge status={detailModal.paymentStatus || 'Unpaid'}>
                  {detailModal.paymentStatus || 'Unpaid'}
                </Badge>
              </div>
              <div className="mt-3 flex flex-col gap-2">
                {detailBalance > 0 ? (
                  <Button className="w-full" onClick={() => openPayModal(detailModal, 'payment')}>
                    Record accommodation payment
                  </Button>
                ) : null}
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Accommodation invoice
                </p>
                <FinanceDocActions
                  compact
                  label="Invoice"
                  onPayload={() => bookingDocPayload(detailModal, 'INVOICE')}
                />
                {(Number(detailFin?.accommodationPaid ?? detailModal.amountPaid) || 0) > 0 ? (
                  <>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                      Accommodation receipt
                    </p>
                    <FinanceDocActions
                      compact
                      label="Receipt"
                      onPayload={() => bookingDocPayload(detailModal, 'RECEIPT')}
                    />
                  </>
                ) : null}
              </div>
            </div>

            <div className="rounded-xl border border-[var(--border)] p-4">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Security Deposit
              </h4>
              <DetailRow
                label="Deposit Received"
                value={formatCurrency(detailDeposit?.received ?? 0)}
              />
              <DetailRow label="Deposit Held" value={formatCurrency(detailDeposit?.held ?? 0)} />
              <DetailRow
                label="Deposit Refunded"
                value={formatCurrency(detailDeposit?.refunded ?? 0)}
              />
              <DetailRow
                label="Maintenance Deductions"
                value={formatCurrency(detailDeposit?.deducted ?? 0)}
              />
              <DetailRow
                label="Remaining Refundable"
                value={formatCurrency(detailDeposit?.remaining ?? 0)}
              />
              {detailDeposit?.status ? (
                <div className="flex items-center justify-between gap-4 pt-2.5">
                  <span className="text-sm text-[var(--text-muted)]">Deposit status</span>
                  <Badge status={detailDeposit.status}>{detailDeposit.status}</Badge>
                </div>
              ) : (
                <p className="mt-2 text-xs text-[var(--text-muted)]">
                  No security deposit recorded. Deposit is held separately and is not accommodation
                  revenue.
                </p>
              )}
              {detailModal.deposit ? (
                <div className="mt-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    Deposit receipt
                  </p>
                  <FinanceDocActions
                    compact
                    label="Deposit receipt"
                    onPayload={() => bookingDepositDocPayload(detailModal, detailModal.deposit)}
                  />
                </div>
              ) : null}
            </div>

            {(detailModal.transactionHistory || detailModal.payments || []).length > 0 ? (
              <div className="rounded-xl border border-[var(--border)] p-4 sm:col-span-2">
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Transaction History
                </h4>
                <div className="space-y-2">
                  {(detailModal.transactionHistory?.length
                    ? detailModal.transactionHistory
                    : detailModal.payments.map((p) => ({
                        id: p.id,
                        label: 'Accommodation Payment',
                        amount: p.amount,
                        method: p.method,
                        date: p.paymentDate,
                        description: p.comment,
                      }))
                  ).map((t) => (
                    <div key={t.id} className="flex justify-between gap-2 text-xs">
                      <span className="text-[var(--text-muted)]">
                        {formatDate(t.date)} · {t.label || t.category}
                        {t.method ? ` · ${t.method}` : ''}
                        {t.description ? ` · ${t.description}` : ''}
                      </span>
                      <span className="font-medium text-[var(--text)]">{formatCurrency(t.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(editBooking)}
        onClose={() => !savingEdit && setEditBooking(null)}
        title={editBooking ? `Edit Booking · ${editBooking.code}` : 'Edit Booking'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditBooking(null)} disabled={savingEdit}>
              Cancel
            </Button>
            <Button onClick={saveEditBooking} disabled={savingEdit}>
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
            <IdentityDocumentField
              className="sm:col-span-2"
              file={editIdentityFile}
              value={
                clearIdentity
                  ? null
                  : {
                      identityDocument: editForm.identityDocument,
                      identityDocumentName: editForm.identityDocumentName,
                    }
              }
              onFileChange={(f) => {
                setEditIdentityFile(f);
                setClearIdentity(false);
              }}
              onClear={() => {
                setEditIdentityFile(null);
                setClearIdentity(true);
                setEditForm((prev) => ({
                  ...prev,
                  identityDocument: null,
                  identityDocumentName: null,
                }));
              }}
            />
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
          </div>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(extendModal)}
        onClose={() => !savingExtend && setExtendModal(null)}
        title={extendModal ? `Extend Stay · ${extendModal.code}` : 'Extend Stay'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setExtendModal(null)} disabled={savingExtend}>
              Cancel
            </Button>
            <Button onClick={saveExtendStay} disabled={savingExtend}>
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
                Room {extendModal.roomNumber} ·{' '}
                {formatRoomLocation({ building: extendModal.building, floor: extendModal.floor })}
              </p>
              <p className="mt-1 text-[var(--text-muted)]">
                Current stay: {formatDate(extendModal.checkIn)} → {formatDate(extendModal.checkOut)}
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
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
