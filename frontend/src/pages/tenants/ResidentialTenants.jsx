import { useState } from 'react';
import toast from 'react-hot-toast';
import EntityListPage from '../../components/ui/EntityListPage.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Modal from '../../components/ui/Modal.jsx';
import FormActionBar from '../../components/ui/FormActionBar.jsx';
import Input from '../../components/ui/Input.jsx';
import { remResidentialTenants } from '../../services/remsData.js';
import { formatCurrency, formatDate } from '../../utils/format.js';
import { ASSIGN_OPTIONS } from '../../utils/unitWorkflows.js';

export default function ResidentialTenants() {
  const [rows, setRows] = useState(remResidentialTenants);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    unit: '',
    leaseStart: '',
    leaseEnd: '',
    rent: '',
  });

  const openCreate = () => {
    setEditing(null);
    setForm({
      name: '',
      email: '',
      phone: '',
      unit: '',
      leaseStart: '',
      leaseEnd: '',
      rent: '',
    });
    setFormOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      name: row.name || '',
      email: row.email || '',
      phone: row.phone || '',
      unit: row.unit || '',
      leaseStart: row.leaseStart || '',
      leaseEnd: row.leaseEnd || '',
      rent: String(row.rent ?? ''),
    });
    setFormOpen(true);
  };

  const save = (close = true) => {
    const payload = { ...form, rent: Number(form.rent) || 0 };
    if (editing) {
      setRows((prev) => prev.map((r) => (r.id === editing.id ? { ...r, ...payload } : r)));
      toast.success('Tenant updated');
    } else {
      setRows((prev) => [
        {
          id: `rt-${Date.now()}`,
          status: 'Active',
          documents: [],
          ...payload,
        },
        ...prev,
      ]);
      toast.success('Tenant registered');
    }
    if (close) setFormOpen(false);
  };

  return (
    <>
      <EntityListPage
        title="Residential Tenants"
        subtitle="Long-term residential occupants and leases."
        breadcrumbs={[{ label: 'Tenants' }, { label: 'Residential' }]}
        rows={rows}
        setRows={setRows}
        entityLabel="tenant"
        exportFileName="residential-tenants"
        statusOptions={['Active', 'Expired', 'Moved Out', 'Pending']}
        statusKey="status"
        searchKeys={['name', 'email', 'phone', 'unit', 'status']}
        filters={[
          { key: 'status', label: 'status', options: [...new Set(rows.map((t) => t.status))] },
        ]}
        primaryAction={{ label: 'Register tenant', onClick: openCreate }}
        onEdit={openEdit}
        onView={(row) => toast(`Viewing ${row.name}`)}
        assignOptions={ASSIGN_OPTIONS}
        getWorkflowActions={(row, { changeStatus, askConfirm, toast: t }) => [
          {
            key: 'register',
            label: 'Register',
            hidden: row.status === 'Active',
            onClick: () => changeStatus('Active'),
          },
          {
            key: 'renew',
            label: 'Renew Lease',
            onClick: () => {
              askConfirm({
                title: 'Renew lease?',
                message: `Renew lease for ${row.name}?`,
                confirmLabel: 'Renew',
                action: () => {
                  changeStatus('Active');
                  t.success('Lease renewed');
                },
              });
            },
          },
          {
            key: 'terminate',
            label: 'Terminate Lease',
            onClick: () =>
              askConfirm({
                title: 'Terminate lease?',
                message: `Terminate lease for ${row.name}?`,
                confirmLabel: 'Terminate',
                danger: true,
                action: () => changeStatus('Expired'),
              }),
          },
          {
            key: 'move-in',
            label: 'Move In',
            onClick: () => {
              changeStatus('Active');
              t.success(`${row.name} moved in`);
            },
          },
          {
            key: 'move-out',
            label: 'Move Out',
            onClick: () =>
              askConfirm({
                title: 'Move out?',
                message: `Mark ${row.name} as Moved Out?`,
                confirmLabel: 'Move Out',
                action: () => changeStatus('Moved Out'),
              }),
          },
          {
            key: 'upload-docs',
            label: 'Upload Documents',
            onClick: () => t.success('Document upload opened'),
          },
        ]}
        columns={[
          { key: 'name', label: 'Tenant' },
          { key: 'unit', label: 'Unit' },
          { key: 'email', label: 'Email' },
          { key: 'phone', label: 'Phone' },
          {
            key: 'leaseEnd',
            label: 'Lease end',
            render: (row) => formatDate(row.leaseEnd),
          },
          {
            key: 'rent',
            label: 'Rent',
            render: (row) => formatCurrency(row.rent),
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
        title={editing ? 'Edit tenant' : 'Register tenant'}
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
            label="Full name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            label="Unit"
            value={form.unit}
            onChange={(e) => setForm({ ...form, unit: e.target.value })}
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <Input
            label="Phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <Input
            label="Lease start"
            type="date"
            value={form.leaseStart}
            onChange={(e) => setForm({ ...form, leaseStart: e.target.value })}
          />
          <Input
            label="Lease end"
            type="date"
            value={form.leaseEnd}
            onChange={(e) => setForm({ ...form, leaseEnd: e.target.value })}
          />
          <Input
            label="Rent (AED)"
            type="number"
            value={form.rent}
            onChange={(e) => setForm({ ...form, rent: e.target.value })}
            className="sm:col-span-2"
          />
        </div>
      </Modal>
    </>
  );
}
