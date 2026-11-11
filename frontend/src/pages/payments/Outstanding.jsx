import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import PaymentMethodFields from '../../components/payments/PaymentMethodFields.jsx';
import { formatCurrency, formatDate } from '../../utils/format.js';
import { rentalApi } from '../../services/rentalApi.js';

const KIND_LABEL = {
  RENT: 'Rent',
  OTHER_CHARGE: 'Other charge',
  OWNER_MONTHLY: 'Owner monthly',
  SALE_BALANCE: 'Sale balance',
  GUEST: 'Guest stay',
};

function tone(status, balance) {
  const s = String(status || '').toUpperCase();
  if (s === 'PAID' || balance <= 0) return 'Paid';
  if (s === 'PARTIAL' || (balance > 0 && s !== 'UNPAID')) return 'Partial';
  return 'Unpaid';
}

export default function Outstanding() {
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await rentalApi.getOutstandingReport();
      setRows(data.items || []);
      setTotals({ total: data.total || 0, byKind: data.byKind || {}, count: data.count || 0 });
    } catch (err) {
      toast.error(err.message || 'Failed to load outstanding');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const summaryCards = useMemo(() => {
    if (!totals) return [];
    return [
      { label: 'Total outstanding', value: totals.total },
      { label: 'Rent', value: totals.byKind.rent || 0 },
      { label: 'Other charges', value: totals.byKind.otherCharges || 0 },
      { label: 'Owner monthly', value: totals.byKind.ownerMonthly || 0 },
      { label: 'Sale balances', value: totals.byKind.saleBalance || 0 },
      { label: 'Guest stays', value: totals.byKind.guest || 0 },
    ];
  }, [totals]);

  const openRecord = (row) => {
    if (row.recordAction === 'BOOKING_PAYMENT' || row.recordAction === 'SALE_PAYMENT') {
      if (row.unitId) {
        window.location.assign(`/units/${row.unitId}`);
        return;
      }
      toast.error('Open the unit profile to record this payment');
      return;
    }
    setModal({
      ...row,
      payAmount: String(row.balance || 0),
      method: 'CASH',
      reference: '',
      receivedByName: '',
      agentName: '',
      officeMpesaNumber: '',
      paymentDate: new Date().toISOString().slice(0, 10),
    });
  };

  const save = async () => {
    if (!modal) return;
    const amount = Number(modal.payAmount) || 0;
    if (!(amount > 0)) {
      toast.error('Enter an amount paid');
      return;
    }
    setSaving(true);
    try {
      if (modal.recordAction === 'UPDATE_CHARGE') {
        await rentalApi.updateLeaseCharge(modal.id, { addPayment: amount });
      } else {
        const nextPaid = Math.min(modal.amountDue, (Number(modal.amountPaid) || 0) + amount);
        let status = 'Unpaid';
        if (nextPaid <= 0) status = 'Unpaid';
        else if (nextPaid < modal.amountDue) status = 'Partial';
        else status = 'Paid';
        await rentalApi.updatePayment(modal.id, {
          amountPaid: nextPaid,
          status,
          method: status === 'Unpaid' ? null : modal.method,
          paymentDate: status === 'Unpaid' ? null : modal.paymentDate,
          reference: status === 'Unpaid' ? null : modal.reference || null,
          receivedByName: status === 'Unpaid' ? null : modal.receivedByName || null,
          agentName: status === 'Unpaid' ? null : modal.agentName || null,
          officeMpesaNumber: status === 'Unpaid' ? null : modal.officeMpesaNumber || null,
        });
      }
      setModal(null);
      toast.success('Payment recorded');
      await load();
    } catch (err) {
      toast.error(err.message || 'Could not record payment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Outstanding"
        subtitle="All unpaid balances: rent, other charges, owner monthly charges, sale balances, and guest stays. Remaining = Total − Amount paid."
      />

      {summaryCards.length ? (
        <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {summaryCards.map((c) => (
            <div
              key={c.label}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                {c.label}
              </p>
              <p className="mt-1 text-xl font-semibold text-[var(--text)]">
                {formatCurrency(c.value)}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      <Card>
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--text-muted)]">Nothing outstanding.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-[var(--text-muted)]">
                  <th className="pb-2 font-medium">Type</th>
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">Unit</th>
                  <th className="pb-2 font-medium">Detail</th>
                  <th className="pb-2 font-medium">Total</th>
                  <th className="pb-2 font-medium">Paid</th>
                  <th className="pb-2 font-medium">Remaining</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={`${r.kind}-${r.id}`} className="border-b border-[var(--border)]/60">
                    <td className="py-3">{KIND_LABEL[r.kind] || r.kind}</td>
                    <td className="py-3 font-medium">{r.name}</td>
                    <td className="py-3">
                      <span className="font-medium text-[var(--text)]">{r.roomNumber}</span>
                      <span className="block text-xs text-[var(--text-muted)]">
                        {[r.building, r.floor].filter(Boolean).join(' · ')}
                      </span>
                    </td>
                    <td className="py-3">
                      {r.description || r.month || '—'}
                      {r.month && r.description && r.description !== `Rent ${r.month}` ? (
                        <span className="block text-xs text-[var(--text-muted)]">{r.month}</span>
                      ) : null}
                    </td>
                    <td className="py-3">{formatCurrency(r.amountDue)}</td>
                    <td className="py-3">{formatCurrency(r.amountPaid)}</td>
                    <td className="py-3 font-semibold">{formatCurrency(r.balance)}</td>
                    <td className="py-3">
                      <Badge status={tone(r.status, r.balance)}>{tone(r.status, r.balance)}</Badge>
                    </td>
                    <td className="py-3">
                      {r.recordAction === 'UPDATE_PAYMENT' || r.recordAction === 'UPDATE_CHARGE' ? (
                        <Button variant="secondary" className="h-9 px-3 text-xs" onClick={() => openRecord(r)}>
                          Record
                        </Button>
                      ) : r.unitId ? (
                        <Link
                          to={`/units/${r.unitId}`}
                          className="text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300"
                        >
                          Open unit
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={Boolean(modal)}
        onClose={() => !saving && setModal(null)}
        title="Record payment"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModal(null)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        }
      >
        {modal ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Name" value={modal.name} readOnly />
            <Input label="Remaining" value={formatCurrency(modal.balance)} readOnly />
            <Input
              label="Amount paid now"
              type="number"
              value={modal.payAmount}
              onChange={(e) => setModal({ ...modal, payAmount: e.target.value })}
            />
            {modal.recordAction === 'UPDATE_PAYMENT' ? (
              <>
                <Input
                  label="Payment date"
                  type="date"
                  value={modal.paymentDate}
                  onChange={(e) => setModal({ ...modal, paymentDate: e.target.value })}
                />
                <div className="sm:col-span-2">
                  <PaymentMethodFields
                    value={modal}
                    onChange={(next) =>
                      setModal({
                        ...modal,
                        method: next.method,
                        reference: next.reference,
                        receivedByName: next.receivedByName,
                        agentName: next.agentName,
                        officeMpesaNumber: next.officeMpesaNumber,
                      })
                    }
                  />
                </div>
              </>
            ) : null}
            <p className="sm:col-span-2 text-xs text-[var(--text-muted)]">
              {formatDate(modal.paymentDate)} · {KIND_LABEL[modal.kind] || modal.kind}
            </p>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
