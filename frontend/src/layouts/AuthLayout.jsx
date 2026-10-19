import { Outlet } from 'react-router-dom';
import { APP_NAME } from '../utils/constants.js';

export default function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <aside className="relative flex min-h-[38vh] flex-col justify-between overflow-hidden bg-gradient-to-br from-[var(--primary-dark)] via-[var(--primary)] to-[#6d63c4] px-8 py-10 text-white lg:min-h-screen lg:w-[44%] lg:px-12 lg:py-14">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, rgba(45,212,191,0.35), transparent 45%), radial-gradient(circle at 80% 70%, rgba(148,163,184,0.25), transparent 40%)',
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        <div className="relative">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 text-sm font-semibold tracking-wide text-white backdrop-blur">
              RJ
            </span>
            <span className="font-display text-3xl tracking-tight md:text-4xl">{APP_NAME}</span>
          </div>
          <p className="mt-6 max-w-sm text-base leading-relaxed text-white/80 md:text-lg">
            {APP_NAME} — manage properties, units, guests, and finances in one place.
          </p>
        </div>

        <p className="relative mt-10 text-xs text-white/40 lg:mt-0">
          Built for real estate teams and property managers.
        </p>
      </aside>

      <section className="flex flex-1 items-center justify-center bg-[var(--bg)] px-6 py-10 lg:px-12">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </section>
    </div>
  );
}
