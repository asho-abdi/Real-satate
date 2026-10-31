import { useCallback, useEffect, useState } from 'react';
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
import { DEFAULT_STAFF_PAGES, STAFF_PAGES } from '../utils/pageAccess.js';

const emptyForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
  roleCode: 'BUILDING_MANAGER',
  buildingIds: [],
  allowedPages: [...DEFAULT_STAFF_PAGES],
  isActive: true,
};

function pageLabels(keys) {
  const set = new Set(keys || []);
  return STAFF_PAGES.filter((p) => set.has(p.key)).map((p) => p.label);
}

export default function UsersAdmin() {
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [u, r, b] = await Promise.all([
        adminApi.listUsers(),
        adminApi.listRoles(),
        rentalApi.listBuildings(),
      ]);
      setUsers(u);
      setRoles(r);
      setBuildings(b);
    } catch (err) {
      toast.error(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (u) => {
    setEditing(u);
    const isAdmin = u.isAdmin || u.role === 'ADMIN';
    setForm({
      firstName: u.firstName || '',
      lastName: u.lastName || '',
      email: u.email || '',
      phone: u.phone || '',
      password: '',
      roleCode: u.role || 'BUILDING_MANAGER',
      buildingIds: (u.buildings || []).map((b) => b.id),
      allowedPages:
        isAdmin
          ? []
          : Array.isArray(u.allowedPages) && u.allowedPages.length
            ? [...u.allowedPages]
            : [...DEFAULT_STAFF_PAGES],
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

  const togglePage = (key) => {
    setForm((prev) => {
      const has = prev.allowedPages.includes(key);
      return {
        ...prev,
        allowedPages: has
          ? prev.allowedPages.filter((x) => x !== key)
          : [...prev.allowedPages, key],
      };
    });
  };

  const selectAllPages = () => {
    setForm((prev) => ({ ...prev, allowedPages: STAFF_PAGES.map((p) => p.key) }));
  };

  const clearPages = () => {
    setForm((prev) => ({ ...prev, allowedPages: [] }));
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
      toast.error('Choose which building(s) this user manages');
      return;
    }
    if (form.roleCode === 'BUILDING_MANAGER' && form.allowedPages.length === 0) {
      toast.error('Choose at least one page this user can open');
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
        allowedPages: form.roleCode === 'ADMIN' ? [] : form.allowedPages,
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

  if (!currentUser?.isAdmin && currentUser?.role !== 'ADMIN') {
    return (
      <div>
        <PageHeader title="Users & Access" subtitle="Admin only." />
        <Card>
          <p className="text-sm text-[var(--text-muted)]">
            You do not have permission to manage users or building assignments.
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
        subtitle="Give each person the buildings they manage and the pages they can open."
        actions={
          <Button className="h-12 px-5" onClick={openCreate}>
            Add User
          </Button>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">1 · Buildings</p>
          <p className="mt-1 text-sm text-[var(--text)]">
            Assign buildings to each staff user — they only see data for those buildings.
          </p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">2 · Pages</p>
          <p className="mt-1 text-sm text-[var(--text)]">
            Choose which menu pages they can open — other pages stay hidden.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {users.map((u) => {
          const isAdmin = u.isAdmin || u.role === 'ADMIN';
          const pages = isAdmin
            ? ['All pages']
            : pageLabels(u.allowedPages?.length ? u.allowedPages : DEFAULT_STAFF_PAGES);
          return (
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
                    Edit access
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
                {u.email} ·{' '}
                <strong className="text-[var(--text)]">{isAdmin ? 'Admin' : 'Staff'}</strong>
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                    Manages buildings
                  </p>
                  <p className="mt-1 text-sm text-[var(--text)]">
                    {isAdmin
                      ? 'All buildings'
                      : (u.buildings || []).map((b) => b.name || b.code).join(', ') || 'None assigned'}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                    Can open pages
                  </p>
                  <p className="mt-1 text-sm text-[var(--text)]">
                    {pages.length ? pages.join(', ') : 'No pages'}
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        title={editing ? 'Edit user access' : 'Add user'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" className="h-12 px-5" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button className="h-12 px-5" onClick={saveUser} disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save access' : 'Create user'}
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
            label="Account type"
            value={form.roleCode}
            onChange={(e) => {
              const roleCode = e.target.value;
              setForm((prev) => ({
                ...prev,
                roleCode,
                buildingIds: roleCode === 'ADMIN' ? [] : prev.buildingIds,
                allowedPages: roleCode === 'ADMIN' ? [] : prev.allowedPages.length ? prev.allowedPages : [...DEFAULT_STAFF_PAGES],
              }));
            }}
          >
            {roles.map((r) => (
              <option key={r.id} value={r.code}>
                {r.code === 'ADMIN' ? 'Admin — everything' : 'Staff — assigned buildings & pages'}
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
          <>
            <div className="mt-6">
              <p className="mb-1 text-sm font-semibold text-[var(--text)]">Buildings this user manages</p>
              <p className="mb-3 text-xs text-[var(--text-muted)]">
                Tick every building they are responsible for. They will only see data from these buildings.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {buildings.map((b) => {
                  const checked = form.buildingIds.includes(b.id);
                  return (
                    <label
                      key={b.id}
                      className={cn(
                        'flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm',
                        checked
                          ? 'border-[var(--primary)] bg-[color-mix(in_oklab,var(--primary)_8%,transparent)]'
                          : 'border-[var(--border)]',
                      )}
                    >
                      <input type="checkbox" checked={checked} onChange={() => toggleBuilding(b.id)} />
                      <span>
                        <span className="font-medium">{b.name}</span>
                        <span className="ml-1 text-[var(--text-muted)]">({b.code})</span>
                      </span>
                    </label>
                  );
                })}
              </div>
              {buildings.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">No buildings yet — create buildings first.</p>
              ) : null}
            </div>

            <div className="mt-6">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-[var(--text)]">Pages this user can open</p>
                  <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                    Turn on only the pages this person needs.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={selectAllPages}
                    className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs font-medium text-[var(--text)] hover:bg-[var(--surface-2)]"
                  >
                    All pages
                  </button>
                  <button
                    type="button"
                    onClick={clearPages}
                    className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs font-medium text-[var(--text)] hover:bg-[var(--surface-2)]"
                  >
                    Clear
                  </button>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {STAFF_PAGES.map((page) => {
                  const checked = form.allowedPages.includes(page.key);
                  return (
                    <label
                      key={page.key}
                      className={cn(
                        'flex cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2.5 text-sm',
                        checked
                          ? 'border-[var(--primary)] bg-[color-mix(in_oklab,var(--primary)_8%,transparent)]'
                          : 'border-[var(--border)] opacity-70',
                      )}
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={checked}
                        onChange={() => togglePage(page.key)}
                      />
                      <span>
                        <span className="font-medium text-[var(--text)]">{page.label}</span>
                        <span className="mt-0.5 block text-xs text-[var(--text-muted)]">{page.description}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <p className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/60 px-4 py-3 text-sm text-[var(--text-muted)]">
            Admins can open every page and manage every building automatically.
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
