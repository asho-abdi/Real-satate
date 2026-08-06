import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import { PAYMENT_METHODS, PAYMENT_STATUSES } from '../../utils/constants.js';
import { formatCurrency, formatDate } from '../../utils/format.js';
import { rentalApi } from '../../services/rentalApi.js';
import { labelStatus } from '../../utils/labels.js';

export default function Outstanding() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await rentalApi.getOutstandingReport();
      setRows(
        (data.items || []).map((p) => ({
          id: p.id,
          name: p.tenant?.fullName || p.business?.businessName || '—',
          roomNumber:
            p.tenant?.unit?.roomNumber || p.business?.unit?.roomNumber || '—',
          building:
            p.tenant?.unit?.building?.name || p.business?.unit?.building?.name || '',
          month: p.month,
          amountDue: Number(p.amountDue),
          amountPaid: Number(p.amountPaid),
          status: labelStatus(p.status),
          method: p.method,
          paymentDate: p.paymentDate,
        })),
      );
    } catch (err) {
      toast.error(err.message || 'Failed to load outstanding');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openRecord = (row) => {
    setModal({
      ...row,
      amountPaid: row.amountPaid || 0,
      method: row.method === 'E_BESA' ? 'E-besa' : row.method === 'CASH' ? 'Cash' : row.method || 'Cash',
      paymentDate: row.paymentDate
        ? String(row.paymentDate).slice(0, 10)
        : new Date().toISOString().slice(0, 10),
      status: row.status === 'Partial' ? 'Partial' : 'Paid',
    });
  };

  const save = async () => {
    if (!modal) return;
    const amountPaid = Number(modal.amountPaid) || 0;
    const amountDue = Number(modal.amountDue) || 0;
    let status = modal.status;
    if (amountPaid <= 0) status = 'Unpaid';
    else if (amountPaid < amountDue && status === 'Paid') status = 'Partial';
    else if (amountPaid >= amountDue) status = 'Paid';

    try {
      await rentalApi.updatePayment(modal.id, {
        amountPaid,
        status,
        method: status === 'Unpaid' ? null : modal.method,
        paymentDate: status === 'Unpaid' ? null : modal.paymentDate,
      });
      setModal(null);
      toast.success('Payment recorded');
      await load();
    } catch (err) {
      toast.error(err.message || 'Could not record payment');
    }
  };

  return (
    <div>
      <PageHeader title="Outstanding" subtitle="Unpaid and partial monthly rents only." />

      <Card>
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-[var(--text-muted)]">
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">Room</th>
                  <th className="pb-2 font-medium">Month</th>
                  <th className="pb-2 font-medium">Due</th>
                  <th className="pb-2 font-medium">Paid</th>
                  <th className="pb-2 font-medium">Balance</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-[var(--border)]/60">
                    <td className="py-3 font-medium">{r.name}</td>
                    <td className="py-3">
                      {r.roomNumber}
                      <span className="block text-xs text-[var(--text-muted)]">{r.building}</span>
                    </td>
                    <td className="py-3">{r.month}</td>
                    <td className="py-3">{formatCurrency(r.amountDue)}</td>
                    <td className="py-3">{formatCurrency(r.amountPaid)}</td>
                    <td className="py-3 font-medium text-rose-600 dark:text-rose-400">
                      {formatCurrency(r.amountDue - r.amountPaid)}
                    </td>
                    <td className="py-3">
                      <Badge status={r.status}>{r.status}</Badge>
                    </td>
                    <td className="py-3">
                      <Button className="h-11 px-4" onClick={() => openRecord(r)}>
                        Record Payment
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 ? (
              <p className="py-6 text-sm text-[var(--text-muted)]">No outstanding payments.</p>
            ) : null}
          </div>
        )}
      </Card>

      <Modal
        open={Boolean(modal)}
        onClose={() => setModal(null)}
        title="Record Payment"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" className="h-12 px-5" onClick={() => setModal(null)}>
              Cancel
            </Button>
            <Button className="h-12 px-5 text-base" onClick={save}>
              Save
            </Button>
          </div>
        }
      >
        {modal ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Name" value={modal.name} readOnly />
            <Input label="Month" value={modal.month} readOnly />
            <Input label="Amount due" value={String(modal.amountDue)} readOnly />
            <Input
              label="Amount paid"
              type="number"
              value={modal.amountPaid}
              onChange={(e) => setModal({ ...modal, amountPaid: e.target.value })}
            />
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
            <p className="sm:col-span-2 text-sm text-[var(--text-muted)]">
              Balance after save:{' '}
              {formatCurrency(
                Math.max(0, Number(modal.amountDue) - (Number(modal.amountPaid) || 0)),
              )}
              {modal.paymentDate ? ` · ${formatDate(modal.paymentDate)}` : ''}
            </p>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
