import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { MdClose, MdKeyboardDoubleArrowLeft, MdKeyboardDoubleArrowRight, MdLogout } from 'react-icons/md';
import { cn } from '../../utils/format.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLayout } from '../../context/LayoutContext.jsx';
import Logo, { Wordmark } from '../brand/Logo.jsx';
import { filterNavSections, resolveNavIcon } from './navItems.js';

const resolveIcon = resolveNavIcon;

export function initialsOf(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'U';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

function roleLabel(user) {
  if (!user) return '';
  if (user.isAdmin || user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') return 'Administrator';
  const r = String(user.roleName || user.role || 'Staff');
  return r.charAt(0).toUpperCase() + r.slice(1).toLowerCase().replace(/_/g, ' ');
}

export default function Sidebar({ open, onClose, isMobile }) {
  const { user, logout } = useAuth();
  const { sidebarCollapsed, toggleSidebar } = useLayout();
  const sections = filterNavSections(user);
  const collapsed = !isMobile && sidebarCollapsed;
  const [tip, setTip] = useState(null);

  const showTip = (e, label) => {
    if (!collapsed) return;
    const r = e.currentTarget.getBoundingClientRect();
    setTip({ label, top: r.top + r.height / 2 });
  };
  const hideTip = () => setTip(null);

  const content = (
    <div className="app-sidebar relative flex h-full flex-col">
      {/* Brand */}
      <div
        className={cn(
          'flex h-[var(--header-h)] shrink-0 items-center border-b border-white/[0.07]',
          collapsed ? 'justify-center px-2' : 'justify-between px-4',
        )}
      >
        <Link to="/dashboard" className="flex min-w-0 items-center gap-2.5" aria-label="RJK Realty home" onClick={isMobile ? onClose : undefined}>
          <Logo variant="mark" tone="onDark" className="h-8 w-auto shrink-0" alt="" />
          {!collapsed ? (
            <span className="min-w-0">
              <Wordmark onDark className="block text-[16px]" />
              <span className="mt-1 block truncate text-[9.5px] font-medium uppercase tracking-[0.16em] text-white/45">
                Property Management
              </span>
            </span>
          ) : null}
        </Link>
        {isMobile ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
            aria-label="Close menu"
          >
            <MdClose className="h-5 w-5" />
          </button>
        ) : null}
      </div>

      {/* Navigation */}
      <nav
        className={cn('sidebar-scroll flex-1 overflow-y-auto overflow-x-hidden py-4', collapsed ? 'px-2.5' : 'px-3')}
        aria-label="Main navigation"
        onScroll={hideTip}
      >
        {sections.map((section, sIdx) => (
          <div key={section.title} className={cn(sIdx > 0 && 'mt-5')}>
            {collapsed ? (
              sIdx > 0 ? <div className="mx-auto mb-3 h-px w-6 bg-white/10" aria-hidden="true" /> : null
            ) : (
              <p className="sidebar-section-label mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.16em]">
                {section.title}
              </p>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = resolveIcon(item.icon);
                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.to === '/bookings' || item.to === '/dashboard' || item.to === '/'}
                      onClick={isMobile ? onClose : undefined}
                      onMouseEnter={(e) => showTip(e, item.label)}
                      onMouseLeave={hideTip}
                      aria-label={collapsed ? item.label : undefined}
                      className={({ isActive }) =>
                        cn(
                          'group relative flex items-center rounded-lg text-[13.5px] font-medium transition-colors duration-150',
                          collapsed ? 'h-10 justify-center' : 'gap-3 px-3 py-2',
                          isActive
                            ? 'sidebar-link-active bg-[var(--sidebar-active-bg)]'
                            : 'hover:bg-white/[0.06]',
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive ? (
                            <motion.span
                              layoutId={isMobile ? 'nav-active-m' : 'nav-active'}
                              className="absolute inset-y-1.5 left-0 w-[3px] rounded-r-full bg-[var(--gold)]"
                              transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                            />
                          ) : null}
                          <Icon className="sidebar-link-icon h-[19px] w-[19px] shrink-0" />
                          {!collapsed ? <span className="flex-1 truncate">{item.label}</span> : null}
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

      {/* Footer: user + collapse */}
      <div className={cn('shrink-0 border-t border-white/[0.07]', collapsed ? 'p-2.5' : 'p-3')}>
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <Link
              to="/profile"
              onMouseEnter={(e) => showTip(e, user?.name || 'Profile')}
              onMouseLeave={hideTip}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--gold)] text-xs font-bold text-[var(--on-gold)]"
              aria-label="Profile"
            >
              {initialsOf(user?.name)}
            </Link>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 rounded-xl bg-white/[0.05] p-2.5">
            <Link to="/profile" onClick={isMobile ? onClose : undefined} className="flex min-w-0 flex-1 items-center gap-2.5">
              {user?.avatar ? (
                <img src={user.avatar} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-white/15" />
              ) : (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--gold)] text-xs font-bold text-[var(--on-gold)]">
                  {initialsOf(user?.name)}
                </span>
              )}
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-semibold text-white">{user?.name || 'User'}</span>
                <span className="block truncate text-[11px] text-white/50">{roleLabel(user)}</span>
              </span>
            </Link>
            <button
              type="button"
              onClick={() => logout()}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/55 transition hover:bg-white/10 hover:text-white"
              aria-label="Sign out"
              title="Sign out"
            >
              <MdLogout className="h-[17px] w-[17px]" />
            </button>
          </div>
        )}
        {!isMobile ? (
          <button
            type="button"
            onClick={() => {
              hideTip();
              toggleSidebar();
            }}
            className={cn(
              'mt-2 flex h-8 w-full items-center rounded-lg text-[12px] font-medium text-white/45 transition hover:bg-white/[0.06] hover:text-white',
              collapsed ? 'justify-center' : 'gap-2 px-3',
            )}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <MdKeyboardDoubleArrowRight className="h-4 w-4" />
            ) : (
              <>
                <MdKeyboardDoubleArrowLeft className="h-4 w-4" /> Collapse
              </>
            )}
          </button>
        ) : null}
      </div>

      {collapsed && tip ? (
        <div
          role="tooltip"
          style={{ top: tip.top }}
          className="pointer-events-none fixed left-[calc(var(--sidebar-w-collapsed)+8px)] z-[60] -translate-y-1/2 whitespace-nowrap rounded-md bg-[var(--navy-dark)] px-2.5 py-1.5 text-xs font-medium text-white shadow-lg ring-1 ring-white/10"
        >
          {tip.label}
        </div>
      ) : null}
    </div>
  );

  if (isMobile) {
    return (
      <AnimatePresence>
        {open ? (
          <>
            <motion.button
              key="overlay"
              type="button"
              className="fixed inset-0 z-40 bg-[rgba(0,17,31,0.55)] backdrop-blur-[2px] lg:hidden"
              aria-label="Close sidebar overlay"
              onClick={onClose}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.aside
              key="drawer"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 38 }}
              className="fixed inset-y-0 left-0 z-50 w-[min(var(--sidebar-w),86vw)] shadow-2xl lg:hidden"
            >
              {content}
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    );
  }

  return (
    <aside
      className="fixed inset-y-0 left-0 z-30 hidden transition-[width] duration-200 ease-out lg:block"
      style={{ width: collapsed ? 'var(--sidebar-w-collapsed)' : 'var(--sidebar-w)' }}
    >
      {content}
    </aside>
  );
}
