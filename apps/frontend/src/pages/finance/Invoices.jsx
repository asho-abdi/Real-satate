import { useState } from 'react';
import toast from 'react-hot-toast';
import EntityListPage from '../../components/ui/EntityListPage.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Modal from '../../components/ui/Modal.jsx';
import FormActionBar from '../../components/ui/FormActionBar.jsx';
import Input from '../../components/ui/Input.jsx';
import { remInvoices } from '../../services/remsData.js';
import { formatCurrency, formatDate } from '../../utils/format.js';
import { ASSIGN_OPTIONS } from '../../utils/unitWorkflows.js';

export default function Invoices() {
  const [rows, setRows] = useState(remInvoices);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    payer: '',
    unit: '',
    amount: '',
    dueDate: '',
    issueDate: '',
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ payer: '', unit: '', amount: '', dueDate: '', issueDate: '' });
    setFormOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      payer: row.payer || '',
      unit: row.unit || '',
      amount: String(row.amount ?? ''),
      dueDate: row.dueDate || '',
      issueDate: row.issueDate || '',
    });
    setFormOpen(true);
  };

  const save = (close = true) => {
    const amount = Number(form.amount) || 0;
    const payload = { ...form, amount, balance: amount };
    if (editing) {
      setRows((prev) => prev.map((r) => (r.id === editing.id ? { ...r, ...payload } : r)));
      toast.success('Invoice updated');
    } else {
      setRows((prev) => [
        {
          id: `inv-${Date.now()}`,
          code: `INV-2026-${Math.floor(Math.random() * 9000 + 1000)}`,
          status: 'Pending',
          ...payload,
        },
        ...prev,
      ]);
      toast.success('Invoice created');
    }
    if (close) setFormOpen(false);
  };

  return (
    <>
      <EntityListPage
        title="Invoices"
        subtitle="Issued invoices and balances."
        breadcrumbs={[{ label: 'Leases & Finance' }, { label: 'Invoices' }]}
        rows={rows}
        setRows={setRows}
        entityLabel="invoice"
        exportFileName="invoices"
        statusOptions={['Paid', 'Pending', 'Partial', 'Overdue', 'Void']}
        statusKey="status"
        searchKeys={['code', 'payer', 'unit', 'status']}
        filters={[
          { key: 'status', label: 'status', options: [...new Set(rows.map((r) => r.status))] },
        ]}
        primaryAction={{ label: 'Create invoice', onClick: openCreate }}
        onEdit={openEdit}
        onView={(row) => toast(`Viewing ${row.code}`)}
        assignOptions={ASSIGN_OPTIONS}
        getWorkflowActions={(row, { changeStatus, askConfirm, toast: t }) => [
          {
            key: 'issue',
            label: 'Issue',
            onClick: () => t.success(`${row.code} issued`),
          },
          {
            key: 'paid',
            label: 'Mark Paid',
            hidden: row.status === 'Paid',
            onClick: () => changeStatus('Paid'),
          },
          {
            key: 'overdue',
            label: 'Mark Overdue',
            hidden: row.status === 'Overdue' || row.status === 'Paid',
            onClick: () => changeStatus('Overdue'),
          },
          {
            key: 'send',
            label: 'Send',
            onClick: () => t.success(`${row.code} sent to ${row.payer}`),
          },
          {
            key: 'void',
            label: 'Void',
            onClick: () =>
              askConfirm({
                title: 'Void invoice?',
                message: `Void ${row.code}?`,
                confirmLabel: 'Void',
                danger: true,
                action: () => changeStatus('Void'),
              }),
          },
        ]}
        columns={[
          { key: 'code', label: 'Code' },
          { key: 'payer', label: 'Payer' },
          { key: 'unit', label: 'Unit' },
          {
            key: 'amount',
            label: 'Amount',
            render: (row) => formatCurrency(row.amount, 'AED'),
          },
          {
            key: 'balance',
            label: 'Balance',
            render: (row) => formatCurrency(row.balance, 'AED'),
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
        title={editing ? 'Edit invoice' : 'Create invoice'}
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
            label="Issue date"
            type="date"
            value={form.issueDate}
            onChange={(e) => setForm({ ...form, issueDate: e.target.value })}
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
