import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import * as MdIcons from 'react-icons/md';
import { MdClose, MdShield } from 'react-icons/md';
import { APP_NAME, NAV_SECTIONS } from '../../utils/constants.js';
import { cn } from '../../utils/format.js';
import { useAuth } from '../../context/AuthContext.jsx';

function resolveIcon(name) {
  const Icon = MdIcons[name];
  return Icon || MdIcons.MdCircle;
}

export default function Sidebar({ open, onClose, isMobile }) {
  const { user } = useAuth();
  const isAdmin = Boolean(user?.isAdmin || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN');

  const sections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => {
      if (item.to === '/users') return isAdmin;
      return true;
    }),
  })).filter((section) => section.items.length > 0);
  const content = (
    <div className="flex h-full flex-col bg-[var(--sidebar)]">
      <div className="flex h-[var(--header-h)] items-center justify-between border-b border-white/[0.06] px-5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--sidebar-active-bg)] text-[var(--sidebar-active)]">
            <MdShield className="h-5 w-5" />
          </span>
          <span className="text-lg font-bold tracking-tight text-white">{APP_NAME}</span>
        </div>
        {isMobile ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white"
            aria-label="Close menu"
          >
            <MdClose className="h-5 w-5" />
          </button>
        ) : null}
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
              {section.title}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = resolveIcon(item.icon);
                const isDashboard = item.to === '/dashboard';
                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.to === '/bookings' || item.to === '/dashboard' || item.to === '/'}
                      onClick={isMobile ? onClose : undefined}
                      className={({ isActive }) =>
                        cn(
                          'group flex items-center gap-3 rounded-md px-3 py-2.5 text-[13px] font-medium transition-all',
                          isActive
                            ? 'bg-[var(--sidebar-active-bg)] text-white shadow-[inset_3px_0_0_0_var(--sidebar-active)]'
                            : 'text-white/80 hover:bg-white/[0.06] hover:text-white',
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <Icon
                            className={cn(
                              'h-[18px] w-[18px] shrink-0',
                              isActive ? 'text-[var(--sidebar-active)]' : 'text-white/70 group-hover:text-white',
                            )}
                          />
                          <span className="flex-1 text-white">{item.label}</span>
                          {isDashboard && isActive ? (
                            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--sidebar-active)] px-1.5 text-[10px] font-bold text-white">
                              01
                            </span>
                          ) : null}
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

      <div className="border-t border-white/[0.06] px-5 py-4">
        <p className="text-[11px] text-white/50">{APP_NAME}</p>
        <p className="mt-0.5 text-xs font-medium text-white/70">Real Estate Management</p>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <>
        {open ? (
          <button
            type="button"
            className="fixed inset-0 z-40 bg-[var(--primary-dark)]/60 backdrop-blur-sm lg:hidden"
            aria-label="Close sidebar overlay"
            onClick={onClose}
          />
        ) : null}
        <motion.aside
          initial={false}
          animate={{ x: open ? 0 : '-100%' }}
          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          className="fixed inset-y-0 left-0 z-50 w-[260px] lg:hidden"
        >
          {content}
        </motion.aside>
      </>
    );
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[260px] lg:block">{content}</aside>
  );
}
