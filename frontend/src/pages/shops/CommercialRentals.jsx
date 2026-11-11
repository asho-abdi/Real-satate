import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useOutletContext } from 'react-router-dom';
import { MdWarning } from 'react-icons/md';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import PaymentCalendar from '../../components/rentals/PaymentCalendar.jsx';
import { formatCurrency, formatDate, cn } from '../../utils/format.js';
import { rentalApi, resolveIdentityAttachment } from '../../services/rentalApi.js';
import IdentityDocumentField from '../../components/ui/IdentityDocumentField.jsx';
import PaymentMethodFields from '../../components/payments/PaymentMethodFields.jsx';
import StatementModal from '../../components/finance/StatementModal.jsx';

const emptyForm = {
  dealType: 'RENTAL',
  businessName: '',
  contactName: '',
  phone: '',
  idNumber: '',
  monthlyRent: '',
  discount: 0,
  leaseStart: '',
  salePrice: '',
  saleDate: '',
  amountPaid: '',
  monthlyMaintenance: '',
};

const today = () => new Date().toISOString().slice(0, 10);

function typeLabel(commercialType) {
  return String(commercialType || '').toUpperCase() === 'OFFICE' ? 'Office' : 'Shop';
}

function moduleCopy(filterType) {
  const t = String(filterType || 'ALL').toUpperCase();
  if (t === 'OFFICE') {
    return {
      filter: 'OFFICE',
      kind: 'Office',
      kindLower: 'office',
      plural: 'Offices',
      title: 'Commercial Spaces',
      subtitle: 'Offices — rentals, sales, payments, and statements.',
      unitLabel: 'Available office',
      nameLabel: 'Office / business name',
      registerTitle: 'Register office',
      saveRental: 'Save Office',
      emptyActive: 'No active office rentals match your filters.',
      emptyPast: 'No past office rentals.',
      emptySold: 'No sold offices yet. Use Register → Sold to record a sale.',
      dealTypes: [
        { label: 'Sold office', value: 'SALE' },
        { label: 'Rental office', value: 'RENTAL' },
      ],
    };
  }
  if (t === 'SHOP') {
    return {
      filter: 'SHOP',
      kind: 'Shop',
      kindLower: 'shop',
      plural: 'Shops',
      title: 'Commercial Spaces',
      subtitle: 'Shops — rentals, sales, payments, and statements.',
      unitLabel: 'Available shop',
      nameLabel: 'Shop / business name',
      registerTitle: 'Register shop',
      saveRental: 'Save Shop',
      emptyActive: 'No active shop rentals match your filters.',
      emptyPast: 'No past shop rentals.',
      emptySold: 'No sold shops yet. Use Register → Sold to record a sale.',
      dealTypes: [
        { label: 'Sold shop', value: 'SALE' },
        { label: 'Rental shop', value: 'RENTAL' },
      ],
    };
  }
  return {
    filter: 'ALL',
    kind: 'Commercial space',
    kindLower: 'commercial space',
    plural: 'Commercial spaces',
    title: 'Commercial Spaces',
    subtitle: 'Unified shops and offices — rentals, sales, payments, and statements.',
    unitLabel: 'Available unit',
    nameLabel: 'Business / tenant name',
    registerTitle: 'Register commercial space',
    saveRental: 'Save',
    emptyActive: 'No active commercial rentals match your filters.',
    emptyPast: 'No past commercial rentals.',
    emptySold: 'No sold commercial spaces yet. Use Register → Sold to record a sale.',
    dealTypes: [
      { label: 'Sold', value: 'SALE' },
      { label: 'Rental', value: 'RENTAL' },
    ],
  };
}

/**
 * Unified Commercial Spaces management (Shop + Office).
 * Filter via commercialTypeFilter: ALL | SHOP | OFFICE.
 */
