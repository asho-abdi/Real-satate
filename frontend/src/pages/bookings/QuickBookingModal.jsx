import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '../../components/ui/Modal.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import PaymentMethodFields from '../../components/payments/PaymentMethodFields.jsx';
import { rentalApi } from '../../services/rentalApi.js';
import { calcNights, calcPeriodBookingTotal, roundMoney } from '../../utils/rentCalc.js';
import { formatCurrency } from '../../utils/format.js';

const emptyCustomer = {
  fullName: '',
  phone: '',
  idNumber: '',
  nationality: '',
  gender: 'Male',
  emergencyContact: '',
};

/**
 * Compact booking form opened from an empty calendar cell.
 * Room + check-in are prefilled; overlap is validated by the API.
 */
export default function QuickBookingModal({
  open,
  onClose,
  onCreated,
  room,
  checkIn: initialCheckIn,
}) {
  const [checkIn, setCheckIn] = useState(initialCheckIn || '');
  const [checkOut, setCheckOut] = useState('');
  const [customer, setCustomer] = useState(emptyCustomer);
  const [bookingPeriod, setBookingPeriod] = useState('DAILY');
  const [amountPaid, setAmountPaid] = useState('');
  const [securityDeposit, setSecurityDeposit] = useState('0');
  const [payMethodForm, setPayMethodForm] = useState({ method: 'CASH' });
  const [saving, setSaving] = useState(false);
  const [availability, setAvailability] = useState(null);

  useEffect(() => {
    if (!open) return;
    setCheckIn(initialCheckIn || '');
    const start = initialCheckIn ? new Date(`${initialCheckIn}T00:00:00`) : null;
    if (start) {
      start.setDate(start.getDate() + 1);
      const y = start.getFullYear();
      const m = String(start.getMonth() + 1).padStart(2, '0');
      const d = String(start.getDate()).padStart(2, '0');
      setCheckOut(`${y}-${m}-${d}`);
    } else {
      setCheckOut('');
    }
    setCustomer(emptyCustomer);
    setBookingPeriod('DAILY');
    setAmountPaid('');
    setSecurityDeposit('0');
    setPayMethodForm({ method: 'CASH' });
    setAvailability(null);
  }, [open, initialCheckIn, room?.id]);

  const totals = useMemo(
    () =>
      calcPeriodBookingTotal({
        monthlyRent: room?.monthlyRent || 0,
        dailyRate: room?.dailyRate,
        weeklyRate: room?.weeklyRent,
        bookingPeriod,
        checkIn,
        checkOut,
        discountType: 'FIXED',
        discountValue: 0,
        servicesAmount: 0,
        taxesAmount: 0,
      }),
    [room, bookingPeriod, checkIn, checkOut],
  );

  useEffect(() => {
    if (totals.total > 0 && (amountPaid === '' || Number(amountPaid) === 0)) {
      setAmountPaid(String(totals.total));
    }
  }, [totals.total]);

  useEffect(() => {
    if (!open || !room?.id || !checkIn || !checkOut || calcNights(checkIn, checkOut) < 1) {
      setAvailability(null);
      return undefined;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const result = await rentalApi.checkBookingAvailability({
          unitId: room.id,
          checkIn,
          checkOut,
        });
        if (!cancelled) setAvailability(result);
      } catch (err) {
        if (!cancelled) setAvailability({ available: false, reason: err.message });
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [open, room?.id, checkIn, checkOut]);

  const save = async () => {
    if (!room?.id) {
      toast.error('Room is required');
      return;
    }
    if (!customer.fullName.trim() || !customer.phone.trim() || !customer.idNumber.trim()) {
      toast.error('Full name, phone, and ID are required');
      return;
    }
    if (calcNights(checkIn, checkOut) < 1) {
      toast.error('Check-out must be after check-in');
      return;
    }
    if (availability && availability.available === false) {
      toast.error(availability.reason || 'Room is not available for these dates');
      return;
    }

    setSaving(true);
    try {
      const created = await rentalApi.createBooking({
        roomId: room.id,
        fullName: customer.fullName.trim(),
        phone: customer.phone.trim(),
        idNumber: customer.idNumber.trim(),
        nationality: customer.nationality.trim() || null,
        gender: customer.gender,
        emergencyContact: customer.emergencyContact.trim() || null,
        checkIn,
        checkOut,
        bookingPeriod,
        periodQuantity: totals.periodQuantity,
        periodRate: totals.periodRate,
        paymentMethod: payMethodForm.method || 'CASH',
        reference: payMethodForm.reference || null,
        receivedByName: payMethodForm.receivedByName || null,
        agentName: payMethodForm.agentName || null,
        officeMpesaNumber: payMethodForm.officeMpesaNumber || null,
        amountPaid: Number(amountPaid) || 0,
        securityDeposit: Number(securityDeposit) || 0,
      });
      toast.success(`Booking ${created.code} created`);
      onCreated?.(created);
      onClose?.();
    } catch (err) {
      toast.error(err.message || 'Could not create booking');
    } finally {
      setSaving(false);
    }
  };

  const balance = Math.max(0, roundMoney((totals.total || 0) - (Number(amountPaid) || 0)));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Quick booking"
      description={
        room
          ? `Room ${room.roomNumber}${room.building ? ` · ${room.building}` : ''}`
          : 'Select stay details'
      }
      size="lg"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={saving}
            onClick={save}
            disabled={availability?.available === false}
          >
            Create booking
          </Button>
        </div>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Check-in"
          type="date"
          value={checkIn}
          onChange={(e) => setCheckIn(e.target.value)}
        />
        <Input
          label="Check-out"
          type="date"
          value={checkOut}
          onChange={(e) => setCheckOut(e.target.value)}
        />
        <Input
          label="Guest full name"
          value={customer.fullName}
          onChange={(e) => setCustomer((p) => ({ ...p, fullName: e.target.value }))}
        />
        <Input
          label="Phone"
          value={customer.phone}
          onChange={(e) => setCustomer((p) => ({ ...p, phone: e.target.value }))}
        />
        <Input
          label="ID / Passport"
          value={customer.idNumber}
          onChange={(e) => setCustomer((p) => ({ ...p, idNumber: e.target.value }))}
        />
        <Select
          label="Gender"
          value={customer.gender}
          onChange={(e) => setCustomer((p) => ({ ...p, gender: e.target.value }))}
        >
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Other">Other</option>
        </Select>
        <Select
          label="Rate type"
          value={bookingPeriod}
          onChange={(e) => setBookingPeriod(e.target.value)}
        >
          <option value="DAILY">Daily</option>
          <option value="WEEKLY">Weekly</option>
          <option value="MONTHLY">Monthly</option>
        </Select>
        <Input
          label="Security deposit"
          type="number"
          min="0"
          value={securityDeposit}
          onChange={(e) => setSecurityDeposit(e.target.value)}
        />
      </div>

      <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3 text-sm">
        <div className="flex flex-wrap justify-between gap-2">
          <span className="text-[var(--text-muted)]">
            {totals.periodQuantity || 0} night{(totals.periodQuantity || 0) === 1 ? '' : 's'} ·{' '}
            {formatCurrency(totals.periodRate || 0)} / night
          </span>
          <span className="font-semibold text-[var(--text)]">
            Total {formatCurrency(totals.total || 0)}
          </span>
        </div>
        {availability?.available === false ? (
          <p className="mt-2 text-xs font-medium text-red-600">{availability.reason}</p>
        ) : availability?.available ? (
          <p className="mt-2 text-xs font-medium text-emerald-700">Room available for these dates</p>
        ) : null}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Input
          label="Amount paid now"
          type="number"
          min="0"
          value={amountPaid}
          onChange={(e) => setAmountPaid(e.target.value)}
        />
        <div className="flex items-end pb-2 text-sm text-[var(--text-muted)]">
          Balance due: <span className="ml-1 font-semibold text-[var(--text)]">{formatCurrency(balance)}</span>
        </div>
      </div>

      <div className="mt-3">
        <PaymentMethodFields value={payMethodForm} onChange={setPayMethodForm} />
      </div>
    </Modal>
  );
}
