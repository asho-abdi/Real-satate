import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { MdBadge, MdMailOutline, MdPhone, MdPhonelinkLock, MdVerifiedUser } from 'react-icons/md';
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

        <div className="space-y-6">
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

          {user?.isAdmin && (
            <Card
              title="Two-factor authentication"
              description="Protect your administrator account with an authenticator app. Optional until you enrol."
              icon={<MdPhonelinkLock />}
            >
              {mfaStatus?.mfaEnabled ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-500/30 dark:bg-emerald-500/10">
                  <p className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                    <MdVerifiedUser className="h-4 w-4" /> Two-factor authentication is on for this account.
                  </p>
                  <Button variant="danger-soft" size="sm" onClick={disableMfa} loading={mfaBusy}>
                    Turn off
                  </Button>
                </div>
              ) : enrollData ? (
                <div className="space-y-4">
                  <ol className="space-y-1 text-sm text-[var(--text-secondary)]">
                    <li>1. Add this account to your authenticator app using the setup key below.</li>
                    <li>2. Save the recovery codes somewhere safe.</li>
                    <li>3. Enter the 6-digit code from the app to finish.</li>
                  </ol>
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
                    <p className="eyebrow">Setup key</p>
                    <code className="mt-1 block break-all font-mono text-sm text-[var(--text)]">{enrollData.secret}</code>
                    <p className="mt-2 break-all text-[11px] text-[var(--text-muted)]">{enrollData.otpauthUrl}</p>
                  </div>
                  {Array.isArray(enrollData.recoveryCodes) && (
                    <div className="rounded-lg border border-[var(--gold)]/40 bg-[var(--gold-soft)] p-3">
                      <p className="mb-2 text-sm font-semibold text-[var(--text)]">Save these recovery codes now</p>
                      <ul className="grid grid-cols-2 gap-1 font-mono text-xs text-[var(--text)] sm:grid-cols-3">
                        {enrollData.recoveryCodes.map((c) => (
                          <li key={c}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <div className="sm:w-56">
                      <Input
                        label="Authenticator code"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="123456"
                        className="font-mono tracking-[0.3em]"
                        value={mfaCode}
                        onChange={(e) => setMfaCode(e.target.value)}
                      />
                    </div>
                    <Button onClick={confirmMfa} loading={mfaBusy}>
                      Confirm and turn on
                    </Button>
                  </div>
                </div>
              ) : (
                <Button variant="navy" onClick={startMfa} loading={mfaBusy}>
                  <MdPhonelinkLock className="h-4 w-4" /> Set up authenticator
                </Button>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
