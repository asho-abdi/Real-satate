import { useState } from 'react';
import toast from 'react-hot-toast';
import { MdBadge, MdMailOutline, MdPhone } from 'react-icons/md';
import { useAuth } from '../../context/AuthContext.jsx';
import { authService } from '../../services/authService.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Input from '../../components/ui/Input.jsx';
import Button from '../../components/ui/Button.jsx';
import { initialsOf } from '../../components/layout/Sidebar.jsx';

export default function Profile() {
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }
    setSaving(true);
    try {
      const next = await authService.updateProfile({ name: name.trim(), phone: phone.trim() });
      setUser(next);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.message || 'Could not update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Profile"
        subtitle="Your account details."
        breadcrumbs={[{ label: 'Account' }, { label: 'Profile' }]}
      />

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <Card className="relative overflow-hidden text-center">
          <div className="absolute inset-x-0 top-0 h-20 bg-[var(--navy)]" aria-hidden="true">
            <span className="absolute inset-x-0 bottom-0 h-[3px] bg-[var(--gold)]" />
          </div>
          <div className="relative flex flex-col items-center pt-6">
            {user?.avatar ? (
              <img src={user.avatar} alt="" className="h-24 w-24 rounded-full object-cover ring-4 ring-[var(--surface)]" />
            ) : (
              <span className="flex h-24 w-24 items-center justify-center rounded-full bg-[var(--gold)] font-display text-2xl font-bold text-[var(--on-gold)] ring-4 ring-[var(--surface)]">
                {initialsOf(user?.name)}
              </span>
            )}
            <p className="mt-4 font-display text-base font-bold text-[var(--text)]">{user?.name}</p>
            <p className="mt-0.5 text-[13px] text-[var(--text-muted)]">{user?.email}</p>
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-[var(--primary-light)] px-2 py-0.5 text-xs font-semibold text-[var(--navy)] dark:text-[var(--primary)]">
              <MdBadge className="h-3.5 w-3.5" />
              {user?.isAdmin ? 'Administrator' : user?.role}
            </span>
          </div>
        </Card>

        <Card title="Account details" description="Update how your name and phone appear across the workspace.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input label="Email" icon={<MdMailOutline />} type="email" value={user?.email || ''} disabled />
            <Input label="Phone" icon={<MdPhone />} value={phone} onChange={(e) => setPhone(e.target.value)} />
            <Input label="Role" value={user?.role || ''} disabled />
          </div>
          <div className="mt-6 flex justify-end border-t border-[var(--border)] pt-5">
          <Button onClick={save} loading={saving}>
            Save profile
          </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
