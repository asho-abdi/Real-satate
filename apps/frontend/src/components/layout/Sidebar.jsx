import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import * as MdIcons from 'react-icons/md';
import { MdClose } from 'react-icons/md';
import { APP_NAME, NAV_SECTIONS } from '../../utils/constants.js';
import { cn } from '../../utils/format.js';

function resolveIcon(name) {
  const Icon = MdIcons[name];
  return Icon || MdIcons.MdCircle;
}

export default function Sidebar({ open, onClose, isMobile }) {
  const content = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500/20 text-sm font-semibold text-brand-300">
            PR
          </span>
          <span className="font-display text-xl tracking-tight text-white">{APP_NAME}</span>
        </div>
        {isMobile ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white"
            aria-label="Close menu"
          >
            <MdClose className="h-5 w-5" />
          </button>
        ) : null}
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title}>
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-200/50">
              {section.title}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = resolveIcon(item.icon);
                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.to === '/bookings' || item.to === '/dashboard'}
                      onClick={isMobile ? onClose : undefined}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white transition',
                          isActive
                            ? 'bg-brand-500/20 text-white shadow-[inset_0_0_0_1px_rgba(45,212,191,0.25)]'
                            : 'text-white/90 hover:bg-white/10 hover:text-white',
                        )
                      }
                    >
                      <Icon className="h-5 w-5 shrink-0 text-white opacity-90" />
                      <span className="text-white">{item.label}</span>
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 px-5 py-4 text-xs text-teal-200/40">
        Two buildings · Simple rentals
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <>
        {open ? (
          <button
            type="button"
            className="fixed inset-0 z-40 bg-ink-950/50 backdrop-blur-sm lg:hidden"
            aria-label="Close sidebar overlay"
            onClick={onClose}
          />
        ) : null}
        <motion.aside
          initial={false}
          animate={{ x: open ? 0 : '-100%' }}
          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          className="fixed inset-y-0 left-0 z-50 w-72 bg-[var(--sidebar)] lg:hidden"
        >
          {content}
        </motion.aside>
      </>
    );
  }

  return (
    <motion.aside
      initial={{ x: -24, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="fixed inset-y-0 left-0 z-30 hidden w-72 bg-[var(--sidebar)] lg:block"
    >
      {content}
    </motion.aside>
  );
}
