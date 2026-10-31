import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  MdApartment,
  MdBusiness,
  MdDarkMode,
  MdExpandMore,
  MdFullscreen,
  MdLayers,
  MdLightMode,
  MdLock,
  MdLogout,
  MdMeetingRoom,
  MdMenu,
  MdNotifications,
  MdPerson,
  MdSearch,
  MdSettings,
  MdShield,
  MdStorefront,
  MdViewSidebar,
  MdWebAsset,
} from 'react-icons/md';
import * as MdIcons from 'react-icons/md';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import { useNotifications } from '../../context/NotificationContext.jsx';
import { useLayout } from '../../context/LayoutContext.jsx';
import { APP_NAME } from '../../utils/constants.js';
import { cn, formatDate } from '../../utils/format.js';
import { rentalApi } from '../../services/rentalApi.js';
import { filterNavSections } from './navItems.js';

const TYPE_META = {
  building: { label: 'Building', icon: MdApartment },
  floor: { label: 'Floor', icon: MdLayers },
  room: { label: 'Room', icon: MdMeetingRoom },
  guest: { label: 'Guest', icon: MdPerson },
  tenant: { label: 'Tenant', icon: MdPerson },
  business: { label: 'Shop', icon: MdStorefront },
};

function resolveIcon(name) {
  return MdIcons[name] || MdIcons.MdCircle;
}

function pathActive(pathname, to) {
  if (to === '/dashboard' || to === '/') return pathname === '/dashboard' || pathname === '/';
  if (to === '/bookings') return pathname === '/bookings' || pathname.startsWith('/bookings/');
  return pathname === to || pathname.startsWith(`${to}/`);
}

