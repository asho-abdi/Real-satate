import { useEffect, useState } from 'react';
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
  const [mfaStatus, setMfaStatus] = useState(null);
  const [enrollData, setEnrollData] = useState(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaBusy, setMfaBusy] = useState(false);

  useEffect(() => {
    if (!user?.isAdmin) return;
    authService
      .getMfaStatus()
      .then(setMfaStatus)
      .catch(() => setMfaStatus(null));
  }, [user?.isAdmin, user?.mfaEnabled]);

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

  const startMfa = async () => {
    setMfaBusy(true);
    try {
      const data = await authService.enrollMfa();
      setEnrollData(data);
      toast.success('Scan the secret in your authenticator app');
    } catch (err) {
      toast.error(err.message || 'Could not start MFA');
    } finally {
      setMfaBusy(false);
    }
  };

  const confirmMfa = async () => {
    setMfaBusy(true);
    try {
      await authService.confirmMfa(mfaCode.trim());
      setEnrollData(null);
      setMfaCode('');
      setMfaStatus({ available: true, mfaEnabled: true, mfaEnrolledAt: new Date().toISOString() });
      setUser({ ...user, mfaEnabled: true });
      toast.success('MFA enabled');
    } catch (err) {
      toast.error(err.message || 'Invalid code');
    } finally {
      setMfaBusy(false);
    }
  };

  const disableMfa = async () => {
    const code = window.prompt('Enter authenticator or recovery code to disable MFA');
    if (!code) return;
    setMfaBusy(true);
    try {
      await authService.disableMfa({ code });
      setMfaStatus({ available: true, mfaEnabled: false, mfaEnrolledAt: null });
      setUser({ ...user, mfaEnabled: false });
      toast.success('MFA disabled');
    } catch (err) {
      toast.error(err.message || 'Could not disable MFA');
    } finally {
      setMfaBusy(false);
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

        <div className="space-y-6">
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

          {user?.isAdmin && (
            <Card title="Two-factor authentication (administrators)">
              <p className="mb-4 text-sm text-[var(--text-muted)]">
                Opt-in authenticator MFA. Existing admins are not locked out until they enroll.
              </p>
              {mfaStatus?.mfaEnabled ? (
                <div className="space-y-3">
                  <p className="text-sm text-emerald-700">MFA is enabled on this account.</p>
                  <Button variant="secondary" onClick={disableMfa} loading={mfaBusy}>
                    Disable MFA
                  </Button>
                </div>
              ) : enrollData ? (
                <div className="space-y-3">
                  <p className="break-all text-xs text-[var(--text-muted)]">{enrollData.otpauthUrl}</p>
                  <p className="text-sm">
                    Secret: <code className="font-mono">{enrollData.secret}</code>
                  </p>
                  {Array.isArray(enrollData.recoveryCodes) && (
                    <div className="rounded border border-[var(--border)] p-3 text-sm">
                      <p className="mb-2 font-medium">Save these recovery codes now:</p>
                      <ul className="grid grid-cols-2 gap-1 font-mono text-xs">
                        {enrollData.recoveryCodes.map((c) => (
                          <li key={c}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <Input
                    label="Confirm with authenticator code"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value)}
                  />
                  <Button onClick={confirmMfa} loading={mfaBusy}>
                    Confirm MFA
                  </Button>
                </div>
              ) : (
                <Button onClick={startMfa} loading={mfaBusy}>
                  Set up authenticator MFA
                </Button>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
