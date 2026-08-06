import { lastNMonths } from '../../utils/rentCalc.js';
import { formatCurrency } from '../../utils/format.js';

const STATUS_BG = {
  Paid: 'bg-emerald-500 text-white',
  Partial: 'bg-amber-400 text-ink-950',
  Unpaid: 'bg-rose-500 text-white',
  none: 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-200',
};

export default function PaymentCalendar({
  payments = [],
  tenantId,
  businessId,
  amountDue,
  onMonthClick,
}) {
  const months = lastNMonths(12);
  const entityId = tenantId || businessId;

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
      {months.map((m) => {
        const row = payments.find((p) => {
          if (p.month !== m.key) return false;
          if (tenantId) return p.tenantId === tenantId;
          if (businessId) return p.businessId === businessId;
          return entityId
            ? p.tenantId === entityId || p.businessId === entityId
            : false;
        });
        const status = row?.status || 'none';
        return (
          <button
            key={m.key}
            type="button"
            onClick={() =>
              onMonthClick({
                month: m.key,
                label: m.label,
                payment: row || {
                  month: m.key,
                  amountDue: amountDue || 0,
                  amountPaid: 0,
                  status: 'Unpaid',
                  paymentDate: null,
                  method: null,
                },
              })
            }
            className={`rounded-xl px-2 py-3 text-center transition hover:opacity-90 ${STATUS_BG[status] || STATUS_BG.none}`}
          >
            <p className="text-[11px] font-medium opacity-90">{m.label}</p>
            <p className="mt-1 text-xs font-semibold">
              {row ? formatCurrency(row.amountPaid || 0) : '—'}
            </p>
            <p className="mt-0.5 text-[10px] uppercase tracking-wide opacity-90">
              {row?.status || 'Open'}
            </p>
          </button>
        );
      })}
    </div>
  );
}
