import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { FullPageLoader } from './components/ui/Spinner';

const LoginPage = React.lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const PatientsView = React.lazy(() => import('./pages/PatientsView').then(m => ({ default: m.PatientsView })));
const ProfileView = React.lazy(() => import('./pages/ProfileView').then(m => ({ default: m.ProfileView })));
const ServicesView = React.lazy(() => import('./pages/ServicesView').then(m => ({ default: m.ServicesView })));
const AppointmentsView = React.lazy(() => import('./pages/AppointmentsView').then(m => ({ default: m.AppointmentsView })));
const CashierView = React.lazy(() => import('./pages/CashierView').then(m => ({ default: m.CashierView })));
const AttentionsView = React.lazy(() => import('./pages/AttentionsView').then(m => ({ default: m.AttentionsView })));
const SuperadminPanel = React.lazy(() => import('./pages/SuperadminPanel').then(m => ({ default: m.SuperadminPanel })));
import { useAuthStore } from './store/authStore';
import { ThemeProvider } from './context/ThemeContext';

// Protected Route Wrapper
const ProtectedRoute = ({ children, allowedRole }: { children: React.ReactNode, allowedRole: string }) => {
  const { token, role } = useAuthStore();
  if (!token) return <Navigate to="/login" replace />;
  
  // Superadmins can access both their panel and the vet dashboard
  if (allowedRole === 'admin' && role === 'superadmin') {
    return <>{children}</>;
  }
  
  if (role !== allowedRole) return <Navigate to={role === 'superadmin' ? '/superadmin' : '/admin'} replace />;
  return <>{children}</>;
};

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Suspense fallback={<FullPageLoader />}>
          <Routes>
          <Route path="/login" element={<LoginPage />} />
          
          <Route path="/admin" element={
            <ProtectedRoute allowedRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/admin/patients" element={
            <ProtectedRoute allowedRole="admin">
              <PatientsView />
            </ProtectedRoute>
          } />
          
          <Route path="/admin/services" element={
            <ProtectedRoute allowedRole="admin">
              <ServicesView />
            </ProtectedRoute>
          } />
          
          <Route path="/admin/appointments" element={
            <ProtectedRoute allowedRole="admin">
              <AppointmentsView />
            </ProtectedRoute>
          } />
          
          <Route path="/admin/cashier" element={
            <ProtectedRoute allowedRole="admin">
              <CashierView />
            </ProtectedRoute>
          } />
          
          <Route path="/admin/attentions" element={
            <ProtectedRoute allowedRole="admin">
              <AttentionsView />
            </ProtectedRoute>
          } />
          
          <Route path="/admin/profile" element={
            <ProtectedRoute allowedRole="admin">
              <ProfileView />
            </ProtectedRoute>
          } />
          
          <Route path="/superadmin/*" element={
            <ProtectedRoute allowedRole="superadmin">
              <SuperadminPanel />
            </ProtectedRoute>
          } />
          
          <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
