import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import BrandLoader from '../components/brand/BrandLoader.jsx';
import { ROUTE_PAGE_KEY, userCanAccessRoute } from '../utils/pageAccess.js';

function pageKeyForPath(pathname) {
  if (ROUTE_PAGE_KEY[pathname]) return ROUTE_PAGE_KEY[pathname];
  if (pathname.startsWith('/buildings')) return 'buildings';
  if (pathname.startsWith('/units')) return 'units';
  if (pathname.startsWith('/work-progress')) return 'work-progress';
  if (pathname.startsWith('/bookings')) return 'bookings';
  const base = `/${pathname.split('/').filter(Boolean)[0] || 'dashboard'}`;
  return ROUTE_PAGE_KEY[base] || null;
}

function pathForPageKey(key) {
  const hit = Object.entries(ROUTE_PAGE_KEY).find(([, v]) => v === key);
  return hit?.[0] || '/profile';
}

export default function ProtectedRoute() {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <BrandLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const pageKey = pageKeyForPath(location.pathname);
  if (pageKey) {
    const route = pathForPageKey(pageKey);
    if (!userCanAccessRoute(user, route)) {
      const pages = Array.isArray(user?.allowedPages) ? user.allowedPages : [];
      const fallback =
        user?.isAdmin || user?.role === 'ADMIN'
          ? '/dashboard'
          : pages.includes('dashboard')
            ? '/dashboard'
            : pages.includes('today')
              ? '/today'
              : pages[0]
                ? pathForPageKey(pages[0])
                : '/profile';
      return <Navigate to={fallback} replace />;
    }
  }

  return <Outlet />;
}
