import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/Navbar';
import ReviewActionModal from '../../components/ReviewActionModal';
import api from '../../api/client';
import {
  Award,
  FileText,
  CheckCircle,
  Clock,
  ShieldCheck,
  TrendingUp,
  Eye,
  RefreshCw,
  Search,
  Building,
  CheckCircle2
} from 'lucide-react';

export default function PrincipalDashboard() {
  const { user } = useAuth();
  const [queue, setQueue] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedAppId, setSelectedAppId] = useState(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [queueRes, analyticsRes] = await Promise.all([
        api.get('/workflows/queue'),
        api.get('/admin/analytics')
      ]);

      if (queueRes.data.success) setQueue(queueRes.data.applications || []);
      if (analyticsRes.data.success) setAnalytics(analyticsRes.data.analytics);
    } catch (err) {
      console.error('Failed to load Principal data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredQueue = queue.filter(app => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      app.applicationId?.toLowerCase().includes(q) ||
      app.student?.name?.toLowerCase().includes(q) ||
      app.student?.registerNumber?.toLowerCase().includes(q) ||
      app.documentType?.name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Banner - Navy & Gold Theme */}
        <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-blue-950 border border-amber-500/40 rounded-2xl p-6 sm:p-8 text-white shadow-2xl mb-8 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div>
              <div className="inline-flex items-center space-x-2 bg-amber-500/20 border border-amber-500/40 px-3 py-1 rounded-full text-xs font-semibold text-amber-300 mb-3">
                <Award className="w-3.5 h-3.5 text-amber-400" />
                <span>Executive Office of the Principal</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                {user?.name}
              </h1>
              <p className="text-slate-300 text-sm mt-1">
                Principal &bull; Dean of Academics &bull; Final Academic Sign-Off Authority
              </p>
            </div>

            <div className="flex items-center space-x-3 shrink-0">
              <button
                type="button"
                onClick={loadData}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 transition-colors"
                title="Refresh Queue"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>

              <div className="bg-slate-800/90 border border-amber-500/40 rounded-xl px-5 py-3 text-right">
                <span className="text-xs text-amber-300/80 block">Final Sign-Off Queue</span>
                <span className="text-2xl font-bold text-amber-400">{queue.length} Pending</span>
              </div>
            </div>
          </div>
        </div>

        {actionSuccessMsg && (
          <div className="mb-6 p-4 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-amber-400" />
              <span>{actionSuccessMsg}</span>
            </div>
            <button onClick={() => setActionSuccessMsg('')} className="text-amber-400 hover:text-white">
              Dismiss
            </button>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
          <div className="bg-slate-900/90 p-5 rounded-xl border border-slate-800 shadow-xs flex items-center space-x-4">
            <div className="w-12 h-12 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Pending Final Sign-Off
              </div>
              <div className="text-2xl font-bold text-amber-300 mt-0.5">{queue.length}</div>
            </div>
          </div>

          <div className="bg-slate-900/90 p-5 rounded-xl border border-slate-800 shadow-xs flex items-center space-x-4">
            <div className="w-12 h-12 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Issued Documents
              </div>
              <div className="text-2xl font-bold text-emerald-400 mt-0.5">
                {analytics?.totalCertificates || 0}
              </div>
            </div>
          </div>

          <div className="bg-slate-900/90 p-5 rounded-xl border border-slate-800 shadow-xs flex items-center space-x-4">
            <div className="w-12 h-12 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                SLA Compliance Rate
              </div>
              <div className="text-2xl font-bold text-sky-400 mt-0.5">
                {analytics?.slaComplianceRate || 100}%
              </div>
            </div>
          </div>
        </div>

        {/* Final Sign-Off Queue Table */}
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <span className="text-amber-400">&bull;</span>
                <span>Principal Final Authorization Queue</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Transcripts and final approvals verified by Faculty and HOD awaiting executive sign-off
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search candidates or ID..."
                className="w-full text-xs pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading final review queue...</div>
          ) : filteredQueue.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-500">
              <ShieldCheck className="w-10 h-10 text-amber-400 mx-auto mb-2 opacity-80" />
              <div className="font-bold text-slate-300">Queue is completely clear</div>
              <p className="text-slate-500 mt-0.5">No academic transcripts are awaiting final executive sign-off.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-800 text-left text-xs">
                <thead className="bg-slate-900 text-slate-400 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-6 py-3.5">Application ID</th>
                    <th className="px-6 py-3.5">Candidate</th>
                    <th className="px-6 py-3.5">Department</th>
                    <th className="px-6 py-3.5">Document Type</th>
                    <th className="px-6 py-3.5">Previous Endorsements</th>
                    <th className="px-6 py-3.5">Submitted On</th>
                    <th className="px-6 py-3.5 text-right">Executive Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredQueue.map(app => (
                    <tr key={app._id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-amber-400">
                        {app.applicationId}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-white">{app.student?.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {app.student?.registerNumber}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-300">
                        {app.department?.name}
                      </td>
                      <td className="px-6 py-4 text-slate-200 font-medium">
                        {app.documentType?.name}
                      </td>
                      <td className="px-6 py-4 text-emerald-400 text-[11px]">
                        Faculty &amp; HOD Endorsed &check;
                      </td>
                      <td className="px-6 py-4 text-slate-400">
                        {new Date(app.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedAppId(app.applicationId)}
                          className="inline-flex items-center px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          Executive Sign-Off
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      <ReviewActionModal
        applicationId={selectedAppId}
        isOpen={!!selectedAppId}
        onClose={() => setSelectedAppId(null)}
        onActionSuccess={(msg) => {
          setActionSuccessMsg(msg);
          loadData();
        }}
      />
    </div>
  );
}
