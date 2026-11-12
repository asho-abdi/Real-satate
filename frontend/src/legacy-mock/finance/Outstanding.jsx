import { useState } from 'react';
import toast from 'react-hot-toast';
import EntityListPage from '../../components/ui/EntityListPage.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Modal from '../../components/ui/Modal.jsx';
import FormActionBar from '../../components/ui/FormActionBar.jsx';
import Input from '../../components/ui/Input.jsx';
import { remOutstanding } from '../../services/remsData.js';
import { formatCurrency, formatDate } from '../../utils/format.js';
import { ASSIGN_OPTIONS } from '../../utils/unitWorkflows.js';

export default function Outstanding() {
  const [rows, setRows] = useState(remOutstanding);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    payer: '',
    unit: '',
    amount: '',
    dueDate: '',
    source: 'Invoice',
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ payer: '', unit: '', amount: '', dueDate: '', source: 'Invoice' });
    setFormOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      payer: row.payer || '',
      unit: row.unit || '',
      amount: String(row.amount ?? ''),
      dueDate: row.dueDate || '',
      source: row.source || 'Invoice',
    });
    setFormOpen(true);
  };

  const save = (close = true) => {
    const payload = { ...form, amount: Number(form.amount) || 0 };
    if (editing) {
      setRows((prev) => prev.map((r) => (r.id === editing.id ? { ...r, ...payload } : r)));
      toast.success('Record updated');
    } else {
      setRows((prev) => [
        {
          id: `out-${Date.now()}`,
          code: `OUT-${Math.floor(Math.random() * 9000 + 1000)}`,
          status: 'Overdue',
          ...payload,
        },
        ...prev,
      ]);
      toast.success('Outstanding record added');
    }
    if (close) setFormOpen(false);
  };

  return (
    <>
      <EntityListPage
        title="Outstanding"
        subtitle="Overdue balances requiring collection."
        breadcrumbs={[{ label: 'Leases & Finance' }, { label: 'Outstanding' }]}
        rows={rows}
        setRows={setRows}
        entityLabel="balance"
        exportFileName="outstanding"
        statusOptions={['Overdue', 'Partial', 'Pending', 'Paid']}
        statusKey="status"
        searchKeys={['code', 'payer', 'unit', 'source', 'status']}
        filters={[
          { key: 'status', label: 'status', options: [...new Set(rows.map((r) => r.status))] },
          { key: 'source', label: 'source', options: [...new Set(rows.map((r) => r.source))] },
        ]}
        primaryAction={{ label: 'Add record', onClick: openCreate }}
        onEdit={openEdit}
        onView={(row) => toast(`Viewing ${row.code}`)}
        assignOptions={ASSIGN_OPTIONS}
        getWorkflowActions={(row, { changeStatus, toast: t }) => [
          {
            key: 'remind',
            label: 'Send Reminder',
            onClick: () => t.success(`Reminder sent to ${row.payer}`),
          },
          {
            key: 'record-payment',
            label: 'Record Payment',
            onClick: () => {
              changeStatus('Paid');
              t.success(`Payment recorded for ${row.code}`);
            },
          },
          {
            key: 'overdue',
            label: 'Mark Overdue',
            hidden: row.status === 'Overdue',
            onClick: () => changeStatus('Overdue'),
          },
        ]}
        columns={[
          { key: 'code', label: 'Code' },
          { key: 'source', label: 'Source' },
          { key: 'payer', label: 'Payer' },
          { key: 'unit', label: 'Unit' },
          {
            key: 'amount',
            label: 'Amount',
            render: (row) => formatCurrency(row.amount),
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
        title={editing ? 'Edit outstanding' : 'Add outstanding'}
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
          />
        </div>
      </Modal>
    </>
  );
}
