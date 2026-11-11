import { useState } from 'react';
import toast from 'react-hot-toast';
import EntityListPage from '../../components/ui/EntityListPage.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Modal from '../../components/ui/Modal.jsx';
import FormActionBar from '../../components/ui/FormActionBar.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import { remUnitCategories } from '../../services/remsData.js';
import { formatCurrency } from '../../utils/format.js';
import { ASSIGN_OPTIONS } from '../../utils/unitWorkflows.js';

export default function UnitCategories() {
  const [rows, setRows] = useState(remUnitCategories);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: '',
    occupancyMode: 'Residential',
    baseRate: '',
    description: '',
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', occupancyMode: 'Residential', baseRate: '', description: '' });
    setFormOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      name: row.name || '',
      occupancyMode: row.occupancyMode || 'Residential',
      baseRate: String(row.baseRate ?? ''),
      description: row.description || '',
    });
    setFormOpen(true);
  };

  const save = (close = true) => {
    const payload = { ...form, baseRate: Number(form.baseRate) || 0 };
    if (editing) {
      setRows((prev) => prev.map((r) => (r.id === editing.id ? { ...r, ...payload } : r)));
      toast.success('Category updated');
    } else {
      setRows((prev) => [
        { id: `ucat-${Date.now()}`, status: 'Active', ...payload },
        ...prev,
      ]);
      toast.success('Category created');
    }
    if (close) setFormOpen(false);
  };

  return (
    <>
      <EntityListPage
        title="Unit Categories"
        subtitle="Rate templates by occupancy mode."
        breadcrumbs={[{ label: 'Property Management' }, { label: 'Unit Categories' }]}
        rows={rows}
        setRows={setRows}
        entityLabel="category"
        exportFileName="unit-categories"
        statusOptions={['Active', 'Inactive']}
        statusKey="status"
        searchKeys={['name', 'occupancyMode', 'description', 'status']}
        filters={[
          {
            key: 'occupancyMode',
            label: 'mode',
            options: [...new Set(rows.map((r) => r.occupancyMode))],
          },
          { key: 'status', label: 'status', options: [...new Set(rows.map((r) => r.status))] },
        ]}
        primaryAction={{ label: 'Add category', onClick: openCreate }}
        onEdit={openEdit}
        onView={(row) => toast(`Viewing ${row.name}`)}
        assignOptions={ASSIGN_OPTIONS}
        getWorkflowActions={(row, { changeStatus }) => [
          {
            key: 'activate',
            label: 'Activate',
            hidden: row.status === 'Active',
            onClick: () => changeStatus('Active'),
          },
          {
            key: 'deactivate',
            label: 'Deactivate',
            hidden: row.status !== 'Active',
            onClick: () => changeStatus('Inactive'),
          },
        ]}
        columns={[
          { key: 'name', label: 'Category' },
          { key: 'occupancyMode', label: 'Mode' },
          {
            key: 'baseRate',
            label: 'Base rate',
            render: (row) => formatCurrency(row.baseRate),
          },
          { key: 'description', label: 'Description' },
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
        title={editing ? 'Edit category' : 'Add category'}
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
            label="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Select
            label="Mode"
            value={form.occupancyMode}
            onChange={(e) => setForm({ ...form, occupancyMode: e.target.value })}
          >
            <option>Residential</option>
            <option>Commercial</option>
            <option>Airbnb</option>
          </Select>
          <Input
            label="Base rate (AED)"
            type="number"
            value={form.baseRate}
            onChange={(e) => setForm({ ...form, baseRate: e.target.value })}
          />
          <Input
            label="Description"
            className="sm:col-span-2"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
      </Modal>
    </>
  );
}
