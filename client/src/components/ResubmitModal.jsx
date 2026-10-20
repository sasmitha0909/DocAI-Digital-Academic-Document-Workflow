import React, { useState, useEffect } from 'react';
import api from '../api/client';
import {
  X,
  Upload,
  FileCheck2,
  AlertTriangle,
  Loader2,
  File,
  CheckCircle2,
  Send,
  Trash2
} from 'lucide-react';

export default function ResubmitModal({ application, isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState({});
  const [uploadedAttachments, setUploadedAttachments] = useState({});
  const [uploadingKeys, setUploadingKeys] = useState({});
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && application) {
      setFormData(application.formData || {});
      setRemarks('');
      setError('');
      setUploadedAttachments({});
    }
  }, [isOpen, application]);

  if (!isOpen || !application) return null;

  const handleFileUpload = async (key, file) => {
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError(`File "${file.name}" exceeds 5 MB.`);
      return;
    }

    setError('');
    setUploadingKeys(prev => ({ ...prev, [key]: true }));

    const data = new FormData();
    data.append('file', file);
    data.append('fieldName', key);

    try {
      const res = await api.post('/attachments/upload', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success && res.data.attachment) {
        setUploadedAttachments(prev => ({
          ...prev,
          [key]: res.data.attachment
        }));
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload replacement file');
    } finally {
      setUploadingKeys(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleResubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const newAttachmentsPayload = Object.entries(uploadedAttachments).map(([key, item]) => ({
      key,
      attachmentId: item.id
    }));

    try {
      const res = await api.post(`/workflows/${application.applicationId}/resubmit`, {
        formData,
        attachments: newAttachmentsPayload,
        remarks: remarks.trim()
      });

      if (res.data.success) {
        onSuccess(res.data.application);
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resubmit application');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 bg-amber-600 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-amber-700/60 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold">Resubmit Corrected Application</h2>
              <p className="text-xs text-amber-100 font-mono">{application.applicationId}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleResubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Correction Reason Alert */}
          {application.correctionDetails?.reason && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs">
              <span className="font-bold block uppercase tracking-wider text-[10px] text-amber-700 mb-1">
                Reviewer Instructions
              </span>
              <p className="font-medium text-amber-950 italic">
                "{application.correctionDetails.reason}"
              </p>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
              {error}
            </div>
          )}

          {/* Form Fields Revision */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Update Application Details
            </h3>
            {Object.entries(formData).map(([k, v]) => (
              <div key={k}>
                <label className="block text-xs font-semibold text-slate-700 mb-1 capitalize">
                  {k.replace(/([A-Z])/g, ' $1')}
                </label>
                <input
                  type="text"
                  value={v || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, [k]: e.target.value }))}
                  className="w-full text-xs sm:text-sm border border-slate-300 rounded-lg p-2.5"
                />
              </div>
            ))}
          </div>

          {/* Replacement File Upload */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Upload Replacement Documents (Optional)
            </h3>
            {application.documentType?.requiredAttachments?.map((att) => {
              const uploaded = uploadedAttachments[att.key];
              const isUploading = uploadingKeys[att.key];

              return (
                <div key={att.key} className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="font-bold text-slate-800">{att.label}</span>
                    {uploaded && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        Replacement Ready
                      </span>
                    )}
                  </div>

                  {uploaded ? (
                    <div className="flex items-center justify-between bg-white p-2 rounded border border-emerald-200">
                      <span className="truncate font-medium text-slate-700">{uploaded.originalName}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setUploadedAttachments(prev => {
                            const copy = { ...prev };
                            delete copy[att.key];
                            return copy;
                          });
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="relative border border-dashed border-slate-300 hover:border-amber-500 rounded p-3 text-center bg-white cursor-pointer">
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                        onChange={(e) => handleFileUpload(att.key, e.target.files[0])}
                        disabled={isUploading}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      {isUploading ? (
                        <div className="flex items-center justify-center space-x-1.5 text-amber-700">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Uploading file...</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center space-x-1.5 text-slate-500">
                          <Upload className="w-4 h-4" />
                          <span>Click to replace file</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Note to Reviewer (Optional)
            </label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Replaced with clear scanned copy as requested"
              className="w-full text-xs sm:text-sm border border-slate-300 rounded-lg p-2.5"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center py-2.5 px-4 rounded-xl font-bold text-xs text-white bg-amber-600 hover:bg-amber-700 shadow transition-colors"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting Changes...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-1.5" />
                  Submit Revised Application
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
