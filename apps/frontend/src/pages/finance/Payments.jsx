import { useState } from 'react';
import toast from 'react-hot-toast';
import EntityListPage from '../../components/ui/EntityListPage.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Modal from '../../components/ui/Modal.jsx';
import FormActionBar from '../../components/ui/FormActionBar.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import { remPayments } from '../../services/remsData.js';
import { formatCurrency, formatDate } from '../../utils/format.js';
import { ASSIGN_OPTIONS } from '../../utils/unitWorkflows.js';

export default function Payments() {
  const [rows, setRows] = useState(remPayments);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    payer: '',
    unit: '',
    type: 'Rent',
    amount: '',
    dueDate: '',
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ payer: '', unit: '', type: 'Rent', amount: '', dueDate: '' });
    setFormOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      payer: row.payer || '',
      unit: row.unit || '',
      type: row.type || 'Rent',
      amount: String(row.amount ?? ''),
      dueDate: row.dueDate || '',
    });
    setFormOpen(true);
  };

  const save = (close = true) => {
    const payload = { ...form, amount: Number(form.amount) || 0 };
    if (editing) {
      setRows((prev) => prev.map((r) => (r.id === editing.id ? { ...r, ...payload } : r)));
      toast.success('Payment updated');
    } else {
      setRows((prev) => [
        {
          id: `pay-${Date.now()}`,
          code: `PAY-2026-${Math.floor(Math.random() * 9000 + 1000)}`,
          status: 'Pending',
          paidAt: null,
          ...payload,
        },
        ...prev,
      ]);
      toast.success('Payment recorded');
    }
    if (close) setFormOpen(false);
  };

  return (
    <>
      <EntityListPage
        title="Payments"
        subtitle="Rent, deposits, utilities, and refunds."
        breadcrumbs={[{ label: 'Leases & Finance' }, { label: 'Payments' }]}
        rows={rows}
        setRows={setRows}
        entityLabel="payment"
        exportFileName="payments"
        statusOptions={['Paid', 'Pending', 'Partial', 'Overdue', 'Refunded']}
        statusKey="status"
        searchKeys={['code', 'payer', 'unit', 'type', 'status']}
        filters={[
          { key: 'status', label: 'status', options: [...new Set(rows.map((r) => r.status))] },
          { key: 'type', label: 'type', options: [...new Set(rows.map((r) => r.type))] },
        ]}
        primaryAction={{ label: 'Record payment', onClick: openCreate }}
        onEdit={openEdit}
        onView={(row) => toast(`Viewing ${row.code}`)}
        assignOptions={ASSIGN_OPTIONS}
        getWorkflowActions={(row, { changeStatus, askConfirm, toast: t }) => [
          {
            key: 'record',
            label: 'Record Payment',
            hidden: row.status === 'Paid',
            onClick: () => changeStatus('Paid'),
          },
          {
            key: 'invoice',
            label: 'Generate Invoice',
            onClick: () => t.success(`Invoice generated for ${row.code}`),
          },
          {
            key: 'receipt',
            label: 'Send Receipt',
            onClick: () => t.success(`Receipt sent for ${row.code}`),
          },
          {
            key: 'refund',
            label: 'Refund',
            onClick: () =>
              askConfirm({
                title: 'Refund payment?',
                message: `Refund ${formatCurrency(row.amount, 'AED')} for ${row.code}?`,
                confirmLabel: 'Refund',
                danger: true,
                action: () => changeStatus('Refunded'),
              }),
          },
          {
            key: 'overdue',
            label: 'Mark Overdue',
            hidden: row.status === 'Overdue' || row.status === 'Paid',
            onClick: () => changeStatus('Overdue'),
          },
        ]}
        columns={[
          { key: 'code', label: 'Code' },
          { key: 'payer', label: 'Payer' },
          { key: 'unit', label: 'Unit' },
          { key: 'type', label: 'Type' },
          {
            key: 'amount',
            label: 'Amount',
            render: (row) => formatCurrency(row.amount, 'AED'),
          },
          {
            key: 'dueDate',
            label: 'Due',
            render: (row) => formatDate(row.dueDate),
          },
          {
            key: 'status',
            label: 'Status',
            render: (row) => <Badge status={row.status}>{row.status}</Badge>,
          },
        ]}
      />

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit payment' : 'Record payment'}
        footer={
          <FormActionBar
            onCancel={() => setFormOpen(false)}
            onReset={() => toast('Form reset')}
            onSaveDraft={() => toast.success('Draft saved')}
            onSave={() => save(true)}
            onSaveAndNew={() => {
              save(false);
              setEditing(null);
              toast.success('Saved — ready for new');
            }}
            onSaveAndClose={() => save(true)}
          />
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Payer"
            value={form.payer}
            onChange={(e) => setForm({ ...form, payer: e.target.value })}
          />
          <Input
            label="Unit"
            value={form.unit}
            onChange={(e) => setForm({ ...form, unit: e.target.value })}
          />
          <Select
            label="Type"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          >
            <option>Rent</option>
            <option>Deposit</option>
            <option>Utility</option>
            <option>Service</option>
            <option>Refund</option>
          </Select>
          <Input
            label="Amount (AED)"
            type="number"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />
          <Input
            label="Due date"
            type="date"
            value={form.dueDate}
            onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            className="sm:col-span-2"
          />
        </div>
      </Modal>
    </>
  );
}
