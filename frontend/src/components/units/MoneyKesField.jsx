import { useState } from 'react';
import Input from '../ui/Input.jsx';
import {
  formatUsdApprox,
  getUsdKesRate,
  usdToKes,
} from '../../utils/format.js';

/**
 * KES money input with live USD equivalent and optional "Enter USD" fill.
 * Always stores/emits KES values.
 */
export default function MoneyKesField({
  label,
  value,
  onChange,
  className,
  placeholder,
  hint,
  min = 0,
  step = '0.01',
  disabled = false,
}) {
  const [usdDraft, setUsdDraft] = useState('');
  const [showUsd, setShowUsd] = useState(false);
  const usdHint = formatUsdApprox(value);

  const applyUsd = () => {
    const n = Number(usdDraft);
    if (!Number.isFinite(n) || n < 0) return;
    const kes = Math.round(usdToKes(n, getUsdKesRate()) * 100) / 100;
    onChange(String(kes));
    setShowUsd(false);
    setUsdDraft('');
  };

  return (
    <div className={className}>
      <Input
        label={label}
        type="number"
        min={min}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        hint={[usdHint, hint].filter(Boolean).join(' · ') || undefined}
      />
      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="text-xs font-medium text-brand-600 underline-offset-2 hover:underline dark:text-brand-300"
          onClick={() => setShowUsd((v) => !v)}
        >
          {showUsd ? 'Hide USD entry' : 'Enter USD'}
        </button>
        {showUsd ? (
          <div className="flex flex-wrap items-end gap-2">
            <Input
              label="USD"
              type="number"
              min={0}
              step="0.01"
              value={usdDraft}
              onChange={(e) => setUsdDraft(e.target.value)}
              placeholder="e.g. 300"
              className="w-36"
            />
            <button
              type="button"
              className="mb-0.5 rounded-xl bg-brand-500 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-600"
              onClick={applyUsd}
            >
              Fill KES
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
