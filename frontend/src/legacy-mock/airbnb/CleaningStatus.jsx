import { useState } from 'react';
import toast from 'react-hot-toast';
import EntityListPage from '../../components/ui/EntityListPage.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Modal from '../../components/ui/Modal.jsx';
import FormActionBar from '../../components/ui/FormActionBar.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import { remCleaningBoard } from '../../services/remsData.js';
import { formatDate } from '../../utils/format.js';
import { ASSIGN_OPTIONS } from '../../utils/unitWorkflows.js';

export default function CleaningStatus() {
  const [rows, setRows] = useState(remCleaningBoard);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    unit: '',
    building: '',
    cleaningStatus: 'Dirty',
    assignee: 'Cleaning Team',
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ unit: '', building: '', cleaningStatus: 'Dirty', assignee: 'Cleaning Team' });
    setFormOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      unit: row.unit || '',
      building: row.building || '',
      cleaningStatus: row.cleaningStatus || 'Dirty',
      assignee: row.assignee || 'Cleaning Team',
    });
    setFormOpen(true);
  };

  const save = (close = true) => {
    if (editing) {
      setRows((prev) => prev.map((r) => (r.id === editing.id ? { ...r, ...form } : r)));
      toast.success('Cleaning task updated');
    } else {
      setRows((prev) => [
        {
          id: `cln-${Date.now()}`,
          status: 'Available',
          nextCheckIn: null,
          ...form,
        },
        ...prev,
      ]);
      toast.success('Cleaning task created');
    }
    if (close) setFormOpen(false);
  };

  return (
    <>
      <EntityListPage
        title="Cleaning Status"
        subtitle="Housekeeping board for Airbnb units."
        breadcrumbs={[{ label: 'Airbnb' }, { label: 'Cleaning Status' }]}
        rows={rows}
        setRows={setRows}
        entityLabel="cleaning task"
        exportFileName="cleaning-status"
        statusOptions={['Clean', 'Dirty', 'In Progress', 'Inspected']}
        statusKey="cleaningStatus"
        searchKeys={['unit', 'building', 'cleaningStatus', 'status']}
        filters={[
          {
            key: 'cleaningStatus',
            label: 'cleaning',
            options: [...new Set(rows.map((r) => r.cleaningStatus))],
          },
          { key: 'building', label: 'building', options: [...new Set(rows.map((r) => r.building))] },
        ]}
        primaryAction={{ label: 'Add task', onClick: openCreate }}
        onEdit={openEdit}
        onView={(row) => toast(`Viewing ${row.unit}`)}
        assignOptions={['Cleaning Team', 'Cleaner A', 'Cleaner B', 'Ops Lead']}
        getWorkflowActions={(row, { changeStatus, updateRows, toast: t }) => [
          {
            key: 'mark-clean',
            label: 'Mark Clean',
            hidden: row.cleaningStatus === 'Clean',
            onClick: () => changeStatus('Clean'),
          },
          {
            key: 'assign-cleaner',
            label: 'Assign Cleaner',
            onClick: () => {
              updateRows((prev) =>
                prev.map((r) =>
                  r.id === row.id
                    ? { ...r, cleaningStatus: 'In Progress', assignee: 'Cleaning Team' }
                    : r,
                ),
              );
              t.success(`Cleaner assigned to ${row.unit}`);
            },
          },
          {
            key: 'start',
            label: 'Start Cleaning',
            hidden: row.cleaningStatus === 'In Progress',
            onClick: () => changeStatus('In Progress'),
          },
        ]}
        columns={[
          { key: 'unit', label: 'Unit' },
          { key: 'building', label: 'Building' },
          {
            key: 'cleaningStatus',
            label: 'Cleaning',
            render: (row) => <Badge status={row.cleaningStatus}>{row.cleaningStatus}</Badge>,
          },
          {
            key: 'status',
            label: 'Unit status',
            render: (row) => <Badge status={row.status}>{row.status}</Badge>,
          },
          {
            key: 'nextCheckIn',
            label: 'Next check-in',
            render: (row) => (row.nextCheckIn ? formatDate(row.nextCheckIn) : '—'),
          },
          { key: 'assignee', label: 'Assignee' },
        ]}
      />

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit cleaning task' : 'Add cleaning task'}
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
            label="Unit"
            value={form.unit}
            onChange={(e) => setForm({ ...form, unit: e.target.value })}
          />
          <Input
            label="Building"
            value={form.building}
            onChange={(e) => setForm({ ...form, building: e.target.value })}
          />
          <Select
            label="Cleaning status"
            value={form.cleaningStatus}
            onChange={(e) => setForm({ ...form, cleaningStatus: e.target.value })}
          >
            <option>Dirty</option>
            <option>In Progress</option>
            <option>Clean</option>
            <option>Inspected</option>
          </Select>
          <Select
            label="Assignee"
            value={form.assignee}
            onChange={(e) => setForm({ ...form, assignee: e.target.value })}
          >
            {ASSIGN_OPTIONS.map((a) => (
              <option key={a}>{a}</option>
            ))}
            <option>Cleaning Team</option>
          </Select>
        </div>
      </Modal>
    </>
  );
}
