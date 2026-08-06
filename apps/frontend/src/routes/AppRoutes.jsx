import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import AuthLayout from '../layouts/AuthLayout.jsx';
import DashboardLayout from '../layouts/DashboardLayout.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';
import Spinner from '../components/ui/Spinner.jsx';

const Login = lazy(() => import('../pages/auth/Login.jsx'));
const ForgotPassword = lazy(() => import('../pages/auth/ForgotPassword.jsx'));
const ResetPassword = lazy(() => import('../pages/auth/ResetPassword.jsx'));
const Profile = lazy(() => import('../pages/auth/Profile.jsx'));
const ChangePassword = lazy(() => import('../pages/auth/ChangePassword.jsx'));
const Dashboard = lazy(() => import('../pages/dashboard/Dashboard.jsx'));
const Buildings = lazy(() => import('../pages/setup/Buildings.jsx'));
const BuildingDetail = lazy(() => import('../pages/setup/BuildingDetail.jsx'));
const Rooms = lazy(() => import('../pages/setup/Rooms.jsx'));
const Bookings = lazy(() => import('../pages/bookings/Bookings.jsx'));
const Apartments = lazy(() => import('../pages/apartments/Apartments.jsx'));
const Shops = lazy(() => import('../pages/shops/Shops.jsx'));
const Payments = lazy(() => import('../pages/payments/Payments.jsx'));
const Outstanding = lazy(() => import('../pages/payments/Outstanding.jsx'));
const Reports = lazy(() => import('../pages/reports/Reports.jsx'));
const Settings = lazy(() => import('../pages/Settings.jsx'));
const NotFound = lazy(() => import('../pages/NotFound.jsx'));

function RootRedirect() {
  const { isAuthenticated } = useAuth();
  return <Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />;
}

function FallBack() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Spinner />
    </div>
  );
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<FallBack />}>
      <Routes>
        <Route path="/" element={<RootRedirect />} />

        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />

            <Route path="/buildings" element={<Buildings />} />
            <Route path="/buildings/:id" element={<BuildingDetail />} />
            <Route path="/rooms" element={<Rooms />} />

            <Route path="/bookings/new" element={<Navigate to="/bookings?tab=new" replace />} />
            <Route path="/bookings" element={<Bookings />} />

            <Route path="/apartments" element={<Apartments />} />
            <Route path="/shops" element={<Shops />} />

            <Route path="/payments" element={<Payments />} />
            <Route path="/outstanding" element={<Outstanding />} />
            <Route path="/reports" element={<Reports />} />

            <Route path="/profile" element={<Profile />} />
            <Route path="/change-password" element={<ChangePassword />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
