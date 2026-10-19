import { MdCalendarMonth, MdCalendarToday, MdDateRange } from 'react-icons/md';
import Input from '../ui/Input.jsx';
import { cn } from '../../utils/format.js';

const RATE_ROWS = [
  {
    key: 'dailyRate',
    field: 'dailyRate',
    title: 'Per night',
    subtitle: 'When someone books by the day',
    icon: MdCalendarToday,
    placeholder: '35',
  },
  {
    key: 'weekly',
    field: 'weeklyRent',
    title: 'Per week',
    subtitle: 'When they stay a full week',
    icon: MdDateRange,
    placeholder: '200',
  },
  {
    key: 'monthly',
    field: 'monthlyRent',
    title: 'Per month',
    subtitle: 'When they stay a full month',
    icon: MdCalendarMonth,
    placeholder: '750',
  },
];

/** Daily, weekly, and monthly rates for Guest / Airbnb units. */
export default function GuestPricingFields({ form, onChange, className }) {
  const set = (patch) => onChange({ ...form, ...patch });

  return (
    <div className={cn('space-y-3', className)}>
      {RATE_ROWS.map((row) => {
        const Icon = row.icon;
        return (
          <div
            key={row.key}
            className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:flex-row sm:items-center"
          >
            <div className="flex min-w-0 flex-1 items-start gap-3 sm:max-w-[220px]">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-[var(--text)]">{row.title}</p>
                <p className="text-xs text-[var(--text-muted)]">{row.subtitle}</p>
              </div>
            </div>
            <div className="w-full sm:max-w-[200px]">
              <Input
                label="Price (KES)"
                type="number"
                min={0}
                step="0.01"
                value={form[row.field]}
                onChange={(e) => set({ [row.field]: e.target.value })}
                placeholder={row.placeholder}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function guestPricingError(form) {
  const daily = Number(form.dailyRate);
  const weekly = Number(form.weeklyRent);
  const monthly = Number(form.monthlyRent);
  if (!(daily > 0) || !(weekly > 0) || !(monthly > 0)) {
    return 'Please enter a price for each night, week, and month.';
  }
  return null;
}
