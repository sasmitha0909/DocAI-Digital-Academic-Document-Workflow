import React from 'react';
import { GraduationCap, UserCheck, Building2, Shield, Award } from 'lucide-react';

export const DEMO_USERS = [
  {
    role: 'student',
    title: 'Student',
    name: 'YOUR NAME',
    dept: 'AI & Data Science (Yr 3)',
    identifier: 'yourname.student@test.com',
    altIdentifier: '310624243167',
    password: 'Test@1234',
    icon: GraduationCap,
    color: 'hover:border-teal-400 hover:bg-teal-50/50 text-teal-700 bg-teal-50 border-teal-200'
  },
  {
    role: 'faculty',
    title: 'Faculty Mentor',
    name: 'YOUR NAME (Faculty)',
    dept: 'Assistant Professor, AIDS',
    identifier: 'yourname.faculty@test.com',
    password: 'Test@1234',
    icon: UserCheck,
    color: 'hover:border-emerald-400 hover:bg-emerald-50/50 text-emerald-700 bg-emerald-50 border-emerald-200'
  },
  {
    role: 'hod',
    title: 'Head of Department',
    name: 'YOUR NAME (HOD)',
    dept: 'HOD, AI & Data Science',
    identifier: 'yourname.hod@test.com',
    password: 'Test@1234',
    icon: Building2,
    color: 'hover:border-indigo-400 hover:bg-indigo-50/50 text-indigo-700 bg-indigo-50 border-indigo-200'
  },
  {
    role: 'admin',
    title: 'Administrator',
    name: 'YOUR NAME (Admin)',
    dept: 'Central Academic Office',
    identifier: 'yourname.admin@test.com',
    password: 'Test@1234',
    icon: Shield,
    color: 'hover:border-slate-500 hover:bg-slate-100/70 text-slate-800 bg-slate-100 border-slate-300'
  },
  {
    role: 'principal',
    title: 'Principal & Dean',
    name: 'YOUR NAME (Principal)',
    dept: 'Office of the Principal',
    identifier: 'yourname.principal@test.com',
    password: 'Test@1234',
    icon: Award,
    color: 'hover:border-amber-400 hover:bg-amber-50/50 text-amber-900 bg-amber-50 border-amber-300'
  }
];

export default function DemoAccountsPanel({ onSelectDemoAccount, activeDemoRole }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
            One-Click Demo Accounts (All 5 Roles)
          </h3>
        </div>
        <span className="text-xs font-mono text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">
          Dev / Demo Mode
        </span>
      </div>
      <p className="text-xs text-slate-500 mb-4">
        Click any role to autofill verified credentials. Password for your test accounts is{' '}
        <code className="bg-slate-200/80 px-1.5 py-0.5 rounded text-slate-800 font-mono font-semibold">
          Test@1234
        </code>.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5">
        {DEMO_USERS.map((demo) => {
          const Icon = demo.icon;
          const isSelected = activeDemoRole === demo.role;

          return (
            <button
              key={demo.role}
              type="button"
              onClick={() => onSelectDemoAccount(demo)}
              className={`w-full text-left p-3 rounded-lg border transition-all flex items-start justify-between ${
                isSelected
                  ? 'border-sky-500 ring-2 ring-sky-200 bg-sky-50/70'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs'
              }`}
            >
              <div className="flex items-start space-x-3">
                <div className={`p-2 rounded-md ${demo.color} shrink-0`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-slate-900">{demo.title}</span>
                    <span className="text-[11px] text-slate-500">({demo.name})</span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                    {demo.identifier}
                  </div>
                  {demo.altIdentifier && (
                    <div className="text-[10px] text-teal-600 font-mono">
                      Reg No: {demo.altIdentifier}
                    </div>
                  )}
                  <div className="text-[10px] text-slate-400 mt-0.5">{demo.dept}</div>
                </div>
              </div>

              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                  isSelected
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {isSelected ? 'Active' : 'Fill'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
