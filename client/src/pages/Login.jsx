import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DemoAccountsPanel from '../components/DemoAccountsPanel';
import RegisterForm from '../components/RegisterForm';
import { Lock, Mail, Eye, EyeOff, Loader2, AlertCircle, FileCheck2, ArrowRight, UserPlus, LogIn } from 'lucide-react';

export default function Login() {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeDemoRole, setActiveDemoRole] = useState(null);
  const [error, setError] = useState('');

  const { login, isAuthenticated, user, getRoleDashboardRoute } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // If already logged in, redirect immediately
  useEffect(() => {
    if (isAuthenticated && user) {
      const target = location.state?.from?.pathname || getRoleDashboardRoute(user.role);
      navigate(target, { replace: true });
    }
  }, [isAuthenticated, user, navigate, location, getRoleDashboardRoute]);

  const handleSelectDemo = (demo) => {
    setIdentifier(demo.identifier);
    setPassword(demo.password);
    setActiveDemoRole(demo.role);
    setError('');
    setMode('login');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError('Please provide your email/register number and password');
      return;
    }

    setLoading(true);
    setError('');

    const res = await login(identifier, password);
    setLoading(false);

    if (res.success) {
      const destination = location.state?.from?.pathname || res.redirectPath;
      navigate(destination, { replace: true });
    } else {
      setError(res.error || 'Authentication failed. Please verify your credentials.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-4xl mb-6 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-sky-600 text-white shadow-lg mb-3">
          <FileCheck2 className="w-8 h-8" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Digital Academic Document Workflow System
        </h1>
        <p className="mt-1 text-sm text-slate-500 max-w-lg mx-auto">
          Single portal for Student applications, multi-tier approvals (Faculty &rarr; HOD &rarr; Admin/Principal), and automated certificate issuance.
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-4xl">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          
          {/* Left Column: Form (7 cols) */}
          <div className="p-8 lg:p-10 lg:col-span-7 flex flex-col justify-between">
            <div>
              {/* Mode Switcher Tabs */}
              <div className="flex border-b border-slate-200 mb-6 pb-1">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError('');
                  }}
                  className={`pb-2 mr-6 text-sm font-bold flex items-center space-x-1.5 border-b-2 transition-colors ${
                    mode === 'login'
                      ? 'border-sky-600 text-sky-600'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setError('');
                  }}
                  className={`pb-2 text-sm font-bold flex items-center space-x-1.5 border-b-2 transition-colors ${
                    mode === 'register'
                      ? 'border-sky-600 text-sky-600'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Create Account</span>
                </button>
              </div>

              {mode === 'login' ? (
                <div>
                  <div className="mb-6">
                    <h2 className="text-xl font-bold text-slate-900">Sign in to your account</h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Students can log in with Email or Register Number. Staff use official email.
                    </p>
                  </div>

                  {error && (
                    <div className="mb-6 p-3.5 rounded-lg bg-rose-50 border border-rose-200 flex items-start space-x-3 text-rose-800 text-xs animate-shake">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span className="font-medium">{error}</span>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                        Email or Register Number
                      </label>
                      <div className="relative rounded-lg shadow-xs">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <Mail className="h-4 w-4" />
                        </div>
                        <input
                          type="text"
                          value={identifier}
                          onChange={(e) => setIdentifier(e.target.value)}
                          placeholder="e.g. student.aids1@college.edu or 310624243167"
                          className="block w-full pl-10 pr-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors bg-slate-50/50 hover:bg-white"
                          disabled={loading}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                          Password
                        </label>
                        <span className="text-[11px] text-slate-400">Test pass: Test@1234</span>
                      </div>
                      <div className="relative rounded-lg shadow-xs">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <Lock className="h-4 w-4" />
                        </div>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter account password"
                          className="block w-full pl-10 pr-10 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors bg-slate-50/50 hover:bg-white"
                          disabled={loading}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full inline-flex items-center justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-50 transition-colors"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Authenticating...
                          </>
                        ) : (
                          <>
                            Sign In
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <RegisterForm onSwitchToLogin={() => setMode('login')} />
              )}
            </div>

            <div className="mt-8 pt-4 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-400">
                Institutional Academic Document System &bull; Strict Role Isolation &bull; Audit Logged
              </p>
            </div>
          </div>

          {/* Right Column: Demo Accounts Panel (5 cols) */}
          <div className="p-6 lg:p-8 lg:col-span-5 bg-slate-50 border-t lg:border-t-0 lg:border-l border-slate-200">
            <DemoAccountsPanel
              onSelectDemoAccount={handleSelectDemo}
              activeDemoRole={activeDemoRole}
            />
          </div>

        </div>
      </div>
    </div>
  );
}
