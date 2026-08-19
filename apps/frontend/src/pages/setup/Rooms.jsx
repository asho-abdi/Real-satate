import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  MdDoorFront,
  MdCheckCircle,
  MdCancel,
  MdSchedule,
  MdMeetingRoom,
} from 'react-icons/md';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Modal from '../../components/ui/Modal.jsx';
import { UNIT_STATUSES, UNIT_USAGES, UNIT_TYPES } from '../../utils/constants.js';
import { formatCurrency, cn } from '../../utils/format.js';
import { usageToApi, defaultUsageForUnitType } from '../../utils/labels.js';
import { rentalApi } from '../../services/rentalApi.js';

const STATUS_STYLE = {
  Available: {
    card: 'border-l-4 border-l-emerald-500',
    icon: MdCheckCircle,
    iconClass: 'text-emerald-500',
    badgeBg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
    barBg: 'bg-emerald-500',
  },
  Occupied: {
    card: 'border-l-4 border-l-sky-500',
    icon: MdCancel,
    iconClass: 'text-sky-500',
    badgeBg: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200',
    barBg: 'bg-sky-500',
  },
  Reserved: {
    card: 'border-l-4 border-l-amber-400',
    icon: MdSchedule,
    iconClass: 'text-amber-400',
    badgeBg: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
    barBg: 'bg-amber-400',
  },
};

function StatCard({ label, value, icon: Icon, iconClass, barBg, total }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          {label}
        </span>
        <span className={cn('flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--surface-2)]', iconClass)}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="text-3xl font-bold text-[var(--text)]">{value}</p>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--border)]">
        <div className={cn('h-full rounded-full transition-all', barBg)} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-[var(--text-muted)]">{pct}% of total</p>
    </div>
  );
}

