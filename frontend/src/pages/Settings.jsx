import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import PageHeader from '../components/ui/PageHeader.jsx';
import Card from '../components/ui/Card.jsx';
import Input from '../components/ui/Input.jsx';
import Select from '../components/ui/Select.jsx';
import Button from '../components/ui/Button.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import { useSettings } from '../context/SettingsContext.jsx';

export default function Settings() {
  const { settings, loading, saveSettings } = useSettings();
  const [companyName, setCompanyName] = useState(settings.companyName);
  const [currency, setCurrency] = useState(settings.currency);
  const [nightsNote, setNightsNote] = useState(settings.nightsNote);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setCompanyName(settings.companyName);
    setCurrency(settings.currency);
    setNightsNote(settings.nightsNote);
  }, [settings]);

  const save = async () => {
    setSaving(true);
    try {
      await saveSettings({ companyName, currency, nightsNote });
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

      <Card title="Company" className="max-w-xl">
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
          <Button className="h-12 px-6 text-base" onClick={save} loading={saving}>
            Save Settings
          </Button>
        </div>
      </Card>
    </div>
  );
}
