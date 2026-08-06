import { useState } from 'react';
import toast from 'react-hot-toast';
import PageHeader from '../components/ui/PageHeader.jsx';
import Card from '../components/ui/Card.jsx';
import Input from '../components/ui/Input.jsx';
import Select from '../components/ui/Select.jsx';
import Button from '../components/ui/Button.jsx';
import { APP_NAME } from '../utils/constants.js';

export default function Settings() {
  const [companyName, setCompanyName] = useState(APP_NAME);
  const [currency, setCurrency] = useState('USD');
  const [nightsNote, setNightsNote] = useState(
    'Guest stays are billed as nights × (monthly rent ÷ 30).',
  );

  const save = () => {
    try {
      sessionStorage.setItem(
        'simple-settings',
        JSON.stringify({ companyName, currency, nightsNote }),
      );
    } catch {
      /* ignore */
    }
    toast.success('Settings saved');
  };

  return (
    <div>
      <PageHeader title="Settings" subtitle="Minimal company preferences." />

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
          <Button className="h-12 px-6 text-base" onClick={save}>
            Save Settings
          </Button>
        </div>
      </Card>
    </div>
  );
}
