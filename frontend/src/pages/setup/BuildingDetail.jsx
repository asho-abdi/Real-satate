import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { MdDeleteOutline } from 'react-icons/md';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import Modal from '../../components/ui/Modal.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import FloorTabMenu from '../../components/ui/FloorTabMenu.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import { UNIT_TYPES, UNIT_STATUSES, UNIT_USAGES } from '../../utils/constants.js';
import { cn, formatCurrency } from '../../utils/format.js';
import {
  defaultUsageForUnitType,
  labelStatus,
  labelUnitType,
  usageAfterUnitTypeChange,
  usageToApi,
} from '../../utils/labels.js';
import { rentalApi } from '../../services/rentalApi.js';
import api from '../../services/api.js';
import UnitImageGallery from '../../components/ui/UnitImageGallery.jsx';
import GuestPricingFields, { guestPricingError } from '../../components/units/GuestPricingFields.jsx';
import {
  FormSection,
  LeasePricingFields,
  UsageChoiceCards,
} from '../../components/units/FlatFormLayout.jsx';

const SHOP_STATUS_ORDER = ['Available', 'Rented', 'Sold', 'Reserved', 'Maintenance'];

function normalizeUnitStatus(status) {
  const labeled = labelStatus(status);
  if (labeled === 'Occupied') return 'Rented';
  return labeled;
}

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

