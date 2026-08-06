import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MdDarkMode,
  MdLightMode,
  MdLock,
  MdLogout,
  MdMenu,
  MdNotifications,
  MdPerson,
  MdSearch,
  MdSettings,
} from 'react-icons/md';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import { useNotifications } from '../../context/NotificationContext.jsx';
import { formatDate } from '../../utils/format.js';

export default function TopNavbar({ onMenuClick, search, onSearchChange }) {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const notifRef = useRef(null);
  const userRef = useRef(null);

  useEffect(() => {
    const onDocClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (userRef.current && !userRef.current.contains(e.target)) setUserOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

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

        <div className="relative min-w-0 flex-1 max-w-xl">
          <MdSearch className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search customer, phone, building, room…"
            className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] pl-10 pr-3 text-sm text-[var(--text)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          />
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
