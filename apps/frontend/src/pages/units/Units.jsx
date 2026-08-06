import { useState } from 'react';
import toast from 'react-hot-toast';
import EntityListPage from '../../components/ui/EntityListPage.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Modal from '../../components/ui/Modal.jsx';
import FormActionBar from '../../components/ui/FormActionBar.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import { remUnits, remBuildings } from '../../services/remsData.js';
import { formatCurrency } from '../../utils/format.js';
import {
  ASSIGN_OPTIONS,
  UNIT_STATUS_OPTIONS,
  getUnitWorkflowActions,
} from '../../utils/unitWorkflows.js';

export default function Units() {
  const [rows, setRows] = useState(remUnits);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    code: '',
    building: remBuildings[0]?.name || '',
    category: '',
    occupancyMode: 'Residential',
    rent: '',
    floor: '',
  });

  const openCreate = () => {
    setEditing(null);
    setForm({
      code: '',
      building: remBuildings[0]?.name || '',
      category: '',
      occupancyMode: 'Residential',
      rent: '',
      floor: '',
    });
    setFormOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      code: row.code || '',
      building: row.building || '',
      category: row.category || '',
      occupancyMode: row.occupancyMode || 'Residential',
      rent: String(row.rent ?? ''),
      floor: row.floor || '',
    });
    setFormOpen(true);
  };

  const save = (close = true) => {
    const payload = {
      ...form,
      rent: Number(form.rent) || 0,
    };
    if (editing) {
      setRows((prev) => prev.map((r) => (r.id === editing.id ? { ...r, ...payload } : r)));
      toast.success('Unit updated');
    } else {
      setRows((prev) => [
        {
          id: `unt-${Date.now()}`,
          status: 'Available',
          bedrooms: 1,
          bathrooms: 1,
          area: 0,
          amenities: [],
          images: [],
          ...payload,
        },
        ...prev,
      ]);
      toast.success('Unit created');
    }
    if (close) setFormOpen(false);
  };

  return (
    <>
      <EntityListPage
        title="Units"
        subtitle="All residential, commercial, and Airbnb units."
        breadcrumbs={[{ label: 'Property Management' }, { label: 'Units' }]}
        rows={rows}
        setRows={setRows}
        entityLabel="unit"
        exportFileName="units"
        statusOptions={UNIT_STATUS_OPTIONS}
        statusKey="status"
        searchKeys={['code', 'building', 'category', 'occupancyMode', 'status']}
        filters={[
          {
            key: 'occupancyMode',
            label: 'mode',
            options: [...new Set(rows.map((u) => u.occupancyMode))],
          },
          {
            key: 'status',
            label: 'status',
            options: [...new Set(rows.map((u) => u.status))],
          },
        ]}
        primaryAction={{ label: 'Add unit', onClick: openCreate }}
        onEdit={openEdit}
        onView={(row) => toast(`Viewing ${row.code}`)}
        assignOptions={ASSIGN_OPTIONS}
        getWorkflowActions={getUnitWorkflowActions}
        columns={[
          { key: 'code', label: 'Unit' },
          { key: 'building', label: 'Building' },
          { key: 'floor', label: 'Floor' },
          { key: 'category', label: 'Category' },
          { key: 'occupancyMode', label: 'Mode' },
          {
            key: 'rent',
            label: 'Rent',
            render: (row) =>
              row.occupancyMode === 'Airbnb'
                ? `${formatCurrency(row.rent, 'AED')}/night`
                : formatCurrency(row.rent, 'AED'),
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
        title={editing ? 'Edit unit' : 'Add unit'}
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
            label="Unit code"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
          />
          <Input
            label="Floor"
            value={form.floor}
            onChange={(e) => setForm({ ...form, floor: e.target.value })}
          />
          <Select
            label="Building"
            value={form.building}
            onChange={(e) => setForm({ ...form, building: e.target.value })}
          >
            {remBuildings.map((b) => (
              <option key={b.id} value={b.name}>
                {b.name}
              </option>
            ))}
          </Select>
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
            label="Category"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          />
          <Input
            label="Rent (AED)"
            type="number"
            value={form.rent}
            onChange={(e) => setForm({ ...form, rent: e.target.value })}
          />
        </div>
      </Modal>
    </>
  );
}
