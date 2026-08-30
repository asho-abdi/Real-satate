import { useState } from 'react';
import toast from 'react-hot-toast';
import EntityListPage from '../components/ui/EntityListPage.jsx';
import Badge from '../components/ui/Badge.jsx';
import Modal from '../components/ui/Modal.jsx';
import FormActionBar from '../components/ui/FormActionBar.jsx';
import Input from '../components/ui/Input.jsx';
import Select from '../components/ui/Select.jsx';
import { remUsers, remRoles } from '../services/remsData.js';
import { formatDate } from '../utils/format.js';
import { ASSIGN_OPTIONS } from '../utils/unitWorkflows.js';

export default function Users() {
  const [rows, setRows] = useState(remUsers);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: remRoles[0]?.name || 'Property Manager',
  });

  const openCreate = () => {
    setEditing(null);
    setForm({
      name: '',
      email: '',
      phone: '',
      role: remRoles[0]?.name || 'Property Manager',
    });
    setFormOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      name: row.name || '',
      email: row.email || '',
      phone: row.phone || '',
      role: row.role || '',
    });
    setFormOpen(true);
  };

  const save = (close = true) => {
    const roleId = remRoles.find((r) => r.name === form.role)?.id;
    if (editing) {
      setRows((prev) =>
        prev.map((r) => (r.id === editing.id ? { ...r, ...form, roleId } : r)),
      );
      toast.success('User updated');
    } else {
      setRows((prev) => [
        {
          id: `usr-${Date.now()}`,
          status: 'Active',
          lastLogin: null,
          avatar: '',
          roleId,
          ...form,
        },
        ...prev,
      ]);
      toast.success('User invited');
    }
    if (close) setFormOpen(false);
  };

  return (
    <>
      <EntityListPage
        title="Users"
        subtitle="Staff accounts with role assignments."
        breadcrumbs={[{ label: 'Administration' }, { label: 'Users' }]}
        rows={rows}
        setRows={setRows}
        entityLabel="user"
        exportFileName="users"
        statusOptions={['Active', 'Inactive', 'Locked']}
        statusKey="status"
        searchKeys={['name', 'email', 'role', 'status']}
        filters={[
          { key: 'status', label: 'status', options: [...new Set(rows.map((u) => u.status))] },
          { key: 'role', label: 'role', options: [...new Set(rows.map((u) => u.role))] },
        ]}
        primaryAction={{ label: 'Invite user', onClick: openCreate }}
        onEdit={openEdit}
        onView={(row) => toast(`Viewing ${row.name}`)}
        assignOptions={ASSIGN_OPTIONS}
        getWorkflowActions={(row, { changeStatus, updateRows, askConfirm, toast: t }) => [
          {
            key: 'activate',
            label: 'Activate',
            hidden: row.status === 'Active',
            onClick: () => changeStatus('Active'),
          },
          {
            key: 'deactivate',
            label: 'Deactivate',
            hidden: row.status === 'Inactive',
            onClick: () =>
              askConfirm({
                title: 'Deactivate user?',
                message: `Deactivate ${row.name}?`,
                confirmLabel: 'Deactivate',
                danger: true,
                action: () => changeStatus('Inactive'),
              }),
          },
          {
            key: 'lock',
            label: 'Lock',
            hidden: row.status === 'Locked',
            onClick: () => changeStatus('Locked'),
          },
          {
            key: 'unlock',
            label: 'Unlock',
            hidden: row.status !== 'Locked',
            onClick: () => changeStatus('Active'),
          },
          {
            key: 'reset-pw',
            label: 'Reset Password',
            onClick: () => t.success(`Password reset email sent to ${row.email}`),
          },
          {
            key: 'assign-role',
            label: 'Assign Role',
            onClick: () => {
              const next = remRoles.find((r) => r.name !== row.role)?.name || row.role;
              updateRows((prev) =>
                prev.map((r) =>
                  r.id === row.id
                    ? {
                        ...r,
                        role: next,
                        roleId: remRoles.find((x) => x.name === next)?.id,
                      }
                    : r,
                ),
              );
              t.success(`Role set to ${next}`);
            },
          },
        ]}
        columns={[
          { key: 'name', label: 'Name' },
          { key: 'email', label: 'Email' },
          { key: 'role', label: 'Role' },
          {
            key: 'lastLogin',
            label: 'Last login',
            render: (row) => (row.lastLogin ? formatDate(row.lastLogin) : '—'),
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
        title={editing ? 'Edit user' : 'Invite user'}
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
          <Select
            label="Role"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            {remRoles.map((r) => (
              <option key={r.id} value={r.name}>
                {r.name}
              </option>
            ))}
          </Select>
        </div>
      </Modal>
    </>
  );
}
