import React from 'react';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import { LogOut, GraduationCap, Building2, UserCheck, Shield } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();

  if (!user) return null;

  // Role visual configuration
  const roleStyles = {
    student: {
      badge: 'bg-teal-50 text-teal-700 border-teal-200',
      label: 'Student',
      icon: GraduationCap,
      accent: 'border-b-teal-500'
    },
    faculty: {
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      label: 'Faculty',
      icon: UserCheck,
      accent: 'border-b-emerald-600'
    },
    hod: {
      badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      label: 'Head of Department',
      icon: Building2,
      accent: 'border-b-indigo-600'
    },
    admin: {
      badge: 'bg-slate-100 text-slate-800 border-slate-300',
      label: 'Administrator',
      icon: Shield,
      accent: 'border-b-slate-700'
    },
    principal: {
      badge: 'bg-amber-50 text-amber-800 border-amber-300',
      label: 'Principal & Dean',
      icon: Shield,
      accent: 'border-b-amber-500'
    }
  };

  const currentRole = roleStyles[user.role] || roleStyles.student;
  const RoleIcon = currentRole.icon;

  return (
    <header className={`bg-white border-b-2 ${currentRole.accent} shadow-sm sticky top-0 z-40`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo & Portal Info */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-lg shadow-sm">
              DA
            </div>
            <div>
              <span className="font-bold text-slate-900 text-lg tracking-tight block">
                DocAI Workflow
              </span>
              <span className="text-xs text-slate-500 hidden sm:block">
                Academic Document Verification & Lifecycle
              </span>
            </div>
          </div>

          {/* User profile & controls */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            <NotificationBell />

            <div className="flex items-center space-x-3">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-semibold text-slate-900">{user.name}</div>
                <div className="text-xs text-slate-500 flex items-center justify-end space-x-1.5">
                  {user.department && (
                    <span>{user.department.code || user.department.name} • </span>
                  )}
                  {user.registerNumber && (
                    <span className="font-mono">{user.registerNumber}</span>
                  )}
                  {user.designation && !user.registerNumber && (
                    <span>{user.designation}</span>
                  )}
                </div>
              </div>

              {/* Role Badge */}
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${currentRole.badge}`}>
                <RoleIcon className="w-3.5 h-3.5 mr-1" />
                {currentRole.label}
              </span>
            </div>

            {/* Logout button */}
            <button
              onClick={logout}
              className="inline-flex items-center justify-center p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
