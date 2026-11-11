import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import PageHeader from '../components/ui/PageHeader.jsx';
import Card from '../components/ui/Card.jsx';
import Input from '../components/ui/Input.jsx';
import Select from '../components/ui/Select.jsx';
import Button from '../components/ui/Button.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import { useSettings } from '../context/SettingsContext.jsx';
import { NAV_LAYOUTS, useLayout } from '../context/LayoutContext.jsx';
import { settingsService } from '../services/settingsService.js';

export default function Settings() {
  const { settings, loading, saveSettings } = useSettings();
  const { navLayout, setNavLayout } = useLayout();
  const [companyName, setCompanyName] = useState(settings.companyName);
  const [currency, setCurrency] = useState(settings.currency);
  const [nightsNote, setNightsNote] = useState(settings.nightsNote);
  const [officeMpesa, setOfficeMpesa] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setCompanyName(settings.companyName);
    setCurrency(settings.currency);
    setNightsNote(settings.nightsNote);
  }, [settings]);

  useEffect(() => {
    let alive = true;
    settingsService
      .fetchSettings()
      .then((map) => {
        if (!alive) return;
        const raw = map['payments.officeMpesaNumber'];
        setOfficeMpesa(typeof raw === 'string' ? raw : raw != null ? String(raw) : '');
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await saveSettings({ companyName, currency, nightsNote });
      await settingsService.updateSetting('payments.officeMpesaNumber', officeMpesa.trim());
      toast.success('Settings saved');
    } catch (error) {
      toast.error(error.message || 'Could not save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner label="Loading settings…" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Settings" subtitle="Company preferences synced with the backend." />

      <div className="grid max-w-xl gap-5">
        <Card title="Navigation layout">
          <Select
            label="Menu style"
            value={navLayout}
            onChange={(e) => setNavLayout(e.target.value)}
          >
            {NAV_LAYOUTS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            Sidebar is the default. Switch to Topbar anytime — saved on this device.
          </p>
        </Card>

        <Card title="Company">
          <div className="grid gap-4">
            <Input
              label="Company name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
            <Select
              label="Currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              <option value="KES">KES — Kenyan Shilling</option>
              <option value="USD">USD</option>
              <option value="AED">AED</option>
            </Select>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-[var(--text)]">Default nights note</span>
              <textarea
                value={nightsNote}
                onChange={(e) => setNightsNote(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              />
            </label>
            <Input
              label="Office MPESA number"
              value={officeMpesa}
              onChange={(e) => setOfficeMpesa(e.target.value)}
              hint="Used as the default when recording MPESA – Office Number payments."
            />
            <Button onClick={save} loading={saving}>
              Save Settings
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
