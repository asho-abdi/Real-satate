import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import * as MdIcons from 'react-icons/md';
import { MdClose, MdApartment } from 'react-icons/md';
import { APP_NAME } from '../../utils/constants.js';
import { cn } from '../../utils/format.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { filterNavSections } from './navItems.js';

function resolveIcon(name) {
  const Icon = MdIcons[name];
  return Icon || MdIcons.MdCircle;
}

export default function Sidebar({ open, onClose, isMobile }) {
  const { user } = useAuth();
  const sections = filterNavSections(user);

  const content = (
    <div className="app-sidebar flex h-full flex-col bg-[var(--sidebar)] text-white">
      <div className="flex h-[var(--header-h)] items-center justify-between border-b border-white/[0.08] px-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--sidebar-active)] text-[var(--primary)] shadow-sm">
            <MdApartment className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-bold tracking-tight text-white">{APP_NAME}</p>
            <p className="sidebar-section-label truncate text-[10px] font-medium uppercase tracking-[0.14em]">
              Property Management
            </p>
          </div>
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

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="sidebar-section-label mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.16em]">
              {section.title}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = resolveIcon(item.icon);
                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.to === '/bookings' || item.to === '/dashboard' || item.to === '/'}
                      onClick={isMobile ? onClose : undefined}
                      className={({ isActive }) =>
                        cn(
                          'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium text-white transition-all hover:bg-white/[0.06]',
                          isActive &&
                            'sidebar-link-active bg-[var(--sidebar-active-bg)] shadow-[inset_3px_0_0_0_var(--sidebar-active)]',
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <Icon
                            className={cn(
                              'sidebar-link-icon h-[18px] w-[18px] shrink-0',
                              isActive && 'text-[var(--sidebar-active)]',
                            )}
                          />
                          <span className="flex-1 text-white">{item.label}</span>
                        </>
                      )}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/[0.08] px-4 py-4">
        <div className="rounded-xl bg-white/[0.06] px-3 py-3">
          <p className="text-[11px] font-semibold text-white">{APP_NAME}</p>
          <p className="mt-0.5 text-[11px] leading-snug text-white/60">
            Buildings, units, bookings & collections
          </p>
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <>
        {open ? (
          <button
            type="button"
            className="fixed inset-0 z-40 bg-[color-mix(in_oklab,var(--primary-dark)_55%,transparent)] backdrop-blur-sm lg:hidden"
            aria-label="Close sidebar overlay"
            onClick={onClose}
          />
        ) : null}
        <motion.aside
          initial={false}
          animate={{ x: open ? 0 : '-100%' }}
          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          className="fixed inset-y-0 left-0 z-50 w-[272px] lg:hidden"
        >
          {content}
        </motion.aside>
      </>
    );
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[272px] lg:block">{content}</aside>
  );
}
