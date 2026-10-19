import { Fragment, useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
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
import Spinner from '../../components/ui/Spinner.jsx';
import UnitImageGallery from '../../components/ui/UnitImageGallery.jsx';
import { UNIT_STATUSES, UNIT_USAGES, UNIT_TYPES } from '../../utils/constants.js';
import { formatCurrency, cn } from '../../utils/format.js';
import { usageToApi, usageAfterUnitTypeChange } from '../../utils/labels.js';
import { rentalApi } from '../../services/rentalApi.js';
import GuestPricingFields, { guestPricingError } from '../../components/units/GuestPricingFields.jsx';
import { FormSection, LeasePricingFields } from '../../components/units/FlatFormLayout.jsx';
import api from '../../services/api.js';

function RoomThumb({ url }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    let alive = true;
    let objectUrl = '';
    if (!url) return undefined;
    (async () => {
      try {
        const path = String(url).replace(/^\/api\/v1/, '');
        const res = await api.get(path.startsWith('/') ? path : `/${path}`, { responseType: 'blob' });
        objectUrl = URL.createObjectURL(res.data);
        if (alive) setSrc(objectUrl);
      } catch {
        if (alive) setSrc('');
      }
    })();
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);
  if (!src) return <div className="h-full w-full bg-[var(--surface-2)]" />;
  return <img src={src} alt="" className="h-full w-full object-cover" />;
}