export default function CommercialRentals({ initialFilter = 'ALL' }) {
  const { globalSearch = '' } = useOutletContext() || {};
  const [typeFilter, setTypeFilter] = useState(
    ['SHOP', 'OFFICE', 'ALL'].includes(String(initialFilter).toUpperCase())
      ? String(initialFilter).toUpperCase()
      : 'ALL',
  );
  const copy = useMemo(() => moduleCopy(typeFilter), [typeFilter]);

  // data
  const [buildings, setBuildings] = useState([]);
  const [floors, setFloors] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [sales, setSales] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  // tabs
  const [tab, setTab] = useState('tenants');

  // registration form state
  const [regType, setRegType] = useState('SHOP'); // commercialType for create
  const [regBuildingId, setRegBuildingId] = useState('');
  const [regFloorId, setRegFloorId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [identityFile, setIdentityFile] = useState(null);
  const [statementParty, setStatementParty] = useState(null);

  // filter state (business list)
  const [filterBuildingId, setFilterBuildingId] = useState('');
  const [filterFloorId, setFilterFloorId] = useState('');
  const [search, setSearch] = useState('');

  // terminate modal
  const [termModal, setTermModal] = useState(null); // { biz }
  const [termForm, setTermForm] = useState({ leaseEnd: today(), notes: '' });
  const [terminating, setTerminating] = useState(false);

  // edit modal
  const [editModal, setEditModal] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [editIdentityFile, setEditIdentityFile] = useState(null);
  const [clearIdentity, setClearIdentity] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const listParams =
        typeFilter === 'ALL'
          ? { commercialType: 'ALL' }
          : { commercialType: typeFilter, usage: typeFilter };
      const [b, f, units, biz, p, sold] = await Promise.all([
        rentalApi.listBuildings(),
        rentalApi.listFloors(),
        rentalApi.listUnits(
          typeFilter === 'ALL' ? { usage: 'SHOP,OFFICE' } : { usage: typeFilter },
        ),
        rentalApi.listBusinesses(listParams),
        rentalApi.listPayments(),
        rentalApi.listShopSales(listParams),
      ]);
      setBuildings(b);
      setFloors(f);
      setRooms(units || []);
      setBusinesses(biz || []);
      const bizIds = new Set((biz || []).map((x) => x.id));
      setPayments(
        (p || []).filter(
          (x) =>
            x.tenantType === 'shop' ||
            x.tenantType === 'office' ||
            (x.businessId && bizIds.has(x.businessId)),
        ),
      );
      setSales(sold || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load commercial spaces');
    } finally {
      setLoading(false);
    }
  }, [typeFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (String(globalSearch || '').trim()) setTab('tenants');
  }, [globalSearch]);

  // ── filter helpers ──────────────────────────────────────────────
  const filterFloors = useMemo(
    () => (filterBuildingId ? floors.filter((f) => f.buildingId === filterBuildingId) : floors),
    [floors, filterBuildingId],
  );

  const soldUnitIds = useMemo(
    () => new Set((sales || []).map((s) => s.unitId).filter(Boolean)),
    [sales],
  );

  const activeBusinesses = useMemo(
    () =>
      businesses.filter(
        (b) => b.status === 'Active' && !soldUnitIds.has(b.unitId || b.roomId),
      ),
    [businesses, soldUnitIds],
  );
  const pastBusinesses = useMemo(
    () => businesses.filter((b) => b.status !== 'Active'),
    [businesses],
  );

  const displayedBusinesses = useMemo(() => {
    const base = tab === 'past' ? pastBusinesses : activeBusinesses;
    const globalQ = String(globalSearch || '').trim().toLowerCase();
    const localQ = search.trim().toLowerCase();

    return base.filter((b) => {
      if (filterBuildingId && b.buildingId !== filterBuildingId) return false;
      if (filterFloorId && b.floorId !== filterFloorId) return false;
      const q = globalQ || localQ;
      if (!q) return true;
      return [b.businessName, b.contactName, b.phone, b.roomNumber, b.building, b.floor, b.idNumber]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [
    activeBusinesses,
    pastBusinesses,
    tab,
    globalSearch,
    search,
    filterBuildingId,
    filterFloorId,
  ]);

  // ── registration helpers ─────────────────────────────────────────
  const regFloors = useMemo(
    () => floors.filter((f) => f.buildingId === regBuildingId),
    [floors, regBuildingId],
  );
  const availableUnits = useMemo(
    () =>
      rooms.filter(
        (r) =>
          r.buildingId === regBuildingId &&
          (!regFloorId || r.floorId === regFloorId) &&
          r.status === 'Available' &&
          String(r.commercialType || r.usageRaw || r.usage || '').toUpperCase() ===
            String(regType).toUpperCase(),
      ),
    [rooms, regBuildingId, regFloorId, regType],
  );
  const selectedRoom = rooms.find((r) => r.id === roomId);

  const onRoom = (id) => {
    setRoomId(id);
    const r = rooms.find((x) => x.id === id);
    if (r) setForm((f) => ({ ...f, monthlyRent: r.monthlyRent, discount: r.discount || 0 }));
  };

  const register = async () => {
    const expectedUsage = String(regType).toUpperCase() === 'OFFICE' ? 'OFFICE' : 'SHOP';
    if (!selectedRoom) {
      toast.error(`Select an available ${typeLabel(expectedUsage).toLowerCase()}`);
      return;
    }
    const unitUsage = String(
      selectedRoom.commercialType || selectedRoom.usageRaw || selectedRoom.usage || '',
    ).toUpperCase();
    if (unitUsage !== expectedUsage) {
      toast.error(`Selected unit must be a ${typeLabel(expectedUsage).toLowerCase()}`);
      return;
    }

    if (form.dealType === 'SALE') {
      if (!form.businessName.trim() || !form.phone.trim() || !form.salePrice || !form.saleDate) {
        toast.error('Buyer name, phone, sale price, and sale date are required');
        return;
      }
      try {
        const identity = await resolveIdentityAttachment(identityFile);
        await rentalApi.createShopSale({
          unitId: selectedRoom.id,
          expectedUsage,
          commercialType: expectedUsage,
          buyerName: form.businessName.trim(),
          contactName: form.contactName.trim() || null,
          phone: form.phone.trim(),
          idNumber: form.idNumber.trim() || null,
          salePrice: Number(form.salePrice),
          saleDate: form.saleDate,
          amountPaid: Number(form.amountPaid) || 0,
          monthlyMaintenance: Number(form.monthlyMaintenance) || 0,
          ...identity,
        });
        toast.success(`${typeLabel(expectedUsage)} sale recorded`);
        setTab('sold');
        setRegBuildingId('');
        setRegFloorId('');
        setRoomId('');
        setForm(emptyForm);
        setIdentityFile(null);
        await load();
      } catch (err) {
        toast.error(err.message || 'Could not record sale');
      }
      return;
    }

    if (
      !form.businessName.trim() ||
      !form.contactName.trim() ||
      !form.phone.trim() ||
      !form.leaseStart
    ) {
      toast.error('Fill business name, contact, phone, and lease start');
      return;
    }
    try {
      const identity = await resolveIdentityAttachment(identityFile);
      await rentalApi.createBusiness({
        ...form,
        businessName: form.businessName.trim(),
        contactName: form.contactName.trim(),
        phone: form.phone.trim(),
        idNumber: form.idNumber.trim(),
        roomId: selectedRoom.id,
        expectedUsage,
        commercialType: expectedUsage,
        monthlyRent: Number(form.monthlyRent) || selectedRoom.monthlyRent,
        discount: Number(form.discount) || 0,
        ...identity,
      });
      toast.success(`${typeLabel(expectedUsage)} rental registered`);
      setTab('tenants');
      setRegBuildingId('');
      setRegFloorId('');
      setRoomId('');
      setForm(emptyForm);
      setIdentityFile(null);
      await load();
    } catch (err) {
      toast.error(err.message || 'Could not register commercial space');
    }
  };

  // ── termination helpers ──────────────────────────────────────────
  const openEdit = (biz) => {
    setEditModal({ biz });
    setEditForm({
      businessName: biz.businessName || '',
      contactName: biz.contactName || '',
      phone: biz.phone || '',
      idNumber: biz.idNumber || '',
      monthlyRent: String(biz.monthlyRent ?? ''),
      discount: biz.discount ?? 0,
      leaseStart: biz.leaseStart || '',
      identityDocument: biz.identityDocument || null,
      identityDocumentName: biz.identityDocumentName || null,
    });
    setEditIdentityFile(null);
    setClearIdentity(false);
  };

  const saveEdit = async () => {
    if (!editModal) return;
    setSavingEdit(true);
    try {
      const identity = await resolveIdentityAttachment(editIdentityFile, {
        clear: clearIdentity,
        identityDocument: editForm.identityDocument,
        identityDocumentName: editForm.identityDocumentName,
      });
      await rentalApi.updateBusiness(editModal.biz.id, {
        ...editForm,
        monthlyRent: Number(editForm.monthlyRent),
        discount: Number(editForm.discount) || 0,
        ...identity,
      });
      toast.success('Business updated');
      setEditModal(null);
      setEditIdentityFile(null);
      setClearIdentity(false);
      await load();
    } catch (err) {
      toast.error(err.message || 'Could not update business');
    } finally {
      setSavingEdit(false);
    }
  };

  const openTerminate = (biz) => {
    setTermModal({ biz });
    setTermForm({ leaseEnd: today(), notes: '' });
  };

  const confirmTerminate = async () => {
    if (!termModal) return;
    setTerminating(true);
    try {
      await rentalApi.terminateBusiness(termModal.biz.id, {
        leaseEnd: termForm.leaseEnd || today(),
        notes: termForm.notes || undefined,
      });
      toast.success(`Lease terminated for ${termModal.biz.businessName}`);
      setTermModal(null);
      await load();
    } catch (err) {
      toast.error(err.message || 'Could not terminate lease');
    } finally {
      setTerminating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title={copy.title} subtitle={copy.subtitle} />

      <div className="mb-4 flex flex-wrap gap-2">
        {[
          { id: 'ALL', label: 'All' },
          { id: 'SHOP', label: 'Shops' },
          { id: 'OFFICE', label: 'Offices' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTypeFilter(t.id)}
            className={cn(
              'h-10 rounded-xl px-4 text-sm font-semibold transition',
              typeFilter === t.id
                ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/30'
                : 'bg-[var(--surface)] text-[var(--text-muted)] ring-1 ring-[var(--border)]',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* tab strip */}
      <div className="mb-6 flex flex-wrap gap-2">
        {[
          { id: 'tenants', label: `Rentals (${activeBusinesses.length})` },
          { id: 'sold', label: `Purchased (${sales.length})` },
          { id: 'past', label: `Past rentals (${pastBusinesses.length})` },
          { id: 'register', label: 'Register' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
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

      {/* ── Register form ─────────────────────────────────────── */}
      {tab === 'register' ? (
        <Card title={copy.registerTitle}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Select
              label="Commercial type"
              value={regType}
              onChange={(e) => {
                setRegType(e.target.value);
                setRoomId('');
              }}
            >
              <option value="SHOP">Shop</option>
              <option value="OFFICE">Office</option>
            </Select>
            <Select
              label="Business model"
              value={form.dealType}
              onChange={(e) => setForm({ ...form, dealType: e.target.value })}
            >
              {copy.dealTypes.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </Select>
            <Select
              label="Building"
              value={regBuildingId}
              onChange={(e) => {
                setRegBuildingId(e.target.value);
                setRegFloorId('');
                setRoomId('');
              }}
            >
              <option value="">Select</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
            <Select
              label="Floor"
              value={regFloorId}
              disabled={!regBuildingId}
              onChange={(e) => {
                setRegFloorId(e.target.value);
                setRoomId('');
              }}
            >
              <option value="">Select</option>
              {regFloors.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </Select>
            <Select
              label={copy.unitLabel}
              value={roomId}
              disabled={!regBuildingId}
              onChange={(e) => onRoom(e.target.value)}
            >
              <option value="">Select</option>
              {availableUnits.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.roomNumber} · {formatCurrency(r.monthlyRent || r.salePrice || 0)}
                </option>
              ))}
            </Select>
            <Input
              label={form.dealType === 'SALE' ? 'Buyer / owner name' : copy.nameLabel}
              value={form.businessName}
              onChange={(e) => setForm({ ...form, businessName: e.target.value })}
            />
            <Input
              label="Tenant / contact name"
              value={form.contactName}
              onChange={(e) => setForm({ ...form, contactName: e.target.value })}
            />
            <Input
              label="Phone number"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <Input
              label="ID / license number"
              value={form.idNumber}
              onChange={(e) => setForm({ ...form, idNumber: e.target.value })}
            />
            <IdentityDocumentField
              className="sm:col-span-2"
              label="Identity / license document"
              file={identityFile}
              onFileChange={setIdentityFile}
              onClear={() => setIdentityFile(null)}
            />
            {form.dealType === 'SALE' ? (
              <>
                <Input
                  label="Sale price"
                  type="number"
                  value={form.salePrice}
                  onChange={(e) => setForm({ ...form, salePrice: e.target.value })}
                />
                <Input
                  label="Sale date"
                  type="date"
                  value={form.saleDate}
                  onChange={(e) => setForm({ ...form, saleDate: e.target.value })}
                />
                <Input
                  label="Amount paid"
                  type="number"
                  value={form.amountPaid}
                  onChange={(e) => setForm({ ...form, amountPaid: e.target.value })}
                />
                <Input
                  label="Monthly charge (owner)"
                  type="number"
                  value={form.monthlyMaintenance}
                  onChange={(e) => setForm({ ...form, monthlyMaintenance: e.target.value })}
                />
              </>
            ) : (
              <>
                <Input
                  label="Monthly rent"
                  type="number"
                  value={form.monthlyRent}
                  onChange={(e) => setForm({ ...form, monthlyRent: e.target.value })}
                />
                <Input
                  label="Discount"
                  type="number"
                  value={form.discount}
                  onChange={(e) => setForm({ ...form, discount: e.target.value })}
                />
                <Input
                  label="Lease start date"
                  type="date"
                  value={form.leaseStart}
                  onChange={(e) => setForm({ ...form, leaseStart: e.target.value })}
                />
              </>
            )}
          </div>
          <Button className="mt-6 px-8" onClick={register}>
            {form.dealType === 'SALE' ? 'Record Sale' : copy.saveRental}
          </Button>
        </Card>
      ) : tab === 'sold' ? (
        <SoldShopsPanel sales={sales} onRefresh={load} emptyMessage={copy.emptySold} kind={copy.kind} />
      ) : (
        <>
          {/* ── Filter bar ──────────────────────────────────────── */}
          <Card className="mb-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Input
                label="Search"
                placeholder={`${copy.nameLabel}, contact, phone, room…`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Select
                label="Building"
                value={filterBuildingId}
                onChange={(e) => {
                  setFilterBuildingId(e.target.value);
                  setFilterFloorId('');
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
                value={filterFloorId}
                onChange={(e) => setFilterFloorId(e.target.value)}
                disabled={filterFloors.length === 0}
              >
                <option value="">All Floors</option>
                {filterFloors.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </Select>
              <div className="flex items-end">
                {(search || filterBuildingId || filterFloorId) ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch('');
                      setFilterBuildingId('');
                      setFilterFloorId('');
                    }}
                    className="h-10 rounded-xl border border-[var(--border)] px-4 text-sm text-[var(--text-muted)] hover:bg-[var(--surface-2)]"
                  >
                    Clear filters
                  </button>
                ) : null}
              </div>
            </div>
          </Card>

          {/* ── Business cards ───────────────────────────────────── */}
          <div className="space-y-4">
            {displayedBusinesses.length === 0 ? (
              <Card>
                <p className="text-sm text-[var(--text-muted)]">
                  {tab === 'past' ? copy.emptyPast : copy.emptyActive}
                </p>
              </Card>
            ) : (
              displayedBusinesses.map((b) => (
                <Card
                  key={b.id}
                  title={`${b.businessName} · ${b.roomNumber}`}
                  action={
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge status={typeLabel(b.commercialType || b.usageRaw || b.usage)}>
                        {typeLabel(b.commercialType || b.usageRaw || b.usage)}
                      </Badge>
                      {b.unitId || b.roomId ? (
                        <Link
                          to={`/units/${b.unitId || b.roomId}`}
                          className="inline-flex h-10 items-center justify-center rounded-xl bg-brand-500 px-4 text-sm font-semibold text-white shadow-sm shadow-brand-500/30 transition hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/40 dark:bg-brand-500 dark:text-white dark:hover:bg-brand-400"
                        >
                          Open profile
                        </Link>
                      ) : null}
                      <Badge status={b.status}>{b.status}</Badge>
                      <button
                        type="button"
                        onClick={() => setStatementParty({ businessId: b.id })}
                        className="inline-flex h-10 items-center rounded-xl border border-[var(--border)] px-3 text-sm font-medium text-[var(--text-muted)] transition hover:bg-[var(--surface-2)]"
                      >
                        Statement
                      </button>
                      <button
                        type="button"
                        onClick={() => openEdit(b)}
                        className="inline-flex h-10 items-center rounded-xl border border-[var(--border)] px-3 text-sm font-medium text-[var(--text-muted)] transition hover:bg-[var(--surface-2)]"
                      >
                        Edit
                      </button>
                      {b.status === 'Active' ? (
                        <button
                          type="button"
                          onClick={() => openTerminate(b)}
                          className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-rose-200 px-3 text-sm font-medium text-rose-600 transition hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/30"
                        >
                          Terminate Lease
                        </button>
                      ) : null}
                    </div>
                  }
                >
                  <p className="mb-1 text-sm text-[var(--text-muted)]">
                    {typeLabel(b.commercialType || b.usageRaw || b.usage)} · {b.building}
                    {b.floor ? ` · ${b.floor}` : ''} · {b.contactName} · {b.phone} · Rent{' '}
                    {formatCurrency(b.monthlyRent)}
                    {b.discount ? ` (−${formatCurrency(b.discount)})` : ''} · Since{' '}
                    {formatDate(b.leaseStart)}
                    {b.leaseEnd ? ` · Ended ${formatDate(b.leaseEnd)}` : ''}
                  </p>
                  {b.identityDocument ? (
                    <div className="mb-2">
                      <IdentityDocumentField
                        label="ID document"
                        hint=""
                        readOnly
                        value={{
                          identityDocument: b.identityDocument,
                          identityDocumentName: b.identityDocumentName,
                        }}
                      />
                    </div>
                  ) : null}
                  {b.status === 'Active' ? (
                    <div className="mt-4">
                      <PaymentCalendar
                        payments={payments}
                        businessId={b.id}
                        amountDue={Math.max(0, b.monthlyRent - (b.discount || 0))}
                        leaseStart={b.leaseStart}
                        leaseEnd={b.leaseEnd}
                        tenantName={b.businessName || b.contactName}
                        unitNumber={b.roomNumber}
                        building={b.building}
                        floor={b.floor}
                        onPaymentSaved={load}
                      />
                    </div>
                  ) : null}
                </Card>
              ))
            )}
          </div>
        </>
      )}

      {/* ── Edit Business modal ─────────────────────────────────── */}
      <Modal
        open={Boolean(editModal)}
        onClose={() => !savingEdit && setEditModal(null)}
        title="Edit Business"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditModal(null)} disabled={savingEdit}>
              Cancel
            </Button>
            <Button onClick={saveEdit} disabled={savingEdit}>
              {savingEdit ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        }
      >
        {editModal ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Business name" value={editForm.businessName} onChange={(e) => setEditForm({ ...editForm, businessName: e.target.value })} />
            <Input label="Contact name" value={editForm.contactName} onChange={(e) => setEditForm({ ...editForm, contactName: e.target.value })} />
            <Input label="Phone" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
            <Input label="License / ID" value={editForm.idNumber} onChange={(e) => setEditForm({ ...editForm, idNumber: e.target.value })} />
            <IdentityDocumentField
              className="sm:col-span-2"
              label="Identity / license document"
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
            <Input label="Monthly rent" type="number" value={editForm.monthlyRent} onChange={(e) => setEditForm({ ...editForm, monthlyRent: e.target.value })} />
            <Input label="Discount" type="number" value={editForm.discount} onChange={(e) => setEditForm({ ...editForm, discount: e.target.value })} />
            <Input label="Lease start" type="date" value={editForm.leaseStart} onChange={(e) => setEditForm({ ...editForm, leaseStart: e.target.value })} />
          </div>
        ) : null}
      </Modal>

      {/* ── Terminate Lease modal ─────────────────────────────── */}
      <Modal
        open={Boolean(termModal)}
        onClose={() => !terminating && setTermModal(null)}
        title="Terminate Lease"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"

              onClick={() => setTermModal(null)}
              disabled={terminating}
            >
              Cancel
            </Button>
            <button
              type="button"
              disabled={terminating}
              onClick={confirmTerminate}
              className="h-10 rounded-lg bg-[var(--danger)] px-4 text-sm font-semibold text-white shadow-xs transition hover:brightness-95 disabled:opacity-60"
            >
              {terminating ? 'Terminating…' : 'Confirm Termination'}
            </button>
          </div>
        }
      >
        {termModal ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3 dark:border-rose-800 dark:bg-rose-950/30">
              <MdWarning className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />
              <p className="text-sm text-rose-800 dark:text-rose-200">
                This will mark <strong>{termModal.biz.businessName}</strong>'s lease as{' '}
                <strong>Ended</strong> and set room{' '}
                <strong>{termModal.biz.roomNumber}</strong> back to{' '}
                <strong>Available</strong>. This cannot be undone.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Termination date"
                type="date"
                value={termForm.leaseEnd}
                onChange={(e) => setTermForm({ ...termForm, leaseEnd: e.target.value })}
              />
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-[var(--text)]">
                  Reason / Notes (optional)
                </label>
                <textarea
                  value={termForm.notes}
                  onChange={(e) => setTermForm({ ...termForm, notes: e.target.value })}
                  rows={3}
                  placeholder="e.g. Business relocated, lease expired…"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-muted)] focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      <StatementModal
        open={Boolean(statementParty)}
        onClose={() => setStatementParty(null)}
        party={statementParty}
      />
    </div>
  );
}

function SoldShopsPanel({ sales, onRefresh, emptyMessage, kind = 'Shop' }) {
  const [payModal, setPayModal] = useState(null);
  const [maintModal, setMaintModal] = useState(null);
  const [payForm, setPayForm] = useState({
    amount: '',
    paymentDate: today(),
    method: 'CASH',
    reference: '',
    receivedByName: '',
    agentName: '',
    officeMpesaNumber: '',
    notes: '',
  });
  const [maintForm, setMaintForm] = useState({
    month: new Date().toISOString().slice(0, 7),
    amountDue: '',
    amountPaid: '',
    paymentDate: today(),
    method: 'CASH',
    reference: '',
    receivedByName: '',
    agentName: '',
    officeMpesaNumber: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const openSalePay = (sale) => {
    setPayModal(sale);
    setPayForm({
      amount: sale.balance > 0 ? String(sale.balance) : '',
      paymentDate: today(),
      method: 'CASH',
      reference: '',
      receivedByName: '',
      agentName: '',
      officeMpesaNumber: '',
      notes: '',
    });
  };

  const openMaint = (sale) => {
    setMaintModal(sale);
    setMaintForm({
      month: new Date().toISOString().slice(0, 7),
      amountDue: String(sale.monthlyMaintenance || 0),
      amountPaid: String(sale.monthlyMaintenance || 0),
      paymentDate: today(),
      method: 'CASH',
      reference: '',
      receivedByName: '',
      agentName: '',
      officeMpesaNumber: '',
      notes: '',
    });
  };

  const saveSalePayment = async () => {
    if (!payModal) return;
    const amount = Number(payForm.amount);
    if (!(amount > 0)) {
      toast.error('Enter a payment amount');
      return;
    }
    setSaving(true);
    try {
      await rentalApi.addShopSalePayment(payModal.id, {
        amount,
        paymentDate: payForm.paymentDate,
        paymentMethod: payForm.method,
        reference: payForm.reference || null,
        receivedByName: payForm.receivedByName || null,
        agentName: payForm.agentName || null,
        officeMpesaNumber: payForm.officeMpesaNumber || null,
        notes: payForm.notes || null,
      });
      toast.success('Sale payment recorded');
      setPayModal(null);
      await onRefresh();
    } catch (err) {
      toast.error(err.message || 'Could not record payment');
    } finally {
      setSaving(false);
    }
  };

  const saveMaintenance = async () => {
    if (!maintModal) return;
    const amountPaid = Number(maintForm.amountPaid);
    if (!(amountPaid > 0) || !maintForm.month) {
      toast.error('Month and amount paid are required');
      return;
    }
    setSaving(true);
    try {
      await rentalApi.recordShopMaintenance(maintModal.id, {
        month: maintForm.month,
        amountDue: Number(maintForm.amountDue) || Number(maintModal.monthlyMaintenance) || amountPaid,
        amountPaid,
        paymentDate: maintForm.paymentDate,
        paymentMethod: maintForm.method,
        reference: maintForm.reference || null,
        receivedByName: maintForm.receivedByName || null,
        agentName: maintForm.agentName || null,
        officeMpesaNumber: maintForm.officeMpesaNumber || null,
        notes: maintForm.notes || null,
      });
      toast.success('Monthly charge payment recorded');
      setMaintModal(null);
      await onRefresh();
    } catch (err) {
      toast.error(err.message || 'Could not record monthly charge');
    } finally {
      setSaving(false);
    }
  };

  if (!sales.length) {
    return (
      <Card>
        <p className="text-sm text-[var(--text-muted)]">
          {emptyMessage || `No sold ${String(kind).toLowerCase()}s yet.`}
        </p>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {sales.map((s) => {
          const unit = s.unit || {};
          const building = unit.building?.name || '—';
          const floor = unit.floor?.name || '—';
          const room = unit.unitNumber || unit.roomNumber || '—';
          return (
            <Card key={s.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold text-[var(--text)]">{s.buyerName}</h3>
                    <Badge status="Sold">Sold</Badge>
                    <Badge status={s.balance > 0 ? 'Partial' : 'Paid'}>
                      {s.balance > 0 ? 'Balance due' : 'Sale paid'}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    {building} · {floor} · Unit {room}
                    {s.phone ? ` · ${s.phone}` : ''}
                    {s.saleDate ? ` · Sold ${formatDate(s.saleDate)}` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {s.unit?.id ? (
                    <Link
                      to={`/units/${s.unit.id}`}
                      className="inline-flex h-10 items-center justify-center rounded-xl bg-brand-500 px-4 text-sm font-semibold text-white shadow-sm shadow-brand-500/30 transition hover:bg-brand-600 dark:bg-brand-500 dark:text-white dark:hover:bg-brand-400"
                    >
                      Open profile
                    </Link>
                  ) : null}
                  <Button variant="secondary" onClick={() => openSalePay(s)}>
                    Sale payment
                  </Button>
                  <Button onClick={() => openMaint(s)}>
                    Monthly charge
                  </Button>
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
                <div>
                  <p className="text-[var(--text-muted)]">Sale price</p>
                  <p className="font-medium">{formatCurrency(s.salePrice)}</p>
                </div>
                <div>
                  <p className="text-[var(--text-muted)]">Paid</p>
                  <p className="font-medium">{formatCurrency(s.amountPaid)}</p>
                </div>
                <div>
                  <p className="text-[var(--text-muted)]">Remaining</p>
                  <p className="font-medium">{formatCurrency(s.balance)}</p>
                </div>
                <div>
                  <p className="text-[var(--text-muted)]">Monthly charge</p>
                  <p className="font-medium">{formatCurrency(s.monthlyMaintenance || 0)}</p>
                </div>
              </div>
              {(s.salePayments?.length || s.ownerCharges?.length || s.maintenancePayments?.length) ? (
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  {s.salePayments?.length ? (
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Sale payments</p>
                      <ul className="space-y-1 text-sm">
                        {s.salePayments.map((p) => (
                          <li key={p.id} className="flex justify-between gap-2 border-b border-[var(--border)] py-1">
                            <span>{formatDate(p.paymentDate)} · {p.paymentMethod || '—'}</span>
                            <span className="font-medium">{formatCurrency(p.amount)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {s.ownerCharges?.length ? (
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Monthly charges</p>
                      <ul className="space-y-1 text-sm">
                        {s.ownerCharges.map((p) => (
                          <li key={p.id} className="flex justify-between gap-2 border-b border-[var(--border)] py-1">
                            <span>{p.month || '—'} · {p.status || '—'}</span>
                            <span className="font-medium">{formatCurrency(p.amountPaid)} / {formatCurrency(p.amountDue)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : s.maintenancePayments?.length ? (
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Legacy monthly history</p>
                      <ul className="space-y-1 text-sm">
                        {s.maintenancePayments.map((p) => (
                          <li key={p.id} className="flex justify-between gap-2 border-b border-[var(--border)] py-1">
                            <span>{p.month} · {p.status || '—'}</span>
                            <span className="font-medium">{formatCurrency(p.amountPaid)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </Card>
          );
        })}
      </div>

      <Modal
        open={Boolean(payModal)}
        onClose={() => !saving && setPayModal(null)}
        title="Record sale payment"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setPayModal(null)} disabled={saving}>Cancel</Button>
            <Button onClick={saveSalePayment} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </div>
        }
      >
        {payModal ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Amount" type="number" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} />
            <Input label="Date" type="date" value={payForm.paymentDate} onChange={(e) => setPayForm({ ...payForm, paymentDate: e.target.value })} />
            <div className="sm:col-span-2">
              <PaymentMethodFields
                value={payForm}
                onChange={(next) =>
                  setPayForm({
                    ...payForm,
                    method: next.method,
                    reference: next.reference,
                    receivedByName: next.receivedByName,
                    agentName: next.agentName,
                    officeMpesaNumber: next.officeMpesaNumber,
                  })
                }
              />
            </div>
            <Input
              className="sm:col-span-2"
              label="Notes"
              value={payForm.notes}
              onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
            />
          </div>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(maintModal)}
        onClose={() => !saving && setMaintModal(null)}
        title="Record monthly charge payment"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setMaintModal(null)} disabled={saving}>Cancel</Button>
            <Button onClick={saveMaintenance} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </div>
        }
      >
        {maintModal ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Month" type="month" value={maintForm.month} onChange={(e) => setMaintForm({ ...maintForm, month: e.target.value })} />
            <Input label="Amount due" type="number" value={maintForm.amountDue} onChange={(e) => setMaintForm({ ...maintForm, amountDue: e.target.value })} />
            <Input label="Amount paid" type="number" value={maintForm.amountPaid} onChange={(e) => setMaintForm({ ...maintForm, amountPaid: e.target.value })} />
            <Input label="Date" type="date" value={maintForm.paymentDate} onChange={(e) => setMaintForm({ ...maintForm, paymentDate: e.target.value })} />
            <div className="sm:col-span-2">
              <PaymentMethodFields
                value={maintForm}
                onChange={(next) =>
                  setMaintForm({
                    ...maintForm,
                    method: next.method,
                    reference: next.reference,
                    receivedByName: next.receivedByName,
                    agentName: next.agentName,
                    officeMpesaNumber: next.officeMpesaNumber,
                  })
                }
              />
            </div>
            <Input
              className="sm:col-span-2"
              label="Notes"
              value={maintForm.notes}
              onChange={(e) => setMaintForm({ ...maintForm, notes: e.target.value })}
            />
          </div>
        ) : null}
      </Modal>
    </>
  );
}
