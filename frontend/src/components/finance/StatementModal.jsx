import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { MdDownload, MdPrint } from 'react-icons/md';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import Input from '../ui/Input.jsx';
import Spinner from '../ui/Spinner.jsx';
import { rentalApi } from '../../services/rentalApi.js';
import { formatCurrency } from '../../utils/format.js';
import { labelMethod } from '../../utils/labels.js';
import { openPdfBlob } from '../../utils/financeDocs.js';

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

function queryParams(party, from, to) {
  const params = { ...party };
  if (from) params.from = from;
  if (to) params.to = to;
  return params;
}

/**
 * Tenant / customer financial statement with print, PDF, and share.
 */
export default function StatementModal({ open, onClose, party }) {
  const [loading, setLoading] = useState(false);
  const [statement, setStatement] = useState(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [appliedFrom, setAppliedFrom] = useState('');
  const [appliedTo, setAppliedTo] = useState('');

  const loadStatement = useCallback(async () => {
    if (!party) return;
    setLoading(true);
    try {
      const data = await rentalApi.getStatement(queryParams(party, appliedFrom, appliedTo));
      setStatement(data);
    } catch (err) {
      toast.error(err.message || 'Could not load statement');
    } finally {
      setLoading(false);
    }
  }, [party, appliedFrom, appliedTo]);

  useEffect(() => {
    if (!open || !party) return undefined;
    loadStatement();
    return undefined;
  }, [open, party, loadStatement]);

  const applyRange = () => {
    setAppliedFrom(from);
    setAppliedTo(to);
  };

  const clearRange = () => {
    setFrom('');
    setTo('');
    setAppliedFrom('');
    setAppliedTo('');
  };

  const statementParams = queryParams(party, appliedFrom, appliedTo);

  const downloadPdf = async () => {
    setDownloading(true);
    try {
      const blob = await rentalApi.downloadStatementPdf(statementParams);
      downloadBlob(blob, `statement-${statement?.customer?.name || 'customer'}.pdf`);
    } catch (err) {
      toast.error(err.message || 'PDF download failed');
    } finally {
      setDownloading(false);
    }
  };

  const [printing, setPrinting] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Print the branded A4 statement PDF rather than the app screen behind the dialog.
  const printPdf = async () => {
    setPrinting(true);
    try {
      const blob = await rentalApi.downloadStatementPdf(statementParams);
      const { opened } = await openPdfBlob(blob);
      if (!opened) downloadBlob(blob, `statement-${statement?.customer?.name || 'customer'}.pdf`);
      else toast.success('Statement opened — use Print in the PDF viewer');
    } catch (err) {
      toast.error(err.message || 'Could not open the statement PDF');
    } finally {
      setPrinting(false);
    }
  };

  const summary = statement?.summary || {};

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title="Customer statement"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={printPdf} loading={printing} disabled={!statement}>
            <MdPrint className="h-4 w-4" /> Print
          </Button>
          <Button onClick={downloadPdf} loading={downloading} disabled={!statement}>
            <MdDownload className="h-4 w-4" /> Download PDF
          </Button>
        </div>
      }
    >
      {party ? (
        <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
          <Input
            label="From"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="min-w-[10rem]"
          />
          <Input
            label="To"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="min-w-[10rem]"
          />
          <Button  onClick={applyRange}>
            Apply
          </Button>
          {appliedFrom || appliedTo ? (
            <Button variant="secondary"  onClick={clearRange}>
              All history
            </Button>
          ) : null}
        </div>
      ) : null}

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

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Opening</p>
              <p className="mt-1 text-lg font-bold text-[var(--text)]">{formatCurrency(summary.openingBalance || 0)}</p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Total debit</p>
              <p className="mt-1 text-lg font-bold text-[var(--text)]">{formatCurrency(summary.totalDebit || 0)}</p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Total credit</p>
              <p className="mt-1 text-lg font-bold text-[var(--text)]">{formatCurrency(summary.totalCredit || 0)}</p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Closing / outstanding</p>
              <p className="mt-1 text-lg font-bold text-[var(--text)]">
                {formatCurrency(summary.closingBalance ?? summary.outstandingBalance ?? 0)}
              </p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Credit balance</p>
              <p className="mt-1 text-lg font-bold text-[var(--text)]">{formatCurrency(summary.creditBalance || 0)}</p>
              <p className="text-[11px] text-[var(--text-muted)]">Overpayment available</p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Deposits held</p>
              <p className="mt-1 text-lg font-bold text-[var(--text)]">{formatCurrency(summary.depositsHeld || 0)}</p>
              <p className="text-[11px] text-[var(--text-muted)]">Liability — not revenue</p>
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
                  <tr
                    key={`${line.sourceId}-${idx}`}
                    className={`border-t border-[var(--border)] ${line.isOpening ? 'bg-[var(--surface-2)]/60 font-medium' : ''}`}
                  >
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
