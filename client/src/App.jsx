import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import Login from './pages/Login';
import Unauthorized from './pages/Unauthorized';
import StudentDashboard from './pages/student/StudentDashboard';
import FacultyDashboard from './pages/faculty/FacultyDashboard';
import HodDashboard from './pages/hod/HodDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import PrincipalDashboard from './pages/principal/PrincipalDashboard';

import Landing from './pages/Landing';

function HomeRedirect() {
  const { user, isAuthenticated, loading, getRoleDashboardRoute } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Landing />;
  }

  return <Navigate to={getRoleDashboardRoute(user.role)} replace />;
}

export default function App() {
  return (
    <Routes>
      {/* Public Login Route */}
      <Route path="/login" element={<Login />} />

      {/* Root redirect to respective dashboard */}
      <Route path="/" element={<HomeRedirect />} />

      {/* Student Portal (Soft Blue / Teal) */}
      <Route
        path="/student/*"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <StudentDashboard />
          </ProtectedRoute>
        }
      />

      {/* Faculty Reviewer Desk (Green) */}
      <Route
        path="/faculty/*"
        element={
          <ProtectedRoute allowedRoles={['faculty']}>
            <FacultyDashboard />
          </ProtectedRoute>
        }
      />

      {/* HOD Endorsement Desk (Indigo) */}
      <Route
        path="/hod/*"
        element={
          <ProtectedRoute allowedRoles={['hod']}>
            <HodDashboard />
          </ProtectedRoute>
        }
      />

      {/* Administrative Office (Dark Slate) */}
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      {/* Principal & Dean Executive Office (Navy & Gold) */}
      <Route
        path="/principal/*"
        element={
          <ProtectedRoute allowedRoles={['principal']}>
            <PrincipalDashboard />
          </ProtectedRoute>
        }
      />

      {/* 403 Forbidden Page */}
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
