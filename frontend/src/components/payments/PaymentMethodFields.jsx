import { useEffect, useState } from 'react';
import Input from '../ui/Input.jsx';
import Select from '../ui/Select.jsx';
import { PAYMENT_METHOD_OPTIONS } from '../../utils/constants.js';
import { METHOD_VALUES } from '../../utils/labels.js';
import api from '../../services/api.js';

const empty = {
  method: 'CASH',
  reference: '',
  receivedByName: '',
  agentName: '',
  officeMpesaNumber: '',
};

/**
 * Controlled payment method + dynamic detail fields for Cash / MPESA / Agent.
 */
export default function PaymentMethodFields({ value, onChange, showReceivedBy = true }) {
  const form = { ...empty, ...(value || {}) };
  const method = METHOD_VALUES[form.method] || form.method || 'CASH';
  const [defaultMpesa, setDefaultMpesa] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await api.get('/finance/office-mpesa');
        const n = res.data?.data?.officeMpesaNumber ?? res.data?.officeMpesaNumber;
        if (alive && n) {
          setDefaultMpesa(typeof n === 'string' ? n.replace(/^"|"$/g, '') : String(n));
        }
      } catch {
        /* settings may be restricted — ignore */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (method === 'MPESA' && !form.officeMpesaNumber && defaultMpesa) {
      onChange?.({ ...form, method: 'MPESA', officeMpesaNumber: defaultMpesa });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [method, defaultMpesa]);

  const set = (patch) => onChange?.({ ...form, method, ...patch });

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Select
        label="Payment method"
        value={method}
        onChange={(e) => set({ method: e.target.value })}
      >
        {PAYMENT_METHOD_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>

      {showReceivedBy ? (
        <Input
          label="Received by"
          value={form.receivedByName}
          onChange={(e) => set({ receivedByName: e.target.value })}
          placeholder="Staff name"
        />
      ) : null}

      {method === 'MPESA' ? (
        <>
          <Input
            label="MPESA transaction / reference"
            value={form.reference}
            onChange={(e) => set({ reference: e.target.value })}
            placeholder="e.g. QH7X…"
            required
          />
          <Input
            label="Office MPESA number"
            value={form.officeMpesaNumber || defaultMpesa}
            onChange={(e) => set({ officeMpesaNumber: e.target.value })}
          />
        </>
      ) : null}

      {method === 'AGENT' ? (
        <>
          <Input
            label="Agent name"
            value={form.agentName}
            onChange={(e) => set({ agentName: e.target.value })}
            required
          />
          <Input
            label="Agent / transaction reference"
            value={form.reference}
            onChange={(e) => set({ reference: e.target.value })}
          />
        </>
      ) : null}

      {method === 'CASH' ? (
        <Input
          label="Reference / notes (optional)"
          value={form.reference}
          onChange={(e) => set({ reference: e.target.value })}
          className="sm:col-span-2"
        />
      ) : null}
    </div>
  );
}
