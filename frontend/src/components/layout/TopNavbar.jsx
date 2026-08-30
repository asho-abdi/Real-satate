import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  MdApartment,
  MdBusiness,
  MdDarkMode,
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
  MdStorefront,
} from 'react-icons/md';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import { useNotifications } from '../../context/NotificationContext.jsx';
import { formatDate } from '../../utils/format.js';
import { rentalApi } from '../../services/rentalApi.js';

const TYPE_META = {
  building: { label: 'Building', icon: MdApartment },
  floor: { label: 'Floor', icon: MdLayers },
  room: { label: 'Room', icon: MdMeetingRoom },
  guest: { label: 'Guest', icon: MdPerson },
  tenant: { label: 'Tenant', icon: MdPerson },
  business: { label: 'Shop', icon: MdStorefront },
};

export default function TopNavbar({ onMenuClick, search, onSearchChange }) {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const notifRef = useRef(null);
  const userRef = useRef(null);
  const searchRef = useRef(null);
  const debounceRef = useRef(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const onDocClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (userRef.current && !userRef.current.contains(e.target)) setUserOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false);
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
    }
  };

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[color-mix(in_oklab,var(--surface)_88%,transparent)] backdrop-blur-md">
      <div className="flex h-16 items-center gap-3 px-4 md:px-6">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-xl p-2 text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)] lg:hidden"
          aria-label="Open menu"
        >
          <MdMenu className="h-6 w-6" />
        </button>

        <div className="relative min-w-0 flex-1 max-w-xl" ref={searchRef}>
          <MdSearch className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={() => {
              if (String(search || '').trim()) setSearchOpen(true);
            }}
            onKeyDown={onSearchKeyDown}
            placeholder="Search customer, phone, building, room…"
            className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] pl-10 pr-3 text-sm text-[var(--text)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            aria-autocomplete="list"
            aria-expanded={searchOpen}
            aria-controls="global-search-results"
          />

          {searchOpen && String(search || '').trim() ? (
            <div
              id="global-search-results"
              className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow)]"
            >
              <div className="border-b border-[var(--border)] px-4 py-2.5">
                <p className="text-xs font-medium text-[var(--text-muted)]">
                  {searching
                    ? 'Searching…'
                    : results.length
                      ? `${results.length} result${results.length === 1 ? '' : 's'}`
                      : 'No matches'}
                </p>
              </div>
              <ul className="max-h-80 overflow-y-auto py-1">
                {results.map((item, index) => {
                  const meta = TYPE_META[item.type] || { label: item.type, icon: MdBusiness };
                  const Icon = meta.icon;
                  const active = index === activeIndex;
                  return (
                    <li key={`${item.type}-${item.id}`}>
                      <button
                        type="button"
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => selectResult(item)}
                        className={`flex w-full items-start gap-3 px-4 py-2.5 text-left transition ${
                          active ? 'bg-[var(--surface-2)]' : 'hover:bg-[var(--surface-2)]'
                        }`}
                      >
                        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium text-[var(--text)]">
                              {item.title}
                            </span>
                            <span className="shrink-0 rounded-md bg-[var(--surface-2)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                              {meta.label}
                            </span>
                          </span>
                          {item.subtitle ? (
                            <span className="mt-0.5 block truncate text-xs text-[var(--text-muted)]">
                              {item.subtitle}
                            </span>
                          ) : null}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {!searching && !results.length ? (
                <p className="px-4 py-6 text-center text-sm text-[var(--text-muted)]">
                  Try a name, phone, building, floor, or room number.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            className="rounded-xl p-2 text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
            aria-label="Toggle theme"
          >
            {isDark ? <MdLightMode className="h-5 w-5" /> : <MdDarkMode className="h-5 w-5" />}
          </button>

          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => setNotifOpen((v) => !v)}
              className="relative rounded-xl p-2 text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
              aria-label="Notifications"
            >
              <MdNotifications className="h-5 w-5" />
              {unreadCount > 0 ? (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              ) : null}
            </button>

            {notifOpen ? (
              <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow)] sm:w-96">
                <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
                  <p className="text-sm font-semibold text-[var(--text)]">Notifications</p>
                  {unreadCount > 0 ? (
                    <button
                      type="button"
                      onClick={markAllRead}
                      className="text-xs font-medium text-brand-700 hover:underline dark:text-brand-300"
                    >
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
                        className={`w-full px-4 py-3 text-left transition hover:bg-[var(--surface-2)] ${
                          n.read ? 'opacity-70' : ''
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {!n.read ? (
                            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
                          ) : (
                            <span className="mt-1.5 h-2 w-2 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-[var(--text)]">{n.title}</p>
                            <p className="mt-0.5 line-clamp-2 text-xs text-[var(--text-muted)]">{n.message}</p>
                            <p className="mt-1 text-[11px] text-[var(--text-muted)]">{formatDate(n.time)}</p>
                          </div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="border-t border-[var(--border)] px-4 py-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      markAllRead();
                      setNotifOpen(false);
                    }}
                    className="text-xs font-medium text-brand-700 hover:underline dark:text-brand-300"
                  >
                    Close notifications
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="relative" ref={userRef}>
            <button
              type="button"
              onClick={() => setUserOpen((v) => !v)}
              className="flex items-center gap-2 rounded-xl p-1.5 pr-2 hover:bg-[var(--surface-2)]"
            >
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt=""
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-brand-800 dark:bg-brand-900/50 dark:text-brand-200">
                  <MdPerson className="h-4 w-4" />
                </span>
              )}
              <span className="hidden max-w-[120px] truncate text-left text-sm font-medium text-[var(--text)] sm:block">
                {user?.name || 'User'}
              </span>
            </button>

            {userOpen ? (
              <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow)]">
                <div className="border-b border-[var(--border)] px-4 py-3">
                  <p className="truncate text-sm font-semibold text-[var(--text)]">{user?.name}</p>
                  <p className="truncate text-xs text-[var(--text-muted)]">{user?.email}</p>
                  <p className="mt-1 text-[11px] text-brand-700 dark:text-brand-300">{user?.role}</p>
                </div>
                <div className="p-1.5">
                  <Link
                    to="/profile"
                    onClick={() => setUserOpen(false)}
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-[var(--text)] hover:bg-[var(--surface-2)]"
                  >
                    <MdPerson className="h-4 w-4 text-[var(--text-muted)]" />
                    Profile
                  </Link>
                  <Link
                    to="/change-password"
                    onClick={() => setUserOpen(false)}
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-[var(--text)] hover:bg-[var(--surface-2)]"
                  >
                    <MdLock className="h-4 w-4 text-[var(--text-muted)]" />
                    Change password
                  </Link>
                  <Link
                    to="/settings"
                    onClick={() => setUserOpen(false)}
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-[var(--text)] hover:bg-[var(--surface-2)]"
                  >
                    <MdSettings className="h-4 w-4 text-[var(--text-muted)]" />
                    Settings
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setUserOpen(false);
                      logout();
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                  >
                    <MdLogout className="h-4 w-4" />
                    Sign out
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
