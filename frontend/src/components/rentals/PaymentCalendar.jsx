/**
 * LeasePaymentTable — replaces the old monthly-calendar UI.
 *
 * Props (unchanged from old PaymentCalendar so callers need minimal changes):
 *   payments      – array of payment records from the API
 *   tenantId      – id of the tenant (apartment)
 *   businessId    – id of the business (shop)
 *   amountDue     – monthly rent net of discount
 *   leaseStart    – ISO date string  (optional – falls back to 12-month window)
 *   leaseEnd      – ISO date string  (optional)
 *   tenantName    – display name
 *   unitNumber    – display unit
 *   building      – display building
 *   floor         – display floor
 *   onPaymentSaved – called after a successful create/update so the parent can reload
 */

import { useMemo, useState } from 'react';
import { MdAdd, MdCheck, MdCreditCard, MdPrint, MdVisibility } from 'react-icons/md';
import { AnimatePresence, motion } from 'framer-motion';
import { MdClose } from 'react-icons/md';
import Input from '../ui/Input.jsx';
import Select from '../ui/Select.jsx';
import Button from '../ui/Button.jsx';
import PaymentMethodFields from '../payments/PaymentMethodFields.jsx';
import { formatCurrency, formatDate, cn } from '../../utils/format.js';
import { rentalApi } from '../../services/rentalApi.js';
import toast from 'react-hot-toast';

// ─── helpers ──────────────────────────────────────────────────────────────────

function monthKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function addMonths(date, n) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}

function monthLabel(key) {
  const [y, m] = key.split('-');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleString('en-US', {
    month: 'short',
    year: 'numeric',
  });
}

/** Due date = leaseStart day-of-month within the given YYYY-MM month */
function dueDate(leaseStartIso, monthKey) {
  const start = new Date(leaseStartIso);
  const [y, m] = monthKey.split('-');
  const day = start.getDate();
  const candidate = new Date(Number(y), Number(m) - 1, day);
  // clamp to last day of month
  const lastDay = new Date(Number(y), Number(m), 0).getDate();
  candidate.setDate(Math.min(day, lastDay));
  return candidate;
}

/**
 * Calculate payment status from amounts + due date.
 * Mirrors backend resolveStatus but adds UPCOMING / DUE / OVERDUE.
 */
function calcStatus(amountDue, amountPaid, dueDateObj) {
  const paid = Number(amountPaid) || 0;
  const due = Number(amountDue) || 0;
  if (paid >= due && paid > 0) return 'PAID';
  if (paid > 0) return 'PARTIAL';
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const d = new Date(dueDateObj);
  d.setHours(0, 0, 0, 0);
  if (d < now) return 'OVERDUE';
  if (d <= now) return 'DUE';
  return 'UPCOMING';
}

const STATUS_STYLE = {
  PAID: {
    badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
    dot: 'bg-emerald-500',
  },
  PARTIAL: {
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200',
    dot: 'bg-amber-400',
  },
  OVERDUE: {
    badge: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200',
    dot: 'bg-rose-500',
  },
  DUE: {
    badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200',
    dot: 'bg-orange-500',
  },
  UPCOMING: {
    badge: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    dot: 'bg-slate-400',
  },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.UPCOMING;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide',
        s.badge,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', s.dot)} />
      {status}
    </span>
  );
}

// ─── tiny inline modal ─────────────────────────────────────────────────────────

function InlineModal({ open, onClose, title, children, footer }) {
  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <motion.button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-slate-950/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            className="relative z-10 w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
              <h2 className="text-base font-semibold text-[var(--text)]">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1 text-[var(--text-muted)] hover:bg-[var(--surface-2)]"
              >
                <MdClose className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
            {footer ? (
              <div className="border-t border-[var(--border)] px-5 py-4">{footer}</div>
            ) : null}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}

// ─── summary stat card ─────────────────────────────────────────────────────────

