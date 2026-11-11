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

function unwrapSetting(value) {
  if (value == null) return '';
  const s = typeof value === 'string' ? value : String(value);
  return s.replace(/^"|"$/g, '');
}

/**
 * Controlled payment method + dynamic detail fields for Cash / MPESA / Agent.
 */
export default function PaymentMethodFields({ value, onChange, showReceivedBy = true }) {
  const form = { ...empty, ...(value || {}) };
  const method = METHOD_VALUES[form.method] || form.method || 'CASH';
  const [defaultMpesa, setDefaultMpesa] = useState('');
  const [defaultAgentName, setDefaultAgentName] = useState('');
  const [defaultAgentRef, setDefaultAgentRef] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        let data;
        try {
          const res = await api.get('/finance/payment-defaults');
          data = res.data?.data ?? res.data;
        } catch {
          const res = await api.get('/finance/office-mpesa');
          data = res.data?.data ?? res.data;
        }
        if (!alive || !data) return;
        const mpesa = data.officeMpesaNumber;
        if (mpesa) setDefaultMpesa(unwrapSetting(mpesa));
        if (data.agentAccountName) setDefaultAgentName(unwrapSetting(data.agentAccountName));
        if (data.agentAccountReference) setDefaultAgentRef(unwrapSetting(data.agentAccountReference));
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

  useEffect(() => {
    if (method === 'AGENT' && !form.agentName && defaultAgentName) {
      onChange?.({ ...form, method: 'AGENT', agentName: defaultAgentName });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [method, defaultAgentName]);

  useEffect(() => {
    if (method === 'AGENT' && !form.reference && defaultAgentRef) {
      onChange?.({ ...form, method: 'AGENT', reference: defaultAgentRef });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [method, defaultAgentRef]);

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
            value={form.agentName || defaultAgentName}
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
