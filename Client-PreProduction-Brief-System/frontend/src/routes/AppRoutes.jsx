import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Layouts
import AppLayout from '../layouts/AppLayout';

// Public Pages
import Landing from '../pages/Landing/Landing';
import Login from '../pages/Login/Login';
import Register from '../pages/Register/Register';
import ForgotPassword from '../pages/ForgotPassword/ForgotPassword';
import ResetPassword from '../pages/ResetPassword/ResetPassword';

// Protected Pages
import Dashboard from '../pages/Dashboard/Dashboard';
import BriefList from '../pages/BriefList/BriefList';
import BriefForm from '../pages/BriefForm/BriefForm';
import BriefDetail from '../pages/BriefDetail/BriefDetail';
import ClientList from '../pages/ClientList/ClientList';
import UserList from '../pages/UserList/UserList';
import Reports from '../pages/Reports/Reports';
import AuditLogs from '../pages/AuditLogs/AuditLogs';
import Notifications from '../pages/Notifications/Notifications';

// Private Route Guard Component
const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) return null; // Wait for context restoration
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Role-Based Route Guard Component
const RoleRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  
  if (loading) return null;
  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Protected Routes inside App Layout */}
      <Route
        path="/"
        element={
          <PrivateRoute>
            <AppLayout />
          </PrivateRoute>
        }
      >
        <Route path="dashboard" element={<Dashboard />} />
        
        {/* Briefs paths */}
        <Route path="briefs" element={<BriefList />} />
        <Route path="briefs/new" element={<BriefForm />} />
        <Route path="briefs/:id" element={<BriefDetail />} />
        <Route path="briefs/:id/edit" element={<BriefForm />} />
        
        {/* Clients management (Admin/PM only) */}
        <Route
          path="clients"
          element={
            <RoleRoute allowedRoles={['Admin', 'Project Manager']}>
              <ClientList />
            </RoleRoute>
          }
        />

        {/* User Accounts (Admin only) */}
        <Route
          path="users"
          element={
            <RoleRoute allowedRoles={['Admin']}>
              <UserList />
            </RoleRoute>
          }
        />

        {/* Reports (Admin/PM only) */}
        <Route
          path="reports"
          element={
            <RoleRoute allowedRoles={['Admin', 'Project Manager']}>
              <Reports />
            </RoleRoute>
          }
        />

        {/* Audit logs (Admin only) */}
        <Route
          path="audit-logs"
          element={
            <RoleRoute allowedRoles={['Admin']}>
              <AuditLogs />
            </RoleRoute>
          }
        />

        {/* Notification Center (all roles) */}
        <Route path="notifications" element={<Notifications />} />
      </Route>

      {/* Fallback Catch All */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
