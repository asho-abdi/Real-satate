import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import { UNIT_TYPES, UNIT_STATUSES, UNIT_USAGES } from '../../utils/constants.js';
import { calcDailyRent } from '../../utils/rentCalc.js';
import { formatCurrency } from '../../utils/format.js';
import { defaultUsageForUnitType, labelUnitType, usageToApi } from '../../utils/labels.js';
import { rentalApi } from '../../services/rentalApi.js';

export default function BuildingDetail() {
  const { id } = useParams();
  const [building, setBuilding] = useState(null);
  const [floors, setFloors] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFloorId, setSelectedFloorId] = useState('');
  const [floorOpen, setFloorOpen] = useState(false);
  const [roomOpen, setRoomOpen] = useState(false);
  const [floorForm, setFloorForm] = useState({ name: '', level: 0 });
  const [roomForm, setRoomForm] = useState({
    roomNumber: '',
    unitType: '1 Bedroom',
    usage: defaultUsageForUnitType('1 Bedroom'),
    monthlyRent: '',
    discount: '',
    status: 'Available',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await rentalApi.getBuilding(id);
      setBuilding(data);
      const nextFloors = data.floors || [];
      setFloors(nextFloors);
      setRooms((data.units || []).map((u) => ({
        id: u.id,
        floorId: u.floorId,
        roomNumber: u.roomNumber,
        unitType: labelUnitType(u.unitType),
        usage: String(u.usage || '').toLowerCase(),
        monthlyRent: Number(u.monthlyRent),
        discount: Number(u.discount) || 0,
        dailyRent: Math.round((Number(u.monthlyRent) / 30) * 100) / 100,
        status: u.status === 'AVAILABLE' ? 'Available' : u.status === 'OCCUPIED' ? 'Occupied' : 'Reserved',
      })));
      setSelectedFloorId((prev) => prev || nextFloors[0]?.id || '');
    } catch (err) {
      toast.error(err.message || 'Building not found');
      setBuilding(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const selectedFloor = floors.find((f) => f.id === selectedFloorId);
  const floorRooms = useMemo(
    () => rooms.filter((r) => r.floorId === selectedFloorId),
    [rooms, selectedFloorId],
  );
  const dailyRent = calcDailyRent(roomForm.monthlyRent);

  const addFloor = async () => {
    if (!floorForm.name.trim()) {
      toast.error('Floor name required');
      return;
    }
    try {
      const floor = await rentalApi.createFloor({
        buildingId: id,
        name: floorForm.name.trim(),
        level: Number(floorForm.level) || 0,
      });
      setFloorOpen(false);
      setFloorForm({ name: '', level: 0 });
      toast.success('Floor added');
      await load();
      setSelectedFloorId(floor.id);
    } catch (err) {
      toast.error(err.message || 'Could not add floor');
    }
  };

  const setUsageFor = async (roomId, nextUsage) => {
    try {
      await rentalApi.updateUnit(roomId, { usage: usageToApi(nextUsage) });
      toast.success(`Usage → ${nextUsage}`);
      await load();
    } catch (err) {
      toast.error(err.message || 'Could not update usage');
    }
  };

  const addRoom = async () => {
    if (!selectedFloorId) {
      toast.error('Select a floor first');
      return;
    }
    if (!roomForm.roomNumber.trim() || !roomForm.monthlyRent) {
      toast.error('Room number and monthly rent required');
      return;
    }
    try {
      await rentalApi.createUnit({
        buildingId: id,
        floorId: selectedFloorId,
        roomNumber: roomForm.roomNumber.trim(),
        unitType: roomForm.unitType,
        usage: usageToApi(roomForm.usage),
        monthlyRent: Number(roomForm.monthlyRent),
        discount: Number(roomForm.discount) || 0,
        status: roomForm.status,
      });
      setRoomOpen(false);
      setRoomForm({
        roomNumber: '',
        unitType: '1 Bedroom',
        usage: defaultUsageForUnitType('1 Bedroom'),
        monthlyRent: '',
        discount: '',
        status: 'Available',
      });
      toast.success('Room added');
      await load();
    } catch (err) {
      toast.error(err.message || 'Could not add room');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (!building) {
    return (
      <div>
        <PageHeader title="Building not found" />
        <Link to="/buildings">
          <Button className="h-12 px-5">Back to buildings</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={building.name}
        subtitle={`${building.code} · Register floors, then rooms under each floor.`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link to="/buildings">
              <Button variant="secondary" className="h-12 px-5">
                All buildings
              </Button>
            </Link>
            <Button variant="secondary" className="h-12 px-5" onClick={() => setFloorOpen(true)}>
              Add Floor
            </Button>
            <Button className="h-12 px-5 text-base" onClick={() => setRoomOpen(true)}>
              Add Room
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {floors.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setSelectedFloorId(f.id)}
            className={`h-12 rounded-xl px-5 text-base font-medium transition ${
              selectedFloorId === f.id
                ? 'bg-brand-700 text-white dark:bg-brand-400 dark:text-ink-950'
                : 'bg-[var(--surface)] text-[var(--text-muted)] ring-1 ring-[var(--border)]'
            }`}
          >
            {f.name}
          </button>
        ))}
        {floors.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No floors yet — add the first floor.</p>
        ) : null}
      </div>

      <Card title={selectedFloor ? `${selectedFloor.name} · Rooms` : 'Rooms'}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--text-muted)]">
                <th className="pb-2 font-medium">Room</th>
                <th className="pb-2 font-medium">Type</th>
                <th className="pb-2 font-medium">Monthly</th>
                <th className="pb-2 font-medium">Daily</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium">Usage</th>
              </tr>
            </thead>
            <tbody>
              {floorRooms.map((r) => (
                <tr key={r.id} className="border-b border-[var(--border)]/60">
                  <td className="py-3 font-medium">{r.roomNumber}</td>
                  <td className="py-3">{r.unitType}</td>
                  <td className="py-3">{formatCurrency(r.monthlyRent)}</td>
                  <td className="py-3">{formatCurrency(r.dailyRent)}</td>
                  <td className="py-3">
                    <Badge status={r.status}>{r.status}</Badge>
                  </td>
                  <td className="py-3">
                    <Select
                      value={r.usage || 'apartment'}
                      onChange={(e) => setUsageFor(r.id, e.target.value)}
                      className="min-w-[10rem]"
                    >
                      {UNIT_USAGES.map((u) => (
                        <option key={u.value} value={u.value}>
                          {u.label}
                        </option>
                      ))}
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {floorRooms.length === 0 ? (
            <p className="py-6 text-sm text-[var(--text-muted)]">No rooms on this floor yet.</p>
          ) : null}
        </div>
      </Card>

      <Modal
        open={floorOpen}
        onClose={() => setFloorOpen(false)}
        title="Add Floor"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" className="h-12 px-5" onClick={() => setFloorOpen(false)}>
              Cancel
            </Button>
            <Button className="h-12 px-5" onClick={addFloor}>
              Save Floor
            </Button>
          </div>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Name"
            value={floorForm.name}
            onChange={(e) => setFloorForm({ ...floorForm, name: e.target.value })}
            placeholder="Ground Floor"
          />
          <Input
            label="Level"
            type="number"
            value={floorForm.level}
            onChange={(e) => setFloorForm({ ...floorForm, level: e.target.value })}
          />
        </div>
      </Modal>

      <Modal
        open={roomOpen}
        onClose={() => setRoomOpen(false)}
        title={`Add Room${selectedFloor ? ` · ${selectedFloor.name}` : ''}`}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" className="h-12 px-5" onClick={() => setRoomOpen(false)}>
              Cancel
            </Button>
            <Button className="h-12 px-5" onClick={addRoom}>
              Save Room
            </Button>
          </div>
        }
      >
        <p className="mb-3 text-sm text-[var(--text-muted)]">
          For guest bookings, set usage to <strong>Guest / Airbnb</strong>. Shops and apartments
          will not appear on the booking page.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Room number"
            value={roomForm.roomNumber}
            onChange={(e) => setRoomForm({ ...roomForm, roomNumber: e.target.value })}
            placeholder="201"
          />
          <Select
            label="Unit type"
            value={roomForm.unitType}
            onChange={(e) => {
              const unitType = e.target.value;
              setRoomForm({
                ...roomForm,
                unitType,
                usage: defaultUsageForUnitType(unitType),
              });
            }}
          >
            {UNIT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
          <Select
            label="Room usage (you choose)"
            value={roomForm.usage}
            onChange={(e) => setRoomForm({ ...roomForm, usage: e.target.value })}
            disabled={roomForm.unitType === 'Commercial Shop'}
          >
            {UNIT_USAGES.map((u) => (
              <option key={u.value} value={u.value}>
                {u.label}
              </option>
            ))}
          </Select>
          <Input
            label="Monthly rent"
            type="number"
            value={roomForm.monthlyRent}
            onChange={(e) => setRoomForm({ ...roomForm, monthlyRent: e.target.value })}
          />
          <Input
            label="Daily rent (auto)"
            value={roomForm.monthlyRent ? String(dailyRent) : ''}
            readOnly
          />
          <Input
            label="Discount (optional)"
            type="number"
            value={roomForm.discount}
            onChange={(e) => setRoomForm({ ...roomForm, discount: e.target.value })}
          />
          <Select
            label="Status"
            value={roomForm.status}
            onChange={(e) => setRoomForm({ ...roomForm, status: e.target.value })}
          >
            {UNIT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>
      </Modal>
    </div>
  );
}
