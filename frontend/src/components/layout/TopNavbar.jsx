import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  MdApartment,
  MdBusiness,
  MdCalendarToday,
  MdChevronRight,
  MdDarkMode,
  MdExpandMore,
  MdFullscreen,
  MdLayers,
  MdLightMode,
  MdLock,
  MdLogout,
  MdMeetingRoom,
  MdMenu,
  MdNotificationsNone,
  MdPerson,
  MdSearch,
  MdSettings,
  MdStorefront,
  MdViewSidebar,
  MdWebAsset,
} from 'react-icons/md';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import { useNotifications } from '../../context/NotificationContext.jsx';
import { useLayout } from '../../context/LayoutContext.jsx';
import { NAV_SECTIONS } from '../../utils/constants.js';
import { cn, formatDate } from '../../utils/format.js';
import { rentalApi } from '../../services/rentalApi.js';
import Logo from '../brand/Logo.jsx';
import Spinner from '../ui/Spinner.jsx';
import { filterNavSections, resolveNavIcon } from './navItems.js';
import { initialsOf } from './Sidebar.jsx';

const TYPE_META = {
  building: { label: 'Building', icon: MdApartment },
  floor: { label: 'Floor', icon: MdLayers },
  room: { label: 'Room', icon: MdMeetingRoom },
  guest: { label: 'Guest', icon: MdPerson },
  tenant: { label: 'Tenant', icon: MdPerson },
  business: { label: 'Shop', icon: MdStorefront },
};

const resolveIcon = resolveNavIcon;

function pathActive(pathname, to) {
  if (to === '/dashboard' || to === '/') return pathname === '/dashboard' || pathname === '/';
  if (to === '/bookings') return pathname === '/bookings' || pathname.startsWith('/bookings/');
  return pathname === to || pathname.startsWith(`${to}/`);
}

const EXTRA_CRUMBS = {
  '/profile': ['Account', 'Profile'],
  '/change-password': ['Account', 'Change password'],
};

/** Section › Page (› Detail) trail derived from the navigation map. */
function useRouteTrail(pathname) {
  return useMemo(() => {
    if (EXTRA_CRUMBS[pathname]) return EXTRA_CRUMBS[pathname].map((label) => ({ label }));
    if (pathname.startsWith('/units/')) {
      return [{ label: 'Portfolio' }, { label: 'Availability', to: '/availability' }, { label: 'Unit profile' }];
    }
    for (const section of NAV_SECTIONS) {
      for (const item of section.items) {
        if (pathActive(pathname, item.to)) {
          const trail = [{ label: section.title }, { label: item.label, to: item.to }];
          if (pathname !== item.to && pathname.startsWith(`${item.to}/`)) trail.push({ label: 'Details' });
          return trail;
        }
      }
    }
    return [];
  }, [pathname]);
}

function useClickAway(ref, onAway, active) {
  useEffect(() => {
    if (!active) return undefined;
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onAway();
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [ref, onAway, active]);
}

const popover =
  'z-50 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-pop)]';
const iconBtn =
  'relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text)]';

function MenuPop({ open, className, children }) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0, y: -4, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.98 }}
          transition={{ duration: 0.14 }}
          className={cn(popover, className)}
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function NavDropdown({ section, open, onToggle, onClose }) {
  const location = useLocation();
  const sectionActive = section.items.some((item) => pathActive(location.pathname, item.to));
  const ref = useRef(null);
  useClickAway(ref, onClose, open);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'relative inline-flex h-9 items-center gap-1 rounded-lg px-3 text-[13.5px] font-medium transition-colors',
          sectionActive || open
            ? 'text-[var(--navy)] dark:text-white'
            : 'text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]',
        )}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span>{section.topLabel || section.title}</span>
        <MdExpandMore className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
        {sectionActive ? (
          <span className="absolute inset-x-3 -bottom-[13px] h-[2px] rounded-full bg-[var(--gold)]" />
        ) : null}
      </button>

      <MenuPop open={open} className="absolute left-0 top-[calc(100%+0.5rem)] min-w-[220px] p-1">
        <div role="menu">
          {section.items.map((item) => {
            const Icon = resolveIcon(item.icon);
            const active = pathActive(location.pathname, item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/bookings' || item.to === '/dashboard' || item.to === '/'}
                role="menuitem"
                onClick={onClose}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] transition-colors',
                  active
                    ? 'bg-[var(--gold-soft)] font-semibold text-[var(--navy)] dark:text-[var(--accent)]'
                    : 'text-[var(--text)] hover:bg-[var(--surface-2)]',
                )}
              >
                <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]')} />
                {item.label}
              </NavLink>
            );
          })}
        </div>
      </MenuPop>
    </div>
  );
}

