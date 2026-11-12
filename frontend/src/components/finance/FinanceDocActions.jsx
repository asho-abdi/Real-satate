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

  const btnClass = compact ? 'h-9 px-3 text-sm' : 'h-11 px-4';

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      <Button
        variant="secondary"
        className={btnClass}
        disabled={Boolean(busy)}
        onClick={() => run('print')}
      >
        <span className="inline-flex items-center gap-1.5">
          <MdPrint className="h-4 w-4" />
          {busy === 'print' ? 'Preparing…' : `Print ${label}`}
        </span>
      </Button>
      <Button
        variant="secondary"
        className={btnClass}
        disabled={Boolean(busy)}
        onClick={() => run('download')}
      >
        <span className="inline-flex items-center gap-1.5">
          <MdDownload className="h-4 w-4" />
          {busy === 'download' ? 'Preparing…' : 'Download'}
        </span>
      </Button>
    </div>
  );
}
