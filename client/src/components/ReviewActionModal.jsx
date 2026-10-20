import React, { useState, useEffect } from 'react';
import api from '../api/client';
import {
  X,
  FileCheck2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Eye,
  Download,
  Loader2,
  Clock,
  User,
  Building,
  Send,
  AlertCircle
} from 'lucide-react';

export default function ReviewActionModal({ applicationId, isOpen, onClose, onActionSuccess }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Sub-action dialogs (Approve / Reject / Correction)
  const [activeAction, setActiveAction] = useState(null); // 'APPROVE' | 'REJECT' | 'CORRECTION'
  const [remarks, setRemarks] = useState('');
  const [mandatoryReason, setMandatoryReason] = useState('');
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    if (isOpen && applicationId) {
      setLoading(true);
      setError('');
      setActiveAction(null);
      setRemarks('');
      setMandatoryReason('');
      setActionError('');

      api.get(`/applications/${applicationId}`)
        .then(res => {
          if (res.data.success) {
            setData(res.data);
          }
        })
        .catch(err => {
          setError(err.response?.data?.message || 'Failed to load application');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen, applicationId]);

  if (!isOpen) return null;

  const app = data?.application;

  const handleDownload = (attachmentId, originalName) => {
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

  const handleExecuteAction = async () => {
    setActionError('');

    if (activeAction === 'REJECT') {
      if (!mandatoryReason.trim()) {
        setActionError('Rejection reason is mandatory. Please state the exact justification.');
        return;
      }
      setSubmitting(true);
      try {
        const res = await api.post(`/workflows/${app.applicationId}/reject`, {
          reason: mandatoryReason.trim()
        });
        if (res.data.success) {
          onActionSuccess(res.data.message);
          onClose();
        }
      } catch (err) {
        setActionError(err.response?.data?.message || 'Failed to reject application');
      } finally {
        setSubmitting(false);
      }
    } else if (activeAction === 'CORRECTION') {
      if (!mandatoryReason.trim()) {
        setActionError('Correction reason is mandatory. Specify the required revisions.');
        return;
      }
      setSubmitting(true);
      try {
        const res = await api.post(`/workflows/${app.applicationId}/correction`, {
          reason: mandatoryReason.trim()
        });
        if (res.data.success) {
          onActionSuccess(res.data.message);
          onClose();
        }
      } catch (err) {
        setActionError(err.response?.data?.message || 'Failed to request correction');
      } finally {
        setSubmitting(false);
      }
    } else if (activeAction === 'APPROVE') {
      setSubmitting(true);
      try {
        const res = await api.post(`/workflows/${app.applicationId}/approve`, {
          remarks: remarks.trim()
        });
        if (res.data.success) {
          onActionSuccess(res.data.message);
          onClose();
        }
      } catch (err) {
        setActionError(err.response?.data?.message || 'Failed to approve application');
      } finally {
        setSubmitting(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-slate-800 rounded-lg text-emerald-400">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono font-bold text-base text-white">
                  {app?.applicationId || applicationId}
                </span>
                <span className="text-xs bg-slate-700 text-slate-200 px-2.5 py-0.5 rounded-full font-semibold">
                  Stage {app?.currentStage}: {app?.currentRole?.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {app?.documentType?.name} &bull; {app?.department?.name}
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

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-slate-600 animate-spin mb-2" />
              <p className="text-xs text-slate-500">Loading application details...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
              {error}
            </div>
          ) : app ? (
            <>
              {/* Student Metadata Card */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
                  <span className="text-[10px] font-semibold uppercase text-slate-400 block mb-0.5">Applicant</span>
                  <div className="font-bold text-slate-900">{app.student?.name}</div>
                  <div className="text-slate-500 font-mono text-[11px]">{app.student?.registerNumber}</div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
                  <span className="text-[10px] font-semibold uppercase text-slate-400 block mb-0.5">Department &amp; Year</span>
                  <div className="font-bold text-slate-900">{app.department?.name}</div>
                  <div className="text-slate-500 text-[11px]">Year {app.student?.year || 3}</div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
                  <span className="text-[10px] font-semibold uppercase text-slate-400 block mb-0.5">Submitted On</span>
                  <div className="font-bold text-slate-900">{new Date(app.createdAt).toLocaleDateString()}</div>
                  <div className="text-slate-500 text-[11px]">{new Date(app.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              </div>

              {/* Progress Stepper */}
              <div className="border border-slate-200 rounded-xl p-5 bg-white shadow-2xs">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-4">
                  Multi-Tier Workflow Progress
                </h3>

                <div className="relative border-l-2 border-slate-200 ml-3 space-y-5">
                  {app.stages?.map((stage) => {
                    const isPassed = stage.status === 'APPROVED';
                    const isCurrent = app.currentStage === stage.stageNumber && app.status !== 'REJECTED';

                    return (
                      <div key={stage.stageNumber} className="relative pl-6">
                        <div
                          className={`absolute -left-[9px] top-0.5 w-4 h-4 rounded-full border-2 bg-white ${
                            isPassed
                              ? 'border-emerald-500 bg-emerald-500'
                              : isCurrent
                              ? 'border-sky-500 ring-4 ring-sky-100'
                              : 'border-slate-300'
                          }`}
                        />
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900">
                            Stage {stage.stageNumber}: {stage.stepName} ({stage.role})
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isPassed ? 'bg-emerald-100 text-emerald-800' : isCurrent ? 'bg-sky-100 text-sky-800' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {stage.status}
                          </span>
                        </div>
                        {stage.actionBy && (
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Handled by {stage.actionBy.name} on {new Date(stage.actionDate).toLocaleDateString()}
                          </div>
                        )}
                        {stage.remarks && (
                          <div className="mt-1 text-xs italic text-slate-600 bg-slate-50 p-2 rounded">
                            "{stage.remarks}"
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Form Data */}
              <div className="border border-slate-200 rounded-xl p-5 bg-white">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                  Application Information
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

              {/* Attachments (With Preview & Download) */}
              <div className="border border-slate-200 rounded-xl p-5 bg-white">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center justify-between">
                  <span>Supporting Attachments</span>
                  <span className="text-[11px] font-normal text-slate-400">Verified Files</span>
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
                          <FileText className="w-5 h-5 text-sky-600 shrink-0" />
                          <div className="truncate">
                            <span className="font-bold text-slate-900 block truncate">{att.originalName}</span>
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
                            className="inline-flex items-center px-2.5 py-1.5 rounded-lg bg-slate-800 text-white hover:bg-slate-900 text-xs font-semibold shadow-2xs"
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

              {/* Action Modals / Prompts */}
              {activeAction && (
                <div className="p-4 rounded-xl border bg-slate-50 border-slate-300 space-y-3 animate-in fade-in duration-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      {activeAction === 'APPROVE' && 'Approve & Advance Application'}
                      {activeAction === 'REJECT' && 'Reject Application (Mandatory Reason Required)'}
                      {activeAction === 'CORRECTION' && 'Request Correction (Mandatory Reason Required)'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveAction(null)}
                      className="text-xs text-slate-400 hover:text-slate-600"
                    >
                      Cancel
                    </button>
                  </div>

                  {actionError && (
                    <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{actionError}</span>
                    </div>
                  )}

                  {activeAction === 'APPROVE' ? (
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">
                        Review Remarks / Endorsement Note (Optional)
                      </label>
                      <input
                        type="text"
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        placeholder="e.g. Verified and approved"
                        className="w-full text-xs sm:text-sm border border-slate-300 rounded-lg p-2.5 bg-white"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-semibold text-slate-800 mb-1">
                        Reason <span className="text-rose-600">* (Mandatory)</span>
                      </label>
                      <textarea
                        rows={3}
                        required
                        value={mandatoryReason}
                        onChange={(e) => setMandatoryReason(e.target.value)}
                        placeholder={
                          activeAction === 'REJECT'
                            ? 'Enter specific justification for rejection...'
                            : 'Specify what documents or details need to be corrected by the student...'
                        }
                        className="w-full text-xs sm:text-sm border border-slate-300 rounded-lg p-2.5 bg-white"
                      />
                    </div>
                  )}

                  <div className="flex justify-end space-x-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setActiveAction(null)}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleExecuteAction}
                      disabled={submitting}
                      className={`inline-flex items-center px-4 py-1.5 rounded-lg text-xs font-bold text-white shadow-sm transition-colors ${
                        activeAction === 'APPROVE'
                          ? 'bg-emerald-600 hover:bg-emerald-700'
                          : activeAction === 'REJECT'
                          ? 'bg-rose-600 hover:bg-rose-700'
                          : 'bg-amber-600 hover:bg-amber-700'
                      }`}
                    >
                      {submitting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                      ) : (
                        <Send className="w-3.5 h-3.5 mr-1" />
                      )}
                      Confirm {activeAction}
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer Review Actions Bar */}
        {app && !activeAction && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-slate-500">
              Role Authority: <span className="font-bold text-slate-800 capitalize">{app.currentRole}</span>
            </span>

            <div className="flex items-center space-x-2.5">
              <button
                type="button"
                onClick={() => {
                  setActiveAction('CORRECTION');
                  setMandatoryReason('');
                  setActionError('');
                }}
                className="inline-flex items-center px-3.5 py-2 rounded-xl border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 text-xs font-bold transition-colors shadow-2xs"
              >
                <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
                Request Correction
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveAction('REJECT');
                  setMandatoryReason('');
                  setActionError('');
                }}
                className="inline-flex items-center px-3.5 py-2 rounded-xl border border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100 text-xs font-bold transition-colors shadow-2xs"
              >
                <XCircle className="w-3.5 h-3.5 mr-1.5" />
                Reject
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveAction('APPROVE');
                  setRemarks('');
                  setActionError('');
                }}
                className="inline-flex items-center px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold transition-colors shadow-sm"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                Approve &amp; Forward
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
