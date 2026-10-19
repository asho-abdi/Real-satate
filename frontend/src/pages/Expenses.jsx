import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import PageHeader from '../components/ui/PageHeader.jsx';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import Input from '../components/ui/Input.jsx';
import Select from '../components/ui/Select.jsx';
import Modal from '../components/ui/Modal.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx';
import { MONEY_TXN_TYPES, PAYMENT_METHODS } from '../utils/constants.js';
import { formatCurrency } from '../utils/format.js';
import { rentalApi } from '../services/rentalApi.js';
import ExpenseCard from '../components/realty/ExpenseCard.jsx';

const emptyForm = {
  txnType: 'BANK_DEPOSIT',
  amount: '',
  expenseDate: new Date().toISOString().slice(0, 10),
  paymentMethod: 'Cash',
  source: '',
  destination: '',
  account: '',
  vendor: '',
  description: '',
  comment: '',
  buildingId: '',
};

export default function Expenses() {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [filters, setFilters] = useState({
    txnType: '',
    from: '',
    to: '',
    source: '',
    destination: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.txnType) params.txnType = filters.txnType;
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;
      if (filters.source) params.source = filters.source;
      if (filters.destination) params.destination = filters.destination;
      const [list, sum, b] = await Promise.all([
        rentalApi.listExpenses(params),
        rentalApi.getExpenseSummary(),
        rentalApi.listBuildings(),
      ]);
      setRows(list || []);
      setSummary(sum);
      setBuildings(b || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load money movements');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    if (!form.amount || !form.expenseDate || !form.comment.trim()) {
      toast.error('Amount, date, and reference/comment are required');
      return;
    }
    setSaving(true);
    try {
      await rentalApi.createExpense({
        ...form,
        buildingId: form.buildingId || null,
        category: form.txnType.replace(/_/g, ' '),
        amount: Number(form.amount),
        comment: form.comment.trim(),
      });
      toast.success('Money movement recorded');
      setOpen(false);
      setForm(emptyForm);
      await load();
    } catch (err) {
      toast.error(err.message || 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirm) return;
    try {
      await rentalApi.deleteExpense(confirm.id);
      toast.success('Record deleted');
      setConfirm(null);
      await load();
    } catch (err) {
      toast.error(err.message || 'Could not delete');
    }
  };

  const typeLabel = (code) =>
    MONEY_TXN_TYPES.find((t) => t.value === code)?.label || code || 'Other';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Money Movements"
        subtitle="Track where RJK REALTY revenue goes — bank deposits, transfers, exchange, suppliers, and cash."
        actions={
          <Button className="h-11 px-5" onClick={() => { setForm(emptyForm); setOpen(true); }}>
            Record Movement
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="text-xs uppercase text-[var(--text-muted)]">Total recorded</p>
          <p className="mt-2 text-2xl font-bold">{formatCurrency(summary?.totalExpenses || 0)}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-[var(--text-muted)]">This month</p>
          <p className="mt-2 text-2xl font-bold">{formatCurrency(summary?.thisMonth || 0)}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-[var(--text-muted)]">This year</p>
          <p className="mt-2 text-2xl font-bold">{formatCurrency(summary?.thisYear || 0)}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-[var(--text-muted)]">Records</p>
          <p className="mt-2 text-2xl font-bold">{summary?.totalCount || 0}</p>
        </Card>
      </div>

      <Card>
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Select label="Type" value={filters.txnType} onChange={(e) => setFilters({ ...filters, txnType: e.target.value })}>
            <option value="">All types</option>
            {MONEY_TXN_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </Select>
          <Input label="From" type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
          <Input label="To" type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
          <Input label="Source" value={filters.source} onChange={(e) => setFilters({ ...filters, source: e.target.value })} />
          <Input label="Destination" value={filters.destination} onChange={(e) => setFilters({ ...filters, destination: e.target.value })} />
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--text-muted)]">No money movements yet.</p>
        ) : (
          <div className="grid gap-3">
            {rows.map((r) => (
              <ExpenseCard
                key={r.id}
                date={r.expenseDate}
                type={typeLabel(r.txnType)}
                amount={r.amount}
                source={r.source}
                destination={r.destination}
                reference={r.comment}
                comment={r.description}
                actor={r.createdByName}
                onDelete={() => setConfirm(r)}
              />
            ))}
          </div>
        )}
      </Card>

      <Modal
        open={open}
        onClose={() => !saving && setOpen(false)}
        title="Record Money Movement"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </div>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Transaction type" value={form.txnType} onChange={(e) => setForm({ ...form, txnType: e.target.value })}>
            {MONEY_TXN_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </Select>
          <Input label="Amount" type="number" min={0} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <Input label="Date" type="date" value={form.expenseDate} onChange={(e) => setForm({ ...form, expenseDate: e.target.value })} />
          <Select label="Payment method" value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>
            {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
          </Select>
          <Input label="Source" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="Cash / revenue / account" />
          <Input label="Destination" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} placeholder="Bank / supplier / cash" />
          <Input label="Account" value={form.account} onChange={(e) => setForm({ ...form, account: e.target.value })} />
          <Input label="Person / vendor" value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} />
          <Select label="Linked property (optional)" value={form.buildingId} onChange={(e) => setForm({ ...form, buildingId: e.target.value })}>
            <option value="">None — general finance</option>
            {buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </Select>
          <Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="sm:col-span-2">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-[var(--text)]">Reference / Comment</span>
              <textarea
                rows={3}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                placeholder='e.g. Transferred $5,000 from cash to ABC Bank account.'
                value={form.comment}
                onChange={(e) => setForm({ ...form, comment: e.target.value })}
              />
            </label>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(confirm)}
        title="Delete record?"
        message={confirm ? `Delete ${confirm.code} (${formatCurrency(confirm.amount)})?` : ''}
        confirmLabel="Delete"
        danger
        onConfirm={remove}
        onClose={() => setConfirm(null)}
      />
    </div>
  );
}
