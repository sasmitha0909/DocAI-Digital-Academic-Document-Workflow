import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/Navbar';
import ReviewActionModal from '../../components/ReviewActionModal';
import api from '../../api/client';
import {
  UserCheck,
  FileCheck2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  RefreshCw,
  Search,
  Layers,
  ArrowRight
} from 'lucide-react';

export default function FacultyDashboard() {
  const { user } = useAuth();
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedAppId, setSelectedAppId] = useState(null);
  const [notificationMsg, setNotificationMsg] = useState('');

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await api.get('/workflows/queue');
      if (res.data.success) {
        setQueue(res.data.applications || []);
      }
    } catch (err) {
      console.error('Failed to load review queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
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
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Banner - Emerald Green Theme */}
        <div className="bg-gradient-to-r from-emerald-800 to-green-900 rounded-2xl p-6 sm:p-8 text-white shadow-md mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center space-x-2 bg-white/20 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-xs mb-3">
                <UserCheck className="w-3.5 h-3.5" />
                <span>Faculty Mentor &amp; Review Desk</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {user?.name}
              </h1>
              <p className="text-emerald-100 text-sm mt-1">
                {user?.designation || 'Assistant Professor'} &bull; Department of{' '}
                {user?.department?.name || 'Academic Studies'}
              </p>
            </div>

            <div className="flex items-center space-x-3 shrink-0">
              <button
                type="button"
                onClick={fetchQueue}
                className="p-2.5 rounded-xl bg-emerald-900/80 hover:bg-emerald-900 text-white border border-emerald-700 transition-colors"
                title="Refresh Queue"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>

              <div className="bg-emerald-900/90 border border-emerald-700/80 rounded-xl px-4 py-2.5 text-right">
                <span className="text-[10px] text-emerald-200 uppercase font-semibold block">Active Queue</span>
                <span className="text-xl font-bold text-white">{queue.length} Pending</span>
              </div>
            </div>
          </div>
        </div>

        {notificationMsg && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="font-semibold">{notificationMsg}</span>
            </div>
            <button onClick={() => setNotificationMsg('')} className="text-emerald-700 hover:text-emerald-900 text-xs">
              Dismiss
            </button>
          </div>
        )}

        {/* Queue Table */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Student Appraisal Queue</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Stage 1 review for student applications within your department
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by student or ID..."
                className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading review queue...</div>
          ) : filteredQueue.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
              <div className="font-bold text-slate-700">All caught up!</div>
              <p className="text-slate-400 mt-0.5">No applications are currently awaiting Faculty review.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-6 py-3.5">Application ID</th>
                    <th className="px-6 py-3.5">Student</th>
                    <th className="px-6 py-3.5">Document Type</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Submitted On</th>
                    <th className="px-6 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredQueue.map((app) => (
                    <tr key={app._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-slate-900">
                        {app.applicationId}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">{app.student?.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {app.student?.registerNumber} &bull; Year {app.student?.year || 3}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-slate-800 block">
                          {app.documentType?.name}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {app.attachments?.length || 0} file(s) attached
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          {app.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                        {new Date(app.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedAppId(app.applicationId)}
                          className="inline-flex items-center px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1.5" />
                          Review &amp; Endorse
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
          setNotificationMsg(msg);
          fetchQueue();
        }}
      />
    </div>
  );
}
