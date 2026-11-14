import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { MdApartment, MdEventAvailable, MdInsights } from 'react-icons/md';
import Logo from '../components/brand/Logo.jsx';
import Spinner from '../components/ui/Spinner.jsx';

const HIGHLIGHTS = [
  { icon: MdApartment, title: 'Portfolio in one place', text: 'Buildings, floors, apartments, shops and offices.' },
  { icon: MdEventAvailable, title: 'Bookings & tenancies', text: 'Guest stays, leases and availability at a glance.' },
  { icon: MdInsights, title: 'Collections & reporting', text: 'Payments, outstanding balances and statements.' },
];

export default function AuthLayout() {
  return (
    <div className="flex min-h-screen bg-[var(--bg)]">
      {/* Brand panel */}
      <aside className="relative hidden w-[46%] max-w-[640px] flex-col justify-between overflow-hidden bg-[var(--navy)] px-12 py-12 text-white lg:flex xl:px-16">
        {/* Quiet architectural line motif echoing the logo's tower */}
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 bottom-0 h-[78%] w-auto text-white/[0.05]"
          viewBox="0 0 400 560"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M120 560V140l160-110v530" />
          <path d="M280 30l100 70v460" />
          <path d="M160 160v400M200 135v425M240 110v450" />
          {Array.from({ length: 10 }).map((_, i) => (
            <path key={i} d={`M300 ${130 + i * 42}h60`} />
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-[var(--gold)]" aria-hidden="true" />

        <div className="relative">
          <Logo tone="onDark" className="h-auto w-[210px]" />
        </div>

        <div className="relative max-w-md">
          <p className="eyebrow !text-[var(--gold)]">RJK Realty workspace</p>
          <h2 className="mt-3 font-display text-[34px] font-extrabold leading-[1.15] tracking-[-0.025em] text-white">
            Property management,
            <br />
            <span className="text-[var(--gold)]">simplified.</span>
          </h2>
          <ul className="mt-10 space-y-5">
            {HIGHLIGHTS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] text-[var(--gold)]">
                  <Icon className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-[14.5px] font-semibold text-white">{title}</span>
                  <span className="mt-0.5 block text-[13.5px] leading-relaxed text-white/60">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/40">© {new Date().getFullYear()} RJK Realty. All rights reserved.</p>
      </aside>

      {/* Form panel */}
      <section className="flex flex-1 flex-col items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-[400px]">
          <div className="mb-8 flex justify-center lg:hidden">
            <Logo className="h-auto w-[170px]" />
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow)] sm:p-8 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
            <Suspense fallback={<Spinner label="" />}>
              <Outlet />
            </Suspense>
          </div>
          <p className="mt-8 text-center text-xs text-[var(--text-muted)] lg:hidden">
            © {new Date().getFullYear()} RJK Realty · Property Management, Simplified.
          </p>
        </div>
      </section>
    </div>
  );
}
