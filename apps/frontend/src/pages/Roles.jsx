import { useState } from 'react';
import toast from 'react-hot-toast';
import EntityListPage from '../components/ui/EntityListPage.jsx';
import Modal from '../components/ui/Modal.jsx';
import FormActionBar from '../components/ui/FormActionBar.jsx';
import Input from '../components/ui/Input.jsx';
import { remRoles } from '../services/remsData.js';
import { ASSIGN_OPTIONS } from '../utils/unitWorkflows.js';

export default function Roles() {
  const [rows, setRows] = useState(
    remRoles.map((r) => ({ ...r, status: 'Active' })),
  );
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', permissions: '' });

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', description: '', permissions: '' });
    setFormOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      name: row.name || '',
      description: row.description || '',
      permissions: (row.permissions || []).join(', '),
    });
    setFormOpen(true);
  };

  const save = (close = true) => {
    const permissions = form.permissions
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);
    if (editing) {
      setRows((prev) =>
        prev.map((r) =>
          r.id === editing.id
            ? { ...r, name: form.name, description: form.description, permissions }
            : r,
        ),
      );
      toast.success('Role updated');
    } else {
      setRows((prev) => [
        {
          id: `role-${Date.now()}`,
          name: form.name,
          description: form.description,
          permissions,
          status: 'Active',
        },
        ...prev,
      ]);
      toast.success('Role created');
    }
    if (close) setFormOpen(false);
  };

  return (
    <>
      <EntityListPage
        title="Roles & permissions"
        subtitle="Access profiles for REMS modules."
        breadcrumbs={[{ label: 'Administration' }, { label: 'Roles' }]}
        rows={rows}
        setRows={setRows}
        entityLabel="role"
        exportFileName="roles"
        statusOptions={['Active', 'Inactive']}
        statusKey="status"
        searchKeys={['name', 'description']}
        primaryAction={{ label: 'Add role', onClick: openCreate }}
        onEdit={openEdit}
        onView={(row) => toast(`Viewing ${row.name}`)}
        assignOptions={ASSIGN_OPTIONS}
        showDuplicate={false}
        getWorkflowActions={(row, { toast: t, updateRows }) => [
          {
            key: 'permissions',
            label: 'Manage Permissions',
            onClick: () => {
              setEditing(row);
              setForm({
                name: row.name || '',
                description: row.description || '',
                permissions: (row.permissions || []).join(', '),
              });
              setFormOpen(true);
              t('Manage permissions');
            },
          },
          {
            key: 'duplicate-role',
            label: 'Duplicate Role',
            onClick: () => {
              updateRows((prev) => [
                {
                  ...row,
                  id: `role-${Date.now()}`,
                  name: `${row.name} (Copy)`,
                  status: 'Active',
                },
                ...prev,
              ]);
              t.success('Role duplicated');
            },
          },
        ]}
        columns={[
          { key: 'name', label: 'Role' },
          { key: 'description', label: 'Description' },
          {
            key: 'permissions',
            label: 'Permissions',
            render: (row) => row.permissions?.length ?? 0,
          },
        ]}
      />

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit role' : 'Add role'}
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
        <div className="grid gap-4">
          <Input
            label="Role name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <Input
            label="Permissions (comma-separated)"
            value={form.permissions}
            onChange={(e) => setForm({ ...form, permissions: e.target.value })}
          />
        </div>
      </Modal>
    </>
  );
}
