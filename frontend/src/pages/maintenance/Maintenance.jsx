import { useState } from 'react';
import toast from 'react-hot-toast';
import EntityListPage from '../../components/ui/EntityListPage.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Modal from '../../components/ui/Modal.jsx';
import FormActionBar from '../../components/ui/FormActionBar.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import { remMaintenance } from '../../services/remsData.js';
import { formatDate } from '../../utils/format.js';
import { ASSIGN_OPTIONS } from '../../utils/unitWorkflows.js';

const TECHS = ['Tech Team A', 'Tech Team B', 'Plumber - Yusuf', 'Otis Service', 'Building Ops', 'Unassigned'];

export default function Maintenance() {
  const [rows, setRows] = useState(remMaintenance);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    title: '',
    unit: '',
    building: '',
    priority: 'Medium',
    description: '',
    assignee: 'Unassigned',
  });

  const openCreate = () => {
    setEditing(null);
    setForm({
      title: '',
      unit: '',
      building: '',
      priority: 'Medium',
      description: '',
      assignee: 'Unassigned',
    });
    setFormOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      title: row.title || '',
      unit: row.unit || '',
      building: row.building || '',
      priority: row.priority || 'Medium',
      description: row.description || '',
      assignee: row.assignee || 'Unassigned',
    });
    setFormOpen(true);
  };

  const save = (close = true) => {
    if (editing) {
      setRows((prev) => prev.map((r) => (r.id === editing.id ? { ...r, ...form } : r)));
      toast.success('Ticket updated');
    } else {
      setRows((prev) => [
        {
          id: `mt-${Date.now()}`,
          code: `MT-${Math.floor(Math.random() * 9000 + 1000)}`,
          status: 'Open',
          openedAt: new Date().toISOString(),
          ...form,
        },
        ...prev,
      ]);
      toast.success('Ticket created');
    }
    if (close) setFormOpen(false);
  };

  return (
    <>
      <EntityListPage
        title="Maintenance"
        subtitle="Work orders and technician assignments."
        breadcrumbs={[{ label: 'Operations' }, { label: 'Maintenance' }]}
        rows={rows}
        setRows={setRows}
        entityLabel="ticket"
        exportFileName="maintenance"
        statusOptions={['Open', 'In Progress', 'Resolved', 'Closed']}
        statusKey="status"
        searchKeys={['code', 'title', 'unit', 'building', 'priority', 'status', 'assignee']}
        filters={[
          { key: 'status', label: 'status', options: [...new Set(rows.map((r) => r.status))] },
          { key: 'priority', label: 'priority', options: [...new Set(rows.map((r) => r.priority))] },
        ]}
        primaryAction={{ label: 'Create ticket', onClick: openCreate }}
        onEdit={openEdit}
        onView={(row) => toast(`Viewing ${row.code}`)}
        assignOptions={TECHS}
        getWorkflowActions={(row, { changeStatus, updateRows, askConfirm, toast: t }) => [
          {
            key: 'assign',
            label: 'Assign Technician',
            onClick: () => {
              updateRows((prev) =>
                prev.map((r) =>
                  r.id === row.id
                    ? { ...r, assignee: 'Tech Team A', status: r.status === 'Open' ? 'In Progress' : r.status }
                    : r,
                ),
              );
              t.success(`Technician assigned to ${row.code}`);
            },
          },
          {
            key: 'progress',
            label: 'Update Progress',
            hidden: row.status === 'Closed',
            onClick: () => changeStatus('In Progress'),
          },
          {
            key: 'complete',
            label: 'Complete',
            hidden: ['Resolved', 'Closed'].includes(row.status),
            onClick: () => changeStatus('Resolved'),
          },
          {
            key: 'close',
            label: 'Close',
            hidden: row.status === 'Closed',
            onClick: () =>
              askConfirm({
                title: 'Close ticket?',
                message: `Close ${row.code}?`,
                confirmLabel: 'Close',
                action: () => changeStatus('Closed'),
              }),
          },
          {
            key: 'reopen',
            label: 'Reopen',
            hidden: !['Resolved', 'Closed'].includes(row.status),
            onClick: () => changeStatus('Open'),
          },
        ]}
        columns={[
          { key: 'code', label: 'Code' },
          { key: 'title', label: 'Issue' },
          { key: 'unit', label: 'Unit' },
          { key: 'building', label: 'Building' },
          {
            key: 'priority',
            label: 'Priority',
            render: (row) => <Badge status={row.priority}>{row.priority}</Badge>,
          },
          { key: 'assignee', label: 'Assignee' },
          {
            key: 'openedAt',
            label: 'Opened',
            render: (row) => formatDate(row.openedAt),
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
        title={editing ? 'Edit ticket' : 'Create ticket'}
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
            label="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="sm:col-span-2"
          />
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
            label="Priority"
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: e.target.value })}
          >
            <option>Low</option>
            <option>Medium</option>
            <option>High</option>
            <option>Urgent</option>
          </Select>
          <Select
            label="Assignee"
            value={form.assignee}
            onChange={(e) => setForm({ ...form, assignee: e.target.value })}
          >
            {TECHS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </Select>
          <Input
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="sm:col-span-2"
          />
        </div>
      </Modal>
    </>
  );
}
