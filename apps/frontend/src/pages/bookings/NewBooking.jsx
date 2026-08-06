import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import { PAYMENT_METHODS } from '../../utils/constants.js';
import { calcBookingTotal, calcDailyRent } from '../../utils/rentCalc.js';
import { formatCurrency } from '../../utils/format.js';
import { usageToApi } from '../../utils/labels.js';
import { rentalApi } from '../../services/rentalApi.js';

const emptyCustomer = {
  fullName: '',
  phone: '',
  idNumber: '',
  nationality: '',
  gender: '',
  emergencyContact: '',
};

/** Guest booking form — used inside Guest Bookings page. */
export default function NewBooking({ onSuccess } = {}) {
  const [buildings, setBuildings] = useState([]);
  const [floors, setFloors] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [allRooms, setAllRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buildingId, setBuildingId] = useState('');
  const [floorId, setFloorId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [customer, setCustomer] = useState(emptyCustomer);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [saving, setSaving] = useState(false);
  const [convertingId, setConvertingId] = useState('');

  const reloadRooms = async () => {
    const [guestUnits, allUnits] = await Promise.all([
      rentalApi.listUnits({ usage: 'GUEST' }),
      rentalApi.listUnits(),
    ]);
    setRooms(guestUnits);
    setAllRooms(allUnits);
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [b, f, guestUnits, allUnits] = await Promise.all([
          rentalApi.listBuildings(),
          rentalApi.listFloors(),
          rentalApi.listUnits({ usage: 'GUEST' }),
          rentalApi.listUnits(),
        ]);
        setBuildings(b);
        setFloors(f);
        setRooms(guestUnits);
        setAllRooms(allUnits);
      } catch (err) {
        toast.error(err.message || 'Failed to load rooms');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const nonGuestRoomsInBuilding = useMemo(() => {
    if (!buildingId) return [];
    return allRooms.filter((r) => r.buildingId === buildingId && r.usage !== 'guest');
  }, [allRooms, buildingId]);

  const roomsOnFloor = useMemo(() => {
    if (!buildingId || !floorId) return [];
    return allRooms.filter((r) => r.buildingId === buildingId && r.floorId === floorId);
  }, [allRooms, buildingId, floorId]);

  const bookableRooms = useMemo(
    () => roomsOnFloor.filter((r) => r.usage === 'guest' && r.status === 'Available'),
    [roomsOnFloor],
  );

  const nonGuestRoomsOnFloor = useMemo(
    () => roomsOnFloor.filter((r) => r.usage !== 'guest'),
    [roomsOnFloor],
  );

  const guestRoomsInBuilding = useMemo(() => {
    if (!buildingId) return [];
    return rooms.filter((r) => r.buildingId === buildingId);
  }, [rooms, buildingId]);

  const buildingFloors = useMemo(() => {
    return floors
      .filter((f) => f.buildingId === buildingId)
      .sort((a, b) => a.level - b.level);
  }, [floors, buildingId]);

  const room = allRooms.find((r) => r.id === roomId);

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

  const useRoomForGuestBooking = async (id) => {
    setConvertingId(id);
    try {
      await rentalApi.updateUnit(id, { usage: usageToApi('guest') });
      toast.success('Room set to Guest — select it below');
      await reloadRooms();
      setRoomId(id);
    } catch (err) {
      toast.error(err.message || 'Could not update room');
    } finally {
      setConvertingId('');
    }
  };

  const save = async () => {
    if (!room) {
      toast.error('Select an available guest room');
      return;
    }
    if (room.usage !== 'guest' || room.status !== 'Available') {
      toast.error('This room is not available for guest booking');
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
      ) : rooms.length === 0 ? (
        <Card className="mb-6">
          <p className="text-sm text-[var(--text-muted)]">
            Your building is registered, but there are no <strong>Guest / Airbnb</strong> rooms yet.
            Open the building under <strong>Buildings</strong>, add a floor and room, and set{' '}
            <strong>Room usage</strong> to <strong>Guest / Airbnb</strong>.
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
              {buildings.map((b) => {
                const guestCount = rooms.filter((r) => r.buildingId === b.id).length;
                return (
                  <option key={b.id} value={b.id}>
                    {b.name}
                    {guestCount ? ` · ${guestCount} guest room${guestCount === 1 ? '' : 's'}` : ''}
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
              <option value="">Select floor</option>
              {buildingFloors.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </Select>
            <Select
              label="Room"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              disabled={!buildingId || !floorId}
            >
              <option value="">
                {!floorId ? 'Select floor first' : 'Select room'}
              </option>
              {roomsOnFloor.map((r) => {
                const bookable = r.usage === 'guest' && r.status === 'Available';
                if (bookable) {
                  return (
                    <option key={r.id} value={r.id}>
                      {r.roomNumber} · {r.unitType} · {formatCurrency(r.monthlyRent)}/mo
                    </option>
                  );
                }
                return (
                  <option key={`blocked-${r.id}`} disabled value="">
                    {r.roomNumber} · {r.usage} · {r.status} (not guest — use button below)
                  </option>
                );
              })}
            </Select>

            {floorId && roomsOnFloor.length === 0 ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
                No rooms on this floor yet. Add rooms under <strong>Buildings → Manage floors</strong>.
              </p>
            ) : null}

            {floorId && nonGuestRoomsOnFloor.length > 0 ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
                <p className="mb-2">
                  Rooms on this floor are <strong>shop/apartment</strong>, not guest. Click to use
                  one for nightly booking:
                </p>
                <div className="flex flex-wrap gap-2">
                  {nonGuestRoomsOnFloor.map((r) => (
                    <Button
                      key={r.id}
                      variant="secondary"
                      className="h-10 px-3 text-sm"
                      disabled={convertingId === r.id}
                      onClick={() => useRoomForGuestBooking(r.id)}
                    >
                      {convertingId === r.id
                        ? 'Updating…'
                        : `Use room ${r.roomNumber} for guest booking`}
                    </Button>
                  ))}
                </div>
              </div>
            ) : null}

            {buildingId && guestRoomsInBuilding.length === 0 && !floorId ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
                This building has no guest rooms for booking.
                {nonGuestRoomsInBuilding.length > 0 ? (
                  <>
                    {' '}
                    Existing rooms:{' '}
                    {nonGuestRoomsInBuilding
                      .map((r) => `${r.roomNumber} (${r.usage})`)
                      .join(', ')}
                    . Open <strong>Buildings → Manage floors</strong> and change usage to{' '}
                    <strong>Guest / Airbnb</strong>, or add a new guest room.
                  </>
                ) : (
                  <>
                    {' '}
                    In <strong>Buildings → Manage floors</strong>, add a room and set usage to{' '}
                    <strong>Guest / Airbnb</strong>.
                  </>
                )}
              </p>
            ) : null}

            {floorId && bookableRooms.length === 0 && nonGuestRoomsOnFloor.length === 0 ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
                No available guest rooms on this floor. Pick another floor, or mark a guest room as
                Available in Setup.
              </p>
            ) : null}

            {room ? (
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                <p className="text-sm text-[var(--text-muted)]">Selected room</p>
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