const STATUS_STYLE = {
  Available: {
    card: 'border-l-4 border-l-emerald-500',
    icon: MdCheckCircle,
    iconClass: 'text-emerald-500',
    badgeBg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
    barBg: 'bg-emerald-500',
  },
  Rented: {
    card: 'border-l-4 border-l-sky-500',
    icon: MdCancel,
    iconClass: 'text-sky-500',
    badgeBg: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200',
    barBg: 'bg-sky-500',
  },
  Occupied: {
    card: 'border-l-4 border-l-sky-500',
    icon: MdCancel,
    iconClass: 'text-sky-500',
    badgeBg: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200',
    barBg: 'bg-sky-500',
  },
  Sold: {
    card: 'border-l-4 border-l-violet-500',
    icon: MdMeetingRoom,
    iconClass: 'text-violet-500',
    badgeBg: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200',
    barBg: 'bg-violet-500',
  },
  Reserved: {
    card: 'border-l-4 border-l-amber-400',
    icon: MdSchedule,
    iconClass: 'text-amber-400',
    badgeBg: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
    barBg: 'bg-amber-400',
  },
  Maintenance: {
    card: 'border-l-4 border-l-orange-500',
    icon: MdSchedule,
    iconClass: 'text-orange-500',
    badgeBg: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200',
    barBg: 'bg-orange-500',
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

function detailLabel(r) {
  const usage = String(r.usageRaw || r.usage || '').toLowerCase();
  if (usage === 'shop') {
    return r.areaSqm != null ? `${r.areaSqm} m²` : '—';
  }
  if (usage === 'apartment') {
    if (r.roomsCount == null) return '—';
    const baths =
      r.bathroomsCount != null ? ` · ${r.bathroomsCount} bath${r.bathroomsCount === 1 ? '' : 's'}` : '';
    return `${r.roomsCount} room${r.roomsCount === 1 ? '' : 's'}${baths}`;
  }
  return '—';
}

const STATUS_GROUP_ORDER = ['Available', 'Rented', 'Sold', 'Reserved', 'Maintenance'];

function isShopUnit(r) {
  return String(r.usageRaw || r.usage || '').toLowerCase() === 'shop';
}

function statusKey(status) {
  if (status === 'Occupied') return 'Rented';
  return status || 'Available';
}

function groupRoomsByStatus(rooms) {
  const buckets = new Map();
  for (const r of rooms) {
    const key = statusKey(r.status);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(r);
  }
  return STATUS_GROUP_ORDER.filter((k) => buckets.has(k)).map((k) => ({
    status: k,
    rooms: buckets.get(k),
  })).concat(
    [...buckets.keys()]
      .filter((k) => !STATUS_GROUP_ORDER.includes(k))
      .map((k) => ({ status: k, rooms: buckets.get(k) })),
  );
}

function RoomRow({ r, onStatusChange, onEditRoom, onViewPhotos }) {
  const style = STATUS_STYLE[statusKey(r.status)] || STATUS_STYLE.Available;
  const cover = (r.images || []).find((i) => i.isPrimary) || (r.images || [])[0];
  const displayStatus = statusKey(r.status);
  return (
    <tr
      className={cn(
        'group border-b border-[var(--border)]/60 transition-colors hover:bg-[var(--surface-2)]',
      )}
    >
      <td className="py-3 pr-4 font-medium text-[var(--text)]">{r.roomNumber}</td>
      <td className="py-3 pr-4">
        {cover ? (
          <button
            type="button"
            className="h-12 w-12 overflow-hidden rounded-xl border border-[var(--border)]"
            title="View room photos"
            onClick={() => onViewPhotos(r)}
          >
            <RoomThumb url={cover.url} />
          </button>
        ) : (
          <button
            type="button"
            className="text-xs text-[var(--text-muted)] underline-offset-2 hover:underline"
            onClick={() => onEditRoom(r)}
          >
            Add photo
          </button>
        )}
      </td>
      <td className="py-3 pr-4 text-[var(--text-muted)]">{r.unitType}</td>
      <td className="py-3 pr-4 text-[var(--text)]">{detailLabel(r)}</td>
      <td className="py-3 pr-4 font-medium text-[var(--text)]">
        {String(r.usageRaw || r.usage || '').toLowerCase() === 'guest'
          ? 'Guest rates'
          : formatCurrency(r.monthlyRent)}
      </td>
      <td className="py-3 pr-4">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-semibold',
            style.badgeBg,
          )}
        >
          <style.icon className={cn('h-3 w-3', style.iconClass)} />
          {displayStatus}
        </span>
      </td>
      <td className="py-3">
        <div className="flex flex-wrap gap-1">
          {UNIT_STATUSES.filter((s) => s !== displayStatus).map((s) => (
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
        <div className="flex flex-wrap gap-1.5">
          <Link
            to={`/units/${r.id}`}
            className="inline-flex h-9 items-center justify-center rounded-xl bg-brand-500 px-3 text-xs font-semibold text-white shadow-sm shadow-brand-500/30 transition hover:bg-brand-600 dark:bg-brand-500 dark:text-white dark:hover:bg-brand-400"
          >
            Open profile
          </Link>
          <button
            type="button"
            onClick={() => onEditRoom(r)}
            className="inline-flex h-9 items-center rounded-xl border border-[var(--border)] px-2.5 text-xs font-medium text-[var(--text-muted)] hover:bg-[var(--surface-2)]"
          >
            Edit
          </button>
        </div>
      </td>
    </tr>
  );
}

function FloorSection({ building, floor, rooms, onStatusChange, onEditRoom, onViewPhotos }) {
  const available = rooms.filter((r) => statusKey(r.status) === 'Available').length;
  const rented = rooms.filter((r) => statusKey(r.status) === 'Rented').length;
  const sold = rooms.filter((r) => statusKey(r.status) === 'Sold').length;
  const reserved = rooms.filter((r) => statusKey(r.status) === 'Reserved').length;
  const hasShops = rooms.some(isShopUnit);
  const statusGroups = hasShops ? groupRoomsByStatus(rooms) : [{ status: null, rooms }];

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
            Rented: {rented}
          </span>
          {sold > 0 || hasShops ? (
            <span className="flex items-center gap-1 rounded-lg bg-violet-100 px-2.5 py-1 font-medium text-violet-800 dark:bg-violet-900/30 dark:text-violet-200">
              Sold: {sold}
            </span>
          ) : null}
          {reserved > 0 ? (
            <span className="flex items-center gap-1 rounded-lg bg-amber-100 px-2.5 py-1 font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
              Reserved: {reserved}
            </span>
          ) : null}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[780px] text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-[var(--text-muted)]">
              <th className="pb-2 pr-4 font-medium">Room</th>
              <th className="pb-2 pr-4 font-medium">Photo</th>
              <th className="pb-2 pr-4 font-medium">Type</th>
              <th className="pb-2 pr-4 font-medium">Layout / Area</th>
              <th className="pb-2 pr-4 font-medium">Monthly</th>
              <th className="pb-2 pr-4 font-medium">Status</th>
              <th className="pb-2 font-medium">Change status</th>
              <th className="pb-2 font-medium">Edit</th>
            </tr>
          </thead>
          <tbody>
            {statusGroups.map((group) => (
              <Fragment key={group.status || 'all'}>
                {group.status ? (
                  <tr className="bg-[var(--surface-2)]/80">
                    <td colSpan={9} className="py-2.5 pr-4">
                      <span
                        className={cn(
                          'inline-flex items-center gap-2 rounded-lg px-2.5 py-1 text-xs font-bold uppercase tracking-wide',
                          STATUS_STYLE[group.status]?.badgeBg || 'bg-[var(--surface)] text-[var(--text)]',
                        )}
                      >
                        {group.status === 'Rented' ? 'Rented shops' : group.status === 'Sold' ? 'Sold shops' : group.status}
                        <span className="font-semibold opacity-70">({group.rooms.length})</span>
                      </span>
                    </td>
                  </tr>
                ) : null}
                {group.rooms.map((r) => (
                  <RoomRow
                    key={r.id}
                    r={r}
                    onStatusChange={onStatusChange}
                    onEditRoom={onEditRoom}
                    onViewPhotos={onViewPhotos}
                  />
                ))}
              </Fragment>
            ))}
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
  const [viewPhotosRoom, setViewPhotosRoom] = useState(null);
  const [roomForm, setRoomForm] = useState({
    roomNumber: '',
    unitType: '1 Bedroom',
    usage: 'apartment',
    monthlyRent: '',
    weeklyRent: '',
    dailyRate: '',
    salePrice: '',
    discount: '',
    status: 'Available',
    areaSqm: '',
    roomsCount: '',
    bathroomsCount: '',
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
    const available = filtered.filter((r) => statusKey(r.status) === 'Available').length;
    const rented = filtered.filter((r) => statusKey(r.status) === 'Rented').length;
    const sold = filtered.filter((r) => statusKey(r.status) === 'Sold').length;
    const other = total - available - rented - sold;
    return { total, available, rented, sold, other };
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

  const openEditRoom = (room) => {
    setEditRoom(room);
    setRoomForm({
      roomNumber: room.roomNumber,
      unitType: room.unitType,
      usage: room.usage || 'apartment',
      monthlyRent: String(room.monthlyRent ?? ''),
      weeklyRent: room.weeklyRent != null ? String(room.weeklyRent) : '',
      dailyRate: room.dailyRate != null ? String(room.dailyRate) : '',
      salePrice: room.salePrice != null ? String(room.salePrice) : '',
      discount: String(room.discount || ''),
      status: room.status,
      areaSqm: room.areaSqm != null ? String(room.areaSqm) : '',
      roomsCount: room.roomsCount != null ? String(room.roomsCount) : '',
      bathroomsCount: room.bathroomsCount != null ? String(room.bathroomsCount) : '',
    });
  };

  const saveRoom = async () => {
    if (!editRoom) return;
    const usageApi = usageToApi(roomForm.usage);
    if (usageApi === 'SHOP' && !roomForm.areaSqm) {
      toast.error('Shop meter (sqm) is required');
      return;
    }
    if (usageApi === 'APARTMENT' && (!roomForm.roomsCount || !roomForm.bathroomsCount)) {
      toast.error('Apartment rooms and bathrooms are required');
      return;
    }
    if (usageApi === 'GUEST') {
      const guestErr = guestPricingError(roomForm);
      if (guestErr) {
        toast.error(guestErr);
        return;
      }
    } else if (!roomForm.monthlyRent) {
      toast.error('Monthly rent is required');
      return;
    }
    setSavingRoom(true);
    try {
      await rentalApi.updateUnit(editRoom.id, {
        roomNumber: roomForm.roomNumber.trim(),
        unitType: roomForm.unitType,
        usage: usageApi,
        monthlyRent: Number(roomForm.monthlyRent) || 0,
        weeklyRent:
          usageApi === 'GUEST' && roomForm.weeklyRent !== ''
            ? Number(roomForm.weeklyRent)
            : null,
        dailyRate:
          usageApi === 'GUEST' && roomForm.dailyRate !== ''
            ? Number(roomForm.dailyRate)
            : null,
        salePrice: roomForm.salePrice === '' ? null : Number(roomForm.salePrice),
        discount: Number(roomForm.discount) || 0,
        status: roomForm.status,
        areaSqm: usageApi === 'SHOP' ? Number(roomForm.areaSqm) : null,
        roomsCount: usageApi === 'APARTMENT' ? Number(roomForm.roomsCount) : null,
        bathroomsCount: usageApi === 'APARTMENT' ? Number(roomForm.bathroomsCount) : null,
      });
      toast.success('Unit updated');
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
        subtitle="Overview of unit availability and statuses across all buildings and floors."
      />

      {/* stat cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Total Units"
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
          label="Rented"
          value={stats.rented}
          icon={MdCancel}
          iconClass="text-sky-500"
          barBg="bg-sky-500"
          total={stats.total}
        />
        <StatCard
          label="Sold"
          value={stats.sold}
          icon={MdMeetingRoom}
          iconClass="text-violet-500"
          barBg="bg-violet-500"
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
            placeholder="Unit number or building…"
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
              onEditRoom={openEditRoom}
              onViewPhotos={setViewPhotosRoom}
            />
          ))}
        </Card>
      )}

      <Modal
        open={Boolean(viewPhotosRoom)}
        onClose={() => setViewPhotosRoom(null)}
        title={viewPhotosRoom ? `Room ${viewPhotosRoom.roomNumber} · Photos` : 'Photos'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" className="h-11 px-4" onClick={() => setViewPhotosRoom(null)}>
              Close
            </Button>
            {viewPhotosRoom ? (
              <Button
                className="h-11 px-4"
                onClick={() => {
                  const room = viewPhotosRoom;
                  setViewPhotosRoom(null);
                  openEditRoom(room);
                }}
              >
                Manage photos
              </Button>
            ) : null}
          </div>
        }
      >
        {viewPhotosRoom ? (
          <UnitImageGallery
            unitId={viewPhotosRoom.id}
            images={viewPhotosRoom.images || []}
            readOnly
          />
        ) : null}
      </Modal>

      <Modal
        open={Boolean(editRoom)}
        size="lg"
        onClose={() => !savingRoom && setEditRoom(null)}
        title={editRoom ? `Edit unit ${editRoom.roomNumber}` : 'Edit unit'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" className="h-11 px-4" onClick={() => setEditRoom(null)} disabled={savingRoom}>
              Cancel
            </Button>
            <Button className="h-11 px-5" onClick={saveRoom} disabled={savingRoom}>
              {savingRoom ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
          <FormSection title="Basics" description="Unit number and layout. Usage is set when the unit is created.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Unit number"
                value={roomForm.roomNumber}
                onChange={(e) => setRoomForm({ ...roomForm, roomNumber: e.target.value })}
              />
              <Input
                label="How this unit is used"
                value={UNIT_USAGES.find((u) => u.value === roomForm.usage)?.label || roomForm.usage}
                readOnly
              />
              <Select
                label="Layout type"
                value={roomForm.unitType}
                onChange={(e) =>
                  setRoomForm({
                    ...roomForm,
                    unitType: e.target.value,
                    usage: usageAfterUnitTypeChange(e.target.value, roomForm.usage),
                  })
                }
              >
                {UNIT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </Select>
              {roomForm.usage === 'shop' ? (
                <Input
                  label="Floor area (m²)"
                  type="number"
                  min={0}
                  step="0.01"
                  value={roomForm.areaSqm}
                  onChange={(e) => setRoomForm({ ...roomForm, areaSqm: e.target.value })}
                />
              ) : null}
              {roomForm.usage === 'apartment' ? (
                <>
                  <Input label="Bedrooms" type="number" min={1} value={roomForm.roomsCount} onChange={(e) => setRoomForm({ ...roomForm, roomsCount: e.target.value })} />
                  <Input label="Bathrooms" type="number" min={1} value={roomForm.bathroomsCount} onChange={(e) => setRoomForm({ ...roomForm, bathroomsCount: e.target.value })} />
                </>
              ) : null}
            </div>
          </FormSection>

          <FormSection
            title={roomForm.usage === 'guest' ? 'Stay prices' : 'Rent'}
            description={
              roomForm.usage === 'guest'
                ? 'Prices for nightly, weekly, and monthly guest bookings.'
                : 'What the tenant pays each month.'
            }
          >
            {roomForm.usage === 'guest' ? (
              <GuestPricingFields form={roomForm} onChange={setRoomForm} />
            ) : (
              <LeasePricingFields form={roomForm} onChange={setRoomForm} />
            )}
            {roomForm.usage === 'shop' ? (
              <Input className="mt-4" label="Sale price (optional)" type="number" value={roomForm.salePrice} onChange={(e) => setRoomForm({ ...roomForm, salePrice: e.target.value })} />
            ) : null}
            <Input className="mt-4 max-w-xs" label="Standing discount (optional)" type="number" value={roomForm.discount} onChange={(e) => setRoomForm({ ...roomForm, discount: e.target.value })} />
          </FormSection>

          <FormSection title="Status and photos">
            <div className="mb-4 max-w-xs">
              <Select label="Current status" value={roomForm.status} onChange={(e) => setRoomForm({ ...roomForm, status: e.target.value })}>
                {UNIT_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
            </div>
            {editRoom ? (
              <UnitImageGallery
                unitId={editRoom.id}
                images={editRoom.images || rooms.find((x) => x.id === editRoom.id)?.images || []}
                onChange={async () => {
                  await load();
                  const refreshed = await rentalApi.listUnits();
                  const match = (refreshed || []).find((u) => u.id === editRoom.id);
                  if (match) setEditRoom(match);
                }}
              />
            ) : null}
          </FormSection>
        </div>
      </Modal>
    </div>
  );
}
