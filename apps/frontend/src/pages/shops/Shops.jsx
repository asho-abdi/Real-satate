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
  businessName: '',
  contactName: '',
  phone: '',
  idNumber: '',
  monthlyRent: '',
  discount: 0,
  leaseStart: '',
};

export default function Shops() {
  const [tab, setTab] = useState('tenants');
  const [buildings, setBuildings] = useState([]);
  const [floors, setFloors] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [businesses, setBusinesses] = useState([]);
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
      const [b, f, u, biz, p] = await Promise.all([
        rentalApi.listBuildings(),
        rentalApi.listFloors(),
        rentalApi.listUnits({ usage: 'SHOP' }),
        rentalApi.listBusinesses(),
        rentalApi.listPayments(),
      ]);
      setBuildings(b);
      setFloors(f);
      setRooms(u);
      setBusinesses(biz);
      setPayments(p.filter((x) => x.tenantType === 'shop'));
    } catch (err) {
      toast.error(err.message || 'Failed to load shops');
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
  const shops = useMemo(
    () =>
      rooms.filter(
        (r) =>
          r.buildingId === buildingId &&
          (!floorId || r.floorId === floorId) &&
          r.status === 'Available',
      ),
    [rooms, buildingId, floorId],
  );
  const selectedRoom = rooms.find((r) => r.id === roomId);

  const onRoom = (id) => {
    setRoomId(id);
    const r = rooms.find((x) => x.id === id);
    if (r) setForm((f) => ({ ...f, monthlyRent: r.monthlyRent, discount: r.discount || 0 }));
  };

  const register = async () => {
    if (!selectedRoom || !form.businessName.trim() || !form.contactName.trim() || !form.phone.trim() || !form.leaseStart) {
      toast.error('Fill business, shop, phone, and lease start');
      return;
    }
    try {
      await rentalApi.createBusiness({
        ...form,
        businessName: form.businessName.trim(),
        contactName: form.contactName.trim(),
        phone: form.phone.trim(),
        idNumber: form.idNumber.trim(),
        roomId: selectedRoom.id,
        monthlyRent: Number(form.monthlyRent) || selectedRoom.monthlyRent,
        discount: Number(form.discount) || 0,
      });
      toast.success('Business registered');
      setTab('tenants');
      setBuildingId('');
      setFloorId('');
      setRoomId('');
      setForm(emptyForm);
      await load();
    } catch (err) {
      toast.error(err.message || 'Could not register business');
    }
  };

  const openMonth = (biz, { month, label, payment }) => {
    setModal({
      biz,
      month,
      label,
      status: payment.status || 'Unpaid',
      amountDue: payment.amountDue || Math.max(0, biz.monthlyRent - (biz.discount || 0)),
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
          businessId: modal.biz.id,
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
      <PageHeader title="Shops" subtitle="Commercial shops and monthly rent calendar." />

      <div className="mb-6 flex flex-wrap gap-2">
        {[
          { id: 'tenants', label: 'Current Businesses' },
          { id: 'register', label: 'Register Business' },
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
        <Card title="Register Business">
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
              label="Shop (Available)"
              value={roomId}
              disabled={!buildingId}
              onChange={(e) => onRoom(e.target.value)}
            >
              <option value="">Select</option>
              {shops.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.roomNumber} · {formatCurrency(r.monthlyRent)}
                </option>
              ))}
            </Select>
            <Input
              label="Business name"
              value={form.businessName}
              onChange={(e) => setForm({ ...form, businessName: e.target.value })}
            />
            <Input
              label="Contact name"
              value={form.contactName}
              onChange={(e) => setForm({ ...form, contactName: e.target.value })}
            />
            <Input
              label="Phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <Input
              label="ID / license"
              value={form.idNumber}
              onChange={(e) => setForm({ ...form, idNumber: e.target.value })}
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
            Save Business
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {businesses.length === 0 ? (
            <Card>
              <p className="text-sm text-[var(--text-muted)]">No shops registered yet.</p>
            </Card>
          ) : (
            businesses.map((b) => (
              <Card
                key={b.id}
                title={`${b.businessName} · ${b.roomNumber}`}
                action={<Badge status={b.status}>{b.status}</Badge>}
              >
                <p className="mb-4 text-sm text-[var(--text-muted)]">
                  {b.building} · {b.contactName} · {b.phone} · Rent{' '}
                  {formatCurrency(b.monthlyRent)}
                  {b.discount ? ` (−${formatCurrency(b.discount)})` : ''} · Since{' '}
                  {formatDate(b.leaseStart)}
                </p>
                <p className="mb-2 text-sm font-medium text-[var(--text)]">
                  Payment calendar (12 months)
                </p>
                <PaymentCalendar
                  payments={payments}
                  businessId={b.id}
                  amountDue={Math.max(0, b.monthlyRent - (b.discount || 0))}
                  onMonthClick={(payload) => openMonth(b, payload)}
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
