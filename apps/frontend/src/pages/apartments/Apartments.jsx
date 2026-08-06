import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import PaymentCalendar from '../../components/rentals/PaymentCalendar.jsx';
import { PAYMENT_METHODS, PAYMENT_STATUSES } from '../../utils/constants.js';
import { formatCurrency, formatDate, cn } from '../../utils/format.js';
import { rentalApi } from '../../services/rentalApi.js';

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

export default function Apartments() {
  const [tab, setTab] = useState('tenants');
  const [buildings, setBuildings] = useState([]);
  const [floors, setFloors] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [allRooms, setAllRooms] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [buildingId, setBuildingId] = useState('');
  const [floorId, setFloorId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [form, setForm] = useState(emptyForm);

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

  const buildingFloors = useMemo(
    () => floors.filter((f) => f.buildingId === buildingId),
    [floors, buildingId],
  );
  const apartments = useMemo(
    () =>
      rooms.filter(
        (r) =>
          r.buildingId === buildingId &&
          (!floorId || r.floorId === floorId) &&
          r.status === 'Available',
      ),
    [rooms, buildingId, floorId],
  );

  const floorRoomsSummary = useMemo(() => {
    if (!buildingId || !floorId) return '';
    const inFloor = allRooms.filter((r) => r.buildingId === buildingId && r.floorId === floorId);
    if (inFloor.length === 0) return '';
    return inFloor
      .map((r) => `${r.roomNumber} (${r.usage}, ${r.status})`)
      .join(', ');
  }, [allRooms, buildingId, floorId]);
  const selectedRoom = rooms.find((r) => r.id === roomId);

  const onRoom = (id) => {
    setRoomId(id);
    const r = rooms.find((x) => x.id === id);
    if (r) setForm((f) => ({ ...f, monthlyRent: r.monthlyRent, discount: r.discount || 0 }));
  };

  const register = async () => {
    if (!selectedRoom || !form.fullName.trim() || !form.phone.trim() || !form.idNumber.trim() || !form.leaseStart) {
      toast.error('Fill tenant, apartment, ID, and lease start');
      return;
    }
    try {
      await rentalApi.createTenant({
        ...form,
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        idNumber: form.idNumber.trim(),
        roomId: selectedRoom.id,
        monthlyRent: Number(form.monthlyRent) || selectedRoom.monthlyRent,
        discount: Number(form.discount) || 0,
      });
      toast.success('Tenant registered');
      setTab('tenants');
      setBuildingId('');
      setFloorId('');
      setRoomId('');
      setForm(emptyForm);
      await load();
    } catch (err) {
      toast.error(err.message || 'Could not register tenant');
    }
  };

  const openMonth = (tenant, { month, label, payment }) => {
    setModal({
      tenant,
      month,
      label,
      status: payment.status || 'Unpaid',
      amountDue: payment.amountDue || Math.max(0, tenant.monthlyRent - (tenant.discount || 0)),
      amountPaid: payment.amountPaid || 0,
      method: payment.method || 'Cash',
      paymentDate: payment.paymentDate || new Date().toISOString().slice(0, 10),
      paymentId: payment.id,
    });
  };

  const savePayment = async () => {
    if (!modal) return;
    const amountPaid = Number(modal.amountPaid) || 0;
    const amountDue = Number(modal.amountDue) || 0;
    const status =
      amountPaid <= 0 ? 'Unpaid' : amountPaid >= amountDue ? 'Paid' : 'Partial';
    try {
      if (modal.paymentId) {
        await rentalApi.updatePayment(modal.paymentId, {
          amountPaid,
          amountDue,
          status,
          method: status === 'Unpaid' ? null : modal.method,
          paymentDate: status === 'Unpaid' ? null : modal.paymentDate,
        });
      } else {
        await rentalApi.createPayment({
          tenantId: modal.tenant.id,
          month: modal.month,
          amountDue,
          amountPaid,
          status,
          method: status === 'Unpaid' ? null : modal.method,
          paymentDate: status === 'Unpaid' ? null : modal.paymentDate,
        });
      }
      setModal(null);
      toast.success('Payment updated');
      await load();
    } catch (err) {
      toast.error(err.message || 'Could not save payment');
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

      <div className="mb-6 flex flex-wrap gap-2">
        {[
          { id: 'tenants', label: 'Current Tenants' },
          { id: 'register', label: 'Register Tenant' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              'h-12 rounded-xl px-5 text-base font-medium transition',
              tab === t.id
                ? 'bg-brand-700 text-white dark:bg-brand-400 dark:text-ink-950'
                : 'bg-[var(--surface)] text-[var(--text-muted)] ring-1 ring-[var(--border)]',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'register' ? (
        <Card title="Register Tenant">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
              {buildings.map((b) => (
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
              label="Apartment (Available)"
              value={roomId}
              disabled={!buildingId}
              onChange={(e) => onRoom(e.target.value)}
            >
              <option value="">Select</option>
              {apartments.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.roomNumber} · {formatCurrency(r.monthlyRent)}
                </option>
              ))}
            </Select>

            {buildingId && floorId && apartments.length === 0 ? (
              <p className="col-span-1 mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
                No <strong>Available Apartment</strong> rooms found on this floor. Current rooms:
                {floorRoomsSummary ? ` ${floorRoomsSummary}` : ' none'}. Change room <strong>usage</strong> to
                Apartment and make sure <strong>status</strong> is Available in Setup.
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
          <Button className="mt-6 h-12 px-8 text-base" onClick={register}>
            Save Tenant
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {tenants.length === 0 ? (
            <Card>
              <p className="text-sm text-[var(--text-muted)]">No apartment tenants yet.</p>
            </Card>
          ) : (
            tenants.map((t) => (
              <Card
                key={t.id}
                title={`${t.fullName} · ${t.roomNumber}`}
                action={<Badge status={t.status}>{t.status}</Badge>}
              >
                <p className="mb-4 text-sm text-[var(--text-muted)]">
                  {t.building} · {t.phone} · Rent {formatCurrency(t.monthlyRent)} · Since{' '}
                  {formatDate(t.leaseStart)}
                </p>
                <p className="mb-2 text-sm font-medium text-[var(--text)]">
                  Payment calendar (12 months)
                </p>
                <PaymentCalendar
                  payments={payments}
                  tenantId={t.id}
                  amountDue={Math.max(0, t.monthlyRent - (t.discount || 0))}
                  onMonthClick={(payload) => openMonth(t, payload)}
                />
              </Card>
            ))
          )}
        </div>
      )}

      <Modal
        open={Boolean(modal)}
        onClose={() => setModal(null)}
        title={modal ? `Rent · ${modal.label}` : 'Payment'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" className="h-12 px-5" onClick={() => setModal(null)}>
              Cancel
            </Button>
            <Button className="h-12 px-5 text-base" onClick={savePayment}>
              Save Payment
            </Button>
          </div>
        }
      >
        {modal ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Status"
              value={modal.status}
              onChange={(e) => setModal({ ...modal, status: e.target.value })}
            >
              {PAYMENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
            <Input
              label="Amount due"
              type="number"
              value={modal.amountDue}
              onChange={(e) => setModal({ ...modal, amountDue: e.target.value })}
            />
            <Input
              label="Amount paid"
              type="number"
              value={modal.amountPaid}
              onChange={(e) => setModal({ ...modal, amountPaid: e.target.value })}
            />
            <Select
              label="Method"
              value={modal.method || 'Cash'}
              onChange={(e) => setModal({ ...modal, method: e.target.value })}
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
            <Input
              label="Payment date"
              type="date"
              value={modal.paymentDate || ''}
              onChange={(e) => setModal({ ...modal, paymentDate: e.target.value })}
            />
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
