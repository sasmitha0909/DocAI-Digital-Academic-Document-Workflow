import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

export default function ProtectedRoute({ allowedRoles, children }) {
  const { user, loading, isAuthenticated, getRoleDashboardRoute } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 text-sky-600 animate-spin mb-3" />
        <p className="text-sm font-medium text-slate-600 tracking-wide">
          Verifying credentials & session...
        </p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // If user's role is not allowed, redirect to their proper dashboard or unauthorized page
    console.warn(`[RouteGuard] Role '${user.role}' denied for route '${location.pathname}'. Redirecting.`);
    return <Navigate to={getRoleDashboardRoute(user.role)} replace />;
  }

  return children;
}
