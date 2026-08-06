import { useState } from 'react';
import toast from 'react-hot-toast';
import EntityListPage from '../../components/ui/EntityListPage.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Modal from '../../components/ui/Modal.jsx';
import FormActionBar from '../../components/ui/FormActionBar.jsx';
import Input from '../../components/ui/Input.jsx';
import { remCommercialTenants } from '../../services/remsData.js';
import { formatCurrency, formatDate } from '../../utils/format.js';
import { ASSIGN_OPTIONS } from '../../utils/unitWorkflows.js';

export default function CommercialTenants() {
  const [rows, setRows] = useState(remCommercialTenants);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    company: '',
    contactName: '',
    email: '',
    phone: '',
    unit: '',
    licenseNo: '',
    rent: '',
  });

  const openCreate = () => {
    setEditing(null);
    setForm({
      company: '',
      contactName: '',
      email: '',
      phone: '',
      unit: '',
      licenseNo: '',
      rent: '',
    });
    setFormOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      company: row.company || '',
      contactName: row.contactName || '',
      email: row.email || '',
      phone: row.phone || '',
      unit: row.unit || '',
      licenseNo: row.licenseNo || '',
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
          id: `ct-${Date.now()}`,
          status: 'Pending',
          taxId: '',
          leaseStart: '',
          leaseEnd: '',
          ...payload,
        },
        ...prev,
      ]);
      toast.success('Commercial tenant created');
    }
    if (close) setFormOpen(false);
  };

  return (
    <>
      <EntityListPage
        title="Commercial Tenants"
        subtitle="Business occupants and trade licenses."
        breadcrumbs={[{ label: 'Tenants' }, { label: 'Commercial' }]}
        rows={rows}
        setRows={setRows}
        entityLabel="tenant"
        exportFileName="commercial-tenants"
        statusOptions={['Active', 'Pending', 'Expired', 'Terminated']}
        statusKey="status"
        searchKeys={['company', 'contactName', 'email', 'unit', 'licenseNo', 'status']}
        filters={[
          { key: 'status', label: 'status', options: [...new Set(rows.map((t) => t.status))] },
        ]}
        primaryAction={{ label: 'Add tenant', onClick: openCreate }}
        onEdit={openEdit}
        onView={(row) => toast(`Viewing ${row.company}`)}
        assignOptions={ASSIGN_OPTIONS}
        getWorkflowActions={(row, { changeStatus, askConfirm, toast: t }) => [
          {
            key: 'verify',
            label: 'Verify Business',
            onClick: () => t.success(`${row.company} verified`),
          },
          {
            key: 'approve',
            label: 'Approve Contract',
            hidden: row.status === 'Active',
            onClick: () =>
              askConfirm({
                title: 'Approve contract?',
                message: `Approve commercial contract for ${row.company}?`,
                confirmLabel: 'Approve',
                action: () => changeStatus('Active'),
              }),
          },
          {
            key: 'renew',
            label: 'Renew Contract',
            onClick: () =>
              askConfirm({
                title: 'Renew contract?',
                message: `Renew contract for ${row.company}?`,
                confirmLabel: 'Renew',
                action: () => {
                  changeStatus('Active');
                  t.success('Contract renewed');
                },
              }),
          },
          {
            key: 'terminate',
            label: 'Terminate Contract',
            onClick: () =>
              askConfirm({
                title: 'Terminate contract?',
                message: `Terminate contract for ${row.company}?`,
                confirmLabel: 'Terminate',
                danger: true,
                action: () => changeStatus('Terminated'),
              }),
          },
        ]}
        columns={[
          { key: 'company', label: 'Company' },
          { key: 'contactName', label: 'Contact' },
          { key: 'unit', label: 'Unit' },
          { key: 'licenseNo', label: 'License' },
          {
            key: 'leaseEnd',
            label: 'Lease end',
            render: (row) => formatDate(row.leaseEnd),
          },
          {
            key: 'rent',
            label: 'Rent',
            render: (row) => formatCurrency(row.rent, 'AED'),
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
        title={editing ? 'Edit commercial tenant' : 'Add commercial tenant'}
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
            label="Company"
            value={form.company}
            onChange={(e) => setForm({ ...form, company: e.target.value })}
          />
          <Input
            label="Contact name"
            value={form.contactName}
            onChange={(e) => setForm({ ...form, contactName: e.target.value })}
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
            label="Unit"
            value={form.unit}
            onChange={(e) => setForm({ ...form, unit: e.target.value })}
          />
          <Input
            label="License No"
            value={form.licenseNo}
            onChange={(e) => setForm({ ...form, licenseNo: e.target.value })}
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