function NavDropdown({ section, open, onToggle, onClose }) {
  const location = useLocation();
  const sectionActive = section.items.some((item) => pathActive(location.pathname, item.to));
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open, onClose]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors',
          sectionActive || open
            ? 'bg-brand-500/12 text-brand-600 dark:text-brand-400'
            : 'text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]',
        )}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span>{section.topLabel || section.title}</span>
        <MdExpandMore className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute left-0 top-[calc(100%+0.4rem)] z-40 min-w-[200px] overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] py-1 shadow-lg"
        >
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
                  'flex items-center gap-2.5 px-3 py-2 text-sm transition-colors',
                  active
                    ? 'bg-brand-500/10 font-medium text-brand-600 dark:text-brand-400'
                    : 'text-[var(--text)] hover:bg-[var(--surface-2)]',
                )}
              >
                <Icon className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
                {item.label}
              </NavLink>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export default function TopNavbar({ onMenuClick, search, onSearchChange }) {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const { isTopbar, isSidebar, setNavLayout } = useLayout();
  const navigate = useNavigate();
  const sections = filterNavSections(user);

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
  const debounceRef = useRef(null);
  const requestIdRef = useRef(0);

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
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--surface)]">
      <div className="flex h-[var(--header-h)] items-center gap-3 px-4 md:px-5">
        <button
          type="button"
          onClick={onMenuClick}
          className={cn(
            'rounded-md p-2 text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]',
            isSidebar ? 'lg:hidden' : 'lg:hidden',
          )}
          aria-label="Open menu"
        >
          <MdMenu className="h-5 w-5" />
        </button>

        {isTopbar ? (
          <Link to="/dashboard" className="flex shrink-0 items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[color-mix(in_oklab,var(--primary)_12%,transparent)] text-[var(--primary)] dark:bg-sky-400/15 dark:text-sky-300">
              <MdShield className="h-5 w-5" />
            </span>
            <span className="hidden text-base font-bold tracking-tight text-[var(--text)] sm:inline">
              {APP_NAME}
            </span>
          </Link>
        ) : null}

        {isSidebar ? (
          <div className="relative hidden min-w-0 flex-1 lg:block" data-search-root>
            <div className="relative max-w-md">
              <MdSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="search"
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                onKeyDown={onSearchKeyDown}
                onFocus={() => setSearchPanel(true)}
                placeholder="Search units, guests, phone…"
                className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] pl-9 pr-3 text-sm outline-none transition focus:border-[var(--accent)] focus:bg-[var(--surface)] focus:ring-2 focus:ring-[var(--accent)]/15"
              />
            </div>
            {searchPanel && String(search || '').trim() ? (
              <div className="absolute left-0 top-[calc(100%+0.5rem)] z-40 w-full max-w-md overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-lg">
                <ul className="max-h-72 overflow-y-auto py-1">
                  {results.map((item, index) => {
                    const meta = TYPE_META[item.type] || { label: item.type, icon: MdBusiness };
                    const Icon = meta.icon;
                    return (
                      <li key={`${item.type}-${item.id}`}>
                        <button
                          type="button"
                          onMouseEnter={() => setActiveIndex(index)}
                          onClick={() => selectResult(item)}
                          className={`flex w-full items-start gap-3 px-3 py-2.5 text-left text-sm ${
                            index === activeIndex ? 'bg-[var(--surface-2)]' : 'hover:bg-[var(--surface-2)]'
                          }`}
                        >
                          <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />
                          <span className="min-w-0">
                            <span className="block truncate font-medium">{item.title}</span>
                            {item.subtitle ? (
                              <span className="block truncate text-xs text-[var(--text-muted)]">
                                {item.subtitle}
                              </span>
                            ) : null}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                  {!searching && !results.length ? (
                    <li className="px-3 py-6 text-center text-sm text-[var(--text-muted)]">No matches</li>
                  ) : null}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}

        {isTopbar ? (
          <nav className="hidden min-w-0 flex-1 items-center gap-0.5 lg:flex" aria-label="Primary">
            {sections.map((section) => (
              <NavDropdown
                key={section.title}
                section={section}
                open={openMenu === section.title}
                onToggle={() =>
                  setOpenMenu((cur) => (cur === section.title ? null : section.title))
                }
                onClose={() => setOpenMenu(null)}
              />
            ))}
          </nav>
        ) : null}

        <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1">
          <div className="mr-1 hidden items-center rounded-xl border border-[var(--border)] p-0.5 sm:flex">
            <button
              type="button"
              onClick={() => setNavLayout('sidebar')}
              className={cn(
                'inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors',
                isSidebar
                  ? 'bg-[color-mix(in_oklab,var(--primary)_12%,transparent)] text-[var(--primary)] dark:bg-sky-400/15 dark:text-sky-300'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)]',
              )}
              aria-pressed={isSidebar}
              title="Sidebar layout (default)"
            >
              <MdViewSidebar className="h-4 w-4" />
              <span className="hidden md:inline">Sidebar</span>
            </button>
            <button
              type="button"
              onClick={() => setNavLayout('topbar')}
              className={cn(
                'inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors',
                isTopbar
                  ? 'bg-[color-mix(in_oklab,var(--primary)_12%,transparent)] text-[var(--primary)] dark:bg-sky-400/15 dark:text-sky-300'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)]',
              )}
              aria-pressed={isTopbar}
              title="Topbar layout"
            >
              <MdWebAsset className="h-4 w-4" />
              <span className="hidden md:inline">Topbar</span>
            </button>
          </div>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="hidden rounded-md p-2.5 text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)] md:inline-flex"
            aria-label="Fullscreen"
          >
            <MdFullscreen className="h-[18px] w-[18px]" />
          </button>

          <div className={cn('relative', isSidebar && 'lg:hidden')} data-search-root>
            <button
              type="button"
              onClick={() => setSearchPanel((v) => !v)}
              className="rounded-xl p-2.5 text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
              aria-label="Search"
            >
              <MdSearch className="h-[18px] w-[18px]" />
            </button>

            {searchPanel ? (
              <div className="absolute right-0 top-[calc(100%+0.5rem)] z-40 w-80 sm:w-96">
                <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-lg">
                  <div className="border-b border-[var(--border)] p-3">
                    <input
                      type="search"
                      autoFocus
                      value={search}
                      onChange={(e) => onSearchChange(e.target.value)}
                      onKeyDown={onSearchKeyDown}
                      placeholder="Search customer, phone, room…"
                      className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                    />
                  </div>
                  {searchOpen && String(search || '').trim() ? (
                    <ul className="max-h-72 overflow-y-auto py-1">
                      {results.map((item, index) => {
                        const meta = TYPE_META[item.type] || { label: item.type, icon: MdBusiness };
                        const Icon = meta.icon;
                        return (
                          <li key={`${item.type}-${item.id}`}>
                            <button
                              type="button"
                              onMouseEnter={() => setActiveIndex(index)}
                              onClick={() => selectResult(item)}
                              className={`flex w-full items-start gap-3 px-3 py-2.5 text-left text-sm ${
                                index === activeIndex ? 'bg-[var(--surface-2)]' : 'hover:bg-[var(--surface-2)]'
                              }`}
                            >
                              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />
                              <span className="min-w-0">
                                <span className="block truncate font-medium">{item.title}</span>
                                {item.subtitle ? (
                                  <span className="block truncate text-xs text-[var(--text-muted)]">
                                    {item.subtitle}
                                  </span>
                                ) : null}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                      {!searching && !results.length ? (
                        <li className="px-3 py-6 text-center text-sm text-[var(--text-muted)]">No matches</li>
                      ) : null}
                    </ul>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={toggleTheme}
            className="rounded-md p-2.5 text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
            aria-label="Toggle theme"
          >
            {isDark ? <MdLightMode className="h-[18px] w-[18px]" /> : <MdDarkMode className="h-[18px] w-[18px]" />}
          </button>

          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => setNotifOpen((v) => !v)}
              className="relative rounded-md p-2.5 text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
              aria-label="Notifications"
            >
              <MdNotifications className="h-[18px] w-[18px]" />
              {unreadCount > 0 ? (
                <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-500 px-1 text-[10px] font-bold text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              ) : null}
            </button>

            {notifOpen ? (
              <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-lg sm:w-96">
                <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
                  <p className="text-sm font-semibold">Notifications</p>
                  {unreadCount > 0 ? (
                    <button type="button" onClick={markAllRead} className="text-xs font-medium text-brand-500">
                      Mark all read
                    </button>
                  ) : null}
                </div>
                <ul className="max-h-80 overflow-y-auto">
                  {notifications.slice(0, 6).map((n) => (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => markRead(n.id)}
                        className={`w-full px-4 py-3 text-left hover:bg-[var(--surface-2)] ${n.read ? 'opacity-60' : ''}`}
                      >
                        <p className="text-sm font-medium">{n.title}</p>
                        <p className="mt-0.5 text-xs text-[var(--text-muted)]">{n.message}</p>
                        <p className="mt-1 text-[11px] text-[var(--text-muted)]">{formatDate(n.time)}</p>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <div className="relative ml-1" ref={userRef}>
            <button
              type="button"
              onClick={() => setUserOpen((v) => !v)}
              className="flex items-center gap-2 rounded-md py-1.5 pl-1.5 pr-2 hover:bg-[var(--surface-2)]"
            >
              {user?.avatar ? (
                <img src={user.avatar} alt="" className="h-8 w-8 rounded-full object-cover ring-2 ring-[var(--border)]" />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500/15 text-brand-500">
                  <MdPerson className="h-4 w-4" />
                </span>
              )}
              <span className="hidden max-w-[100px] truncate text-sm font-medium sm:block">
                {user?.name?.split(' ')[0] || 'User'}
              </span>
              <MdExpandMore className="hidden h-4 w-4 text-[var(--text-muted)] sm:block" />
            </button>

            {userOpen ? (
              <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-lg">
                <div className="border-b border-[var(--border)] px-4 py-3">
                  <p className="truncate text-sm font-semibold">{user?.name}</p>
                  <p className="truncate text-xs text-[var(--text-muted)]">{user?.email}</p>
                </div>
                <div className="border-b border-[var(--border)] p-1.5 sm:hidden">
                  <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                    Layout
                  </p>
                  <button
                    type="button"
                    onClick={() => { setNavLayout('topbar'); setUserOpen(false); }}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-[var(--surface-2)]"
                  >
                    <MdWebAsset className="h-4 w-4 text-[var(--text-muted)]" /> Topbar
                  </button>
                  <button
                    type="button"
                    onClick={() => { setNavLayout('sidebar'); setUserOpen(false); }}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-[var(--surface-2)]"
                  >
                    <MdViewSidebar className="h-4 w-4 text-[var(--text-muted)]" /> Sidebar
                  </button>
                </div>
                <div className="p-1.5">
                  <Link to="/profile" onClick={() => setUserOpen(false)} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-[var(--surface-2)]">
                    <MdPerson className="h-4 w-4 text-[var(--text-muted)]" /> Profile
                  </Link>
                  <Link to="/change-password" onClick={() => setUserOpen(false)} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-[var(--surface-2)]">
                    <MdLock className="h-4 w-4 text-[var(--text-muted)]" /> Change password
                  </Link>
                  <Link to="/settings" onClick={() => setUserOpen(false)} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-[var(--surface-2)]">
                    <MdSettings className="h-4 w-4 text-[var(--text-muted)]" /> Settings
                  </Link>
                  <button
                    type="button"
                    onClick={() => { setUserOpen(false); logout(); }}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                  >
                    <MdLogout className="h-4 w-4" /> Sign out
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
