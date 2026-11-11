import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useOutletContext, Link } from 'react-router-dom';
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
import StatementModal from '../../components/finance/StatementModal.jsx';
import { formatCurrency, formatDate, cn } from '../../utils/format.js';
import { rentalApi, resolveIdentityAttachment } from '../../services/rentalApi.js';
import IdentityDocumentField from '../../components/ui/IdentityDocumentField.jsx';

const emptyForm = {
  fullName: '',
  phone: '',
  idNumber: '',
  nationality: '',
  gender: '',
  emergencyContact: '',
  monthlyRent: '',
  discount: 0,
  leaseStart: '',
};

const today = () => new Date().toISOString().slice(0, 10);

export default function Apartments() {
  const { globalSearch = '' } = useOutletContext() || {};

  // data
  const [buildings, setBuildings] = useState([]);
  const [floors, setFloors] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [allRooms, setAllRooms] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  // tabs
  const [tab, setTab] = useState('tenants');

  // registration form state
  const [regBuildingId, setRegBuildingId] = useState('');
  const [regFloorId, setRegFloorId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [identityFile, setIdentityFile] = useState(null);

  // filter state (tenant list)
  const [filterBuildingId, setFilterBuildingId] = useState('');
  const [filterFloorId, setFilterFloorId] = useState('');
  const [search, setSearch] = useState('');

  // terminate modal
  const [termModal, setTermModal] = useState(null); // { tenant }
  const [termForm, setTermForm] = useState({ leaseEnd: today(), notes: '' });
  const [terminating, setTerminating] = useState(false);

  // edit modal
  const [editModal, setEditModal] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [editIdentityFile, setEditIdentityFile] = useState(null);
  const [clearIdentity, setClearIdentity] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [statementParty, setStatementParty] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [b, f, u, allU, t, p] = await Promise.all([
        rentalApi.listBuildings(),
        rentalApi.listFloors(),
        rentalApi.listUnits({ usage: 'APARTMENT' }),
        rentalApi.listUnits(),
        rentalApi.listTenants(),
        rentalApi.listPayments(),
      ]);
      setBuildings(b);
      setFloors(f);
      setRooms(u);
      setAllRooms(allU);
      setTenants(t);
      setPayments(p.filter((x) => x.tenantType === 'apartment'));
    } catch (err) {
      toast.error(err.message || 'Failed to load apartments');
    } finally {
      setLoading(false);
    }
  }, []);

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

  const activeTenants = useMemo(
    () => tenants.filter((t) => t.status === 'Active'),
    [tenants],
  );
  const pastTenants = useMemo(
    () => tenants.filter((t) => t.status !== 'Active'),
    [tenants],
  );

  const displayedTenants = useMemo(() => {
    const base = tab === 'past' ? pastTenants : activeTenants;
    const globalQ = String(globalSearch || '').trim().toLowerCase();
    const localQ = search.trim().toLowerCase();

    return base.filter((t) => {
      if (filterBuildingId && t.buildingId !== filterBuildingId) return false;
      if (filterFloorId && t.floorId !== filterFloorId) return false;
      const q = globalQ || localQ;
      if (!q) return true;
      return [t.fullName, t.phone, t.roomNumber, t.building, t.floor, t.idNumber]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [activeTenants, pastTenants, tab, globalSearch, search, filterBuildingId, filterFloorId]);

  // ── registration helpers ─────────────────────────────────────────
  const regFloors = useMemo(
    () => floors.filter((f) => f.buildingId === regBuildingId),
    [floors, regBuildingId],
  );
  const apartments = useMemo(
    () =>
      rooms.filter(
        (r) =>
          r.buildingId === regBuildingId &&
          (!regFloorId || r.floorId === regFloorId) &&
          r.status === 'Available',
      ),
    [rooms, regBuildingId, regFloorId],
  );
  const floorRoomsSummary = useMemo(() => {
    if (!regBuildingId || !regFloorId) return '';
    const inFloor = allRooms.filter(
      (r) => r.buildingId === regBuildingId && r.floorId === regFloorId,
    );
    return inFloor.map((r) => `${r.roomNumber} (${r.usage}, ${r.status})`).join(', ');
  }, [allRooms, regBuildingId, regFloorId]);
  const selectedRoom = rooms.find((r) => r.id === roomId);

  const onRoom = (id) => {
    setRoomId(id);
    const r = rooms.find((x) => x.id === id);
    if (r) setForm((f) => ({ ...f, monthlyRent: r.monthlyRent, discount: r.discount || 0 }));
  };

  const register = async () => {
    if (
      !selectedRoom ||
      !form.fullName.trim() ||
      !form.phone.trim() ||
      !form.idNumber.trim() ||
      !form.leaseStart
    ) {
      toast.error('Fill tenant, apartment, ID, and lease start');
      return;
    }
    try {
      const identity = await resolveIdentityAttachment(identityFile);
      await rentalApi.createTenant({
        ...form,
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        idNumber: form.idNumber.trim(),
        roomId: selectedRoom.id,
        monthlyRent: Number(form.monthlyRent) || selectedRoom.monthlyRent,
        discount: Number(form.discount) || 0,
        ...identity,
      });
      toast.success('Tenant registered');
      setTab('tenants');
      setRegBuildingId('');
      setRegFloorId('');
      setRoomId('');
      setForm(emptyForm);
      setIdentityFile(null);
      await load();
    } catch (err) {
      toast.error(err.message || 'Could not register tenant');
    }
  };

  // ── termination helpers ──────────────────────────────────────────
  const openEdit = (tenant) => {
    setEditModal({ tenant });
    setEditForm({
      fullName: tenant.fullName || '',
      phone: tenant.phone || '',
      idNumber: tenant.idNumber || '',
      nationality: tenant.nationality || '',
      gender: tenant.gender || '',
      emergencyContact: tenant.emergencyContact || '',
      monthlyRent: String(tenant.monthlyRent ?? ''),
      discount: tenant.discount ?? 0,
      leaseStart: tenant.leaseStart || '',
      identityDocument: tenant.identityDocument || null,
      identityDocumentName: tenant.identityDocumentName || null,
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
      await rentalApi.updateTenant(editModal.tenant.id, {
        ...editForm,
        monthlyRent: Number(editForm.monthlyRent),
        discount: Number(editForm.discount) || 0,
        ...identity,
      });
      toast.success('Tenant updated');
      setEditModal(null);
      setEditIdentityFile(null);
      setClearIdentity(false);
      await load();
    } catch (err) {
      toast.error(err.message || 'Could not update tenant');
    } finally {
      setSavingEdit(false);
    }
  };

  const openTerminate = (tenant) => {
    setTermModal({ tenant });
    setTermForm({ leaseEnd: today(), notes: '' });
  };

  const confirmTerminate = async () => {
    if (!termModal) return;
    setTerminating(true);
    try {
      await rentalApi.terminateTenant(termModal.tenant.id, {
        leaseEnd: termForm.leaseEnd || today(),
        notes: termForm.notes || undefined,
      });
      toast.success(`Lease terminated for ${termModal.tenant.fullName}`);
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
      <PageHeader title="Apartments" subtitle="Residential tenants and monthly rent calendar." />

      {/* tab strip */}
      <div className="mb-6 flex flex-wrap gap-2">
        {[
          { id: 'tenants', label: `Active Tenants (${activeTenants.length})` },
          { id: 'past', label: `Past Tenants (${pastTenants.length})` },
          { id: 'register', label: 'Register Tenant' },
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
        <Card title="Register Tenant">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
              label="Apartment (Available)"
              value={roomId}
              disabled={!regBuildingId}
              onChange={(e) => onRoom(e.target.value)}
            >
              <option value="">Select</option>
              {apartments.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.roomNumber} · {formatCurrency(r.monthlyRent)}
                </option>
              ))}
            </Select>
            {regBuildingId && regFloorId && apartments.length === 0 ? (
              <p className="col-span-full mt-1 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
                No available apartment rooms on this floor.
                {floorRoomsSummary ? ` Current rooms: ${floorRoomsSummary}` : ''}
              </p>
            ) : null}
            <Input
              label="Full name"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            />
            <Input
              label="Phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <Input
              label="ID number"
              value={form.idNumber}
              onChange={(e) => setForm({ ...form, idNumber: e.target.value })}
            />
            <IdentityDocumentField
              className="sm:col-span-2"
              file={identityFile}
              onFileChange={setIdentityFile}
              onClear={() => setIdentityFile(null)}
            />
            <Input
              label="Nationality"
              value={form.nationality}
              onChange={(e) => setForm({ ...form, nationality: e.target.value })}
            />
            <Select
              label="Gender"
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value })}
            >
              <option value="">Select</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </Select>
            <Input
              label="Emergency contact"
              value={form.emergencyContact}
              onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })}
            />
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
              label="Lease start"
              type="date"
              value={form.leaseStart}
              onChange={(e) => setForm({ ...form, leaseStart: e.target.value })}
            />
          </div>
          <Button className="mt-6 px-8" onClick={register}>
            Save Tenant
          </Button>
        </Card>
      ) : (
        <>
          {/* ── Filter bar ──────────────────────────────────────── */}
          <Card className="mb-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Input
                label="Search"
                placeholder="Name, phone, room…"
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

          {/* ── Tenant cards ─────────────────────────────────────── */}
          <div className="space-y-4">
            {displayedTenants.length === 0 ? (
              <Card>
                <p className="text-sm text-[var(--text-muted)]">
                  {tab === 'past' ? 'No past tenants.' : 'No active tenants match your filters.'}
                </p>
              </Card>
            ) : (
              displayedTenants.map((t) => (
                <Card
                  key={t.id}
                  title={`${t.fullName} · ${t.roomNumber}`}
                  action={
                    <div className="flex flex-wrap items-center gap-2">
                      {t.unitId || t.roomId ? (
                        <Link
                          to={`/units/${t.unitId || t.roomId}`}
                          className="inline-flex h-10 items-center justify-center rounded-xl bg-brand-500 px-4 text-sm font-semibold text-white shadow-sm shadow-brand-500/30 transition hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/40 dark:bg-brand-500 dark:text-white dark:hover:bg-brand-400"
                        >
                          Open profile
                        </Link>
                      ) : null}
                      <Badge status={t.status}>{t.status}</Badge>
                      <button
                        type="button"
                        onClick={() => setStatementParty({ tenantId: t.id })}
                        className="inline-flex h-10 items-center rounded-xl border border-[var(--border)] px-3 text-sm font-medium text-[var(--text)] transition hover:bg-[var(--surface-2)]"
                      >
                        Statement
                      </button>
                      <button
                        type="button"
                        onClick={() => openEdit(t)}
                        className="inline-flex h-10 items-center rounded-xl border border-[var(--border)] px-3 text-sm font-medium text-[var(--text-muted)] transition hover:bg-[var(--surface-2)]"
                      >
                        Edit
                      </button>
                      {t.status === 'Active' ? (
                        <button
                          type="button"
                          onClick={() => openTerminate(t)}
                          className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-rose-200 px-3 text-sm font-medium text-rose-600 transition hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/30"
                        >
                          Terminate Lease
                        </button>
                      ) : null}
                    </div>
                  }
                >
                  <p className="mb-1 text-sm text-[var(--text-muted)]">
                    {t.building}
                    {t.floor ? ` · ${t.floor}` : ''} · {t.phone} · Rent{' '}
                    {formatCurrency(t.monthlyRent)}
                    {t.discount ? ` (−${formatCurrency(t.discount)})` : ''} · Since{' '}
                    {formatDate(t.leaseStart)}
                    {t.leaseEnd ? ` · Ended ${formatDate(t.leaseEnd)}` : ''}
                  </p>
                  {t.identityDocument ? (
                    <div className="mb-2">
                      <IdentityDocumentField
                        label="ID document"
                        hint=""
                        readOnly
                        value={{
                          identityDocument: t.identityDocument,
                          identityDocumentName: t.identityDocumentName,
                        }}
                      />
                    </div>
                  ) : null}
                  {t.status === 'Active' ? (
                    <div className="mt-4">
                      <PaymentCalendar
                        payments={payments}
                        tenantId={t.id}
                        amountDue={Math.max(0, t.monthlyRent - (t.discount || 0))}
                        leaseStart={t.leaseStart}
                        leaseEnd={t.leaseEnd}
                        tenantName={t.fullName}
                        unitNumber={t.roomNumber}
                        building={t.building}
                        floor={t.floor}
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

      {/* ── Edit Tenant modal ─────────────────────────────────── */}
      <Modal
        open={Boolean(editModal)}
        onClose={() => !savingEdit && setEditModal(null)}
        title="Edit Tenant"
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
            <Input label="Full name" value={editForm.fullName} onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })} />
            <Input label="Phone" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
            <Input label="ID number" value={editForm.idNumber} onChange={(e) => setEditForm({ ...editForm, idNumber: e.target.value })} />
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
              className="h-10 rounded-xl bg-rose-600 px-6 text-base font-medium text-white transition hover:bg-rose-700 disabled:opacity-60"
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
                This will mark <strong>{termModal.tenant.fullName}</strong>'s lease as{' '}
                <strong>Ended</strong> and set room{' '}
                <strong>{termModal.tenant.roomNumber}</strong> back to{' '}
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
                  placeholder="e.g. Tenant relocated, lease expired…"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-muted)] focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      <StatementModal
        open={!!statementParty}
        onClose={() => setStatementParty(null)}
        party={statementParty}
      />
    </div>
  );
}
