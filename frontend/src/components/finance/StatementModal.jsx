import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import Spinner from '../ui/Spinner.jsx';
import { rentalApi } from '../../services/rentalApi.js';
import { formatCurrency } from '../../utils/format.js';
import { labelMethod } from '../../utils/labels.js';

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/**
 * Tenant / customer financial statement with print, PDF, and share.
 */
export default function StatementModal({ open, onClose, party }) {
  const [loading, setLoading] = useState(false);
  const [statement, setStatement] = useState(null);

  useEffect(() => {
    if (!open || !party) return undefined;
    let alive = true;
    setLoading(true);
    rentalApi
      .getStatement(party)
      .then((data) => {
        if (alive) setStatement(data);
      })
      .catch((err) => toast.error(err.message || 'Could not load statement'))
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [open, party]);

  const downloadPdf = async () => {
    try {
      const blob = await rentalApi.downloadStatementPdf(party);
      downloadBlob(blob, `statement-${statement?.customer?.name || 'customer'}.pdf`);
    } catch (err) {
      toast.error(err.message || 'PDF download failed');
    }
  };

  const share = async () => {
    try {
      const blob = await rentalApi.downloadStatementPdf(party);
      const file = new File([blob], `statement.pdf`, { type: 'application/pdf' });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: 'Customer statement',
          text: statement?.customer?.name || 'Statement',
          files: [file],
        });
        return;
      }
      downloadBlob(blob, `statement-${statement?.customer?.name || 'customer'}.pdf`);
      toast.success('PDF downloaded — attach it in your share app');
    } catch (err) {
      if (err?.name !== 'AbortError') toast.error(err.message || 'Share failed');
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title="Customer statement"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" className="h-11 px-4" onClick={() => window.print()}>
            Print
          </Button>
          <Button variant="secondary" className="h-11 px-4" onClick={downloadPdf}>
            Download PDF
          </Button>
          <Button className="h-11 px-4" onClick={share}>
            Share
          </Button>
        </div>
      }
    >
      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : !statement ? (
        <p className="text-sm text-[var(--text-muted)]">No statement data.</p>
      ) : (
        <div className="space-y-4">
          <div>
            <p className="text-lg font-semibold text-[var(--text)]">{statement.customer?.name}</p>
            <p className="text-sm text-[var(--text-muted)]">
              {[statement.customer?.phone, statement.unit?.building?.name, statement.unit?.floor?.name, statement.unit?.roomNumber && `Unit ${statement.unit.roomNumber}`]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Outstanding</p>
              <p className="mt-1 text-lg font-bold text-[var(--text)]">
                {formatCurrency(statement.summary?.outstandingBalance || 0)}
              </p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Deposits held</p>
              <p className="mt-1 text-lg font-bold text-[var(--text)]">
                {formatCurrency(statement.summary?.depositsHeld || 0)}
              </p>
              <p className="text-[11px] text-[var(--text-muted)]">Liability — not revenue</p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Credits</p>
              <p className="mt-1 text-lg font-bold text-[var(--text)]">
                {formatCurrency(statement.summary?.totalCredit || 0)}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-[var(--surface-2)] text-[var(--text-muted)]">
                <tr>
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Description</th>
                  <th className="px-3 py-2 font-medium">Debit</th>
                  <th className="px-3 py-2 font-medium">Credit</th>
                  <th className="px-3 py-2 font-medium">Balance</th>
                  <th className="px-3 py-2 font-medium">Method</th>
                </tr>
              </thead>
              <tbody>
                {(statement.lines || []).map((line, idx) => (
                  <tr key={`${line.sourceId}-${idx}`} className="border-t border-[var(--border)]">
                    <td className="px-3 py-2 whitespace-nowrap">{String(line.date).slice(0, 10)}</td>
                    <td className="px-3 py-2">
                      {line.description}
                      {line.isLiability ? (
                        <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                          Deposit
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">{line.debit ? formatCurrency(line.debit) : '—'}</td>
                    <td className="px-3 py-2">{line.credit ? formatCurrency(line.credit) : '—'}</td>
                    <td className="px-3 py-2 font-medium">{formatCurrency(line.balance)}</td>
                    <td className="px-3 py-2 text-[var(--text-muted)]">
                      {[labelMethod(line.method), line.reference].filter(Boolean).join(' · ') || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Modal>
  );
}
