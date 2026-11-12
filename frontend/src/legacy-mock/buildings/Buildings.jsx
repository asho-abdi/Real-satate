import { useState } from 'react';
import toast from 'react-hot-toast';
import EntityListPage from '../../components/ui/EntityListPage.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Modal from '../../components/ui/Modal.jsx';
import FormActionBar from '../../components/ui/FormActionBar.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import { remBuildings } from '../../services/remsData.js';
import { ASSIGN_OPTIONS } from '../../utils/unitWorkflows.js';

export default function Buildings() {
  const [rows, setRows] = useState(remBuildings);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', code: '', city: 'Dubai', address: '', manager: '' });

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', code: '', city: 'Dubai', address: '', manager: '' });
    setFormOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      name: row.name || '',
      code: row.code || '',
      city: row.city || 'Dubai',
      address: row.address || '',
      manager: row.manager || '',
    });
    setFormOpen(true);
  };

  const save = (close = true) => {
    if (editing) {
      setRows((prev) => prev.map((r) => (r.id === editing.id ? { ...r, ...form } : r)));
      toast.success('Building updated');
    } else {
      setRows((prev) => [
        {
          id: `bld-${Date.now()}`,
          floors: 0,
          units: 0,
          status: 'Active',
          ...form,
        },
        ...prev,
      ]);
      toast.success('Building created');
    }
    if (close) setFormOpen(false);
  };

  return (
    <>
      <EntityListPage
        title="Buildings"
        subtitle="Mixed-use towers and assets in the portfolio."
        breadcrumbs={[{ label: 'Property Management' }, { label: 'Buildings' }]}
        rows={rows}
        setRows={setRows}
        entityLabel="building"
        exportFileName="buildings"
        statusOptions={['Active', 'Inactive']}
        statusKey="status"
        searchKeys={['name', 'code', 'address', 'city', 'manager', 'status']}
        filters={[
          { key: 'status', label: 'status', options: [...new Set(rows.map((b) => b.status))] },
          { key: 'city', label: 'city', options: [...new Set(rows.map((b) => b.city))] },
        ]}
        primaryAction={{ label: 'Add building', onClick: openCreate }}
        onEdit={openEdit}
        onView={(row) => toast(`Viewing ${row.name}`)}
        assignOptions={ASSIGN_OPTIONS}
        getWorkflowActions={(row, { changeStatus, askConfirm }) => [
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
            onClick: () =>
              askConfirm({
                title: 'Deactivate building?',
                message: `Deactivate ${row.name}?`,
                confirmLabel: 'Deactivate',
                danger: true,
                action: () => changeStatus('Inactive'),
              }),
          },
        ]}
        columns={[
          { key: 'name', label: 'Building' },
          { key: 'code', label: 'Code' },
          { key: 'city', label: 'City' },
          { key: 'floors', label: 'Floors' },
          { key: 'units', label: 'Units' },
          { key: 'manager', label: 'Manager' },
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
        title={editing ? 'Edit building' : 'Add building'}
        footer={
          <FormActionBar
            onCancel={() => setFormOpen(false)}
            onReset={() => {
              setForm({ name: '', code: '', city: 'Dubai', address: '', manager: '' });
              toast('Form reset');
            }}
            onSaveDraft={() => toast.success('Draft saved')}
            onSave={() => save(true)}
            onSaveAndNew={() => {
              save(false);
              setEditing(null);
              setForm({ name: '', code: '', city: 'Dubai', address: '', manager: '' });
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
          <Input
            label="Code"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
          />
          <Input
            label="City"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
          />
          <Input
            label="Manager"
            value={form.manager}
            onChange={(e) => setForm({ ...form, manager: e.target.value })}
          />
          <Input
            label="Address"
            className="sm:col-span-2"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
          <Select
            label="Status"
            value={editing?.status || 'Active'}
            onChange={() => {}}
            disabled
          >
            <option>Active</option>
            <option>Inactive</option>
          </Select>
        </div>
      </Modal>
    </>
  );
}
