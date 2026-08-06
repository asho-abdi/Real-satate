import { useState } from 'react';
import toast from 'react-hot-toast';
import { MdPerson } from 'react-icons/md';
import { useAuth } from '../../context/AuthContext.jsx';
import { authService } from '../../services/authService.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Input from '../../components/ui/Input.jsx';
import Button from '../../components/ui/Button.jsx';

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
        <Card className="flex flex-col items-center text-center">
          {user?.avatar ? (
            <img src={user.avatar} alt="" className="h-24 w-24 rounded-full object-cover" />
          ) : (
            <span className="flex h-24 w-24 items-center justify-center rounded-full bg-brand-100 text-brand-800 dark:bg-brand-900/50 dark:text-brand-200">
              <MdPerson className="h-10 w-10" />
            </span>
          )}
          <p className="mt-4 font-semibold text-[var(--text)]">{user?.name}</p>
          <p className="text-sm text-[var(--text-muted)]">{user?.role}</p>
        </Card>

        <Card title="Account details">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input label="Email" type="email" value={user?.email || ''} disabled />
            <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <Input label="Role" value={user?.role || ''} disabled />
          </div>
          <Button className="mt-6 h-12 px-6" onClick={save} loading={saving}>
            Save profile
          </Button>
        </Card>
      </div>
    </div>
  );
}
