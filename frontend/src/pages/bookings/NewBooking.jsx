import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { MdAccessTime, MdEmail, MdPerson, MdPhone } from 'react-icons/md';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import IdentityDocumentField from '../../components/ui/IdentityDocumentField.jsx';
import { FormSection } from '../../components/units/FlatFormLayout.jsx';
import { PAYMENT_METHODS, BOOKING_PERIODS, DISCOUNT_TYPES } from '../../utils/constants.js';
import { calcDailyRent, calcPeriodBookingTotal } from '../../utils/rentCalc.js';
import { formatCurrency } from '../../utils/format.js';
import { rentalApi, resolveIdentityAttachment } from '../../services/rentalApi.js';

const HOUR_OPTIONS = Array.from({ length: 15 }, (_, i) => {
  const h = 10 + i;
  return `${String(h).padStart(2, '0')}:00`;
});

const COUNTRY_OPTIONS = [
  'Kenya',
  'Somalia',
  'Ethiopia',
  'Uganda',
  'Tanzania',
  'Djibouti',
  'South Sudan',
  'United Kingdom',
  'United States',
  'United Arab Emirates',
  'Other',
];

const emptyCustomer = {
  fullName: '',
  phone: '',
  idNumber: '',
  email: '',
  address: '',
  country: 'Kenya',
  nationality: '',
  gender: '',
  emergencyContact: '',
};

const fieldClass =
  'h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20';

