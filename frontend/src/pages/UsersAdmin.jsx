import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import PageHeader from '../components/ui/PageHeader.jsx';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import Input from '../components/ui/Input.jsx';
import Select from '../components/ui/Select.jsx';
import Modal from '../components/ui/Modal.jsx';
import Badge from '../components/ui/Badge.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx';
import { adminApi } from '../services/adminApi.js';
import { rentalApi } from '../services/rentalApi.js';
import { cn } from '../utils/format.js';
import { useAuth } from '../context/AuthContext.jsx';

const emptyForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
  roleCode: 'BUILDING_MANAGER',
  buildingIds: [],
  isActive: true,
};

export default function UsersAdmin() {
  const { user: currentUser } = useAuth();
  const [tab, setTab] = useState('users');
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [permRoleId, setPermRoleId] = useState('');
  const [selectedPermIds, setSelectedPermIds] = useState([]);
  const [savingPerms, setSavingPerms] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [u, r, p, b] = await Promise.all([
        adminApi.listUsers(),
        adminApi.listRoles(),
        adminApi.listPermissions(),
        rentalApi.listBuildings(),
      ]);
      setUsers(u);
      setRoles(r);
      setPermissions(p);
      setBuildings(b);
      if (!permRoleId && r.length) {
        const manager = r.find((x) => x.code === 'BUILDING_MANAGER') || r[0];
        setPermRoleId(manager.id);
        setSelectedPermIds(manager.permissions.map((x) => x.id));
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [permRoleId]);

  useEffect(() => {
    load();
  }, [load]);

  const selectedRole = useMemo(
    () => roles.find((r) => r.id === permRoleId),
    [roles, permRoleId],
  );

  useEffect(() => {
    if (!selectedRole) return;
    setSelectedPermIds(selectedRole.permissions.map((p) => p.id));
  }, [selectedRole?.id]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (u) => {
    setEditing(u);
    setForm({
      firstName: u.firstName || '',
      lastName: u.lastName || '',
      email: u.email || '',
      phone: u.phone || '',
      password: '',
      roleCode: u.role || 'BUILDING_MANAGER',
      buildingIds: (u.buildings || []).map((b) => b.id),
      isActive: u.isActive !== false,
    });
    setModalOpen(true);
  };

  const toggleBuilding = (id) => {
    setForm((prev) => {
      const has = prev.buildingIds.includes(id);
      return {
        ...prev,
        buildingIds: has
          ? prev.buildingIds.filter((x) => x !== id)
          : [...prev.buildingIds, id],
      };
    });
  };

  const saveUser = async () => {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) {
      toast.error('Name and email are required');
      return;
    }
    if (!editing && !form.password) {
      toast.error('Password is required for new users');
      return;
    }
    if (form.roleCode === 'BUILDING_MANAGER' && form.buildingIds.length === 0) {
      toast.error('Assign at least one building to Building Managers');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        roleCode: form.roleCode,
        buildingIds: form.roleCode === 'ADMIN' ? [] : form.buildingIds,
        isActive: form.isActive,
        ...(form.password ? { password: form.password } : {}),
      };

      if (editing) {
        await adminApi.updateUser(editing.id, payload);
        toast.success('User updated');
      } else {
        await adminApi.createUser(payload);
        toast.success('User created');
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Could not save user');
    } finally {
      setSaving(false);
    }
  };

  const askDelete = (u) => {
    setConfirm({
      title: 'Delete user?',
      message: `Remove access for ${u.name || u.email}? This cannot be undone.`,
      confirmLabel: 'Delete User',
      onConfirm: async () => {
        try {
          await adminApi.deleteUser(u.id);
          toast.success('User deleted');
          setConfirm(null);
          await load();
        } catch (err) {
          toast.error(err.response?.data?.message || err.message || 'Could not delete user');
        }
      },
    });
  };

  const savePermissions = async () => {
    if (!permRoleId || selectedRole?.code === 'ADMIN') return;
    setSavingPerms(true);
    try {
      await adminApi.updateRolePermissions(permRoleId, selectedPermIds);
      toast.success('Permissions updated');
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Could not update permissions');
    } finally {
      setSavingPerms(false);
    }
  };

  if (!currentUser?.isAdmin && currentUser?.role !== 'ADMIN') {
    return (
      <div>
        <PageHeader title="Users & Access" subtitle="Admin only." />
        <Card>
          <p className="text-sm text-[var(--text-muted)]">
            You do not have permission to manage users, roles, or building assignments.
          </p>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Users & Access"
        subtitle="Create users, assign roles, and scope building access."
        actions={
          tab === 'users' ? (
            <Button className="h-12 px-5" onClick={openCreate}>
              Add User
            </Button>
          ) : null
        }
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {[
          { id: 'users', label: `Users (${users.length})` },
          { id: 'roles', label: `Roles & Permissions (${roles.length})` },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              'h-12 rounded-xl px-5 text-base font-medium transition',
              tab === t.id
                ? 'bg-brand-700 text-white dark:bg-brand-400 dark:text-ink-950'
                : 'bg-[var(--surface)] text-[var(--text-muted)] ring-1 ring-[var(--border)]',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'users' ? (
        <div className="space-y-4">
          {users.map((u) => (
            <Card
              key={u.id}
              title={`${u.firstName} ${u.lastName}`}
              action={
                <div className="flex flex-wrap items-center gap-2">
                  <Badge status={u.isActive ? 'Available' : 'Reserved'}>
                    {u.isActive ? 'Active' : 'Disabled'}
                  </Badge>
                  <button
                    type="button"
                    onClick={() => openEdit(u)}
                    className="rounded-xl border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] transition hover:bg-[var(--surface-2)]"
                  >
                    Edit
                  </button>
                  {u.id !== currentUser?.id ? (
                    <button
                      type="button"
                      onClick={() => askDelete(u)}
                      className="rounded-xl border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-50"
                    >
                      Delete
                    </button>
                  ) : null}
                </div>
              }
            >
              <p className="text-sm text-[var(--text-muted)]">
                {u.email} · Role <strong className="text-[var(--text)]">{u.roleName || u.role}</strong>
              </p>
              <p className="mt-1 text-sm text-[var(--text)]">
                {u.isAdmin || u.role === 'ADMIN'
                  ? 'Manages: all buildings'
                  : `Manages: ${(u.buildings || []).map((b) => b.name || b.code).join(', ') || 'None assigned'}`}
              </p>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
          <Card title="Roles">
            <div className="space-y-2">
              {roles.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setPermRoleId(r.id)}
                  className={cn(
                    'w-full rounded-xl px-3 py-2.5 text-left text-sm transition',
                    permRoleId === r.id
                      ? 'bg-brand-700 text-white'
                      : 'bg-[var(--surface-2)] text-[var(--text)] hover:bg-[var(--border)]/40',
                  )}
                >
                  <p className="font-medium">{r.name}</p>
                  <p className={cn('text-xs', permRoleId === r.id ? 'text-white/80' : 'text-[var(--text-muted)]')}>
                    {r.userCount} users · {r.permissions.length} permissions
                  </p>
                </button>
              ))}
            </div>
          </Card>

          <Card
            title={selectedRole ? `${selectedRole.name} permissions` : 'Permissions'}
            action={
              selectedRole?.code !== 'ADMIN' ? (
                <Button className="h-10 px-4" onClick={savePermissions} disabled={savingPerms}>
                  {savingPerms ? 'Saving…' : 'Save Permissions'}
                </Button>
              ) : null
            }
          >
            {selectedRole?.code === 'ADMIN' ? (
              <p className="text-sm text-[var(--text-muted)]">
                Admin has full access to every building and all permissions. These cannot be reduced.
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {permissions.map((p) => {
                  const checked = selectedPermIds.includes(p.id);
                  return (
                    <label
                      key={p.id}
                      className="flex cursor-pointer items-start gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={checked}
                        onChange={() => {
                          setSelectedPermIds((prev) =>
                            checked ? prev.filter((id) => id !== p.id) : [...prev, p.id],
                          );
                        }}
                      />
                      <span>
                        <span className="font-medium text-[var(--text)]">{p.code}</span>
                        <span className="mt-0.5 block text-xs text-[var(--text-muted)]">{p.name}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        title={editing ? 'Edit User' : 'Create User'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" className="h-12 px-5" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button className="h-12 px-5" onClick={saveUser} disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create User'}
            </Button>
          </div>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="First name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
          <Input label="Last name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input
            label={editing ? 'New password (optional)' : 'Password'}
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <Select
            label="Role"
            value={form.roleCode}
            onChange={(e) => {
              const roleCode = e.target.value;
              setForm((prev) => ({
                ...prev,
                roleCode,
                // Admins see every building; managers must be given specific ones
                buildingIds: roleCode === 'ADMIN' ? [] : prev.buildingIds,
              }));
            }}
          >
            {roles.map((r) => (
              <option key={r.id} value={r.code}>
                {r.name}
              </option>
            ))}
          </Select>
          <Select
            label="Status"
            value={form.isActive ? 'active' : 'disabled'}
            onChange={(e) => setForm({ ...form, isActive: e.target.value === 'active' })}
          >
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
          </Select>
        </div>

        {form.roleCode !== 'ADMIN' ? (
          <div className="mt-5">
            <p className="mb-1 text-sm font-medium text-[var(--text)]">Buildings this user manages</p>
            <p className="mb-3 text-xs text-[var(--text-muted)]">
              Tick the buildings they can see and work on. Example: choose SIHAAM so this person only manages that building.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {buildings.map((b) => {
                const checked = form.buildingIds.includes(b.id);
                return (
                  <label
                    key={b.id}
                    className={cn(
                      'flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm',
                      checked
                        ? 'border-brand-500 bg-[var(--primary-light)]'
                        : 'border-[var(--border)]',
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleBuilding(b.id)}
                    />
                    <span>
                      <span className="font-medium">{b.name}</span>
                      <span className="ml-1 text-[var(--text-muted)]">({b.code})</span>
                    </span>
                  </label>
                );
              })}
            </div>
            {form.buildingIds.length > 0 ? (
              <p className="mt-3 text-sm text-[var(--text)]">
                Manages:{' '}
                <strong>
                  {buildings
                    .filter((b) => form.buildingIds.includes(b.id))
                    .map((b) => b.name)
                    .join(', ')}
                </strong>
              </p>
            ) : (
              <p className="mt-3 text-sm text-amber-700">
                Select at least one building before creating this user.
              </p>
            )}
            {buildings.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">No buildings yet — create buildings first.</p>
            ) : null}
          </div>
        ) : (
          <p className="mt-4 text-sm text-[var(--text-muted)]">
            Admin users automatically access every building.
          </p>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={confirm?.onConfirm}
        title={confirm?.title}
        message={confirm?.message}
        confirmLabel={confirm?.confirmLabel || 'Confirm'}
        danger
      />
    </div>
  );
}
