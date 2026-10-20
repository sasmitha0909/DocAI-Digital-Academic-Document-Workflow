import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { downloadOfficialDocument } from '../../utils/documentDownload';
import Navbar from '../../components/Navbar';
import ApplyModal from '../../components/ApplyModal';
import ApplicationDetailsModal from '../../components/ApplicationDetailsModal';
import ResubmitModal from '../../components/ResubmitModal';
import api from '../../api/client';
import {
  GraduationCap,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Plus,
  RefreshCw,
  Eye,
  FileCheck2,
  Download,
  AlertCircle,
  Award,
  Layers,
  RotateCcw
} from 'lucide-react';

export default function StudentDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('applications'); // 'applications' | 'certificates'
  const [stats, setStats] = useState({
    total: 0,
    underReview: 0,
    correctionRequired: 0,
    approved: 0
  });
  const [applications, setApplications] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState(null);
  const [resubmitApp, setResubmitApp] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, appsRes, certsRes] = await Promise.all([
        api.get('/applications/my-stats'),
        api.get('/applications/my-applications'),
        api.get('/certificates/my-certificates')
      ]);

      if (statsRes.data.success) setStats(statsRes.data.stats);
      if (appsRes.data.success) setApplications(appsRes.data.applications);
      if (certsRes.data.success) setCertificates(certsRes.data.certificates);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getStatusBadge = (status) => {
    const config = {
      SUBMITTED: { bg: 'bg-blue-50 text-blue-700 border-blue-200', label: 'Submitted' },
      UNDER_REVIEW: { bg: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Under Review' },
      CORRECTION_REQUIRED: { bg: 'bg-orange-50 text-orange-700 border-orange-200', label: 'Correction Required' },
      RESUBMITTED: { bg: 'bg-purple-50 text-purple-700 border-purple-200', label: 'Resubmitted' },
      APPROVED: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Approved' },
      REJECTED: { bg: 'bg-rose-50 text-rose-700 border-rose-200', label: 'Rejected' },
      PROCESSING: { bg: 'bg-cyan-50 text-cyan-700 border-cyan-200', label: 'Processing' },
      COMPLETED: { bg: 'bg-emerald-600 text-white border-transparent', label: 'Completed' },
      REVOKED: { bg: 'bg-rose-100 text-rose-900 border-rose-300 font-bold', label: 'Revoked' },
      DELAYED: { bg: 'bg-red-100 text-red-900 border-red-300', label: 'Delayed' }
    };

    const cfg = config[status] || { bg: 'bg-slate-50 text-slate-700 border-slate-200', label: status };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.bg}`}>
        {cfg.label}
      </span>
    );
  };

  const handleDownloadCertificate = async (documentId) => {
    try {
      toast.info(`Downloading official document ${documentId}...`);
      const filename = await downloadOfficialDocument(documentId);
      toast.success(`Downloaded ${filename} successfully!`);
    } catch (err) {
      toast.error(err.message || 'Download failed');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Banner - Soft Blue / Teal Theme */}
        <div className="bg-gradient-to-r from-teal-700 via-teal-800 to-sky-800 rounded-2xl p-6 sm:p-8 text-white shadow-md mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center space-x-2 bg-white/20 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-xs mb-3">
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Student Academic Portal</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Welcome back, {user?.name}
              </h1>
              <p className="text-teal-100 text-sm mt-1">
                Register No: <span className="font-mono font-semibold text-white">{user?.registerNumber}</span> &bull;{' '}
                Department of {user?.department?.name || 'Engineering'} &bull; Year {user?.year || '3'}
              </p>
            </div>

            <div className="flex items-center space-x-3 shrink-0">
              <button
                type="button"
                onClick={fetchData}
                className="p-2.5 rounded-xl bg-teal-800/80 hover:bg-teal-800 text-white border border-teal-600 transition-colors"
                title="Refresh Data"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>

              <button
                type="button"
                onClick={() => setIsApplyModalOpen(true)}
                className="inline-flex items-center px-4 py-2.5 rounded-xl bg-white text-teal-800 font-bold text-sm shadow hover:bg-teal-50 transition-colors"
              >
                <Plus className="w-4 h-4 mr-1.5 text-teal-600" />
                Apply for Document
              </button>
            </div>
          </div>
        </div>

        {/* Real MongoDB Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <div className="bg-white p-5 rounded-xl border border-teal-100 shadow-xs flex items-center space-x-4">
            <div className="w-12 h-12 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Requests
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-0.5">{stats.total}</div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-sky-100 shadow-xs flex items-center space-x-4">
            <div className="w-12 h-12 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Under Review
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-0.5">{stats.underReview}</div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-amber-100 shadow-xs flex items-center space-x-4">
            <div className="w-12 h-12 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Corrections
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-0.5">{stats.correctionRequired}</div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-emerald-100 shadow-xs flex items-center space-x-4">
            <div className="w-12 h-12 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Ready / Issued
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-0.5">{certificates.length}</div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 mb-6">
          <button
            onClick={() => setActiveTab('applications')}
            className={`pb-3 px-4 font-bold text-sm transition-colors border-b-2 flex items-center space-x-2 ${
              activeTab === 'applications'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>My Applications ({applications.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('certificates')}
            className={`pb-3 px-4 font-bold text-sm transition-colors border-b-2 flex items-center space-x-2 ${
              activeTab === 'certificates'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Issued Documents &amp; Certificates ({certificates.length})</span>
          </button>
        </div>

        {/* Tab 1: Applications */}
        {activeTab === 'applications' && (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Active &amp; Past Applications</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Track real-time approval stages across Faculty, HOD, and Administration
                </p>
              </div>
            </div>

            {loading ? (
              <div className="py-12 text-center text-xs text-slate-400">Loading applications...</div>
            ) : applications.length === 0 ? (
              <div className="py-16 px-4 text-center">
                <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto mb-3">
                  <FileCheck2 className="w-7 h-7" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">No applications submitted yet</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-5">
                  Apply for Bonafide Certificates, Transcripts, or Recommendation Letters with automated departmental approval.
                </p>
                <button
                  type="button"
                  onClick={() => setIsApplyModalOpen(true)}
                  className="inline-flex items-center px-4 py-2 rounded-xl bg-teal-600 text-white font-semibold text-xs shadow hover:bg-teal-700 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Start First Application
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
                  <thead className="bg-slate-50/80 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-6 py-3.5">Application ID</th>
                      <th className="px-6 py-3.5">Document Type</th>
                      <th className="px-6 py-3.5">Status</th>
                      <th className="px-6 py-3.5">Current Stage</th>
                      <th className="px-6 py-3.5">Submitted On</th>
                      <th className="px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {applications.map((app) => (
                      <tr key={app._id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4 font-mono font-bold text-slate-900">
                          {app.applicationId}
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-semibold text-slate-800 block">
                            {app.documentType?.name || 'Document'}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {app.attachments?.length || 0} attachment(s)
                          </span>
                        </td>
                        <td className="px-6 py-4">{getStatusBadge(app.status)}</td>
                        <td className="px-6 py-4 text-slate-600">
                          <span className="font-medium text-slate-800">
                            Stage {app.currentStage}:
                          </span>{' '}
                          {app.stages?.[app.currentStage - 1]?.stepName || 'Processing'}
                        </td>
                        <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                          {new Date(app.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          {app.status === 'CORRECTION_REQUIRED' && (
                            <button
                              type="button"
                              onClick={() => setResubmitApp(app)}
                              className="inline-flex items-center px-3 py-1.5 rounded-lg bg-amber-500 text-white hover:bg-amber-600 font-bold text-xs shadow-2xs"
                            >
                              <RotateCcw className="w-3.5 h-3.5 mr-1" />
                              Fix &amp; Resubmit
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedAppId(app.applicationId)}
                            className="inline-flex items-center px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs shadow-2xs"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1 text-slate-400" />
                            Track
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

        {/* Tab 2: Issued Certificates */}
        {activeTab === 'certificates' && (
          <div className="space-y-4">
            {/* Printed Notice Alert Banner */}
            <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 flex items-start space-x-3 text-teal-900 text-xs shadow-2xs">
              <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-sm">Official Issuance Notice</span>
                <p className="mt-0.5 text-teal-800">
                  Your document is ready. Please collect the original from the Admin office.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Official Issued Certificates</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Digitally endorsed with default Faculty, HOD, and Principal signature blocks
                  </p>
                </div>
              </div>

              {certificates.length === 0 ? (
                <div className="py-14 text-center text-xs text-slate-400">
                  No certificates issued yet. Once your application reaches final approval, your official PDF will appear here.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {certificates.map((cert) => (
                    <div
                      key={cert._id}
                      className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors"
                    >
                      <div className="flex items-start space-x-4">
                        <div className="p-3 bg-teal-50 text-teal-700 rounded-xl border border-teal-100 shrink-0">
                          <Award className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-mono font-bold text-sm text-slate-900">
                              {cert.documentId}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                                cert.status === 'Valid'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {cert.status}
                            </span>
                          </div>
                          <div className="font-semibold text-slate-800 text-xs mt-0.5">
                            {cert.documentType?.name}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Issued on {new Date(cert.issueDate).toLocaleDateString()} &bull; Application:{' '}
                            <span className="font-mono">{cert.application?.applicationId}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 shrink-0">
                        {cert.status === 'Valid' ? (
                          <button
                            type="button"
                            onClick={() => handleDownloadCertificate(cert.documentId)}
                            className="inline-flex items-center px-4 py-2 rounded-xl bg-teal-600 text-white hover:bg-teal-700 font-bold text-xs shadow transition-colors"
                          >
                            <Download className="w-4 h-4 mr-1.5" />
                            Download Official PDF
                          </button>
                        ) : (
                          <span className="text-xs text-rose-600 font-semibold italic">
                            Document Revoked
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Apply Modal */}
      <ApplyModal
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
        onSuccess={(newApp) => {
          fetchData();
          setSelectedAppId(newApp.applicationId);
        }}
        studentDepartmentId={user?.department?._id || user?.department}
      />

      {/* Details & Tracking Modal */}
      <ApplicationDetailsModal
        applicationId={selectedAppId}
        isOpen={!!selectedAppId}
        onClose={() => setSelectedAppId(null)}
      />

      {/* Resubmit Modal */}
      <ResubmitModal
        application={resubmitApp}
        isOpen={!!resubmitApp}
        onClose={() => setResubmitApp(null)}
        onSuccess={() => {
          fetchData();
        }}
      />
    </div>
  );
}