function StatCard({ label, value, sub, accent }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">{label}</p>
      <p className={cn('text-xl font-bold', accent || 'text-[var(--text)]')}>{value}</p>
      {sub ? <p className="text-[11px] text-[var(--text-muted)]">{sub}</p> : null}
    </div>
  );
}

// ─── main component ────────────────────────────────────────────────────────────

export default function PaymentCalendar({
  payments = [],
  tenantId,
  businessId,
  amountDue,
  leaseStart,
  leaseEnd,
  tenantName,
  unitNumber,
  building,
  floor,
  onPaymentSaved,
}) {
  const [payModal, setPayModal] = useState(null);   // { row } – pay/edit
  const [viewModal, setViewModal] = useState(null); // { row } – view receipt
  const [saving, setSaving] = useState(false);
  const [payForm, setPayForm] = useState({
    amountPaid: '',
    method: 'CASH',
    paymentDate: '',
    reference: '',
    receivedByName: '',
    agentName: '',
    officeMpesaNumber: '',
    notes: '',
  });

  // ── build schedule ──────────────────────────────────────────────
  const schedule = useMemo(() => {
    const startDate = leaseStart ? new Date(leaseStart) : (() => {
      const d = new Date();
      d.setMonth(d.getMonth() - 11);
      return d;
    })();
    const endDate = leaseEnd ? new Date(leaseEnd) : addMonths(startDate, 12);

    const rows = [];
    let cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const endMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
    let idx = 1;

    while (cursor <= endMonth) {
      const key = monthKey(cursor);
      const due = dueDate(startDate.toISOString(), key);

      const record = payments.find((p) => {
        if (p.month !== key) return false;
        if (tenantId) return p.tenantId === tenantId;
        if (businessId) return p.businessId === businessId;
        return false;
      });

      const paid = Number(record?.amountPaid) || 0;
      const monthlyDue = Number(record?.amountDue) || Number(amountDue) || 0;
      const outstanding = Math.max(0, monthlyDue - paid);
      const status = calcStatus(monthlyDue, paid, due);

      rows.push({
        idx: idx++,
        key,
        label: monthLabel(key),
        due,
        monthlyDue,
        paid,
        outstanding,
        status,
        record: record || null,
      });
      cursor = addMonths(cursor, 1);
    }
    return rows;
  }, [payments, tenantId, businessId, amountDue, leaseStart, leaseEnd]);

  // Dashboard table: overdue months only (upcoming months stay hidden)
  const overdueRows = useMemo(
    () => schedule.filter((r) => r.status === 'OVERDUE'),
    [schedule],
  );

  // ── summary stats ───────────────────────────────────────────────
  const summary = useMemo(() => {
    const totalPaid = schedule.reduce((s, r) => s + r.paid, 0);
    const totalOutstanding = overdueRows.reduce((s, r) => s + r.outstanding, 0);
    const next = schedule.find((r) => r.status === 'DUE' || r.status === 'UPCOMING');
    return { totalPaid, totalOutstanding, next };
  }, [schedule, overdueRows]);

  // ── open pay modal ───────────────────────────────────────────────
  const openPay = (row) => {
    setPayModal({ row });
    setPayForm({
      amountPaid: String(row.outstanding || row.monthlyDue),
      method: row.record?.method || 'CASH',
      paymentDate: new Date().toISOString().slice(0, 10),
      reference: row.record?.reference || '',
      receivedByName: row.record?.receivedByName || '',
      agentName: row.record?.agentName || '',
      officeMpesaNumber: row.record?.officeMpesaNumber || '',
      notes: '',
    });
  };

  // ── save payment ─────────────────────────────────────────────────
  const savePayment = async () => {
    if (!payModal) return;
    const { row } = payModal;
    const addPaid = Number(payForm.amountPaid) || 0;
    if (addPaid <= 0) {
      toast.error('Enter an amount greater than zero');
      return;
    }
    if (addPaid > row.outstanding + 0.001) {
      toast.error(`Amount cannot exceed the outstanding balance of ${formatCurrency(row.outstanding)}`);
      return;
    }
    setSaving(true);
    try {
      const totalPaid = row.paid + addPaid;
      const paymentDetails = {
        method: payForm.method,
        reference: payForm.reference || null,
        receivedByName: payForm.receivedByName || null,
        agentName: payForm.agentName || null,
        officeMpesaNumber: payForm.officeMpesaNumber || null,
        paymentDate: payForm.paymentDate || new Date().toISOString().slice(0, 10),
        notes: payForm.notes || null,
      };
      if (row.record?.id) {
        await rentalApi.updatePayment(row.record.id, {
          amountPaid: totalPaid,
          amountDue: row.monthlyDue,
          ...paymentDetails,
        });
      } else {
        await rentalApi.createPayment({
          tenantId: tenantId || null,
          businessId: businessId || null,
          month: row.key,
          amountDue: row.monthlyDue,
          amountPaid: addPaid,
          ...paymentDetails,
        });
      }
      toast.success('Payment recorded');
      setPayModal(null);
      if (onPaymentSaved) onPaymentSaved();
    } catch (err) {
      toast.error(err.message || 'Could not save payment');
    } finally {
      setSaving(false);
    }
  };

  // ── render ────────────────────────────────────────────────────────

  if (schedule.length === 0) {
    return (
      <p className="py-4 text-sm text-[var(--text-muted)]">No payment schedule generated.</p>
    );
  }

  return (
    <div>
      {/* summary strip */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Monthly Rent" value={formatCurrency(amountDue)} />
        <StatCard
          label="Paid This Lease"
          value={formatCurrency(summary.totalPaid)}
          accent="text-emerald-600 dark:text-emerald-400"
        />
        <StatCard
          label="Outstanding"
          value={formatCurrency(summary.totalOutstanding)}
          accent={summary.totalOutstanding > 0 ? 'text-rose-600 dark:text-rose-400' : undefined}
        />
        <StatCard
          label="Next Due"
          value={summary.next ? formatDate(summary.next.due) : '—'}
          sub={summary.next ? summary.next.label : 'All clear'}
        />
      </div>

      {/* table header + record button */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <h4 className="text-sm font-semibold text-[var(--text)]">
          Overdue Payments ({overdueRows.length}
          {overdueRows.length === 1 ? ' month' : ' months'})
        </h4>
        <button
          type="button"
          onClick={() => {
            const firstOverdue = overdueRows[0];
            if (firstOverdue) openPay(firstOverdue);
            else toast('No overdue months');
          }}
          className="flex items-center gap-1.5 rounded-xl bg-brand-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-800 dark:bg-brand-400 dark:text-ink-950 dark:hover:bg-brand-300"
        >
          <MdAdd className="h-4 w-4" />
          Record Payment
        </button>
      </div>

      {overdueRows.length === 0 ? (
        <p className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-6 text-sm text-[var(--text-muted)]">
          No overdue months. Upcoming rent is hidden until it becomes overdue.
        </p>
      ) : (
        <>
          {/* ── desktop table ── */}
          <div className="hidden overflow-hidden rounded-xl border border-[var(--border)] md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Month</th>
                  <th className="px-4 py-3">Due Date</th>
                  <th className="px-4 py-3">Rent</th>
                  <th className="px-4 py-3">Paid</th>
                  <th className="px-4 py-3">Outstanding</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Paid Date</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {overdueRows.map((row, i) => (
                  <tr
                    key={row.key}
                    className={cn(
                      'border-b border-[var(--border)]/60 transition-colors',
                      i % 2 === 1 ? 'bg-[var(--surface-2)]/40' : 'bg-[var(--surface)]',
                      'hover:bg-[var(--surface-2)]',
                    )}
                  >
                    <td className="px-4 py-3 text-[var(--text-muted)]">{i + 1}</td>
                    <td className="px-4 py-3 font-medium text-[var(--text)]">{row.label}</td>
                    <td className="px-4 py-3 text-[var(--text-muted)]">{formatDate(row.due)}</td>
                    <td className="px-4 py-3 font-medium text-[var(--text)]">
                      {formatCurrency(row.monthlyDue)}
                    </td>
                    <td className="px-4 py-3">
                      {row.paid > 0 ? (
                        <span className="text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(row.paid)}
                        </span>
                      ) : (
                        <span className="text-[var(--text-muted)]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {row.outstanding > 0 ? (
                        <span className="text-rose-600 dark:text-rose-400">
                          {formatCurrency(row.outstanding)}
                        </span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400">$0.00</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-4 py-3 text-[var(--text-muted)]">
                      {row.record?.paymentDate ? formatDate(row.record.paymentDate) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => openPay(row)}
                        className="flex items-center gap-1 rounded-lg bg-brand-700 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-800 dark:bg-brand-400 dark:text-ink-950"
                      >
                        <MdCreditCard className="h-3.5 w-3.5" />
                        Pay Now
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── mobile cards ── */}
          <div className="space-y-3 md:hidden">
            {overdueRows.map((row) => (
              <div
                key={row.key}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-[var(--text)]">{row.label}</p>
                    <p className="text-xs text-[var(--text-muted)]">Due {formatDate(row.due)}</p>
                  </div>
                  <StatusBadge status={row.status} />
                </div>
                <div className="mb-3 grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-[var(--text-muted)]">Rent</p>
                    <p className="font-medium text-[var(--text)]">{formatCurrency(row.monthlyDue)}</p>
                  </div>
                  <div>
                    <p className="text-[var(--text-muted)]">Paid</p>
                    <p className="font-medium text-emerald-600 dark:text-emerald-400">
                      {row.paid > 0 ? formatCurrency(row.paid) : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[var(--text-muted)]">Outstanding</p>
                    <p className="font-medium text-rose-600 dark:text-rose-400">
                      {formatCurrency(row.outstanding)}
                    </p>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => openPay(row)}
                    className="flex items-center gap-1 rounded-lg bg-brand-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-800 dark:bg-brand-400 dark:text-ink-950"
                  >
                    <MdCreditCard className="h-3.5 w-3.5" />
                    Pay Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Pay Now modal ─────────────────────────────────────────── */}
      <InlineModal
        open={Boolean(payModal)}
        onClose={() => !saving && setPayModal(null)}
        title="Record Rent Payment"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setPayModal(null)}
              disabled={saving}
              className="h-10 rounded-xl border border-[var(--border)] px-4 text-sm font-medium text-[var(--text-muted)] transition hover:bg-[var(--surface-2)] disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={savePayment}
              disabled={saving}
              className="flex h-10 items-center gap-2 rounded-xl bg-brand-700 px-5 text-sm font-semibold text-white transition hover:bg-brand-800 disabled:opacity-60 dark:bg-brand-400 dark:text-ink-950"
            >
              {saving ? (
                'Saving…'
              ) : (
                <>
                  <MdCheck className="h-4 w-4" />
                  Record Payment
                </>
              )}
            </button>
          </div>
        }
      >
        {payModal ? (
          <div className="space-y-4">
            {/* context strip */}
            <div className="rounded-xl bg-[var(--surface-2)] px-4 py-3">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-[var(--text-muted)]">
                {tenantName ? (
                  <>
                    <span>Tenant</span>
                    <span className="font-medium text-[var(--text)]">{tenantName}</span>
                  </>
                ) : null}
                {unitNumber ? (
                  <>
                    <span>Unit</span>
                    <span className="font-medium text-[var(--text)]">
                      {unitNumber}
                      {building ? ` · ${building}` : ''}
                      {floor ? ` · ${floor}` : ''}
                    </span>
                  </>
                ) : null}
                <span>Month</span>
                <span className="font-medium text-[var(--text)]">{payModal.row.label}</span>
                <span>Monthly Rent</span>
                <span className="font-medium text-[var(--text)]">
                  {formatCurrency(payModal.row.monthlyDue)}
                </span>
                {payModal.row.paid > 0 ? (
                  <>
                    <span>Already Paid</span>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(payModal.row.paid)}
                    </span>
                    <span>Remaining</span>
                    <span className="font-medium text-rose-600 dark:text-rose-400">
                      {formatCurrency(payModal.row.outstanding)}
                    </span>
                  </>
                ) : null}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label={`Amount to Pay (max ${formatCurrency(payModal.row.outstanding || payModal.row.monthlyDue)})`}
                type="number"
                min="0.01"
                step="0.01"
                max={payModal.row.outstanding || payModal.row.monthlyDue}
                value={payForm.amountPaid}
                onChange={(e) => setPayForm({ ...payForm, amountPaid: e.target.value })}
              />
              <Input
                label="Payment Date"
                type="date"
                value={payForm.paymentDate}
                onChange={(e) => setPayForm({ ...payForm, paymentDate: e.target.value })}
              />
              <div className="sm:col-span-2">
                <PaymentMethodFields
                  value={payForm}
                  onChange={(next) => setPayForm({ ...payForm, ...next })}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-[var(--text)]">
                  Notes (optional)
                </label>
                <textarea
                  rows={2}
                  value={payForm.notes}
                  onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
                  placeholder="Any additional notes…"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-muted)] focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
            </div>
          </div>
        ) : null}
      </InlineModal>

      {/* ── View Receipt modal ───────────────────────────────────── */}
      <InlineModal
        open={Boolean(viewModal)}
        onClose={() => setViewModal(null)}
        title="Payment Receipt"
        footer={
          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-muted)] transition hover:bg-[var(--surface-2)]"
            >
              <MdPrint className="h-4 w-4" />
              Print Receipt
            </button>
            <button
              type="button"
              onClick={() => setViewModal(null)}
              className="rounded-xl bg-[var(--surface-2)] px-5 py-2 text-sm font-medium text-[var(--text)] transition hover:opacity-80"
            >
              Close
            </button>
          </div>
        }
      >
        {viewModal ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
                <MdCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <div className="overflow-hidden rounded-xl border border-[var(--border)]">
              {[
                tenantName && ['Tenant', tenantName],
                unitNumber && ['Unit', `${unitNumber}${building ? ` · ${building}` : ''}${floor ? ` · ${floor}` : ''}`],
                ['Payment Month', viewModal.row.label],
                ['Due Date', formatDate(viewModal.row.due)],
                ['Rent Amount', formatCurrency(viewModal.row.monthlyDue)],
                ['Paid Amount', formatCurrency(viewModal.row.paid)],
                ['Outstanding', formatCurrency(viewModal.row.outstanding)],
                viewModal.row.record?.paymentDate && [
                  'Payment Date',
                  formatDate(viewModal.row.record.paymentDate),
                ],
                viewModal.row.record?.method && ['Method', viewModal.row.record.method],
                viewModal.row.record?.notes && ['Reference / Notes', viewModal.row.record.notes],
                ['Status', viewModal.row.status],
              ]
                .filter(Boolean)
                .map(([label, value], i, arr) => (
                  <div
                    key={label}
                    className={cn(
                      'flex items-start justify-between gap-4 px-4 py-3 text-sm',
                      i < arr.length - 1 ? 'border-b border-[var(--border)]' : '',
                      i % 2 === 1 ? 'bg-[var(--surface-2)]/50' : '',
                    )}
                  >
                    <span className="text-[var(--text-muted)]">{label}</span>
                    <span className="text-right font-medium text-[var(--text)]">
                      {label === 'Status' ? <StatusBadge status={value} /> : value}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        ) : null}
      </InlineModal>
    </div>
  );
}
