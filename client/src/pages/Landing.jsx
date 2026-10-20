import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import RegisterForm from '../components/RegisterForm';
import {
  GraduationCap,
  UserCheck,
  Building2,
  Shield,
  Award,
  FileCheck2,
  ArrowRight,
  CheckCircle2,
  Lock,
  Mail,
  Loader2,
  AlertCircle,
  Sparkles,
  UserPlus,
  LogIn
} from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'register'
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const quickLogins = [
    { role: 'Student', identifier: 'yourname.student@test.com', password: 'Test@1234', color: 'border-teal-500 text-teal-300 hover:bg-teal-950/60' },
    { role: 'Faculty', identifier: 'yourname.faculty@test.com', password: 'Test@1234', color: 'border-emerald-500 text-emerald-300 hover:bg-emerald-950/60' },
    { role: 'HOD', identifier: 'yourname.hod@test.com', password: 'Test@1234', color: 'border-indigo-500 text-indigo-300 hover:bg-indigo-950/60' },
    { role: 'Admin', identifier: 'yourname.admin@test.com', password: 'Test@1234', color: 'border-slate-400 text-slate-300 hover:bg-slate-800' },
    { role: 'Principal', identifier: 'yourname.principal@test.com', password: 'Test@1234', color: 'border-amber-500 text-amber-300 hover:bg-amber-950/60' }
  ];

  const handleQuickFill = (item) => {
    setIdentifier(item.identifier);
    setPassword(item.password);
    setError('');
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError('Please enter your email or register number and password');
      return;
    }

    setLoading(true);
    setError('');

    const res = await login(identifier, password);
    setLoading(false);

    if (res.success) {
      toast.success(`Welcome back, ${res.user.name}!`);
      navigate(res.redirectPath || '/student', { replace: true });
    } else {
      setError(res.error || 'Authentication failed. Please verify credentials.');
    }
  };

  const journeySteps = [
    {
      role: 'Student',
      step: '1. Apply & Upload',
      desc: 'Selects document type, fills dynamic fields, and uploads ID or marksheet attachments.',
      icon: GraduationCap,
      color: 'bg-teal-50 text-teal-700 border-teal-200'
    },
    {
      role: 'Faculty',
      step: '2. Mentor Appraisal',
      desc: 'First review gate: verifies academic standing, attaches remarks, approves or requests corrections.',
      icon: UserCheck,
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    },
    {
      role: 'HOD',
      step: '3. Department Endorsement',
      desc: 'Department head reviews curriculum progress and endorses the academic request.',
      icon: Building2,
      color: 'bg-indigo-50 text-indigo-700 border-indigo-200'
    },
    {
      role: 'Admin',
      step: '4. Issuance & Bonafide',
      desc: 'Central Academic Office seals bonafide certificates, monitors SLA delays, and manages records.',
      icon: Shield,
      color: 'bg-slate-100 text-slate-800 border-slate-300'
    },
    {
      role: 'Principal',
      step: '5. Executive Sign-Off',
      desc: 'Dean & Principal executes final academic sign-off for transcripts and institutional awards.',
      icon: Award,
      color: 'bg-amber-50 text-amber-800 border-amber-300'
    },
    {
      role: 'Issued PDF',
      step: '6. Document Generated',
      desc: 'Automated PDFKit certificate created with digital signatures and unique DOC-YYYY-00001 ID.',
      icon: FileCheck2,
      color: 'bg-sky-50 text-sky-700 border-sky-200'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/70 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
              DA
            </div>
            <div>
              <span className="font-bold text-white text-base block tracking-tight">DocAI Workflow</span>
              <span className="text-[11px] text-slate-400">Institutional Document Lifecycle System</span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setActiveTab('register')}
              className="hidden sm:inline-flex items-center px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 font-semibold text-xs border border-slate-700 transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5 mr-1.5" />
              <span>Create Account</span>
            </button>

            <button
              onClick={() => navigate('/login')}
              className="inline-flex items-center px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-md transition-colors"
            >
              <span>Full Login Page</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section with Integrated Login & Registration Portal */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Headlines & Overview (6 cols) */}
          <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center space-x-2 bg-slate-800 border border-slate-700 px-3.5 py-1.5 rounded-full text-xs font-semibold text-sky-300 shadow-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Multi-Tier Academic Workflow &bull; Instant PDF Issuance</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Manage Academic Certificates with <span className="text-sky-400">Zero Paper Delays</span>
            </h1>

            <p className="text-base text-slate-300 leading-relaxed">
              Complete automated workflow engine for <strong>Students</strong>, <strong>Faculty</strong>, <strong>HODs across all departments</strong>, <strong>Administrators</strong>, and the <strong>Principal</strong>.
            </p>

            <div className="grid grid-cols-2 gap-3 text-left pt-2">
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="text-sky-400 font-bold text-xs flex items-center">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                  Create Any Role
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Register as Student, Faculty, or HOD of any department instantly.
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="text-sky-400 font-bold text-xs flex items-center">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                  Auto-Regenerated PDFs
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Digitally signed certificates stored securely and regenerated on demand.
                </div>
              </div>
            </div>

            <div className="pt-2 text-xs text-slate-400 flex items-center justify-center lg:justify-start space-x-4">
              <span>&bull; Role-Based Access Control</span>
              <span>&bull; Live SLA Delay Monitor</span>
              <span>&bull; Persistent Storage</span>
            </div>
          </div>

          {/* Right Column: Interactive Login & Register Card (6 cols) */}
          <div className="lg:col-span-6 w-full max-w-md mx-auto">
            <div className="bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
              
              {/* Tab Switcher */}
              <div className="flex border-b border-slate-200 bg-slate-100/80 p-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('login');
                    setError('');
                  }}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                    activeTab === 'login'
                      ? 'bg-white text-sky-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('register');
                    setError('');
                  }}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                    activeTab === 'register'
                      ? 'bg-white text-sky-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Create Account</span>
                </button>
              </div>

              {/* Tab Content */}
              <div className="p-6 sm:p-7">
                {activeTab === 'login' ? (
                  <div>
                    <div className="mb-4">
                      <h3 className="text-lg font-bold text-slate-900">Sign in to your Portal</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Students can use Email or Register No. Staff use registered email.
                      </p>
                    </div>

                    {error && (
                      <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-start space-x-2 text-rose-800 text-xs animate-shake">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span className="font-medium">{error}</span>
                      </div>
                    )}

                    {/* Quick Demo Fill Buttons */}
                    <div className="mb-4 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        1-Click Test Accounts:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {quickLogins.map((item) => (
                          <button
                            key={item.role}
                            type="button"
                            onClick={() => handleQuickFill(item)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                              identifier === item.identifier
                                ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                                : 'bg-white text-slate-700 border-slate-300 hover:border-sky-400'
                            }`}
                          >
                            {item.role}
                          </button>
                        ))}
                      </div>
                    </div>

                    <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                          Email or Register Number
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                            <Mail className="h-4 w-4" />
                          </div>
                          <input
                            type="text"
                            required
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            placeholder="e.g. yourname.student@test.com"
                            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                          Password
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                            <Lock className="h-4 w-4" />
                          </div>
                          <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter password"
                            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white"
                          />
                        </div>
                      </div>

                      <div className="pt-2">
                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full inline-flex items-center justify-center py-2.5 px-4 rounded-xl shadow-md text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-50 transition-all hover:scale-[1.01]"
                        >
                          {loading ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Authenticating...
                            </>
                          ) : (
                            <>
                              Sign In to Dashboard
                              <ArrowRight className="w-4 h-4 ml-2" />
                            </>
                          )}
                        </button>
                      </div>
                    </form>

                    <div className="mt-4 pt-3 border-t border-slate-100 text-center">
                      <button
                        type="button"
                        onClick={() => setActiveTab('register')}
                        className="text-xs text-sky-600 hover:text-sky-700 font-semibold"
                      >
                        Don't have an account? Create one here
                      </button>
                    </div>
                  </div>
                ) : (
                  <RegisterForm
                    onSwitchToLogin={() => setActiveTab('login')}
                  />
                )}
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* The Journey Section */}
      <section className="py-12 bg-slate-950 border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-xs font-bold uppercase tracking-widest text-sky-400">Step-by-Step Lifecycle</h2>
            <p className="text-2xl font-extrabold text-white mt-1">
              Student &rarr; Faculty &rarr; HOD &rarr; Admin &rarr; Principal &rarr; Certificate
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {journeySteps.map((step, idx) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.role}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative hover:border-slate-700 transition-all hover:shadow-xl"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-xl border ${step.color}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-500 bg-slate-800 px-2 py-0.5 rounded">
                      Step 0{idx + 1}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white mb-1">{step.step}</h3>
                  <div className="text-xs font-semibold text-sky-400 mb-2">Role: {step.role}</div>
                  <p className="text-xs text-slate-400 leading-relaxed">{step.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800 bg-slate-950 py-8 text-center text-xs text-slate-500">
        <p>Digital Academic Document Workflow System &bull; MERN Stack (React, Node, Express, MongoDB, PDFKit)</p>
        <p className="mt-1">All rights reserved &bull; Institutional Academic Portal 2026</p>
      </footer>
    </div>
  );
}
