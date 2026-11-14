import { useState } from 'react';
import toast from 'react-hot-toast';
import { MdDownload, MdPrint } from 'react-icons/md';
import Button from '../ui/Button.jsx';
import { downloadFinanceDoc, printFinanceDoc } from '../../utils/financeDocs.js';

/**
 * Print / Download for invoice or receipt PDFs.
 * Pass either `payload` (create new doc) or omit and use `onPayload()` lazy builder.
 */
export default function FinanceDocActions({
  payload,
  onPayload,
  label = 'Invoice',
  compact = false,
  className = '',
}) {
  const [busy, setBusy] = useState(null);

  const resolvePayload = async () => {
    if (typeof onPayload === 'function') return onPayload();
    return payload;
  };

  const run = async (action) => {
    setBusy(action);
    try {
      const body = await resolvePayload();
      if (!body) throw new Error('Nothing to generate');
      if (action === 'print') {
        await printFinanceDoc(body);
        toast.success(`${label} opened — use Print in the PDF viewer`);
      } else {
        await downloadFinanceDoc(body);
        toast.success(`${label} downloaded`);
      }
    } catch (err) {
      if (err?.name !== 'AbortError') toast.error(err.message || `Could not ${action} ${label.toLowerCase()}`);
    } finally {
      setBusy(null);
    }
  };

  const size = compact ? 'sm' : 'md';

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      <Button
        variant="secondary"
        size={size}
        disabled={Boolean(busy)}
        onClick={() => run('print')}
      >
        <MdPrint className="h-4 w-4" />
        {busy === 'print' ? 'Preparing…' : `Print ${label}`}
      </Button>
      <Button
        variant="secondary"
        size={size}
        disabled={Boolean(busy)}
        onClick={() => run('download')}
        aria-label={`Download ${label}`}
      >
        <MdDownload className="h-4 w-4" />
        {busy === 'download' ? 'Preparing…' : 'Download'}
      </Button>
    </div>
  );
}