function FloorSection({ building, floor, rooms, onStatusChange, onUsageChange, onEditRoom }) {
  const available = rooms.filter((r) => r.status === 'Available').length;
  const occupied = rooms.filter((r) => r.status === 'Occupied').length;
  const reserved = rooms.filter((r) => r.status === 'Reserved').length;

  return (
    <div className="mb-6">
      <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl bg-[var(--surface-2)] px-4 py-2.5">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-[var(--text)]">
          <MdMeetingRoom className="h-4 w-4 text-brand-500" />
          {building} &mdash; {floor}
        </span>
        <span className="ml-auto flex flex-wrap gap-2 text-xs">
          <span className="flex items-center gap-1 rounded-lg bg-emerald-100 px-2.5 py-1 font-medium text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200">
            Available: {available}
          </span>
          <span className="flex items-center gap-1 rounded-lg bg-sky-100 px-2.5 py-1 font-medium text-sky-800 dark:bg-sky-900/30 dark:text-sky-200">
            Occupied: {occupied}
          </span>
          {reserved > 0 ? (
            <span className="flex items-center gap-1 rounded-lg bg-amber-100 px-2.5 py-1 font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
              Reserved: {reserved}
            </span>
          ) : null}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-[var(--text-muted)]">
              <th className="pb-2 pr-4 font-medium">Room</th>
              <th className="pb-2 pr-4 font-medium">Type</th>
              <th className="pb-2 pr-4 font-medium">Usage</th>
              <th className="pb-2 pr-4 font-medium">Monthly</th>
              <th className="pb-2 pr-4 font-medium">Daily</th>
              <th className="pb-2 pr-4 font-medium">Status</th>
              <th className="pb-2 font-medium">Change status</th>
              <th className="pb-2 font-medium">Edit</th>
            </tr>
          </thead>
          <tbody>
            {rooms.map((r) => {
              const style = STATUS_STYLE[r.status] || STATUS_STYLE.Available;
              return (
                <tr
                  key={r.id}
                  className={cn(
                    'group border-b border-[var(--border)]/60 transition-colors hover:bg-[var(--surface-2)]',
                  )}
                >
                  <td className="py-3 pr-4 font-medium text-[var(--text)]">{r.roomNumber}</td>
                  <td className="py-3 pr-4 text-[var(--text-muted)]">{r.unitType}</td>
                  <td className="py-3 pr-4">
                    <Select
                      value={r.usage || 'apartment'}
                      onChange={(e) => onUsageChange(r.id, e.target.value)}
                      className="h-8 py-0 text-xs"
                    >
                      {UNIT_USAGES.map((u) => (
                        <option key={u.value} value={u.value}>
                          {u.label}
                        </option>
                      ))}
                    </Select>
                  </td>
                  <td className="py-3 pr-4 font-medium text-[var(--text)]">
                    {formatCurrency(r.monthlyRent)}
                  </td>
                  <td className="py-3 pr-4 text-[var(--text-muted)]">
                    {formatCurrency(r.dailyRent)}
                  </td>
                  <td className="py-3 pr-4">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-semibold',
                        style.badgeBg,
                      )}
                    >
                      <style.icon className={cn('h-3 w-3', style.iconClass)} />
                      {r.status}
                    </span>
                  </td>
                  <td className="py-3">
                    <div className="flex flex-wrap gap-1">
                      {UNIT_STATUSES.filter((s) => s !== r.status).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => onStatusChange(r.id, s)}
                          className={cn(
                            'rounded-lg px-2.5 py-1 text-xs font-medium transition hover:opacity-90',
                            STATUS_STYLE[s]?.badgeBg || 'bg-[var(--surface-2)] text-[var(--text)]',
                          )}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td className="py-3">
                    <button
                      type="button"
                      onClick={() => onEditRoom(r)}
                      className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs font-medium text-[var(--text-muted)] hover:bg-[var(--surface-2)]"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Rooms() {
  const { globalSearch = '' } = useOutletContext() || {};
  const [buildings, setBuildings] = useState([]);
  const [floors, setFloors] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [buildingId, setBuildingId] = useState('');
  const [floorId, setFloorId] = useState('');
  const [status, setStatus] = useState('');
  const [usage, setUsage] = useState('');
  const [editRoom, setEditRoom] = useState(null);
  const [roomForm, setRoomForm] = useState({
    roomNumber: '',
    unitType: '1 Bedroom',
    usage: 'apartment',
    monthlyRent: '',
    discount: '',
    status: 'Available',
  });
  const [savingRoom, setSavingRoom] = useState(false);

  useEffect(() => {
    if (globalSearch !== undefined) setSearch(globalSearch);
  }, [globalSearch]);

  const load = async () => {
    setLoading(true);
    try {
      const [b, f, u] = await Promise.all([
        rentalApi.listBuildings(),
        rentalApi.listFloors(),
        rentalApi.listUnits(),
      ]);
      setBuildings(b);
      setFloors(f);
      setRooms(u);
    } catch (err) {
      toast.error(err.message || 'Failed to load rooms');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const buildingFloors = useMemo(() => {
    if (!buildingId) return floors;
    return floors.filter((f) => f.buildingId === buildingId);
  }, [floors, buildingId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rooms.filter((r) => {
      if (buildingId && r.buildingId !== buildingId) return false;
      if (floorId && r.floorId !== floorId) return false;
      if (status && r.status !== status) return false;
      if (usage && r.usage !== usage) return false;
      if (!q) return true;
      return (
        r.roomNumber.toLowerCase().includes(q) ||
        String(r.building || '').toLowerCase().includes(q) ||
        String(r.floor || '').toLowerCase().includes(q)
      );
    });
  }, [rooms, search, buildingId, floorId, status, usage]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const available = filtered.filter((r) => r.status === 'Available').length;
    const occupied = filtered.filter((r) => r.status === 'Occupied').length;
    const other = total - available - occupied;
    return { total, available, occupied, other };
  }, [filtered]);

  const grouped = useMemo(() => {
    const map = new Map();
    for (const r of filtered) {
      const key = `${r.buildingId}|||${r.floorId}`;
      if (!map.has(key)) {
        map.set(key, {
          building: r.building || '—',
          floor: r.floor || '—',
          rooms: [],
        });
      }
      map.get(key).rooms.push(r);
    }
    return Array.from(map.values()).sort((a, b) => {
      const bc = a.building.localeCompare(b.building);
      if (bc !== 0) return bc;
      return a.floor.localeCompare(b.floor, undefined, { numeric: true });
    });
  }, [filtered]);

  const setStatusFor = async (id, next) => {
    setRooms((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: next } : r)),
    );
    try {
      await rentalApi.updateUnit(id, { status: next });
      toast.success(`Status → ${next}`);
    } catch (err) {
      toast.error(err.message || 'Update failed');
      await load();
    }
  };

  const setUsageFor = async (id, nextUsage) => {
    setRooms((prev) =>
      prev.map((r) => (r.id === id ? { ...r, usage: nextUsage } : r)),
    );
    try {
      await rentalApi.updateUnit(id, { usage: usageToApi(nextUsage) });
      toast.success(`Usage → ${nextUsage}`);
    } catch (err) {
      toast.error(err.message || 'Update failed');
      await load();
    }
  };

  const openEditRoom = (room) => {
    setEditRoom(room);
    setRoomForm({
      roomNumber: room.roomNumber,
      unitType: room.unitType,
      usage: room.usage || 'apartment',
      monthlyRent: String(room.monthlyRent),
      discount: String(room.discount || ''),
      status: room.status,
    });
  };

  const saveRoom = async () => {
    if (!editRoom) return;
    setSavingRoom(true);
    try {
      await rentalApi.updateUnit(editRoom.id, {
        roomNumber: roomForm.roomNumber.trim(),
        unitType: roomForm.unitType,
        usage: usageToApi(roomForm.usage),
        monthlyRent: Number(roomForm.monthlyRent),
        discount: Number(roomForm.discount) || 0,
        status: roomForm.status,
      });
      toast.success('Room updated');
      setEditRoom(null);
      await load();
    } catch (err) {
      toast.error(err.message || 'Could not update room');
    } finally {
      setSavingRoom(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Availability"
        subtitle="Overview of room availability, occupied units, and statuses across all buildings and floors."
      />

      {/* stat cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Rooms"
          value={stats.total}
          icon={MdDoorFront}
          iconClass="text-[var(--text-muted)]"
          barBg="bg-slate-400"
          total={stats.total}
        />
        <StatCard
          label="Available"
          value={stats.available}
          icon={MdCheckCircle}
          iconClass="text-emerald-500"
          barBg="bg-emerald-500"
          total={stats.total}
        />
        <StatCard
          label="Occupied"
          value={stats.occupied}
          icon={MdCancel}
          iconClass="text-sky-500"
          barBg="bg-sky-500"
          total={stats.total}
        />
        <StatCard
          label="Reserved / Other"
          value={stats.other}
          icon={MdSchedule}
          iconClass="text-amber-400"
          barBg="bg-amber-400"
          total={stats.total}
        />
      </div>

      {/* filter bar */}
      <Card className="mb-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Input
            label="Search"
            placeholder="Room number or building…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            label="Building"
            value={buildingId}
            onChange={(e) => {
              setBuildingId(e.target.value);
              setFloorId('');
            }}
          >
            <option value="">All Buildings</option>
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
          <Select
            label="Floor"
            value={floorId}
            onChange={(e) => setFloorId(e.target.value)}
            disabled={buildingFloors.length === 0}
          >
            <option value="">All Floors</option>
            {buildingFloors.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </Select>
          <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All Statuses</option>
            {UNIT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          <Select label="Usage" value={usage} onChange={(e) => setUsage(e.target.value)}>
            <option value="">All Usage</option>
            <option value="shop">Shop</option>
            <option value="apartment">Apartment</option>
            <option value="guest">Guest</option>
          </Select>
        </div>
      </Card>

      {/* grouped floor sections */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : grouped.length === 0 ? (
        <Card>
          <p className="py-4 text-sm text-[var(--text-muted)]">No rooms match your filters.</p>
        </Card>
      ) : (
        <Card>
          {grouped.map((g) => (
            <FloorSection
              key={`${g.building}|||${g.floor}`}
              building={g.building}
              floor={g.floor}
              rooms={g.rooms}
              onStatusChange={setStatusFor}
              onUsageChange={setUsageFor}
              onEditRoom={openEditRoom}
            />
          ))}
        </Card>
      )}

      <Modal
        open={Boolean(editRoom)}
        onClose={() => !savingRoom && setEditRoom(null)}
        title={`Edit Room · ${editRoom?.roomNumber || ''}`}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" className="h-11 px-4" onClick={() => setEditRoom(null)} disabled={savingRoom}>
              Cancel
            </Button>
            <Button className="h-11 px-4" onClick={saveRoom} disabled={savingRoom}>
              {savingRoom ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Room number" value={roomForm.roomNumber} onChange={(e) => setRoomForm({ ...roomForm, roomNumber: e.target.value })} />
          <Select label="Unit type" value={roomForm.unitType} onChange={(e) => setRoomForm({ ...roomForm, unitType: e.target.value, usage: defaultUsageForUnitType(e.target.value) })}>
            {UNIT_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </Select>
          <Select label="Usage" value={roomForm.usage} onChange={(e) => setRoomForm({ ...roomForm, usage: e.target.value })}>
            {UNIT_USAGES.map((u) => (
              <option key={u.value} value={u.value}>{u.label}</option>
            ))}
          </Select>
          <Input label="Monthly rent" type="number" value={roomForm.monthlyRent} onChange={(e) => setRoomForm({ ...roomForm, monthlyRent: e.target.value })} />
          <Input label="Discount" type="number" value={roomForm.discount} onChange={(e) => setRoomForm({ ...roomForm, discount: e.target.value })} />
          <Select label="Status" value={roomForm.status} onChange={(e) => setRoomForm({ ...roomForm, status: e.target.value })}>
            {UNIT_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
        </div>
      </Modal>
    </div>
  );
}