function SearchResults({ results, searching, activeIndex, setActiveIndex, onSelect }) {
  return (
    <ul className="max-h-80 overflow-y-auto p-1">
      {searching && !results.length ? (
        <li className="flex items-center justify-center gap-2 px-3 py-6 text-[13px] text-[var(--text-muted)]">
          <Spinner inline size={16} /> Searching…
        </li>
      ) : null}
      {results.map((item, index) => {
        const meta = TYPE_META[item.type] || { label: item.type, icon: MdBusiness };
        const Icon = meta.icon;
        return (
          <li key={`${item.type}-${item.id}`}>
            <button
              type="button"
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => onSelect(item)}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm',
                index === activeIndex ? 'bg-[var(--surface-2)]' : 'hover:bg-[var(--surface-2)]',
              )}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--primary-light)] text-[var(--navy)] dark:text-[var(--primary)]">
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-[var(--text)]">{item.title}</span>
                {item.subtitle ? (
                  <span className="block truncate text-xs text-[var(--text-muted)]">{item.subtitle}</span>
                ) : null}
              </span>
              <span className="shrink-0 rounded-md bg-[var(--surface-2)] px-1.5 py-0.5 text-[10.5px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                {meta.label}
              </span>
            </button>
          </li>
        );
      })}
      {!searching && !results.length ? (
        <li className="px-3 py-8 text-center text-[13px] text-[var(--text-muted)]">No matches found</li>
      ) : null}
    </ul>
  );
}

