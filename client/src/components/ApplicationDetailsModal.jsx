import React, { useState, useEffect } from 'react';
import api from '../api/client';
import {
  X,
  FileCheck2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  Download,
  Eye,
  User,
  Building,
  Calendar,
  Layers,
  Shield,
  Loader2
} from 'lucide-react';

export default function ApplicationDetailsModal({ applicationId, isOpen, onClose }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && applicationId) {
      setLoading(true);
      setError('');
      api.get(`/applications/${applicationId}`)
        .then(res => {
          if (res.data.success) {
            setData(res.data);
          }
        })
        .catch(err => {
          setError(err.response?.data?.message || 'Failed to load application details');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen, applicationId]);

  if (!isOpen) return null;

  const app = data?.application;
  const auditLogs = data?.auditLogs || [];

  const getStatusBadge = (status) => {
    const config = {
      SUBMITTED: { bg: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Submitted' },
      UNDER_REVIEW: { bg: 'bg-amber-100 text-amber-800 border-amber-200', label: 'Under Review' },
      CORRECTION_REQUIRED: { bg: 'bg-orange-100 text-orange-800 border-orange-200', label: 'Correction Required' },
      RESUBMITTED: { bg: 'bg-purple-100 text-purple-800 border-purple-200', label: 'Resubmitted' },
      APPROVED: { bg: 'bg-emerald-100 text-emerald-800 border-emerald-200', label: 'Approved' },
      REJECTED: { bg: 'bg-rose-100 text-rose-800 border-rose-200', label: 'Rejected' },
      PROCESSING: { bg: 'bg-cyan-100 text-cyan-800 border-cyan-200', label: 'Processing' },
      COMPLETED: { bg: 'bg-emerald-600 text-white border-transparent', label: 'Completed' },
      DELAYED: { bg: 'bg-red-200 text-red-900 border-red-300 font-extrabold', label: 'Delayed' }
    };

    const cfg = config[status] || { bg: 'bg-slate-100 text-slate-800 border-slate-200', label: status };
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${cfg.bg}`}>
        {cfg.label}
      </span>
    );
  };

  const handleDownload = (attachmentId, originalName) => {
    // Authenticated download via anchor with token header handled by window or fetch
    const token = localStorage.getItem('docai_token');
    fetch(`/api/attachments/${attachmentId}/download`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error('Download failed');
        return res.blob();
      })
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = originalName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      })
      .catch(err => alert(err.message));
  };

  const handlePreview = (attachmentId) => {
    const token = localStorage.getItem('docai_token');
    fetch(`/api/attachments/${attachmentId}/preview`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error('Preview unauthorized or failed');
        return res.blob();
      })
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
      })
      .catch(err => alert(err.message));
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-slate-800 rounded-lg text-sky-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold font-mono tracking-tight text-white">
                  {app?.applicationId || applicationId}
                </h2>
                {app && getStatusBadge(app.status)}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {app?.documentType?.name || 'Academic Document'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-teal-600 animate-spin mb-2" />
              <p className="text-xs text-slate-500">Loading application details...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
              {error}
            </div>
          ) : app ? (
            <>
              {/* Rejection / Correction Banner */}
              {app.status === 'REJECTED' && app.rejectionDetails?.reason && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs">
                  <div className="flex items-center space-x-2 font-bold mb-1">
                    <XCircle className="w-4 h-4 text-rose-600" />
                    <span>Application Rejected</span>
                  </div>
                  <div className="pl-6 space-y-1">
                    <p><span className="font-semibold">Rejected By:</span> {app.rejectionDetails.rejectedBy?.name || 'Reviewer'} ({app.rejectionDetails.role})</p>
                    <p><span className="font-semibold">Date:</span> {new Date(app.rejectionDetails.date).toLocaleString()}</p>
                    <p><span className="font-semibold">Reason:</span> <span className="italic">{app.rejectionDetails.reason}</span></p>
                  </div>
                </div>
              )}

              {app.status === 'CORRECTION_REQUIRED' && app.correctionDetails?.reason && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs">
                  <div className="flex items-center space-x-2 font-bold mb-1">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Correction Required Before Processing Can Continue</span>
                  </div>
                  <div className="pl-6 space-y-1">
                    <p><span className="font-semibold">Requested By:</span> {app.correctionDetails.requestedBy?.name || 'Reviewer'} ({app.correctionDetails.role})</p>
                    <p><span className="font-semibold">Date:</span> {new Date(app.correctionDetails.date).toLocaleString()}</p>
                    <p><span className="font-semibold">Action Needed:</span> <span className="font-medium text-amber-950">{app.correctionDetails.reason}</span></p>
                  </div>
                </div>
              )}

              {/* General Metadata Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
                  <div className="text-slate-400 font-semibold uppercase text-[10px] mb-1">Student</div>
                  <div className="font-bold text-slate-800">{app.student?.name}</div>
                  <div className="text-slate-500 font-mono mt-0.5">{app.student?.registerNumber}</div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
                  <div className="text-slate-400 font-semibold uppercase text-[10px] mb-1">Department</div>
                  <div className="font-bold text-slate-800">{app.department?.name}</div>
                  <div className="text-slate-500 mt-0.5">Year {app.student?.year || 3}</div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
                  <div className="text-slate-400 font-semibold uppercase text-[10px] mb-1">Submission Date</div>
                  <div className="font-bold text-slate-800">
                    {new Date(app.createdAt).toLocaleDateString()}
                  </div>
                  <div className="text-slate-500 mt-0.5">
                    {new Date(app.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>

              {/* Workflow Stepper */}
              <div className="border border-slate-200 rounded-xl p-5 bg-white shadow-2xs">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-4 flex items-center justify-between">
                  <span>Multi-Tier Approval Progress</span>
                  <span className="text-[11px] font-normal text-slate-500">
                    Current Stage: {app.currentStage} of {app.stages?.length}
                  </span>
                </h3>

                <div className="relative border-l-2 border-slate-200 ml-3 space-y-6">
                  {app.stages?.map((stage, idx) => {
                    const isPassed = stage.status === 'APPROVED';
                    const isCurrent = app.currentStage === stage.stageNumber && app.status !== 'REJECTED';
                    const isRejected = stage.status === 'REJECTED';
                    const isCorrection = stage.status === 'CORRECTION_REQUESTED';

                    return (
                      <div key={stage.stageNumber} className="relative pl-6">
                        <div
                          className={`absolute -left-[9px] top-0.5 w-4 h-4 rounded-full border-2 bg-white ${
                            isPassed
                              ? 'border-emerald-500 bg-emerald-500'
                              : isRejected
                              ? 'border-rose-500 bg-rose-500'
                              : isCorrection
                              ? 'border-amber-500 bg-amber-500'
                              : isCurrent
                              ? 'border-teal-500 ring-4 ring-teal-100'
                              : 'border-slate-300'
                          }`}
                        />

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <div>
                            <span className="text-xs font-bold text-slate-900">
                              Stage {stage.stageNumber}: {stage.stepName}
                            </span>
                            <span className="text-[11px] text-slate-500 capitalize ml-2">
                              ({stage.role})
                            </span>
                          </div>

                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider self-start sm:self-auto ${
                              isPassed
                                ? 'bg-emerald-100 text-emerald-800'
                                : isRejected
                                ? 'bg-rose-100 text-rose-800'
                                : isCorrection
                                ? 'bg-amber-100 text-amber-800'
                                : isCurrent
                                ? 'bg-teal-100 text-teal-800 animate-pulse'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {stage.status}
                          </span>
                        </div>

                        {stage.actionBy && (
                          <div className="mt-1 text-[11px] text-slate-600">
                            Verified by: <span className="font-semibold">{stage.actionBy.name}</span>{' '}
                            {stage.actionDate && (
                              <span className="text-slate-400">
                                on {new Date(stage.actionDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        )}

                        {stage.remarks && (
                          <div className="mt-1 p-2 rounded bg-slate-50 border border-slate-200 text-xs italic text-slate-700">
                            "{stage.remarks}"
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Submitted Form Details */}
              <div className="border border-slate-200 rounded-xl p-5 bg-white">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                  Submitted Form Data
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {Object.entries(app.formData || {}).map(([k, v]) => (
                    <div key={k} className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="text-slate-400 uppercase text-[10px] block font-semibold">
                        {k.replace(/([A-Z])/g, ' $1')}
                      </span>
                      <span className="font-medium text-slate-800 mt-0.5 block whitespace-pre-wrap">
                        {String(v)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Attachments List with Preview & Download */}
              <div className="border border-slate-200 rounded-xl p-5 bg-white">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center justify-between">
                  <span>Attached Documents</span>
                  <span className="text-[11px] font-normal text-slate-400">Authorized Access Only</span>
                </h3>

                <div className="space-y-2">
                  {app.attachments?.map((item) => {
                    const att = item.attachment;
                    if (!att) return null;

                    return (
                      <div
                        key={item._id || att._id}
                        className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/60 transition-colors"
                      >
                        <div className="flex items-center space-x-3 text-xs truncate">
                          <FileText className="w-5 h-5 text-teal-600 shrink-0" />
                          <div className="truncate">
                            <span className="font-bold text-slate-900 block truncate">
                              {att.originalName}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {(att.size / 1024).toFixed(1)} KB &bull; {att.mimeType}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handlePreview(att._id)}
                            className="inline-flex items-center px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold shadow-2xs"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1 text-slate-500" />
                            Preview
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownload(att._id, att.originalName)}
                            className="inline-flex items-center px-2.5 py-1.5 rounded-lg bg-teal-600 text-white hover:bg-teal-700 text-xs font-semibold shadow-2xs"
                          >
                            <Download className="w-3.5 h-3.5 mr-1" />
                            Download
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
