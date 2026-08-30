import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import { PAYMENT_METHODS } from '../../utils/constants.js';
import { calcBookingTotal, calcDailyRent } from '../../utils/rentCalc.js';
import { formatCurrency } from '../../utils/format.js';
import { rentalApi } from '../../services/rentalApi.js';

const emptyCustomer = {
  fullName: '',
  phone: '',
  idNumber: '',
  nationality: '',
  gender: '',
  emergencyContact: '',
};

/** Guest booking form — only rooms with usage Guest / Airbnb appear in the dropdown. */
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
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [amountPaid, setAmountPaid] = useState('');
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
      calcBookingTotal({
        monthlyRent: room?.monthlyRent || 0,
        checkIn,
        checkOut,
        discount,
      }),
    [room, checkIn, checkOut, discount],
  );

  const onBuilding = (id) => {
    setBuildingId(id);
    setFloorId('');
    setRoomId('');
  };

  const onFloor = (id) => {
    setFloorId(id);
    setRoomId('');
  };

  useEffect(() => {
    if (room && totals.total > 0) {
      setAmountPaid(String(totals.total));
    }
  }, [room?.id, totals.total]);

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
    if (!checkIn || !checkOut || totals.nights <= 0) {
      toast.error('Check-in and check-out dates required');
      return;
    }
    if (!customer.gender) {
      toast.error('Gender is required');
      return;
    }

    setSaving(true);
    try {
      await rentalApi.createBooking({
        roomId: room.id,
        ...customer,
        fullName: customer.fullName.trim(),
        phone: customer.phone.trim(),
        idNumber: customer.idNumber.trim(),
        nationality: customer.nationality.trim(),
        emergencyContact: customer.emergencyContact.trim(),
        checkIn,
        checkOut,
        discount: Number(discount) || 0,
        paymentMethod,
        amountPaid: Number(amountPaid) || 0,
      });
      toast.success('Booking saved');
      onSuccess?.();
    } catch (err) {
      toast.error(err.message || 'Could not save booking');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {loading ? null : buildings.length === 0 ? (
        <Card className="mb-6">
          <p className="text-sm text-[var(--text-muted)]">
            No buildings yet. Go to <strong>Buildings</strong> and add your first building, then
            add floors and rooms.
          </p>
        </Card>
      ) : buildingsWithGuests.length === 0 ? (
        <Card className="mb-6">
          <p className="text-sm text-[var(--text-muted)]">
            No building has a <strong>Guest / Airbnb</strong> room yet. When adding a room under{' '}
            <strong>Buildings</strong>, set <strong>Room usage</strong> to{' '}
            <strong>Guest / Airbnb</strong>. Buildings with only shop or apartment rooms will not
            appear here.
          </p>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Room">
          <div className="grid gap-4">
            <Select
              label="Building"
              value={buildingId}
              onChange={(e) => onBuilding(e.target.value)}
            >
              <option value="">Select building</option>
              {buildingsWithGuests.map((b) => {
                const count = guestRooms.filter((r) => r.buildingId === b.id).length;
                return (
                  <option key={b.id} value={b.id}>
                    {b.name} · {count} guest room{count === 1 ? '' : 's'}
                  </option>
                );
              })}
            </Select>
            <Select
              label="Floor"
              value={floorId}
              onChange={(e) => onFloor(e.target.value)}
              disabled={!buildingId}
            >
              <option value="">
                {!buildingId ? 'Select building first' : 'Select floor'}
              </option>
              {buildingFloors.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </Select>
            <Select
              label="Guest room (available)"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              disabled={!buildingId || !floorId}
            >
              <option value="">
                {!floorId ? 'Select floor first' : 'Select guest room'}
              </option>
              {availableGuestRooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.roomNumber} · {r.unitType} · {formatCurrency(r.monthlyRent)}/mo
                </option>
              ))}
            </Select>

            {floorId && availableGuestRooms.length === 0 && guestRoomsInBuilding.some((r) => r.floorId === floorId) ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
                Guest rooms exist on this floor but none are available. Mark a room as Available
                in Setup, or pick another floor.
              </p>
            ) : null}

            {floorId && !guestRoomsInBuilding.some((r) => r.floorId === floorId) ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
                No guest rooms on this floor. Shop and apartment rooms are not listed here — add or
                assign a <strong>Guest / Airbnb</strong> room on this floor in Setup.
              </p>
            ) : null}

            {room ? (
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                <p className="text-sm text-[var(--text-muted)]">Selected guest room</p>
                <p className="mt-1 text-lg font-semibold text-[var(--text)]">{room.roomNumber}</p>
                <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <p className="text-[var(--text-muted)]">Type</p>
                    <p className="font-medium">{room.unitType}</p>
                  </div>
                  <div>
                    <p className="text-[var(--text-muted)]">Monthly</p>
                    <p className="font-medium">{formatCurrency(room.monthlyRent)}</p>
                  </div>
                  <div>
                    <p className="text-[var(--text-muted)]">Daily</p>
                    <p className="font-medium">
                      {formatCurrency(room.dailyRent || calcDailyRent(room.monthlyRent))}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </Card>

        <Card title="Customer">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Full name"
              className="sm:col-span-2"
              value={customer.fullName}
              onChange={(e) => setCustomer({ ...customer, fullName: e.target.value })}
            />
            <Input
              label="Phone"
              value={customer.phone}
              onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
            />
            <Input
              label="ID / Passport"
              value={customer.idNumber}
              onChange={(e) => setCustomer({ ...customer, idNumber: e.target.value })}
            />
            <Input
              label="Nationality (optional)"
              value={customer.nationality}
              onChange={(e) => setCustomer({ ...customer, nationality: e.target.value })}
            />
            <Select
              label="Gender"
              value={customer.gender}
              onChange={(e) => setCustomer({ ...customer, gender: e.target.value })}
            >
              <option value="">Select</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </Select>
            <Input
              label="Emergency contact (optional)"
              className="sm:col-span-2"
              value={customer.emergencyContact}
              onChange={(e) => setCustomer({ ...customer, emergencyContact: e.target.value })}
            />
          </div>
        </Card>

        <Card title="Stay & payment" className="lg:col-span-2">
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
            <Input label="Nights" value={String(totals.nights)} readOnly />
            <Input label="Daily rent" value={room ? String(totals.dailyRent) : ''} readOnly />
            <Input
              label="Discount"
              type="number"
              min={0}
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
            />
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
              onChange={(e) => setAmountPaid(e.target.value)}
            />
            <div className="sm:col-span-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text-muted)]">
              Balance at check-in:{' '}
              <strong className="text-[var(--text)]">
                {formatCurrency(Math.max(0, totals.total - (Number(amountPaid) || 0)))}
              </strong>
              {Number(amountPaid) >= totals.total
                ? ' · fully paid'
                : Number(amountPaid) > 0
                  ? ' · partial — collect rest at check-in'
                  : ' · collect at check-in'}
            </div>
            <div className="sm:col-span-2 flex items-end">
              <div className="w-full rounded-2xl bg-brand-700 px-4 py-3 text-white dark:bg-brand-400 dark:text-ink-950">
                <p className="text-sm opacity-90">Final total</p>
                <p className="text-2xl font-semibold">{formatCurrency(totals.total)}</p>
              </div>
            </div>
          </div>

          <Button
            className="mt-6 h-14 w-full text-lg sm:w-auto sm:px-10"
            onClick={save}
            disabled={saving || !room}
          >
            {saving ? 'Saving…' : 'Save Booking'}
          </Button>
        </Card>
      </div>
    </div>
  );
}