export default function TopNavbar({ onMenuClick, search, onSearchChange }) {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const { isTopbar, isSidebar, setNavLayout } = useLayout();
  const navigate = useNavigate();
  const location = useLocation();
  const sections = filterNavSections(user);
  const trail = useRouteTrail(location.pathname);

  const [openMenu, setOpenMenu] = useState(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchPanel, setSearchPanel] = useState(false);
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const notifRef = useRef(null);
  const userRef = useRef(null);
  const searchInputRef = useRef(null);
  const debounceRef = useRef(null);
  const requestIdRef = useRef(0);

  const today = useMemo(
    () =>
      new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(
        new Date(),
      ),
    [],
  );

  useEffect(() => {
    const onDocClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (userRef.current && !userRef.current.contains(e.target)) setUserOpen(false);
      if (!e.target.closest?.('[data-search-root]')) {
        setSearchOpen(false);
        setSearchPanel(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  // Ctrl/Cmd + K focuses search
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchPanel(true);
        window.setTimeout(() => searchInputRef.current?.focus(), 0);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    setOpenMenu(null);
    setUserOpen(false);
    setNotifOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const q = String(search || '').trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (q.length < 1) {
      setResults([]);
      setSearching(false);
      setActiveIndex(-1);
      return undefined;
    }

    setSearching(true);
    setSearchOpen(true);
    const requestId = ++requestIdRef.current;

    debounceRef.current = setTimeout(async () => {
      try {
        const rows = await rentalApi.search(q);
        if (requestId !== requestIdRef.current) return;
        setResults(rows);
        setActiveIndex(rows.length ? 0 : -1);
      } catch {
        if (requestId !== requestIdRef.current) return;
        setResults([]);
        setActiveIndex(-1);
      } finally {
        if (requestId === requestIdRef.current) setSearching(false);
      }
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  const selectResult = (item) => {
    if (!item) return;
    onSearchChange(item.searchText || search);
    setSearchOpen(false);
    setSearchPanel(false);
    navigate(item.path);
  };

  const onSearchKeyDown = (e) => {
    if (!searchOpen && (e.key === 'ArrowDown' || e.key === 'Enter') && results.length) {
      setSearchOpen(true);
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!results.length) return;
      setActiveIndex((i) => (i + 1) % results.length);
      setSearchOpen(true);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!results.length) return;
      setActiveIndex((i) => (i <= 0 ? results.length - 1 : i - 1));
      setSearchOpen(true);
    } else if (e.key === 'Enter') {
      if (searchOpen && activeIndex >= 0 && results[activeIndex]) {
        e.preventDefault();
        selectResult(results[activeIndex]);
      }
    } else if (e.key === 'Escape') {
      setSearchOpen(false);
      setSearchPanel(false);
      e.currentTarget.blur();
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  const hasQuery = Boolean(String(search || '').trim());
  const resultsProps = { results, searching, activeIndex, setActiveIndex, onSelect: selectResult };

  return (
    <header className="app-topbar sticky top-0 z-30 border-b border-[var(--border)] bg-[color-mix(in_oklab,var(--surface)_88%,transparent)] backdrop-blur-md supports-[backdrop-filter]:bg-[color-mix(in_oklab,var(--surface)_80%,transparent)]">
      <div className="flex h-[var(--header-h)] items-center gap-2 px-4 sm:gap-3 md:px-5 lg:px-8">
        <button type="button" onClick={onMenuClick} className={cn(iconBtn, '-ml-1.5 lg:hidden')} aria-label="Open menu">
          <MdMenu className="h-5 w-5" />
        </button>

        {/* Mobile brand (sidebar mode) */}
        {isSidebar ? (
          <Link to="/dashboard" className="flex items-center lg:hidden" aria-label="RJK Realty home">
            <Logo variant="mark" className="h-7 w-auto" alt="" />
          </Link>
        ) : null}

        {isTopbar ? (
          <Link to="/dashboard" className="flex shrink-0 items-center" aria-label="RJK Realty home">
            <Logo variant="full" className="h-9 w-auto" />
          </Link>
        ) : null}

        {/* Breadcrumb trail (sidebar mode) */}
        {isSidebar && trail.length ? (
          <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-1 text-[13px] lg:flex">
            {trail.map((c, i) => {
              const last = i === trail.length - 1;
              return (
                <span key={`${c.label}-${i}`} className="inline-flex min-w-0 items-center gap-1">
                  {i > 0 ? <MdChevronRight className="h-4 w-4 shrink-0 text-[var(--border-strong)]" /> : null}
                  {c.to && !last ? (
                    <Link to={c.to} className="truncate text-[var(--text-muted)] hover:text-[var(--text)]">
                      {c.label}
                    </Link>
                  ) : (
                    <span className={cn('truncate', last ? 'font-semibold text-[var(--text)]' : 'text-[var(--text-muted)]')}>
                      {c.label}
                    </span>
                  )}
                </span>
              );
            })}
          </nav>
        ) : null}

        {isTopbar ? (
          <nav className="ml-4 hidden min-w-0 flex-1 items-center gap-0.5 lg:flex" aria-label="Primary">
            {sections.map((section) => (
              <NavDropdown
                key={section.title}
                section={section}
                open={openMenu === section.title}
                onToggle={() => setOpenMenu((cur) => (cur === section.title ? null : section.title))}
                onClose={() => setOpenMenu(null)}
              />
            ))}
          </nav>
        ) : null}

        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-1.5">
          {/* Desktop search */}
          <div className="relative hidden md:block" data-search-root>
            <div className="relative">
              <MdSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                ref={searchInputRef}
                type="search"
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                onKeyDown={onSearchKeyDown}
                onFocus={() => setSearchPanel(true)}
                placeholder="Search…"
                aria-label="Search"
                className="h-9 w-[220px] rounded-lg border border-[var(--border)] bg-[var(--surface-2)] pl-9 pr-12 text-[13.5px] text-[var(--text)] outline-none transition-[width,border-color,box-shadow,background-color] duration-200 placeholder:text-[var(--text-muted)] focus:w-[300px] focus:border-[var(--navy)] focus:bg-[var(--surface)] focus:ring-[3px] focus:ring-[var(--ring)] xl:w-[260px] xl:focus:w-[340px] dark:focus:border-[var(--gold)] [&::-webkit-search-cancel-button]:hidden"
              />
              <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border border-[var(--border)] bg-[var(--surface)] px-1.5 py-0.5 font-sans text-[10px] font-semibold text-[var(--text-muted)] lg:block">
                Ctrl K
              </kbd>
            </div>
            <MenuPop open={searchPanel && hasQuery} className="absolute right-0 top-[calc(100%+0.5rem)] w-[380px]">
              <SearchResults {...resultsProps} />
            </MenuPop>
          </div>

          {/* Mobile search */}
          <div className="relative md:hidden" data-search-root>
            <button type="button" onClick={() => setSearchPanel((v) => !v)} className={iconBtn} aria-label="Search">
              <MdSearch className="h-5 w-5" />
            </button>
            <MenuPop open={searchPanel} className="fixed inset-x-3 top-[calc(var(--header-h)+0.5rem)]">
              <div className="border-b border-[var(--border)] p-2.5">
                <div className="relative">
                  <MdSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type="search"
                    autoFocus
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    onKeyDown={onSearchKeyDown}
                    placeholder="Search customer, phone, room…"
                    className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] pl-9 pr-3 text-sm outline-none focus:border-[var(--navy)] focus:ring-[3px] focus:ring-[var(--ring)]"
                  />
                </div>
              </div>
              {searchOpen && hasQuery ? <SearchResults {...resultsProps} /> : null}
            </MenuPop>
          </div>

          <span className="mx-1 hidden items-center gap-1.5 whitespace-nowrap text-[12.5px] font-medium text-[var(--text-muted)] xl:inline-flex">
            <MdCalendarToday className="h-3.5 w-3.5" />
            {today}
          </span>

          <span className="mx-0.5 hidden h-6 w-px bg-[var(--border)] sm:block" aria-hidden="true" />

          <button type="button" onClick={toggleTheme} className={iconBtn} aria-label="Toggle theme" title={isDark ? 'Light mode' : 'Dark mode'}>
            {isDark ? <MdLightMode className="h-[19px] w-[19px]" /> : <MdDarkMode className="h-[19px] w-[19px]" />}
          </button>

          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => setNotifOpen((v) => !v)}
              className={cn(iconBtn, notifOpen && 'bg-[var(--surface-2)] text-[var(--text)]')}
              aria-label="Notifications"
            >
              <MdNotificationsNone className="h-5 w-5" />
              {unreadCount > 0 ? (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--gold)] px-1 text-[9.5px] font-bold text-[var(--on-gold)] ring-2 ring-[var(--surface)]">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              ) : null}
            </button>

            <MenuPop open={notifOpen} className="absolute right-0 top-[calc(100%+0.5rem)] w-[min(360px,calc(100vw-2rem))]">
              <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
                <div>
                  <p className="font-display text-sm font-bold text-[var(--text)]">Notifications</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {unreadCount ? `${unreadCount} unread` : 'You are all caught up'}
                  </p>
                </div>
                {unreadCount > 0 ? (
                  <button type="button" onClick={markAllRead} className="text-xs font-semibold text-[var(--accent)] hover:underline">
                    Mark all read
                  </button>
                ) : null}
              </div>
              {notifications.length ? (
                <ul className="max-h-80 divide-y divide-[var(--border)] overflow-y-auto">
                  {notifications.slice(0, 6).map((n) => (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => markRead(n.id)}
                        className="flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--surface-2)]"
                      >
                        <span
                          className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.read ? 'bg-transparent' : 'bg-[var(--gold)]')}
                        />
                        <span className={cn('min-w-0', n.read && 'opacity-60')}>
                          <span className="block text-[13.5px] font-medium text-[var(--text)]">{n.title}</span>
                          <span className="mt-0.5 block text-xs text-[var(--text-muted)]">{n.message}</span>
                          <span className="mt-1 block text-[11px] text-[var(--text-muted)]">{formatDate(n.time)}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--text-muted)]">
                    <MdNotificationsNone className="h-5 w-5" />
                  </span>
                  <p className="text-[13px] font-medium text-[var(--text)]">No notifications yet</p>
                  <p className="text-xs text-[var(--text-muted)]">Alerts about bookings and payments will appear here.</p>
                </div>
              )}
            </MenuPop>
          </div>

          <div className="relative ml-0.5" ref={userRef}>
            <button
              type="button"
              onClick={() => setUserOpen((v) => !v)}
              className={cn(
                'flex items-center gap-2 rounded-lg py-1 pl-1 pr-1.5 transition-colors hover:bg-[var(--surface-2)] sm:pr-2',
                userOpen && 'bg-[var(--surface-2)]',
              )}
              aria-haspopup="menu"
              aria-expanded={userOpen}
            >
              {user?.avatar ? (
                <img src={user.avatar} alt="" className="h-8 w-8 rounded-full object-cover ring-2 ring-[var(--border)]" />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--navy)] text-[11px] font-bold text-white ring-2 ring-[var(--gold)]/40">
                  {initialsOf(user?.name)}
                </span>
              )}
              <span className="hidden max-w-[120px] truncate text-[13.5px] font-semibold text-[var(--text)] sm:block">
                {user?.name?.split(' ')[0] || 'User'}
              </span>
              <MdExpandMore className={cn('hidden h-4 w-4 text-[var(--text-muted)] transition-transform sm:block', userOpen && 'rotate-180')} />
            </button>

            <MenuPop open={userOpen} className="absolute right-0 top-[calc(100%+0.5rem)] w-64">
              <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-3.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--navy)] text-xs font-bold text-white">
                  {initialsOf(user?.name)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--text)]">{user?.name}</p>
                  <p className="truncate text-xs text-[var(--text-muted)]">{user?.email}</p>
                </div>
              </div>
              <div className="p-1.5">
                {[
                  { to: '/profile', icon: MdPerson, label: 'Profile' },
                  { to: '/change-password', icon: MdLock, label: 'Change password' },
                  { to: '/settings', icon: MdSettings, label: 'Settings' },
                ].map(({ to, icon: Icon, label }) => (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setUserOpen(false)}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] text-[var(--text)] hover:bg-[var(--surface-2)]"
                  >
                    <Icon className="h-4 w-4 text-[var(--text-muted)]" /> {label}
                  </Link>
                ))}
              </div>
              <div className="border-t border-[var(--border)] p-1.5">
                <p className="px-3 pb-1 pt-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                  Workspace layout
                </p>
                <div className="grid grid-cols-2 gap-1 px-1.5 pb-1">
                  {[
                    { value: 'sidebar', icon: MdViewSidebar, label: 'Sidebar', active: isSidebar },
                    { value: 'topbar', icon: MdWebAsset, label: 'Topbar', active: isTopbar },
                  ].map(({ value, icon: Icon, label, active }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setNavLayout(value)}
                      aria-pressed={active}
                      className={cn(
                        'flex items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs font-semibold transition-colors',
                        active
                          ? 'border-[var(--gold)] bg-[var(--gold-soft)] text-[var(--navy)] dark:text-[var(--accent)]'
                          : 'border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]',
                      )}
                    >
                      <Icon className="h-4 w-4" /> {label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setUserOpen(false);
                    toggleFullscreen();
                  }}
                  className="mt-1 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] text-[var(--text)] hover:bg-[var(--surface-2)]"
                >
                  <MdFullscreen className="h-4 w-4 text-[var(--text-muted)]" /> Toggle fullscreen
                </button>
              </div>
              <div className="border-t border-[var(--border)] p-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setUserOpen(false);
                    logout();
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
                >
                  <MdLogout className="h-4 w-4" /> Sign out
                </button>
              </div>
            </MenuPop>
          </div>
        </div>
      </div>
    </header>
  );
}
