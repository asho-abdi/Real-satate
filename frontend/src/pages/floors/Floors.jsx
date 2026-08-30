import { useState } from 'react';
import toast from 'react-hot-toast';
import EntityListPage from '../../components/ui/EntityListPage.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Modal from '../../components/ui/Modal.jsx';
import FormActionBar from '../../components/ui/FormActionBar.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import { remFloors, remBuildings } from '../../services/remsData.js';
import { ASSIGN_OPTIONS } from '../../utils/unitWorkflows.js';

export default function Floors() {
  const [rows, setRows] = useState(remFloors);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', building: remBuildings[0]?.name || '', level: '' });

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', building: remBuildings[0]?.name || '', level: '' });
    setFormOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({ name: row.name || '', building: row.building || '', level: String(row.level ?? '') });
    setFormOpen(true);
  };

  const save = (close = true) => {
    if (editing) {
      setRows((prev) =>
        prev.map((r) =>
          r.id === editing.id
            ? { ...r, name: form.name, building: form.building, level: Number(form.level) || 0 }
            : r,
        ),
      );
      toast.success('Floor updated');
    } else {
      setRows((prev) => [
        {
          id: `fl-${Date.now()}`,
          buildingId: remBuildings.find((b) => b.name === form.building)?.id || '',
          name: form.name,
          building: form.building,
          level: Number(form.level) || 0,
          units: 0,
          status: 'Active',
        },
        ...prev,
      ]);
      toast.success('Floor created');
    }
    if (close) setFormOpen(false);
  };

  return (
    <>
      <EntityListPage
        title="Floors"
        subtitle="Floor plans mapped to buildings."
        breadcrumbs={[{ label: 'Property Management' }, { label: 'Floors' }]}
        rows={rows}
        setRows={setRows}
        entityLabel="floor"
        exportFileName="floors"
        statusOptions={['Active', 'Inactive']}
        statusKey="status"
        searchKeys={['name', 'building', 'status']}
        filters={[
          { key: 'status', label: 'status', options: [...new Set(rows.map((f) => f.status))] },
          { key: 'building', label: 'building', options: [...new Set(rows.map((f) => f.building))] },
        ]}
        primaryAction={{ label: 'Add floor', onClick: openCreate }}
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
                title: 'Deactivate floor?',
                message: `Deactivate ${row.name}?`,
                confirmLabel: 'Deactivate',
                danger: true,
                action: () => changeStatus('Inactive'),
              }),
          },
        ]}
        columns={[
          { key: 'name', label: 'Floor' },
          { key: 'building', label: 'Building' },
          { key: 'level', label: 'Level' },
          { key: 'units', label: 'Units' },
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
        title={editing ? 'Edit floor' : 'Add floor'}
        footer={
          <FormActionBar
            onCancel={() => setFormOpen(false)}
            onReset={() => {
              setForm({ name: '', building: remBuildings[0]?.name || '', level: '' });
              toast('Form reset');
            }}
            onSaveDraft={() => toast.success('Draft saved')}
            onSave={() => save(true)}
            onSaveAndNew={() => {
              save(false);
              setEditing(null);
              setForm({ name: '', building: remBuildings[0]?.name || '', level: '' });
              toast.success('Saved — ready for new');
            }}
            onSaveAndClose={() => save(true)}
          />
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Floor name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            label="Level"
            type="number"
            value={form.level}
            onChange={(e) => setForm({ ...form, level: e.target.value })}
          />
          <Select
            label="Building"
            value={form.building}
            onChange={(e) => setForm({ ...form, building: e.target.value })}
            className="sm:col-span-2"
          >
            {remBuildings.map((b) => (
              <option key={b.id} value={b.name}>
                {b.name}
              </option>
            ))}
          </Select>
        </div>
      </Modal>
    </>
  );
}
