import { MdApartment, MdHotel, MdStorefront } from 'react-icons/md';
import { cn } from '../../utils/format.js';
import Input from '../ui/Input.jsx';

export function FormSection({ step, title, description, children, className }) {
  return (
    <section
      className={cn(
        'rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/40 p-5',
        className,
      )}
    >
      <div className="mb-4 flex items-start gap-3">
        {step ? (
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-white shadow-sm shadow-brand-500/30"
            aria-hidden
          >
            {step}
          </span>
        ) : null}
        <div className="min-w-0">
          <h3 className="text-base font-semibold tracking-tight text-[var(--text)]">{title}</h3>
          {description ? (
            <p className="mt-1 text-sm leading-relaxed text-[var(--text-muted)]">{description}</p>
          ) : null}
        </div>
      </div>
      {children}
    </section>
  );
}

const USAGE_CARDS = [
  {
    value: 'apartment',
    title: 'Apartment lease',
    description: 'Someone lives here long-term and pays monthly rent.',
    icon: MdApartment,
  },
  {
    value: 'guest',
    title: 'Guest / Airbnb',
    description: 'Short stays — you set a price per night, week, and month.',
    icon: MdHotel,
  },
  {
    value: 'shop',
    title: 'Shop',
    description: 'A commercial unit — size in square metres, rent or sale.',
    icon: MdStorefront,
  },
];

export function UsageChoiceCards({ value, onChange, shopOnly = false, disabled = false }) {
  const options = shopOnly ? USAGE_CARDS.filter((c) => c.value === 'shop') : USAGE_CARDS;

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {options.map((card) => {
        const Icon = card.icon;
        const selected = value === card.value;
        return (
          <button
            key={card.value}
            type="button"
            disabled={disabled || (shopOnly && card.value !== 'shop')}
            onClick={() => onChange(card.value)}
            className={cn(
              'flex flex-col items-start gap-2 rounded-2xl border-2 p-4 text-left transition',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40',
              selected
                ? 'border-brand-500 bg-brand-50 shadow-sm dark:bg-brand-950/30'
                : 'border-[var(--border)] bg-[var(--surface)] hover:border-brand-300/80 hover:bg-[var(--surface)]',
              disabled && 'cursor-not-allowed opacity-60',
            )}
          >
            <span
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-xl',
                selected ? 'bg-brand-500 text-white' : 'bg-[var(--surface-2)] text-brand-600',
              )}
            >
              <Icon className="h-5 w-5" />
            </span>
            <span className="text-sm font-semibold text-[var(--text)]">{card.title}</span>
            <span className="text-xs leading-relaxed text-[var(--text-muted)]">{card.description}</span>
          </button>
        );
      })}
    </div>
  );
}

export function LeasePricingFields({ form, onChange }) {
  return (
    <Input
      className="max-w-sm"
      label="Monthly rent"
      type="number"
      min={0}
      value={form.monthlyRent}
      onChange={(e) => onChange({ ...form, monthlyRent: e.target.value })}
      placeholder="e.g. 45000"
      hint="Apartments and shops use monthly rent only."
    />
  );
}