/** Guest booking form — sectioned stay / guest / pricing layout. */
export default function NewBooking({ onSuccess } = {}) {
  const [buildings, setBuildings] = useState([]);
  const [floors, setFloors] = useState([]);
  const [guestRooms, setGuestRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buildingId, setBuildingId] = useState('');
  const [floorId, setFloorId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [customer, setCustomer] = useState(emptyCustomer);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [checkInTime, setCheckInTime] = useState('15:00');
  const [adultsCount, setAdultsCount] = useState(1);
  const [childrenCount, setChildrenCount] = useState(0);
  const [bookingPeriod, setBookingPeriod] = useState('DAILY');
  const [periodQuantity, setPeriodQuantity] = useState('');
  const [rateOverride, setRateOverride] = useState('');
  const [discountType, setDiscountType] = useState('FIXED');
  const [discountValue, setDiscountValue] = useState(0);
  const [servicesAmount, setServicesAmount] = useState(0);
  const [taxesAmount, setTaxesAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [markedPaid, setMarkedPaid] = useState(false);
  const [notes, setNotes] = useState('');
  const [identityFile, setIdentityFile] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [b, f, units] = await Promise.all([
          rentalApi.listBuildings(),
          rentalApi.listFloors(),
          rentalApi.listUnits({ usage: 'GUEST' }),
        ]);
        setBuildings(b);
        setFloors(f);
        setGuestRooms(units.filter((r) => r.usage === 'guest'));
      } catch (err) {
        toast.error(err.message || 'Failed to load rooms');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const buildingsWithGuests = useMemo(() => {
    const ids = new Set(guestRooms.map((r) => r.buildingId));
    return buildings.filter((b) => ids.has(b.id));
  }, [buildings, guestRooms]);

  const guestRoomsInBuilding = useMemo(() => {
    if (!buildingId) return [];
    return guestRooms.filter((r) => r.buildingId === buildingId);
  }, [guestRooms, buildingId]);

  const buildingFloors = useMemo(() => {
    const floorIdsWithGuests = new Set(guestRoomsInBuilding.map((r) => r.floorId));
    return floors
      .filter((f) => f.buildingId === buildingId && floorIdsWithGuests.has(f.id))
      .sort((a, b) => a.level - b.level);
  }, [floors, buildingId, guestRoomsInBuilding]);

  const availableGuestRooms = useMemo(() => {
    if (!buildingId || !floorId) return [];
    return guestRoomsInBuilding.filter(
      (r) => r.floorId === floorId && r.status === 'Available',
    );
  }, [guestRoomsInBuilding, buildingId, floorId]);

  const room = guestRooms.find((r) => r.id === roomId);

  const totals = useMemo(
    () =>
      calcPeriodBookingTotal({
        monthlyRent: room?.monthlyRent || 0,
        dailyRate: room?.dailyRate,
        weeklyRate: room?.weeklyRent,
        bookingPeriod,
        periodQuantity: periodQuantity === '' ? undefined : Number(periodQuantity),
        periodRate: rateOverride === '' ? null : Number(rateOverride),
        checkIn,
        checkOut,
        discountType,
        discountValue,
        servicesAmount,
        taxesAmount,
      }),
    [
      room,
      checkIn,
      checkOut,
      discountType,
      discountValue,
      bookingPeriod,
      periodQuantity,
      rateOverride,
      servicesAmount,
      taxesAmount,
    ],
  );

  useEffect(() => {
    if (!room || !(totals.total > 0)) return;
    if (markedPaid) {
      setAmountPaid(String(totals.total));
    } else if (amountPaid === '' || Number(amountPaid) === 0) {
      setAmountPaid(String(totals.total));
    }
  }, [room?.id, totals.total, bookingPeriod, markedPaid]);

  const quantityLabel =
    bookingPeriod === 'WEEKLY' ? 'Weeks' : bookingPeriod === 'MONTHLY' ? 'Months' : 'Nights';
  const rateLabel =
    bookingPeriod === 'WEEKLY'
      ? 'Weekly rate'
      : bookingPeriod === 'MONTHLY'
        ? 'Monthly rate'
        : 'Price / night';

  const balance = Math.max(
    0,
    (totals.total || 0) - (markedPaid ? totals.total : Number(amountPaid) || 0),
  );

  const setCustomerField = (key) => (e) =>
    setCustomer((prev) => ({ ...prev, [key]: e.target.value }));

  const save = async () => {
    if (!room) {
      toast.error('Select an available guest room');
      return;
    }
    if (room.usage !== 'guest') {
      toast.error('Only Guest / Airbnb rooms can be booked here');
      return;
    }
    if (room.status !== 'Available') {
      toast.error('Selected room is not available');
      return;
    }
    if (!customer.fullName.trim() || !customer.phone.trim() || !customer.idNumber.trim()) {
      toast.error('Full name, phone, and ID are required');
      return;
    }
    if (!checkIn || !checkOut || totals.periodQuantity <= 0) {
      toast.error('Check-in, check-out, and duration are required');
      return;
    }
    if (!customer.gender) {
      toast.error('Gender is required');
      return;
    }

    setSaving(true);
    try {
      const identity = await resolveIdentityAttachment(identityFile);
      const paidNow = markedPaid ? totals.total : Number(amountPaid) || 0;
      await rentalApi.createBooking({
        roomId: room.id,
        ...customer,
        fullName: customer.fullName.trim(),
        phone: customer.phone.trim(),
        idNumber: customer.idNumber.trim(),
        email: customer.email.trim() || null,
        address: customer.address.trim() || null,
        country: customer.country.trim() || null,
        nationality: customer.nationality.trim(),
        emergencyContact: customer.emergencyContact.trim(),
        adultsCount: Number(adultsCount) || 1,
        childrenCount: Number(childrenCount) || 0,
        checkInTime,
        ...identity,
        checkIn,
        checkOut,
        bookingPeriod,
        periodQuantity: totals.periodQuantity,
        periodRate: totals.periodRate,
        discountType,
        discountValue: Number(discountValue) || 0,
        discount: totals.discountAmount,
        servicesAmount: Number(servicesAmount) || 0,
        taxesAmount: Number(taxesAmount) || 0,
        paymentMethod,
        amountPaid: paidNow,
        notes: notes.trim() || null,
      });
      toast.success('Booking saved');
      setIdentityFile(null);
      onSuccess?.();
    } catch (err) {
      toast.error(err.message || 'Could not save booking');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <Card title="New booking">
      {buildings.length === 0 ? (
        <p className="mb-5 text-sm text-[var(--text-muted)]">
          No buildings yet. Go to <strong>Buildings</strong> and add your first building, then add
          floors and rooms.
        </p>
      ) : buildingsWithGuests.length === 0 ? (
        <p className="mb-5 text-sm text-[var(--text-muted)]">
          No building has a <strong>Guest / Airbnb</strong> room yet. When adding a room under{' '}
          <strong>Buildings</strong>, set <strong>Room usage</strong> to{' '}
          <strong>Guest / Airbnb</strong>.
        </p>
      ) : null}

      <div className="space-y-5">
        <FormSection
          step={1}
          title="Stay"
          description="Dates, guests, and which room they will use."
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-[var(--text)]">Hour</span>
              <span className="relative block">
                <MdAccessTime className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
                <select
                  value={checkInTime}
                  onChange={(e) => setCheckInTime(e.target.value)}
                  className={`${fieldClass} appearance-none py-2 pl-9 pr-8`}
                >
                  {HOUR_OPTIONS.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </span>
            </label>
            <Select
              label="Booking period"
              value={bookingPeriod}
              onChange={(e) => {
                setBookingPeriod(e.target.value);
                setPeriodQuantity('');
                setRateOverride('');
              }}
            >
              {BOOKING_PERIODS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-[var(--text)]">Guests</span>
              <span className="relative block">
                <MdPerson className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
                <select
                  value={adultsCount}
                  onChange={(e) => setAdultsCount(Number(e.target.value))}
                  className={`${fieldClass} appearance-none py-2 pl-9 pr-8`}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                    <option key={n} value={n}>
                      {n} Guest{n === 1 ? '' : 's'}
                    </option>
                  ))}
                </select>
              </span>
            </label>
            <Input
              label="Children"
              type="number"
              min={0}
              value={childrenCount}
              onChange={(e) => setChildrenCount(Math.max(0, Number(e.target.value) || 0))}
            />
            <Input
              label={quantityLabel}
              type="number"
              min={1}
              value={periodQuantity || String(totals.periodQuantity || '')}
              onChange={(e) => setPeriodQuantity(e.target.value)}
              hint="Blank = from dates"
            />
            <div className="flex items-end">
              <p className="w-full rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--text-muted)]">
                Stay length:{' '}
                <span className="font-semibold text-[var(--text)]">
                  {totals.nights || 0} night{totals.nights === 1 ? '' : 's'}
                </span>
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Select
              label="Building"
              value={buildingId}
              onChange={(e) => {
                setBuildingId(e.target.value);
                setFloorId('');
                setRoomId('');
              }}
            >
              <option value="">Select</option>
              {buildingsWithGuests.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
            <Select
              label="Floor"
              value={floorId}
              disabled={!buildingId}
              onChange={(e) => {
                setFloorId(e.target.value);
                setRoomId('');
              }}
            >
              <option value="">Select</option>
              {buildingFloors.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </Select>
            <Select
              label="Room"
              value={roomId}
              disabled={!buildingId || !floorId}
              onChange={(e) => {
                setRoomId(e.target.value);
                setRateOverride('');
              }}
            >
              <option value="">Select</option>
              {availableGuestRooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.roomNumber}
                  {' · '}
                  {formatCurrency(r.dailyRate ?? r.dailyRent ?? calcDailyRent(r.monthlyRent))}/night
                </option>
              ))}
            </Select>
          </div>

          {floorId && availableGuestRooms.length === 0 ? (
            <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
              No available guest rooms on this floor. Mark a room as Available in Buildings, or pick
              another floor.
            </p>
          ) : null}
        </FormSection>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.9fr)] lg:items-start">
          <FormSection
            step={2}
            title="Guest"
            description="Who is staying and how to reach them."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                className="sm:col-span-2"
                label="Name"
                placeholder="Client or company name"
                value={customer.fullName}
                onChange={setCustomerField('fullName')}
              />
              <Input
                className="sm:col-span-2"
                label="Address"
                placeholder="Full address"
                value={customer.address}
                onChange={setCustomerField('address')}
              />
              <Select
                label="Country"
                value={customer.country}
                onChange={setCustomerField('country')}
              >
                {COUNTRY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
              <Input
                label="Nationality"
                placeholder="Nationality"
                value={customer.nationality}
                onChange={setCustomerField('nationality')}
              />
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-[var(--text)]">Email</span>
                <span className="relative block">
                  <MdEmail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type="email"
                    placeholder="Email address"
                    value={customer.email}
                    onChange={setCustomerField('email')}
                    className={`${fieldClass} py-2 pl-9 pr-3`}
                  />
                </span>
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-[var(--text)]">Phone</span>
                <span className="relative block">
                  <MdPhone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type="tel"
                    placeholder="Phone"
                    value={customer.phone}
                    onChange={setCustomerField('phone')}
                    className={`${fieldClass} py-2 pl-9 pr-3`}
                  />
                </span>
              </label>
              <Input
                label="ID / Passport"
                value={customer.idNumber}
                onChange={setCustomerField('idNumber')}
              />
              <Select
                label="Gender"
                value={customer.gender}
                onChange={setCustomerField('gender')}
              >
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </Select>
              <Input
                className="sm:col-span-2"
                label="Emergency contact"
                value={customer.emergencyContact}
                onChange={setCustomerField('emergencyContact')}
              />
              <div className="sm:col-span-2">
                <IdentityDocumentField
                  file={identityFile}
                  onFileChange={setIdentityFile}
                  onClear={() => setIdentityFile(null)}
                />
              </div>
              <label className="block space-y-1.5 sm:col-span-2">
                <span className="text-sm font-medium text-[var(--text)]">Comment</span>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notes for this booking"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                />
              </label>
            </div>
          </FormSection>

          <FormSection
            step={3}
            title="Pricing"
            description="Rate, extras, and payment."
            className="lg:sticky lg:top-[calc(var(--header-h)+1rem)]"
          >
            <div className="space-y-4">
              <Input
                label={rateLabel}
                type="number"
                min={0}
                step="0.01"
                value={
                  rateOverride !== ''
                    ? rateOverride
                    : room
                      ? String(totals.periodRate)
                      : ''
                }
                onChange={(e) => setRateOverride(e.target.value)}
                placeholder="0.00"
              />
              <Input
                label="Sub total"
                value={room ? formatCurrency(totals.subtotal || 0) : formatCurrency(0)}
                readOnly
              />

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <Select
                  label="Discount type"
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value)}
                >
                  {DISCOUNT_TYPES.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </Select>
                <Input
                  label={discountType === 'PERCENT' ? 'Discount %' : 'Discount amount'}
                  type="number"
                  min={0}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <Input
                  label="Services"
                  type="number"
                  min={0}
                  step="0.01"
                  value={servicesAmount}
                  onChange={(e) => setServicesAmount(e.target.value)}
                />
                <Input
                  label="Taxes"
                  type="number"
                  min={0}
                  step="0.01"
                  value={taxesAmount}
                  onChange={(e) => setTaxesAmount(e.target.value)}
                />
              </div>

              <Select
                label="Payment method"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Select>

              <Input
                label="Amount paid now"
                type="number"
                min={0}
                value={amountPaid}
                onChange={(e) => {
                  setMarkedPaid(false);
                  setAmountPaid(e.target.value);
                }}
                disabled={markedPaid}
              />

              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm">
                <div className="flex items-center justify-between py-1 text-[var(--text-muted)]">
                  <span>Discount</span>
                  <span>{formatCurrency(totals.discountAmount || 0)}</span>
                </div>
                <div className="flex items-center justify-between py-1 text-[var(--text-muted)]">
                  <span>Services</span>
                  <span>{formatCurrency(Number(servicesAmount) || 0)}</span>
                </div>
                <div className="flex items-center justify-between py-1 text-[var(--text-muted)]">
                  <span>Taxes</span>
                  <span>{formatCurrency(Number(taxesAmount) || 0)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-[var(--border)] pt-2">
                  <span className="font-semibold text-[var(--text)]">Total</span>
                  <strong className="text-lg text-[var(--text)]">
                    {formatCurrency(totals.total || 0)}
                  </strong>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-[var(--text)]">
                    <input
                      type="checkbox"
                      checked={markedPaid}
                      onChange={(e) => {
                        const on = e.target.checked;
                        setMarkedPaid(on);
                        if (on) setAmountPaid(String(totals.total || 0));
                      }}
                      className="h-4 w-4 rounded border-[var(--border)] text-brand-600 focus:ring-brand-500"
                    />
                    Mark as paid
                  </label>
                  <span className="text-xs text-[var(--text-muted)]">
                    Balance {formatCurrency(balance)}
                  </span>
                </div>
              </div>

              <Button
                className="h-11 w-full text-base"
                onClick={save}
                disabled={saving || !room}
              >
                {saving ? 'Saving…' : 'Save booking'}
              </Button>
            </div>
          </FormSection>
        </div>
      </div>
    </Card>
  );
}