export default function BuildingDetail() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const floorFromUrl = searchParams.get('floor') || '';
  const [building, setBuilding] = useState(null);
  const [floors, setFloors] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFloorId, setSelectedFloorId] = useState(floorFromUrl);
  const [floorOpen, setFloorOpen] = useState(false);
  const [roomOpen, setRoomOpen] = useState(false);
  const [buildingOpen, setBuildingOpen] = useState(false);
  const [editingFloorId, setEditingFloorId] = useState(null);
  const [editingRoomId, setEditingRoomId] = useState(null);
  const [pendingImages, setPendingImages] = useState([]);
  const [viewPhotosRoom, setViewPhotosRoom] = useState(null);
  const [floorMenuId, setFloorMenuId] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [buildingForm, setBuildingForm] = useState({ name: '', code: '', address: '', floorsCount: 0, notes: '' });
  const [floorForm, setFloorForm] = useState({ name: '', level: 0 });
  const [roomForm, setRoomForm] = useState({
    roomNumber: '',
    unitType: '1 Bedroom',
    usage: defaultUsageForUnitType('1 Bedroom'),
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
        weeklyRent: u.weeklyRent != null ? Number(u.weeklyRent) : null,
        dailyRate: u.dailyRate != null ? Number(u.dailyRate) : null,
        salePrice: u.salePrice != null ? Number(u.salePrice) : null,
        discount: Number(u.discount) || 0,
        dailyRent:
          String(u.usage || '').toUpperCase() === 'GUEST' && u.dailyRate != null
            ? Number(u.dailyRate)
            : null,
        areaSqm: u.areaSqm != null ? Number(u.areaSqm) : null,
        roomsCount: u.roomsCount ?? null,
        bathroomsCount: u.bathroomsCount ?? null,
        status: normalizeUnitStatus(u.status),
        images: u.images || [],
      })));
      const preferred =
        (floorFromUrl && nextFloors.some((f) => f.id === floorFromUrl) && floorFromUrl) ||
        nextFloors[0]?.id ||
        '';
      setSelectedFloorId(preferred);
    } catch (err) {
      toast.error(err.message || 'Building not found');
      setBuilding(null);
    } finally {
      setLoading(false);
    }
  }, [id, floorFromUrl]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (floorFromUrl && floors.some((f) => f.id === floorFromUrl)) {
      setSelectedFloorId(floorFromUrl);
    }
  }, [floorFromUrl, floors]);

  const selectFloor = (floorId) => {
    setFloorMenuId(null);
    setSelectedFloorId(floorId);
  };

  const selectedFloor = floors.find((f) => f.id === selectedFloorId);
  const floorRooms = useMemo(
    () => rooms.filter((r) => r.floorId === selectedFloorId),
    [rooms, selectedFloorId],
  );
  const floorHasShops = useMemo(
    () => floorRooms.some((r) => r.usage === 'shop' || r.usage === 'office'),
    [floorRooms],
  );
  const floorRoomGroups = useMemo(() => {
    if (!floorHasShops) return [{ status: null, rooms: floorRooms }];
    const buckets = new Map();
    for (const r of floorRooms) {
      const key = r.status === 'Occupied' ? 'Rented' : r.status;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(r);
    }
    return SHOP_STATUS_ORDER.filter((k) => buckets.has(k))
      .map((k) => ({ status: k, rooms: buckets.get(k) }))
      .concat(
        [...buckets.keys()]
          .filter((k) => !SHOP_STATUS_ORDER.includes(k))
          .map((k) => ({ status: k, rooms: buckets.get(k) })),
      );
  }, [floorRooms, floorHasShops]);
  const addFloor = async () => {
    if (!floorForm.name.trim()) {
      toast.error('Floor name required');
      return;
    }
    try {
      if (editingFloorId) {
        await rentalApi.updateFloor(editingFloorId, {
          name: floorForm.name.trim(),
          level: Number(floorForm.level) || 0,
        });
        toast.success('Floor updated');
      } else {
        const floor = await rentalApi.createFloor({
          buildingId: id,
          name: floorForm.name.trim(),
          level: Number(floorForm.level) || 0,
        });
        setSelectedFloorId(floor.id);
        toast.success('Floor added');
      }
      setFloorOpen(false);
      setEditingFloorId(null);
      setFloorForm({ name: '', level: 0 });
      await load();
    } catch (err) {
      toast.error(err.message || 'Could not save floor');
    }
  };

  const openEditFloor = (f) => {
    setEditingFloorId(f.id);
    setFloorForm({ name: f.name, level: f.level ?? 0 });
    setFloorOpen(true);
  };

  const openCreateFloor = () => {
    setEditingFloorId(null);
    const nextLevel =
      floors.length === 0
        ? 0
        : Math.max(...floors.map((f) => Number(f.level) || 0)) + 1;
    setFloorForm({ name: '', level: nextLevel });
    setFloorOpen(true);
  };

  const runDeleteFloor = async (floor) => {
    try {
      await rentalApi.deleteFloor(floor.id);
      toast.success('Floor deleted');
      setConfirm(null);
      setFloorMenuId(null);
      await load();
    } catch (err) {
      toast.error(err.message || 'Could not delete floor');
    }
  };

  const askDeleteFloor = (floor) => {
    const roomCount = rooms.filter((r) => r.floorId === floor.id).length;
    setFloorMenuId(null);
    setConfirm({
      title: 'Delete Floor?',
      message:
        roomCount > 0
          ? `Are you sure you want to delete "${floor.name}"? Its ${roomCount} room${roomCount === 1 ? '' : 's'} will remain in the system but this floor will be removed from the list.`
          : `Are you sure you want to delete "${floor.name}"? This action cannot be undone.`,
      confirmLabel: 'Delete Floor',
      onConfirm: () => runDeleteFloor(floor),
    });
  };

  const saveBuilding = async () => {
    if (!buildingForm.name.trim() || !buildingForm.code.trim()) {
      toast.error('Name and code required');
      return;
    }
    try {
      await rentalApi.updateBuilding(id, {
        name: buildingForm.name.trim(),
        code: buildingForm.code.trim(),
        address: buildingForm.address.trim() || null,
        floorsCount: Number(buildingForm.floorsCount) || 0,
        notes: buildingForm.notes.trim() || null,
      });
      setBuildingOpen(false);
      toast.success('Building updated');
      await load();
    } catch (err) {
      toast.error(err.message || 'Could not update building');
    }
  };

  const openEditRoom = (r) => {
    setEditingRoomId(r.id);
    setPendingImages([]);
    setRoomForm({
      roomNumber: r.roomNumber,
      unitType: r.unitType,
      usage: r.usage || defaultUsageForUnitType(r.unitType),
      monthlyRent: String(r.monthlyRent ?? ''),
      weeklyRent: r.weeklyRent != null ? String(r.weeklyRent) : '',
      dailyRate: r.dailyRate != null ? String(r.dailyRate) : '',
      salePrice: r.salePrice != null ? String(r.salePrice) : '',
      discount: String(r.discount || ''),
      status: r.status,
      areaSqm: r.areaSqm != null ? String(r.areaSqm) : '',
      roomsCount: r.roomsCount != null ? String(r.roomsCount) : '',
      bathroomsCount: r.bathroomsCount != null ? String(r.bathroomsCount) : '',
    });
    setRoomOpen(true);
  };

  const openCreateRoom = () => {
    setEditingRoomId(null);
    setPendingImages([]);
    setRoomForm({
      roomNumber: '',
      unitType: '1 Bedroom',
      usage: defaultUsageForUnitType('1 Bedroom'),
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
    setRoomOpen(true);
  };

  const addRoom = async () => {
    if (!selectedFloorId && !editingRoomId) {
      toast.error('Select a floor first');
      return;
    }
    if (!roomForm.roomNumber.trim()) {
      toast.error('Unit number is required');
      return;
    }
    const usage = usageToApi(roomForm.usage);
    if (usage === 'GUEST') {
      const guestErr = guestPricingError(roomForm);
      if (guestErr) {
        toast.error(guestErr);
        return;
      }
    } else if (!roomForm.monthlyRent) {
      toast.error('Monthly rent is required');
      return;
    }
    if ((usage === 'SHOP' || usage === 'OFFICE') && !roomForm.areaSqm) {
      toast.error('Floor area (m²) is required for shops and offices');
      return;
    }
    if (usage === 'APARTMENT' && (!roomForm.roomsCount || !roomForm.bathroomsCount)) {
      toast.error('Apartment rooms and bathrooms are required');
      return;
    }
    try {
      const payload = {
        roomNumber: roomForm.roomNumber.trim(),
        unitType: roomForm.unitType,
        usage,
        monthlyRent: Number(roomForm.monthlyRent),
        weeklyRent:
          usage === 'GUEST' && roomForm.weeklyRent !== ''
            ? Number(roomForm.weeklyRent)
            : null,
        dailyRate:
          usage === 'GUEST' && roomForm.dailyRate !== ''
            ? Number(roomForm.dailyRate)
            : null,
        salePrice: roomForm.salePrice === '' ? null : Number(roomForm.salePrice),
        discount: Number(roomForm.discount) || 0,
        status: roomForm.status,
        areaSqm: usage === 'SHOP' || usage === 'OFFICE' ? Number(roomForm.areaSqm) : null,
        roomsCount: usage === 'APARTMENT' ? Number(roomForm.roomsCount) : null,
        bathroomsCount: usage === 'APARTMENT' ? Number(roomForm.bathroomsCount) : null,
      };
      if (editingRoomId) {
        await rentalApi.updateUnit(editingRoomId, payload);
        toast.success('Unit updated');
      } else {
        const created = await rentalApi.createUnit({
          buildingId: id,
          floorId: selectedFloorId,
          ...payload,
        });
        if (pendingImages.length && created?.id) {
          try {
            await rentalApi.uploadUnitImages(created.id, pendingImages);
          } catch (uploadErr) {
            toast.error(uploadErr.message || 'Unit saved, but photo upload failed — edit the unit to add photos');
          }
        }
        toast.success('Unit added');
      }
      setRoomOpen(false);
      setEditingRoomId(null);
      setPendingImages([]);
      setRoomForm({
        roomNumber: '',
        unitType: '1 Bedroom',
        usage: defaultUsageForUnitType('1 Bedroom'),
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
      await load();
    } catch (err) {
      toast.error(err.message || 'Could not save unit');
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
            <Link to={`/maintenance?buildingId=${building.id}`}>
              <Button variant="secondary" className="h-12 px-5">
                Maintenance
              </Button>
            </Link>
            <Button variant="secondary" className="h-12 px-5" onClick={() => {
              setBuildingForm({
                name: building.name || '',
                code: building.code || '',
                address: building.address || '',
                floorsCount: building.floorsCount ?? 0,
                notes: building.notes || '',
              });
              setBuildingOpen(true);
            }}>
              Edit Building
            </Button>
            <Button variant="secondary" className="h-12 px-5" onClick={openCreateFloor}>
              Add Floor
            </Button>
            <Button className="h-12 px-5 text-base" onClick={openCreateRoom}>
              Add Unit
            </Button>
          </div>
        }
      />

      <div className="mb-5">
        <div className="flex flex-wrap items-center gap-2">
          {floors.map((f) => {
            const isSelected = selectedFloorId === f.id;
            const menuOpen = floorMenuId === f.id;
            return (
              <div key={f.id} className="group relative shrink-0">
                <div
                  className={cn(
                    'inline-flex h-10 items-stretch overflow-hidden rounded-xl border transition-all duration-150',
                    isSelected
                      ? 'border-[#F05A28] bg-[#F05A28] text-white shadow-sm shadow-[#F05A28]/20'
                      : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:border-[#F05A28]/35 hover:shadow-sm',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => selectFloor(f.id)}
                    className={cn(
                      'px-4 text-sm font-medium transition-colors',
                      isSelected ? 'text-white' : 'text-[var(--text)]',
                    )}
                  >
                    {f.name}
                  </button>
                  <FloorTabMenu
                    floor={f}
                    isSelected={isSelected}
                    isOpen={menuOpen}
                    onOpenChange={(next) => setFloorMenuId(next ? f.id : null)}
                    onEdit={() => openEditFloor(f)}
                    onDelete={() => askDeleteFloor(f)}
                  />
                </div>
              </div>
            );
          })}
        </div>
        {floors.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--text-muted)]">No floors yet — add the first floor.</p>
        ) : (
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            {floors.length} floor{floors.length === 1 ? '' : 's'} registered
          </p>
        )}
      </div>

      <Card title={selectedFloor ? `${selectedFloor.name} · Units` : 'Units'}>
        {floorHasShops ? (
          <div className="mb-4 flex flex-wrap gap-2 text-xs">
            {SHOP_STATUS_ORDER.map((s) => {
              const count = floorRooms.filter((r) => (r.status === 'Occupied' ? 'Rented' : r.status) === s).length;
              if (!count) return null;
              return (
                <span
                  key={s}
                  className={cn(
                    'rounded-lg px-2.5 py-1 font-medium',
                    s === 'Available' && 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200',
                    s === 'Rented' && 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-200',
                    s === 'Sold' && 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-200',
                    s === 'Reserved' && 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200',
                    s === 'Maintenance' && 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200',
                  )}
                >
                  {s}: {count}
                </span>
              );
            })}
          </div>
        ) : null}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--text-muted)]">
                <th className="pb-2 font-medium">Unit</th>
                <th className="pb-2 font-medium">Photo</th>
                <th className="pb-2 font-medium">Type</th>
                <th className="pb-2 font-medium">Monthly</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium">Usage</th>
                <th className="pb-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {floorRoomGroups.map((group) => (
                <Fragment key={group.status || 'all'}>
                  {group.status ? (
                    <tr className="bg-[var(--surface-2)]/80">
                      <td colSpan={8} className="py-2.5">
                        <span className="text-xs font-bold uppercase tracking-wide text-[var(--text)]">
                          {group.status === 'Rented'
                            ? 'Rented shops'
                            : group.status === 'Sold'
                              ? 'Sold shops'
                              : group.status}
                          <span className="ml-2 font-semibold text-[var(--text-muted)]">
                            ({group.rooms.length})
                          </span>
                        </span>
                      </td>
                    </tr>
                  ) : null}
                  {group.rooms.map((r) => {
                    const cover = (r.images || []).find((i) => i.isPrimary) || (r.images || [])[0];
                    return (
                      <tr key={r.id} className="border-b border-[var(--border)]/60">
                        <td className="py-3 font-medium">{r.roomNumber}</td>
                        <td className="py-3">
                          {cover ? (
                            <button
                              type="button"
                              className="h-12 w-12 overflow-hidden rounded-xl border border-[var(--border)]"
                              title="View room photos"
                              onClick={() => setViewPhotosRoom(r)}
                            >
                              <RoomThumb url={cover.url} />
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="rounded-lg px-2 py-1 text-xs text-[var(--text-muted)] underline-offset-2 hover:underline"
                              onClick={() => openEditRoom(r)}
                            >
                              Add photo
                            </button>
                          )}
                        </td>
                        <td className="py-3">{r.unitType}</td>
                        <td className="py-3">
                          {r.usage === 'guest' ? 'Guest stay rates' : formatCurrency(r.monthlyRent)}
                        </td>
                        <td className="py-3">
                          <Badge status={r.status}>{r.status}</Badge>
                        </td>
                        <td className="py-3 text-[var(--text)]">
                          {UNIT_USAGES.find((u) => u.value === r.usage)?.label || r.usage || '—'}
                        </td>
                        <td className="py-3">
                          <div className="flex flex-wrap gap-2">
                            <Link
                              to={`/units/${r.id}`}
                              className="inline-flex h-9 items-center justify-center rounded-xl bg-brand-500 px-3 text-xs font-semibold !text-white shadow-sm shadow-brand-500/30 transition hover:bg-brand-600 dark:bg-brand-500 dark:!text-white dark:hover:bg-brand-400"
                            >
                              Open profile
                            </Link>
                            <Button variant="secondary" className="h-9 px-3 text-xs" onClick={() => openEditRoom(r)}>
                              Edit
                            </Button>
                            {(r.images || []).length ? (
                              <Button variant="secondary" className="h-9 px-3 text-xs" onClick={() => setViewPhotosRoom(r)}>
                                View photos
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </Fragment>
              ))}
            </tbody>
          </table>
          {floorRooms.length === 0 ? (
            <p className="py-6 text-sm text-[var(--text-muted)]">No units on this floor yet.</p>
          ) : null}
        </div>
      </Card>

      <Modal
        open={buildingOpen}
        onClose={() => setBuildingOpen(false)}
        title="Edit Building"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" className="h-12 px-5" onClick={() => setBuildingOpen(false)}>
              Cancel
            </Button>
            <Button className="h-12 px-5" onClick={saveBuilding}>
              Save Changes
            </Button>
          </div>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Name" value={buildingForm.name} onChange={(e) => setBuildingForm({ ...buildingForm, name: e.target.value })} />
          <Input label="Code" value={buildingForm.code} onChange={(e) => setBuildingForm({ ...buildingForm, code: e.target.value })} />
          <Input label="Address" className="sm:col-span-2" value={buildingForm.address} onChange={(e) => setBuildingForm({ ...buildingForm, address: e.target.value })} />
          <Input label="Floors count" type="number" value={buildingForm.floorsCount} onChange={(e) => setBuildingForm({ ...buildingForm, floorsCount: e.target.value })} />
          <Input label="Notes" value={buildingForm.notes} onChange={(e) => setBuildingForm({ ...buildingForm, notes: e.target.value })} />
        </div>
      </Modal>

      <Modal
        open={floorOpen}
        onClose={() => {
          setFloorOpen(false);
          setEditingFloorId(null);
        }}
        title={editingFloorId ? 'Manage Floor' : 'Add Floor'}
        footer={
          <div className="flex justify-between gap-2">
            {editingFloorId ? (
              <Button
                variant="danger"
                onClick={() => {
                  const floor = floors.find((f) => f.id === editingFloorId);
                  if (!floor) return;
                  setFloorOpen(false);
                  setEditingFloorId(null);
                  askDeleteFloor(floor);
                }}
              >
                <MdDeleteOutline className="h-4 w-4" />
                Delete Floor
              </Button>
            ) : (
              <div />
            )}
            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="h-12 px-5"
                onClick={() => {
                  setFloorOpen(false);
                  setEditingFloorId(null);
                }}
              >
                Cancel
              </Button>
              <Button className="h-12 px-5" onClick={addFloor}>
                {editingFloorId ? 'Save Changes' : 'Save Floor'}
              </Button>
            </div>
          </div>
        }
      >
        {editingFloorId ? (
          <p className="mb-4 text-sm text-[var(--text-muted)]">
            Update this floor’s details, or delete it from here.
          </p>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Name"
            value={floorForm.name}
            onChange={(e) => setFloorForm({ ...floorForm, name: e.target.value })}
            placeholder="7TH FLOOR"
          />
          <Input
            label="Level (sort order)"
            type="number"
            value={floorForm.level}
            onChange={(e) => setFloorForm({ ...floorForm, level: e.target.value })}
            hint="Basement can be -1. Each level must be unique."
          />
        </div>
      </Modal>

      <Modal
        open={roomOpen}
        size="xl"
        onClose={() => {
          setRoomOpen(false);
          setEditingRoomId(null);
          setPendingImages([]);
        }}
        title={
          editingRoomId
            ? `Edit unit ${roomForm.roomNumber || ''}`.trim()
            : selectedFloor
              ? `Add a unit on ${selectedFloor.name}`
              : 'Add a unit'
        }
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" className="h-12 px-5" onClick={() => {
              setRoomOpen(false);
              setEditingRoomId(null);
              setPendingImages([]);
            }}>
              Cancel
            </Button>
            <Button className="h-12 px-6" onClick={addRoom}>
              {editingRoomId ? 'Save changes' : 'Save this unit'}
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
          <FormSection
            step="1"
            title="What kind of unit is this?"
            description="Pick how this space will be used. Guest stays get their own nightly, weekly, and monthly prices."
          >
            <div className="mb-4 max-w-xs">
              <Input
                label="Unit number"
                value={roomForm.roomNumber}
                onChange={(e) => setRoomForm({ ...roomForm, roomNumber: e.target.value })}
                placeholder="201"
                hint="The label on the door or in your listings."
              />
            </div>
            {editingRoomId ? (
              <p className="inline-flex rounded-full bg-[var(--surface)] px-3 py-1.5 text-sm font-medium text-[var(--text)] ring-1 ring-[var(--border)]">
                {UNIT_USAGES.find((u) => u.value === roomForm.usage)?.label || roomForm.usage}
              </p>
            ) : (
              <UsageChoiceCards
                value={roomForm.usage}
                shopOnly={roomForm.unitType === 'Commercial Shop'}
                onChange={(usage) =>
                  setRoomForm({
                    ...roomForm,
                    usage,
                    areaSqm: '',
                    roomsCount: '',
                    bathroomsCount: '',
                    dailyRate: '',
                    weeklyRent: '',
                    monthlyRent: '',
                  })
                }
              />
            )}
          </FormSection>

          <FormSection
            step="2"
            title="Size and layout"
            description="Bedroom count for homes, or floor area for shops."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Layout type"
                value={roomForm.unitType}
                onChange={(e) => {
                  const unitType = e.target.value;
                  setRoomForm({
                    ...roomForm,
                    unitType,
                    usage: usageAfterUnitTypeChange(unitType, roomForm.usage),
                    areaSqm: '',
                    roomsCount: '',
                    bathroomsCount: '',
                  });
                }}
              >
                {UNIT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>

              {roomForm.usage === 'shop' || roomForm.usage === 'office' ? (
                <Input
                  label="Floor area (m²)"
                  type="number"
                  min={0}
                  step="0.01"
                  value={roomForm.areaSqm}
                  onChange={(e) => setRoomForm({ ...roomForm, areaSqm: e.target.value })}
                  placeholder="45"
                  hint="Unit size in square metres."
                />
              ) : null}

              {roomForm.usage === 'apartment' ? (
                <>
                  <Input
                    label="Bedrooms"
                    type="number"
                    min={1}
                    value={roomForm.roomsCount}
                    onChange={(e) => setRoomForm({ ...roomForm, roomsCount: e.target.value })}
                    placeholder="3"
                  />
                  <Input
                    label="Bathrooms"
                    type="number"
                    min={1}
                    value={roomForm.bathroomsCount}
                    onChange={(e) => setRoomForm({ ...roomForm, bathroomsCount: e.target.value })}
                    placeholder="2"
                  />
                </>
              ) : null}
            </div>
          </FormSection>

          <FormSection
            step="3"
            title={roomForm.usage === 'guest' ? 'Stay prices' : 'Rent and pricing'}
            description={
              roomForm.usage === 'guest'
                ? 'Guests can book by the night, week, or month — each price can be different.'
                : roomForm.usage === 'shop' || roomForm.usage === 'office'
                  ? 'Monthly rent for tenants, or an optional sale price if you sell the unit.'
                  : 'What the tenant pays each month.'
            }
          >
            {roomForm.usage === 'guest' ? (
              <div className="space-y-4">
                <GuestPricingFields form={roomForm} onChange={setRoomForm} />
                <Input
                  label="Standing discount (optional)"
                  type="number"
                  min={0}
                  value={roomForm.discount}
                  onChange={(e) => setRoomForm({ ...roomForm, discount: e.target.value })}
                  hint="Taken off the booking total when you apply a discount."
                />
              </div>
            ) : (
              <div className="space-y-4">
                <LeasePricingFields form={roomForm} onChange={setRoomForm} />
                {roomForm.usage === 'shop' || roomForm.usage === 'office' ? (
                  <Input
                    label="Sale price (optional)"
                    type="number"
                    min={0}
                    value={roomForm.salePrice}
                    onChange={(e) => setRoomForm({ ...roomForm, salePrice: e.target.value })}
                    hint="Only if this unit is for sale, not just rent."
                  />
                ) : null}
                <Input
                  label="Standing discount (optional)"
                  type="number"
                  min={0}
                  value={roomForm.discount}
                  onChange={(e) => setRoomForm({ ...roomForm, discount: e.target.value })}
                  hint="Amount taken off the rent each month, if any."
                />
              </div>
            )}
          </FormSection>

          <FormSection
            step="4"
            title="Availability and photos"
            description="Is the unit ready to show? Add pictures so people know what they are booking."
          >
            <div className="mb-4 max-w-xs">
              <Select
                label="Current status"
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
            <UnitImageGallery
              unitId={editingRoomId || undefined}
              images={editingRoomId ? (building?.units?.find((u) => u.id === editingRoomId)?.images || []) : []}
              pendingFiles={pendingImages}
              onPendingChange={setPendingImages}
              onChange={load}
            />
          </FormSection>
        </div>
      </Modal>

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
            images={viewPhotosRoom.images || building?.units?.find((u) => u.id === viewPhotosRoom.id)?.images || []}
            readOnly
          />
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={confirm?.onConfirm}
        title={confirm?.title}
        message={confirm?.message}
        confirmLabel={confirm?.confirmLabel || 'Confirm'}
        danger
      />
    </div>
  );
}
