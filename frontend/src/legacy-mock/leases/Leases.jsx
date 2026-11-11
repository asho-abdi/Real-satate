import { useState } from 'react';
import toast from 'react-hot-toast';
import EntityListPage from '../../components/ui/EntityListPage.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Modal from '../../components/ui/Modal.jsx';
import FormActionBar from '../../components/ui/FormActionBar.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import { remLeases } from '../../services/remsData.js';
import { formatCurrency, formatDate } from '../../utils/format.js';
import { ASSIGN_OPTIONS } from '../../utils/unitWorkflows.js';

export default function Leases() {
  const [rows, setRows] = useState(remLeases);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    tenant: '',
    tenantType: 'Residential',
    unit: '',
    startDate: '',
    endDate: '',
    rent: '',
  });

  const openCreate = () => {
    setEditing(null);
    setForm({
      tenant: '',
      tenantType: 'Residential',
      unit: '',
      startDate: '',
      endDate: '',
      rent: '',
    });
    setFormOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      tenant: row.tenant || '',
      tenantType: row.tenantType || 'Residential',
      unit: row.unit || '',
      startDate: row.startDate || '',
      endDate: row.endDate || '',
      rent: String(row.rent ?? ''),
    });
    setFormOpen(true);
  };

  const save = (close = true) => {
    const payload = { ...form, rent: Number(form.rent) || 0 };
    if (editing) {
      setRows((prev) => prev.map((r) => (r.id === editing.id ? { ...r, ...payload } : r)));
      toast.success('Lease updated');
    } else {
      setRows((prev) => [
        {
          id: `ls-${Date.now()}`,
          code: `LS-${form.tenantType === 'Commercial' ? 'C' : 'R'}-${Math.floor(Math.random() * 9000 + 1000)}`,
          status: 'Pending',
          documents: [],
          ...payload,
        },
        ...prev,
      ]);
      toast.success('Lease created');
    }
    if (close) setFormOpen(false);
  };

  return (
    <>
      <EntityListPage
        title="Leases"
        subtitle="Residential and commercial tenancy contracts."
        breadcrumbs={[{ label: 'Leases & Finance' }, { label: 'Leases' }]}
        rows={rows}
        setRows={setRows}
        entityLabel="lease"
        exportFileName="leases"
        statusOptions={['Active', 'Pending', 'Expired', 'Terminated']}
        statusKey="status"
        searchKeys={['code', 'tenant', 'unit', 'tenantType', 'status']}
        filters={[
          { key: 'status', label: 'status', options: [...new Set(rows.map((r) => r.status))] },
          {
            key: 'tenantType',
            label: 'type',
            options: [...new Set(rows.map((r) => r.tenantType))],
          },
        ]}
        primaryAction={{ label: 'New lease', onClick: openCreate }}
        onEdit={openEdit}
        onView={(row) => toast(`Viewing ${row.code}`)}
        assignOptions={ASSIGN_OPTIONS}
        getWorkflowActions={(row, { changeStatus, askConfirm, toast: t }) => [
          {
            key: 'activate',
            label: 'Activate',
            hidden: row.status === 'Active',
            onClick: () => changeStatus('Active'),
          },
          {
            key: 'approve',
            label: 'Approve',
            hidden: row.status !== 'Pending',
            onClick: () =>
              askConfirm({
                title: 'Approve lease?',
                message: `Approve ${row.code}?`,
                confirmLabel: 'Approve',
                action: () => changeStatus('Active'),
              }),
          },
          {
            key: 'renew',
            label: 'Renew',
            onClick: () =>
              askConfirm({
                title: 'Renew lease?',
                message: `Renew ${row.code}?`,
                confirmLabel: 'Renew',
                action: () => {
                  changeStatus('Active');
                  t.success('Lease renewed');
                },
              }),
          },
          {
            key: 'terminate',
            label: 'Terminate',
            onClick: () =>
              askConfirm({
                title: 'Terminate lease?',
                message: `Terminate ${row.code}?`,
                confirmLabel: 'Terminate',
                danger: true,
                action: () => changeStatus('Terminated'),
              }),
          },
          {
            key: 'expire',
            label: 'Mark Expired',
            hidden: row.status === 'Expired',
            onClick: () => changeStatus('Expired'),
          },
        ]}
        columns={[
          { key: 'code', label: 'Code' },
          { key: 'tenant', label: 'Tenant' },
          { key: 'tenantType', label: 'Type' },
          { key: 'unit', label: 'Unit' },
          {
            key: 'startDate',
            label: 'Start',
            render: (row) => formatDate(row.startDate),
          },
          {
            key: 'endDate',
            label: 'End',
            render: (row) => formatDate(row.endDate),
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
        title={editing ? 'Edit lease' : 'New lease'}
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
            label="Tenant"
            value={form.tenant}
            onChange={(e) => setForm({ ...form, tenant: e.target.value })}
          />
          <Select
            label="Type"
            value={form.tenantType}
            onChange={(e) => setForm({ ...form, tenantType: e.target.value })}
          >
            <option>Residential</option>
            <option>Commercial</option>
          </Select>
          <Input
            label="Unit"
            value={form.unit}
            onChange={(e) => setForm({ ...form, unit: e.target.value })}
          />
          <Input
            label="Rent (AED)"
            type="number"
            value={form.rent}
            onChange={(e) => setForm({ ...form, rent: e.target.value })}
          />
          <Input
            label="Start date"
            type="date"
            value={form.startDate}
            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
          />
          <Input
            label="End date"
            type="date"
            value={form.endDate}
            onChange={(e) => setForm({ ...form, endDate: e.target.value })}
          />
        </div>
      </Modal>
    </>
  );
}
