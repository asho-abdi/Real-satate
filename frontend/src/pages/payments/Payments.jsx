import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import toast from 'react-hot-toast';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Select from '../../components/ui/Select.jsx';
import Input from '../../components/ui/Input.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import PaymentMethodFields from '../../components/payments/PaymentMethodFields.jsx';
import FinanceDocActions from '../../components/finance/FinanceDocActions.jsx';
import { bookingDocPayload, rentPaymentDocPayload } from '../../utils/financeDocs.js';
import { formatCurrency, formatDate, formatRoomLocation } from '../../utils/format.js';
import { rentalApi } from '../../services/rentalApi.js';

export default function Payments() {
  const { globalSearch = '' } = useOutletContext() || {};
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [editModal, setEditModal] = useState(null);
  const [editForm, setEditForm] = useState({
    amountPaid: '',
    method: 'CASH',
    paymentDate: '',
    reference: '',
    receivedByName: '',
    agentName: '',
    officeMpesaNumber: '',
  });
  const [saving, setSaving] = useState(false);
  const [voidModal, setVoidModal] = useState(null);
  const [voidReason, setVoidReason] = useState('');
  const [voiding, setVoiding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [monthly, bookings] = await Promise.all([
        rentalApi.listPayments(),
        rentalApi.listBookings(),
      ]);
      const mapped = [
        ...monthly.map((p) => ({
          id: p.id,
          recordType: 'monthly',
          source:
            p.tenantType === 'office'
              ? 'Office'
              : p.tenantType === 'shop'
                ? 'Shop'
                : 'Apartment',
          name: p.name,
          room: p.roomNumber,
          building: p.building,
          floor: p.floor,
          period: p.month,
          amountDue: p.amountDue,
          amountPaid: p.amountPaid,
          status: p.status,
          method: p.method,
          date: p.paymentDate,
        })),
        ...bookings
          .filter((b) => b.status !== 'Cancelled')
          .map((b) => ({
            id: b.id,
            recordType: 'guest',
            source: 'Guest',
            name: b.fullName,
            room: b.roomNumber,
            building: b.building,
            floor: b.floor,
            period: `${b.checkIn} → ${b.checkOut}`,
            amountDue: b.total,
            amountPaid: b.amountPaid ?? 0,
            status: b.paymentStatus || 'Unpaid',
            method: b.paymentMethod,
            date: b.checkIn,
          })),
      ];
      setRows(mapped);
    } catch (err) {
      toast.error(err.message || 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (globalSearch !== undefined) setSearch(globalSearch);
  }, [globalSearch]);

  useEffect(() => {
    load();
  }, [load]);

  const openEdit = (row) => {
    setEditModal(row);
    setEditForm({
      amountPaid: String(row.amountPaid ?? 0),
      method: row.method || 'CASH',
      paymentDate: row.date ? String(row.date).slice(0, 10) : new Date().toISOString().slice(0, 10),
      reference: '',
      receivedByName: '',
      agentName: '',
      officeMpesaNumber: '',
    });
  };

  const confirmVoid = async () => {
    if (!voidModal) return;
    const reason = voidReason.trim();
    if (!reason) {
      toast.error('Enter a reason for voiding');
      return;
    }
    setVoiding(true);
    try {
      await rentalApi.voidPayment(voidModal.id, { reason });
      toast.success('Payment voided');
      setVoidModal(null);
      setVoidReason('');
      await load();
    } catch (err) {
      toast.error(err.message || 'Could not void payment');
    } finally {
      setVoiding(false);
    }
  };

  const saveEdit = async () => {
    if (!editModal) return;
    const amountPaid = Number(editForm.amountPaid);
    if (Number.isNaN(amountPaid) || amountPaid < 0) {
      toast.error('Enter a valid amount');
      return;
    }
    setSaving(true);
    try {
      if (editModal.recordType === 'guest') {
        await rentalApi.recordBookingPayment(editModal.id, {
          amountPaid,
          paymentMethod: editForm.method,
          reference: editForm.reference || null,
          receivedByName: editForm.receivedByName || null,
          agentName: editForm.agentName || null,
          officeMpesaNumber: editForm.officeMpesaNumber || null,
        });
      } else {
        await rentalApi.updatePayment(editModal.id, {
          amountPaid,
          amountDue: editModal.amountDue,
          method: editForm.method,
          paymentDate: editForm.paymentDate || null,
          reference: editForm.reference || null,
          receivedByName: editForm.receivedByName || null,
          agentName: editForm.agentName || null,
          officeMpesaNumber: editForm.officeMpesaNumber || null,
        });
      }
      toast.success('Payment updated');
      setEditModal(null);
      await load();
    } catch (err) {
      toast.error(err.message || 'Could not update payment');
    } finally {
      setSaving(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (type && r.source !== type) return false;
      if (status && r.status !== status) return false;
      if (!q) return true;
      return (
        String(r.name || '')
          .toLowerCase()
          .includes(q) ||
        String(r.room || '')
          .toLowerCase()
          .includes(q) ||
        String(r.building || '')
          .toLowerCase()
          .includes(q) ||
        String(r.floor || '')
          .toLowerCase()
          .includes(q)
      );
    });
  }, [rows, search, type, status]);

  return (
    <div>
      <PageHeader title="Payments" subtitle="Monthly rents and guest booking totals." />

      <Card className="mb-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Input
            label="Search"
            placeholder="Name, room, building, floor…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select label="Type" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">All</option>
            <option value="Apartment">Apartment</option>
            <option value="Shop">Shop</option>
            <option value="Office">Office</option>
            <option value="Guest">Guest</option>
          </Select>
          <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            <option value="Paid">Paid</option>
            <option value="Unpaid">Unpaid</option>
            <option value="Partial">Partial</option>
          </Select>
        </div>
      </Card>

      <Card>
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-[var(--text-muted)]">
                  <th className="pb-2 font-medium">Source</th>
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">Room</th>
                  <th className="pb-2 font-medium">Period</th>
                  <th className="pb-2 font-medium">Due</th>
                  <th className="pb-2 font-medium">Paid</th>
                  <th className="pb-2 font-medium">Method</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={`${r.source}-${r.id}`} className="border-b border-[var(--border)]/60">
                    <td className="py-3">{r.source}</td>
                    <td className="py-3 font-medium">{r.name}</td>
                    <td className="py-3">
                      <span className="font-medium text-[var(--text)]">{r.room}</span>
                      <span className="block text-xs text-[var(--text-muted)]">
                        {formatRoomLocation({ building: r.building, floor: r.floor })}
                      </span>
                    </td>
                    <td className="py-3">{r.period}</td>
                    <td className="py-3">{formatCurrency(r.amountDue)}</td>
                    <td className="py-3">{formatCurrency(r.amountPaid)}</td>
                    <td className="py-3">{r.method || '—'}</td>
                    <td className="py-3">
                      <Badge status={r.status}>{r.status}</Badge>
                    </td>
                    <td className="py-3">{r.date ? formatDate(r.date) : '—'}</td>
                    <td className="py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(r)}>
                          Edit
                        </Button>
                        {r.recordType === 'monthly' && (Number(r.amountPaid) || 0) > 0 ? (
                          <Button
                            size="sm"
                            variant="danger-soft"
                            onClick={() => {
                              setVoidModal(r);
                              setVoidReason('');
                            }}
                          >
                            Void
                          </Button>
                        ) : null}
                        <FinanceDocActions
                          compact
                          label={(Number(r.amountPaid) || 0) > 0 ? 'Receipt' : 'Invoice'}
                          onPayload={() =>
                            r.recordType === 'guest'
                              ? bookingDocPayload(
                                  {
                                    id: r.id,
                                    code: r.period,
                                    fullName: r.name,
                                    total: r.amountDue,
                                    amountPaid: r.amountPaid,
                                    paymentMethod: r.method,
                                    checkIn: r.date,
                                    checkOut: r.period,
                                    roomId: null,
                                    building: r.building,
                                    floor: r.floor,
                                    roomNumber: r.room,
                                  },
                                  (Number(r.amountPaid) || 0) > 0 ? 'RECEIPT' : 'INVOICE',
                                )
                              : rentPaymentDocPayload(
                                  {
                                    id: r.id,
                                    month: r.period,
                                    amountDue: r.amountDue,
                                    amountPaid: r.amountPaid,
                                    method: r.method,
                                    paymentDate: r.date,
                                  },
                                  {
                                    customerName: r.name,
                                    buildingName: r.building,
                                    floorName: r.floor,
                                    unitNumber: r.room,
                                  },
                                  (Number(r.amountPaid) || 0) > 0 ? 'RECEIPT' : 'INVOICE',
                                )
                          }
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 ? (
              <p className="py-6 text-sm text-[var(--text-muted)]">No payments found.</p>
            ) : null}
          </div>
        )}
      </Card>

      <Modal
        open={Boolean(editModal)}
        onClose={() => !saving && setEditModal(null)}
        title="Edit Payment"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditModal(null)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={saveEdit} disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        }
      >
        {editModal ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Name" value={editModal.name} readOnly />
            <Input label="Period" value={editModal.period} readOnly />
            <Input label="Amount due" value={String(editModal.amountDue)} readOnly />
            <Input
              label="Amount paid"
              type="number"
              min={0}
              max={editModal.amountDue}
              value={editForm.amountPaid}
              onChange={(e) => setEditForm({ ...editForm, amountPaid: e.target.value })}
            />
            {editModal.recordType === 'monthly' ? (
              <Input
                label="Payment date"
                type="date"
                value={editForm.paymentDate}
                onChange={(e) => setEditForm({ ...editForm, paymentDate: e.target.value })}
              />
            ) : null}
            <div className="sm:col-span-2">
              <PaymentMethodFields
                value={editForm}
                onChange={(next) =>
                  setEditForm({
                    ...editForm,
                    method: next.method,
                    reference: next.reference,
                    receivedByName: next.receivedByName,
                    agentName: next.agentName,
                    officeMpesaNumber: next.officeMpesaNumber,
                  })
                }
              />
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(voidModal)}
        onClose={() => !voiding && setVoidModal(null)}
        title="Void payment"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary"  onClick={() => setVoidModal(null)} disabled={voiding}>
              Cancel
            </Button>
            <Button  onClick={confirmVoid} disabled={voiding}>
              {voiding ? 'Voiding…' : 'Void payment'}
            </Button>
          </div>
        }
      >
        {voidModal ? (
          <div className="space-y-4">
            <p className="text-sm text-[var(--text-muted)]">
              This reverses the recorded payment for {voidModal.name} ({voidModal.period}). The
              row is kept; amount paid becomes zero and status returns to Unpaid.
            </p>
            <Input
              label="Reason (required)"
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder="e.g. Recorded in error, duplicate entry"
            />
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

