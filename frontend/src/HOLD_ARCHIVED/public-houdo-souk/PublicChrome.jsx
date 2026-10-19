import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { MdClose, MdMenu } from 'react-icons/md';
import { useAuth } from '../../context/AuthContext.jsx';
import { APP_NAME } from '../../utils/constants.js';

const LINKS = [
  { to: '/properties?type=guest', label: 'Stays' },
  { to: '/properties?type=apartment', label: 'Apartments' },
  { to: '/properties?type=commercial-rent', label: 'Shops' },
];

function Logo() {
  return (
    <Link to="/" className="text-lg font-bold tracking-tight" style={{ color: '#2f6fed' }}>
      Houdo Souk
    </Link>
  );
}

export function PublicHeader() {
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-[#f5f7fb]/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6">
        <Logo />
        <nav className="hidden items-center gap-6 md:flex">
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `text-sm font-medium transition ${isActive ? 'text-[#2f6fed]' : 'text-[#3d4663] hover:text-[#2f6fed]'}`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Link to="/contact" className="hidden text-sm font-medium text-[#3d4663] hover:text-[#2f6fed] sm:inline">
            Contact
          </Link>
          <Link
            to={isAuthenticated ? '/dashboard' : '/login'}
            className="hidden h-9 items-center rounded-full bg-[#2f6fed] px-4 text-sm font-semibold text-white transition hover:bg-[#1d4ed8] sm:inline-flex"
          >
            {isAuthenticated ? 'Dashboard' : 'Sign in'}
          </Link>
          <button
            type="button"
            className="rounded-xl p-2 text-[#1c2434] md:hidden"
            onClick={() => setOpen((value) => !value)}
            aria-label="Open menu"
          >
            {open ? <MdClose className="h-6 w-6" /> : <MdMenu className="h-6 w-6" />}
          </button>
        </div>
      </div>
      {open ? (
        <div className="border-t border-[#e6edf5] bg-white px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            {LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-3 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--primary-light)]"
              >
                {link.label}
              </NavLink>
            ))}
            <Link
              to={isAuthenticated ? '/dashboard' : '/login'}
              onClick={() => setOpen(false)}
              className="mt-2 inline-flex h-11 items-center justify-center rounded-2xl bg-[var(--primary)] text-sm font-semibold text-white"
            >
              {isAuthenticated ? 'Dashboard' : 'Login'}
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t border-[var(--border)] bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-[var(--text-secondary)] md:flex-row md:items-center md:justify-between md:px-6">
        <p className="font-semibold text-[#1c2434]">Houdo Souk · {APP_NAME}</p>
        <div className="flex flex-wrap gap-4">
          <Link to="/properties">Properties</Link>
          <Link to="/services">Services</Link>
          <Link to="/about">About</Link>
          <Link to="/contact">Contact</Link>
          <Link to="/login">Login</Link>
        </div>
      </div>
    </footer>
  );
}
