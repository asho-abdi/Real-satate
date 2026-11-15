import { useEffect, useState } from 'react';
import Input from '../ui/Input.jsx';
import { getUsdKesRate, kesToUsd, usdToKes } from '../../utils/format.js';

function round2(n) {
  return Math.round(Number(n) * 100) / 100;
}

function toInput(n) {
  if (n === '' || n == null || Number.isNaN(Number(n))) return '';
  const r = round2(n);
  return Number.isInteger(r) ? String(r) : String(r);
}

/**
 * Dual KES + USD money inputs for unit registration.
 * Both fields are always editable; values stay linked by the Settings exchange rate.
 * Parent always receives/stores KES.
 */
export default function MoneyKesField({
  label = 'Amount',
  value,
  onChange,
  className,
  placeholder = 'e.g. 45000',
  hint,
  min = 0,
  step = '0.01',
  disabled = false,
}) {
  const rate = getUsdKesRate();
  const [lastEdited, setLastEdited] = useState('kes');
  const [usdLocal, setUsdLocal] = useState(() =>
    value === '' || value == null ? '' : toInput(kesToUsd(value, rate)),
  );

  useEffect(() => {
    if (lastEdited !== 'kes') return;
    setUsdLocal(value === '' || value == null ? '' : toInput(kesToUsd(value, rate)));
  }, [value, rate, lastEdited]);

  const onKes = (raw) => {
    setLastEdited('kes');
    onChange(raw);
  };

  const onUsd = (raw) => {
    setLastEdited('usd');
    setUsdLocal(raw);
    if (raw === '' || raw == null) {
      onChange('');
      return;
    }
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) return;
    onChange(toInput(usdToKes(n, rate)));
  };

  const baseLabel = String(label || 'Amount')
    .replace(/\s*\(KES\)\s*$/i, '')
    .replace(/\s*KES\s*$/i, '')
    .trim();

  return (
    <div className={className}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label={`${baseLabel} (KES)`}
          type="number"
          min={min}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => onKes(e.target.value)}
          placeholder={placeholder}
        />
        <Input
          label={`${baseLabel} (USD)`}
          type="number"
          min={min}
          step={step}
          value={usdLocal}
          disabled={disabled}
          onChange={(e) => onUsd(e.target.value)}
          placeholder="e.g. 350"
        />
      </div>
      <p className="mt-1.5 text-xs text-[var(--text-muted)]">
        Enter either currency — the other updates using the Settings rate (
        {Number(rate).toLocaleString('en-KE', { maximumFractionDigits: 2 })} KES = 1 USD).
        {hint ? ` ${hint}` : ''}
      </p>
    </div>
  );
}
