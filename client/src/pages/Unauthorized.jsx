import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function Unauthorized() {
  const { user, getRoleDashboardRoute } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-200 text-center">
        <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Access Forbidden (403)</h1>
        <p className="text-sm text-slate-600 mb-6">
          Your current account role ({user?.role || 'unknown'}) does not have permission to access this resource or page.
        </p>

        <button
          onClick={() => navigate(user ? getRoleDashboardRoute(user.role) : '/login')}
          className="inline-flex items-center justify-center w-full py-2.5 px-4 rounded-lg bg-sky-600 text-white font-semibold text-sm hover:bg-sky-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Return to My Dashboard
        </button>
      </div>
    </div>
  );
}
