import { useState } from 'react';
import toast from 'react-hot-toast';
import EntityListPage from '../../components/ui/EntityListPage.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Modal from '../../components/ui/Modal.jsx';
import FormActionBar from '../../components/ui/FormActionBar.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import { remAmenities } from '../../services/remsData.js';
import { ASSIGN_OPTIONS } from '../../utils/unitWorkflows.js';

export default function Amenities() {
  const [rows, setRows] = useState(remAmenities);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', scope: 'Unit' });

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', scope: 'Unit' });
    setFormOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({ name: row.name || '', scope: row.scope || 'Unit' });
    setFormOpen(true);
  };

  const save = (close = true) => {
    if (editing) {
      setRows((prev) => prev.map((r) => (r.id === editing.id ? { ...r, ...form } : r)));
      toast.success('Amenity updated');
    } else {
      setRows((prev) => [
        { id: `amn-${Date.now()}`, status: 'Active', ...form },
        ...prev,
      ]);
      toast.success('Amenity created');
    }
    if (close) setFormOpen(false);
  };

  return (
    <>
      <EntityListPage
        title="Amenities"
        subtitle="Building, unit, and shared amenities."
        breadcrumbs={[{ label: 'Property Management' }, { label: 'Amenities' }]}
        rows={rows}
        setRows={setRows}
        entityLabel="amenity"
        exportFileName="amenities"
        statusOptions={['Active', 'Inactive']}
        statusKey="status"
        searchKeys={['name', 'scope', 'status']}
        filters={[
          { key: 'scope', label: 'scope', options: [...new Set(rows.map((a) => a.scope))] },
          { key: 'status', label: 'status', options: [...new Set(rows.map((a) => a.status))] },
        ]}
        primaryAction={{ label: 'Add amenity', onClick: openCreate }}
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
          { key: 'name', label: 'Amenity' },
          { key: 'scope', label: 'Scope' },
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
        title={editing ? 'Edit amenity' : 'Add amenity'}
        footer={
          <FormActionBar
            onCancel={() => setFormOpen(false)}
            onReset={() => {
              setForm({ name: '', scope: 'Unit' });
              toast('Form reset');
            }}
            onSaveDraft={() => toast.success('Draft saved')}
            onSave={() => save(true)}
            onSaveAndNew={() => {
              save(false);
              setEditing(null);
              setForm({ name: '', scope: 'Unit' });
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
            label="Scope"
            value={form.scope}
            onChange={(e) => setForm({ ...form, scope: e.target.value })}
          >
            <option>Building</option>
            <option>Unit</option>
            <option>Shared</option>
          </Select>
        </div>
      </Modal>
    </>
  );
}
