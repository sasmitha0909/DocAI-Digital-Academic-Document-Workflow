import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { downloadOfficialDocument } from '../../utils/documentDownload';
import Navbar from '../../components/Navbar';
import ReviewActionModal from '../../components/ReviewActionModal';
import api from '../../api/client';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  Shield,
  Users,
  FileCheck2,
  Clock,
  AlertTriangle,
  Activity,
  Search,
  Filter,
  Download,
  Ban,
  Eye,
  RefreshCw,
  FileText,
  Building,
  CheckCircle2,
  Calendar,
  Layers,
  Award
} from 'lucide-react';

const COLORS = ['#0284c7', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('applications'); // 'applications' | 'delayed' | 'certificates' | 'analytics' | 'audit'
  const [loading, setLoading] = useState(true);

  // Data states
  const [applications, setApplications] = useState([]);
  const [delayedApps, setDelayedApps] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [departments, setDepartments] = useState([]);

  // Modals & Action states
  const [reviewAppId, setReviewAppId] = useState(null);
  const [revokeDocId, setRevokeDocId] = useState(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [revokeSubmitting, setRevokeSubmitting] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [deptRes, appsRes, delayedRes, certsRes, analyticsRes, logsRes] = await Promise.all([
        api.get('/departments'),
        api.get(`/admin/search?search=${encodeURIComponent(searchTerm)}&departmentId=${selectedDept}&status=${selectedStatus}`),
        api.get('/admin/delayed'),
        api.get('/certificates'),
        api.get('/admin/analytics'),
        api.get('/admin/audit-logs')
      ]);

      if (deptRes.data.success) setDepartments(deptRes.data.departments || []);
      if (appsRes.data.success) setApplications(appsRes.data.applications || []);
      if (delayedRes.data.success) setDelayedApps(delayedRes.data.delayed || []);
      if (certsRes.data.success) setCertificates(certsRes.data.certificates || []);
      if (analyticsRes.data.success) setAnalytics(analyticsRes.data.analytics);
      if (logsRes.data.success) setAuditLogs(logsRes.data.logs || []);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [searchTerm, selectedDept, selectedStatus]);

  const handleRevoke = async (e) => {
    e.preventDefault();
    if (!revokeReason.trim()) return;

    setRevokeSubmitting(true);
    try {
      const res = await api.post(`/certificates/${revokeDocId}/revoke`, {
        reason: revokeReason.trim()
      });
      if (res.data.success) {
        setActionSuccessMsg(`Document ${revokeDocId} successfully revoked.`);
        setRevokeDocId(null);
        setRevokeReason('');
        loadData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to revoke certificate');
    } finally {
      setRevokeSubmitting(false);
    }
  };

  const handleDownloadCert = async (docId) => {
    try {
      toast.info(`Downloading official document ${docId}...`);
      const filename = await downloadOfficialDocument(docId);
      toast.success(`Downloaded ${filename} successfully!`);
    } catch (err) {
      toast.error(err.message || 'Download failed');
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      SUBMITTED: { bg: 'bg-blue-900/60 text-blue-300 border-blue-700', label: 'Submitted' },
      UNDER_REVIEW: { bg: 'bg-amber-900/60 text-amber-300 border-amber-700', label: 'Under Review' },
      CORRECTION_REQUIRED: { bg: 'bg-orange-900/60 text-orange-300 border-orange-700', label: 'Correction Required' },
      RESUBMITTED: { bg: 'bg-purple-900/60 text-purple-300 border-purple-700', label: 'Resubmitted' },
      APPROVED: { bg: 'bg-emerald-900/60 text-emerald-300 border-emerald-700', label: 'Approved' },
      REJECTED: { bg: 'bg-rose-900/60 text-rose-300 border-rose-700', label: 'Rejected' },
      COMPLETED: { bg: 'bg-emerald-600 text-white border-transparent', label: 'Completed' },
      REVOKED: { bg: 'bg-rose-950 text-rose-400 border-rose-800', label: 'Revoked' },
      DELAYED: { bg: 'bg-red-900/80 text-red-200 border-red-700 font-bold', label: 'Delayed' }
    };

    const cfg = config[status] || { bg: 'bg-slate-800 text-slate-300 border-slate-700', label: status };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${cfg.bg}`}>
        {cfg.label}
      </span>
    );
  };

  // Prepare chart data for Recharts
  const statusChartData = Object.entries(analytics?.byStatus || {}).map(([name, value]) => ({
    name: name.replace('_', ' '),
    value
  }));

  const deptChartData = (analytics?.byDepartment || []).map(d => ({
    name: d.code || d.name,
    count: d.count
  }));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Banner - Dark Slate Theme */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 text-white shadow-xl mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center space-x-2 bg-slate-800 px-3 py-1 rounded-full text-xs font-semibold mb-3 border border-slate-700">
                <Shield className="w-3.5 h-3.5 text-sky-400" />
                <span className="text-sky-300">Central Academic Administration</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {user?.name}
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                Institutional Workflow Engine &bull; SLA Governance &bull; Document Issuance &amp; Revocation
              </p>
            </div>

            <div className="flex items-center space-x-3 shrink-0">
              <button
                type="button"
                onClick={loadData}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition-colors"
                title="Refresh All Data"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>

              <div className="bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-right">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">SLA Compliance</span>
                <span className="text-xl font-bold text-emerald-400">
                  {analytics?.slaComplianceRate || 100}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {actionSuccessMsg && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-200 text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{actionSuccessMsg}</span>
            </div>
            <button onClick={() => setActionSuccessMsg('')} className="text-emerald-400 hover:text-white">
              Dismiss
            </button>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Volume</span>
              <FileText className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-2xl font-bold text-white mt-2">{analytics?.totalApplications || 0}</div>
          </div>

          <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Issued Documents</span>
              <Award className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-400 mt-2">{certificates.length}</div>
          </div>

          <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">SLA Delays</span>
              <Clock className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-2xl font-bold text-rose-400 mt-2">{delayedApps.length}</div>
          </div>

          <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Users</span>
              <Users className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-bold text-white mt-2">{analytics?.totalUsers || 22}</div>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="flex border-b border-slate-800 mb-6 overflow-x-auto space-x-2">
          {[
            { id: 'applications', label: `All Applications (${applications.length})`, icon: FileText },
            { id: 'delayed', label: `Delayed SLA Monitor (${delayedApps.length})`, icon: Clock },
            { id: 'certificates', label: `Documents & Revocation (${certificates.length})`, icon: Award },
            { id: 'analytics', label: 'Analytics & Trends', icon: Activity },
            { id: 'audit', label: `Audit Trail (${auditLogs.length})`, icon: Layers }
          ].map(tab => {
            const Icon = tab.icon;
            const isSel = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 px-4 font-bold text-xs uppercase tracking-wider whitespace-nowrap transition-colors border-b-2 flex items-center space-x-2 ${
                  isSel
                    ? 'border-sky-500 text-sky-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: All Applications & Multi-Filter Search */}
        {activeTab === 'applications' && (
          <div className="space-y-4">
            {/* Search and Filters Bar */}
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-wrap gap-3 items-center justify-between">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by student name, register number, or application ID..."
                  className="w-full text-xs pl-9 pr-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="flex items-center space-x-2">
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="text-xs py-2 px-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-200"
                >
                  <option value="">All Departments</option>
                  {departments.map(d => (
                    <option key={d._id} value={d._id}>{d.code} - {d.name}</option>
                  ))}
                </select>

                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="text-xs py-2 px-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-200"
                >
                  <option value="">All Statuses</option>
                  <option value="SUBMITTED">Submitted</option>
                  <option value="UNDER_REVIEW">Under Review</option>
                  <option value="CORRECTION_REQUIRED">Correction Required</option>
                  <option value="RESUBMITTED">Resubmitted</option>
                  <option value="APPROVED">Approved</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="REVOKED">Revoked</option>
                </select>
              </div>
            </div>

            {/* Applications Table */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-800 text-left text-xs">
                  <thead className="bg-slate-900/80 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-6 py-3.5">Application ID</th>
                      <th className="px-6 py-3.5">Applicant</th>
                      <th className="px-6 py-3.5">Department</th>
                      <th className="px-6 py-3.5">Document Type</th>
                      <th className="px-6 py-3.5">Status</th>
                      <th className="px-6 py-3.5">Stage</th>
                      <th className="px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {applications.map(app => (
                      <tr key={app._id} className="hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4 font-mono font-bold text-sky-400">
                          {app.applicationId}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-white">{app.student?.name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{app.student?.registerNumber}</div>
                        </td>
                        <td className="px-6 py-4 text-slate-300">
                          {app.department?.code}
                        </td>
                        <td className="px-6 py-4 text-slate-200 font-medium">
                          {app.documentType?.name}
                        </td>
                        <td className="px-6 py-4">
                          {getStatusBadge(app.status)}
                        </td>
                        <td className="px-6 py-4 text-slate-400 capitalize">
                          Stage {app.currentStage}: {app.currentRole}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => setReviewAppId(app.applicationId)}
                            className="inline-flex items-center px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 font-semibold text-xs border border-slate-700"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            Manage
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Delayed SLA Monitor */}
        {activeTab === 'delayed' && (
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 space-y-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <Clock className="w-5 h-5 text-rose-500" />
                <span>Overdue &amp; Delayed Applications</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Applications whose elapsed handling time has exceeded their document type's SLA threshold
              </p>
            </div>

            {delayedApps.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                <span>No applications currently exceed expected SLA hours. Operations healthy.</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-800 text-left text-xs">
                  <thead className="bg-slate-900 text-slate-400 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-6 py-3.5">Application ID</th>
                      <th className="px-6 py-3.5">Student</th>
                      <th className="px-6 py-3.5">Department</th>
                      <th className="px-6 py-3.5">Pending Role</th>
                      <th className="px-6 py-3.5">Expected SLA</th>
                      <th className="px-6 py-3.5">Elapsed Time</th>
                      <th className="px-6 py-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {delayedApps.map(d => (
                      <tr key={d._id} className="hover:bg-slate-800/60 bg-rose-950/20">
                        <td className="px-6 py-4 font-mono font-bold text-rose-400">
                          {d.applicationId}
                        </td>
                        <td className="px-6 py-4 text-white font-medium">
                          {d.student?.name}
                        </td>
                        <td className="px-6 py-4 text-slate-300">
                          {d.department?.code}
                        </td>
                        <td className="px-6 py-4 font-bold uppercase text-amber-400">
                          {d.currentRole}
                        </td>
                        <td className="px-6 py-4 text-slate-300">
                          {d.expectedHours} hrs
                        </td>
                        <td className="px-6 py-4 text-rose-400 font-bold">
                          {d.elapsedHours} hrs (+{d.delayHours}h overdue)
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => setReviewAppId(d.applicationId)}
                            className="inline-flex items-center px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
                          >
                            Expedite Review
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Issued Documents & Revocation */}
        {activeTab === 'certificates' && (
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800">
              <h2 className="text-base font-bold text-white">Issued Academic Documents &amp; Certificates</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Download generated PDFs with verified digital signature blocks or revoke non-compliant certificates
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-800 text-left text-xs">
                <thead className="bg-slate-900 text-slate-400 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-6 py-3.5">Document ID</th>
                    <th className="px-6 py-3.5">Student</th>
                    <th className="px-6 py-3.5">Document Type</th>
                    <th className="px-6 py-3.5">Issue Date</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {certificates.map(cert => (
                    <tr key={cert._id} className="hover:bg-slate-800/50">
                      <td className="px-6 py-4 font-mono font-bold text-emerald-400">
                        {cert.documentId}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-white">{cert.student?.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{cert.student?.registerNumber}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-200">
                        {cert.documentType?.name}
                      </td>
                      <td className="px-6 py-4 text-slate-400">
                        {new Date(cert.issueDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          cert.status === 'Valid' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'
                        }`}>
                          {cert.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        {cert.status === 'Valid' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleDownloadCert(cert.documentId)}
                              className="inline-flex items-center px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                            >
                              <Download className="w-3.5 h-3.5 mr-1" />
                              PDF
                            </button>
                            <button
                              type="button"
                              onClick={() => setRevokeDocId(cert.documentId)}
                              className="inline-flex items-center px-2.5 py-1.5 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white font-bold text-xs"
                            >
                              <Ban className="w-3.5 h-3.5 mr-1" />
                              Revoke
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Analytics with Recharts */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Chart 1: Applications by Status */}
              <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
                  Application Status Distribution
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statusChartData}>
                      <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                      <YAxis stroke="#64748b" fontSize={11} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff' }} />
                      <Bar dataKey="value" fill="#0284c7" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 2: Applications by Department */}
              <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
                  Departmental Request Volume
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={deptChartData}>
                      <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                      <YAxis stroke="#64748b" fontSize={11} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff' }} />
                      <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Audit Trail */}
        {activeTab === 'audit' && (
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800">
              <h2 className="text-base font-bold text-white">System Audit Log Trail</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Immutable chronological log of all application actions, approvals, rejections, and revocations
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-800 text-left text-xs">
                <thead className="bg-slate-900 text-slate-400 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-6 py-3.5">Timestamp</th>
                    <th className="px-6 py-3.5">Action</th>
                    <th className="px-6 py-3.5">User</th>
                    <th className="px-6 py-3.5">Role</th>
                    <th className="px-6 py-3.5">Application Ref</th>
                    <th className="px-6 py-3.5">Remarks / Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono text-[11px]">
                  {auditLogs.map(log => (
                    <tr key={log._id} className="hover:bg-slate-800/40">
                      <td className="px-6 py-3.5 text-slate-400">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-3.5 font-bold text-sky-400">
                        {log.action}
                      </td>
                      <td className="px-6 py-3.5 text-white font-sans">
                        {log.performedBy?.name}
                      </td>
                      <td className="px-6 py-3.5 text-slate-300 uppercase">
                        {log.role}
                      </td>
                      <td className="px-6 py-3.5 text-amber-300">
                        {log.applicationId?.applicationId || '-'}
                      </td>
                      <td className="px-6 py-3.5 text-slate-300 font-sans italic">
                        {log.remarks}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Revocation Modal */}
      {revokeDocId && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center space-x-2.5 text-rose-400">
              <Ban className="w-6 h-6" />
              <h3 className="text-base font-bold text-white">Revoke Issued Document</h3>
            </div>
            <p className="text-xs text-slate-300">
              You are about to revoke <span className="font-mono font-bold text-rose-400">{revokeDocId}</span>. The student will be notified and the document marked invalid.
            </p>

            <form onSubmit={handleRevoke} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Revocation Reason <span className="text-rose-400">* (Mandatory)</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                  placeholder="Specify mandatory reason for revocation..."
                  className="w-full text-xs bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRevokeDocId(null)}
                  className="px-3.5 py-2 rounded-lg border border-slate-700 text-xs text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={revokeSubmitting}
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
                >
                  {revokeSubmitting ? 'Revoking...' : 'Confirm Revocation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Modal */}
      <ReviewActionModal
        applicationId={reviewAppId}
        isOpen={!!reviewAppId}
        onClose={() => setReviewAppId(null)}
        onActionSuccess={(msg) => {
          setActionSuccessMsg(msg);
          loadData();
        }}
      />
    </div>
  );
}
