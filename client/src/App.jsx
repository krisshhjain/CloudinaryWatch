import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import AdminLayout from './components/AdminLayout';
import ProtectedRoute from './components/ProtectedRoute';
import AdminProtectedRoute from './components/AdminProtectedRoute';
import GlitchLoader from './components/GlitchLoader';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AuthCallback from './pages/AuthCallback';
import Dashboard from './pages/Dashboard';
import Connect from './pages/Connect';
import Upload from './pages/Upload';
import Optimize from './pages/Optimize';
import Gallery from './pages/Gallery';
import History from './pages/History';
import Settings from './pages/Settings';

// Admin pages
import AdminEntry from './pages/admin/AdminEntry';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminUserDetail from './pages/admin/AdminUserDetail';
import AdminEngagement from './pages/admin/AdminEngagement';
import AdminLoginHistory from './pages/admin/AdminLoginHistory';

export default function App() {
  const { loading } = useAuth();

  if (loading) {
    return <GlitchLoader />;
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/auth/callback" element={<AuthCallback />} />

      {/* Hidden Admin Entry - NOT in navbar/sidebar */}
      <Route path="/krishistheadmin" element={<AdminEntry />} />

      {/* Protected user routes */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/optimize" element={<Optimize />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/history" element={<History />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/connect" element={<Connect />} />
      </Route>

      {/* Admin routes with separate layout */}
      <Route
        element={
          <AdminProtectedRoute>
            <AdminLayout />
          </AdminProtectedRoute>
        }
      >
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/users/:id" element={<AdminUserDetail />} />
        <Route path="/admin/engagement" element={<AdminEngagement />} />
        <Route path="/admin/login-history" element={<AdminLoginHistory />} />
      </Route>

      {/* Legacy admin redirect */}
      <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
