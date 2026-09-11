import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DialogProvider } from './contexts/DialogContext';
import { ShieldAlert } from 'lucide-react';

// Layouts
import { AppLayout } from './layouts/AppLayout';
import { AuthLayout } from './layouts/AuthLayout';

// Auth / Public
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';

// Shared
import { NewWorkflow } from './pages/NewWorkflow';
import { WorkflowDetail } from './pages/WorkflowDetail';

// Persona Dashboards
import PODashboard from './pages/po/PODashboard';
import LeadDashboard from './pages/lead/LeadDashboard';
import QADashboard from './pages/qa/QADashboard';
import AdminDashboard from './pages/admin/AdminDashboard';

// Role → dashboard path mapping
const ROLE_HOME = {
  'Product Owner': '/po/dashboard',
  'Engineering Lead': '/lead/dashboard',
  'QA Reviewer': '/qa/dashboard',
  'Admin': '/admin/dashboard',
};

/** Redirect authenticated users to their persona dashboard */
function RoleRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  const home = ROLE_HOME[user.role] || '/po/dashboard';
  return <Navigate to={home} replace />;
}

/** Role-gated route — redirect to /login or /unauthorized if access denied */
function RoleRoute({ allowedRoles, children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }
  return children;
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <DialogProvider>
          <BrowserRouter>
            <Routes>
              {/* ── Public ── */}
              <Route element={<AuthLayout />}>
                <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
            </Route>

            {/* ── Role redirect after login ── */}
            <Route path="/dashboard" element={<RoleRedirect />} />

            {/* ── Product Owner ── */}
            <Route path="/po/dashboard" element={
              <RoleRoute allowedRoles={['Product Owner', 'Admin']}>
                <PODashboard />
              </RoleRoute>
            } />

            {/* ── Engineering Lead ── */}
            <Route path="/lead/dashboard" element={
              <RoleRoute allowedRoles={['Engineering Lead', 'Admin']}>
                <LeadDashboard />
              </RoleRoute>
            } />

            {/* ── QA Reviewer ── */}
            <Route path="/qa/dashboard" element={
              <RoleRoute allowedRoles={['QA Reviewer', 'Admin']}>
                <QADashboard />
              </RoleRoute>
            } />

            {/* ── Admin ── */}
            <Route path="/admin/dashboard" element={
              <RoleRoute allowedRoles={['Admin']}>
                <AdminDashboard />
              </RoleRoute>
            } />

            {/* ── Shared protected pages ── */}
            <Route element={<AppLayout />}>
              <Route path="/workflows/new" element={
                <RoleRoute allowedRoles={['Product Owner', 'Admin']}>
                  <NewWorkflow />
                </RoleRoute>
              } />
              <Route path="/workflows/:id" element={
                <RoleRoute allowedRoles={['Product Owner', 'Engineering Lead', 'QA Reviewer', 'Admin']}>
                  <WorkflowDetail />
                </RoleRoute>
              } />
            </Route>

            {/* ── Misc ── */}
            <Route path="/unauthorized" element={
              <div style={{ padding: '4rem', textAlign: 'center', color: '#e8eaf6', background: '#0d0f1a', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldAlert size={48} color="#ef4444" style={{ marginBottom: '1rem' }} />
                <h1>Access Denied</h1>
                <p style={{ color: '#7b82a8' }}>You don't have permission to view this page.</p>
              </div>
            } />
            <Route path="*" element={
              <div style={{ padding: '4rem', textAlign: 'center', color: '#e8eaf6', background: '#0d0f1a', minHeight: '100vh' }}>
                <h1>404 — Page Not Found</h1>
              </div>
            } />
          </Routes>
        </BrowserRouter>
        </DialogProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
