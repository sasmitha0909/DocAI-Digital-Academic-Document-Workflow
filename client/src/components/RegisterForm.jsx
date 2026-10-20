import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../api/client';
import {
  GraduationCap,
  UserCheck,
  Building2,
  Shield,
  Award,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Plus
} from 'lucide-react';

export default function RegisterForm({ onSuccess, onSwitchToLogin }) {
  const { register } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [role, setRole] = useState('student');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [registerNumber, setRegisterNumber] = useState('');
  const [department, setDepartment] = useState('');
  const [customDept, setCustomDept] = useState('');
  const [isCustomDept, setIsCustomDept] = useState(false);
  const [designation, setDesignation] = useState('');
  const [year, setYear] = useState('3');

  const [departmentsList, setDepartmentsList] = useState([]);
  const [loadingDepts, setLoadingDepts] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Fetch available departments
  useEffect(() => {
    async function fetchDepartments() {
      setLoadingDepts(true);
      try {
        const res = await api.get('/departments');
        if (res.data.success && Array.isArray(res.data.departments)) {
          setDepartmentsList(res.data.departments);
          if (res.data.departments.length > 0 && !department) {
            setDepartment(res.data.departments[0]._id);
          }
        }
      } catch (err) {
        console.error('Failed to load departments:', err);
      } finally {
        setLoadingDepts(false);
      }
    }
    fetchDepartments();
  }, []);

  const roles = [
    { id: 'student', label: 'Student', icon: GraduationCap, color: 'text-teal-600 bg-teal-50 border-teal-300' },
    { id: 'faculty', label: 'Faculty', icon: UserCheck, color: 'text-emerald-600 bg-emerald-50 border-emerald-300' },
    { id: 'hod', label: 'HOD', icon: Building2, color: 'text-indigo-600 bg-indigo-50 border-indigo-300' },
    { id: 'admin', label: 'Admin', icon: Shield, color: 'text-slate-700 bg-slate-100 border-slate-300' },
    { id: 'principal', label: 'Principal', icon: Award, color: 'text-amber-700 bg-amber-50 border-amber-300' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter your full name');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please provide a valid email address');
      return;
    }
    if (!password || password.length < 4) {
      setError('Password must be at least 4 characters');
      return;
    }

    if (role === 'student' && !registerNumber.trim()) {
      setError('Register number is required for students');
      return;
    }

    const selectedDept = isCustomDept ? customDept.trim() : department;
    if (['student', 'faculty', 'hod'].includes(role) && !selectedDept) {
      setError('Please select or specify a department');
      return;
    }

    setSubmitting(true);

    const payload = {
      name: name.trim(),
      email: email.trim(),
      password,
      role,
      department: selectedDept,
      designation: designation.trim(),
      registerNumber: role === 'student' ? registerNumber.trim() : null,
      year: role === 'student' ? Number(year) : null
    };

    const res = await register(payload);
    setSubmitting(false);

    if (res.success) {
      toast.success(`Account created! Welcome, ${res.user.name}`);
      if (onSuccess) onSuccess(res.user);
      navigate(res.redirectPath || '/student', { replace: true });
    } else {
      setError(res.error || 'Failed to create account');
    }
  };

  return (
    <div className="w-full">
      <div className="mb-5">
        <h3 className="text-lg font-bold text-slate-900">Create Your Account</h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Choose your role and register to access the institutional workflow portal.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-start space-x-2 text-rose-800 text-xs animate-shake">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* Role Picker Pills */}
      <div className="mb-4">
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
          Select Role
        </label>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {roles.map((r) => {
            const Icon = r.icon;
            const isSelected = role === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  setRole(r.id);
                  setError('');
                }}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                  isSelected
                    ? `${r.color} shadow-sm ring-2 ring-sky-500`
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-4 h-4 mb-1" />
                <span>{r.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3.5">
        {/* Name & Email Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Dr. S. Raman / Alice"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Email Address *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. name@test.com"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white"
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Password *
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimum 4 characters"
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white"
          />
        </div>

        {/* Department (for Student, Faculty, HOD) */}
        {['student', 'faculty', 'hod'].includes(role) && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
                Department *
              </label>
              <button
                type="button"
                onClick={() => setIsCustomDept(!isCustomDept)}
                className="text-[11px] text-sky-600 hover:text-sky-700 font-medium flex items-center"
              >
                {isCustomDept ? 'Select existing' : '+ Other Department'}
              </button>
            </div>

            {isCustomDept ? (
              <input
                type="text"
                value={customDept}
                onChange={(e) => setCustomDept(e.target.value)}
                placeholder="Enter Department Name (e.g. Mechanical Engineering, Biotech)"
                className="w-full px-3 py-2 text-xs border border-sky-300 rounded-lg focus:ring-2 focus:ring-sky-500 bg-sky-50/30"
              />
            ) : (
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 bg-white"
              >
                {departmentsList.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Student-specific fields: Register Number & Year */}
        {role === 'student' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Register Number *
              </label>
              <input
                type="text"
                required
                value={registerNumber}
                onChange={(e) => setRegisterNumber(e.target.value)}
                placeholder="e.g. 310624243167"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 uppercase font-mono bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Year of Study
              </label>
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 bg-white"
              >
                <option value="1">1st Year</option>
                <option value="2">2nd Year</option>
                <option value="3">3rd Year</option>
                <option value="4">4th Year</option>
              </select>
            </div>
          </div>
        )}

        {/* Faculty / HOD / Admin designation */}
        {role !== 'student' && (
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Designation (Optional)
            </label>
            <input
              type="text"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              placeholder={
                role === 'hod'
                  ? 'Head of Department'
                  : role === 'faculty'
                  ? 'Assistant Professor / Senior Mentor'
                  : role === 'principal'
                  ? 'Principal & Dean'
                  : 'Administrative Officer'
              }
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 bg-white"
            />
          </div>
        )}

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center py-2.5 px-4 rounded-xl shadow-md text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-50 transition-all hover:scale-[1.01]"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating Account...
              </>
            ) : (
              <>
                Create Account & Enter Dashboard
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </button>
        </div>
      </form>

      {onSwitchToLogin && (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-xs text-sky-600 hover:text-sky-700 font-semibold"
          >
            Already have an account? Sign In here
          </button>
        </div>
      )}
    </div>
  );
}
