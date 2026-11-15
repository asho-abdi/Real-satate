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
import { DEFAULT_USD_KES_RATE, formatCurrency, kesToUsd } from '../utils/format.js';

export default function Settings() {
  const { settings, loading, saveSettings } = useSettings();
  const { navLayout, setNavLayout } = useLayout();
  const [companyName, setCompanyName] = useState(settings.companyName);
  const [usdKesRate, setUsdKesRate] = useState(String(settings.usdKesRate ?? DEFAULT_USD_KES_RATE));
  const [nightsNote, setNightsNote] = useState(settings.nightsNote);
  const [officeMpesa, setOfficeMpesa] = useState('');
  const [agentAccountName, setAgentAccountName] = useState('');
  const [agentAccountReference, setAgentAccountReference] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setCompanyName(settings.companyName);
    setUsdKesRate(String(settings.usdKesRate ?? DEFAULT_USD_KES_RATE));
    setNightsNote(settings.nightsNote);
  }, [settings]);

  useEffect(() => {
    let alive = true;
    settingsService
      .fetchSettings()
      .then((map) => {
        if (!alive) return;
        const rawMpesa = map['payments.officeMpesaNumber'];
        setOfficeMpesa(typeof rawMpesa === 'string' ? rawMpesa : rawMpesa != null ? String(rawMpesa) : '');
        const rawAgent = map['payments.agentAccountName'];
        setAgentAccountName(typeof rawAgent === 'string' ? rawAgent : rawAgent != null ? String(rawAgent) : '');
        const rawAgentRef = map['payments.agentAccountReference'];
        setAgentAccountReference(
          typeof rawAgentRef === 'string' ? rawAgentRef : rawAgentRef != null ? String(rawAgentRef) : '',
        );
        if (map['currency.usdKesRate'] != null && map['currency.usdKesRate'] !== '') {
          setUsdKesRate(String(map['currency.usdKesRate']));
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const rate = Number(usdKesRate);
      if (!Number.isFinite(rate) || rate <= 0) {
        toast.error('Enter a valid USD exchange rate (KES per 1 USD)');
        return;
      }
      await saveSettings({ companyName, usdKesRate: rate, nightsNote });
      await settingsService.updateSetting('payments.officeMpesaNumber', officeMpesa.trim());
      await settingsService.updateSetting('payments.agentAccountName', agentAccountName.trim());
      await settingsService.updateSetting('payments.agentAccountReference', agentAccountReference.trim());
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

  const previewKes = 10000;
  const rateNum = Number(usdKesRate);
  const previewUsd =
    Number.isFinite(rateNum) && rateNum > 0
      ? kesToUsd(previewKes, rateNum)
      : null;
  const preview =
    previewUsd != null
      ? `${formatCurrency(previewKes, { dual: false })} · ${formatCurrency(previewUsd, { currency: 'USD', dual: false })}`
      : null;

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
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/50 px-3 py-3">
              <p className="text-sm font-medium text-[var(--text)]">Primary currency</p>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                Kenyan Shilling (KES) — all amounts are stored in KES. USD is shown as a live conversion.
              </p>
            </div>
            <Input
              label="USD exchange rate (KES per 1 USD)"
              type="number"
              min={0.01}
              step="0.01"
              value={usdKesRate}
              onChange={(e) => setUsdKesRate(e.target.value)}
              hint={
                preview
                  ? `Example: ${formatCurrency(previewKes, { dual: false })} → ${preview}. Changing this rate updates USD everywhere without editing units.`
                  : 'e.g. 129.50'
              }
            />
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
            <Input
              label="Default agent account name"
              value={agentAccountName}
              onChange={(e) => setAgentAccountName(e.target.value)}
              hint="Prefilled when payment method is Agent."
            />
            <Input
              label="Default agent reference"
              value={agentAccountReference}
              onChange={(e) => setAgentAccountReference(e.target.value)}
              hint="Optional default reference for agent payments."
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
