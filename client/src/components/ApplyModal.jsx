import React, { useState, useEffect } from 'react';
import api from '../api/client';
import {
  X,
  Upload,
  FileCheck2,
  File,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Trash2,
  UserCheck,
  ArrowRight
} from 'lucide-react';

export default function ApplyModal({ isOpen, onClose, onSuccess, studentDepartmentId }) {
  const [docTypes, setDocTypes] = useState([]);
  const [selectedDocCode, setSelectedDocCode] = useState('');
  const [facultyList, setFacultyList] = useState([]);
  const [selectedMentor, setSelectedMentor] = useState('');
  const [formData, setFormData] = useState({});
  const [uploadedAttachments, setUploadedAttachments] = useState({}); // { [key]: { id, originalName, size, mimeType } }
  const [uploadingKeys, setUploadingKeys] = useState({}); // { [key]: boolean }
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Fetch active document types on open
  useEffect(() => {
    if (isOpen) {
      setError('');
      api.get('/document-types')
        .then(res => {
          if (res.data.success && res.data.documentTypes?.length) {
            setDocTypes(res.data.documentTypes);
            setSelectedDocCode(res.data.documentTypes[0].code);
          }
        })
        .catch(err => {
          setError('Failed to load document types');
        });

      // Fetch departmental faculty for mentor selection
      const params = studentDepartmentId ? `?departmentId=${studentDepartmentId}` : '';
      api.get(`/users/faculty${params}`)
        .then(res => {
          if (res.data.success && res.data.faculty) {
            setFacultyList(res.data.faculty);
            if (res.data.faculty.length > 0) {
              setSelectedMentor(res.data.faculty[0]._id);
            }
          }
        })
        .catch(() => {});
    }
  }, [isOpen, studentDepartmentId]);

  // Reset form when document type changes
  useEffect(() => {
    setFormData({});
    setUploadedAttachments({});
    setError('');
  }, [selectedDocCode]);

  if (!isOpen) return null;

  const currentDocType = docTypes.find(d => d.code === selectedDocCode);

  const handleFieldChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleFileUpload = async (key, file) => {
    if (!file) return;

    // Client-side validation
    if (file.size > 5 * 1024 * 1024) {
      setError(`File "${file.name}" exceeds the maximum allowed size of 5 MB.`);
      return;
    }

    const allowedMime = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedMime.includes(file.type)) {
      setError(`File "${file.name}" has invalid format. Only PDF, JPG, and PNG are accepted.`);
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
      setError(err.response?.data?.message || `Failed to upload file for ${key}`);
    } finally {
      setUploadingKeys(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleRemoveAttachment = (key) => {
    setUploadedAttachments(prev => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentDocType) return;

    // 1. Validate required fields
    for (const field of currentDocType.requiredFields) {
      if (field.required && !formData[field.key]) {
        setError(`Please fill in the required field: "${field.label}"`);
        return;
      }
    }

    // 2. Validate required attachments (Block submit if required file is missing)
    for (const att of currentDocType.requiredAttachments) {
      if (att.required && !uploadedAttachments[att.key]) {
        setError(`Required attachment missing: "${att.label}". You must upload all required files to submit.`);
        return;
      }
    }

    setSubmitting(true);
    setError('');

    const attachmentsPayload = Object.entries(uploadedAttachments).map(([key, item]) => ({
      key,
      attachmentId: item.id
    }));

    try {
      const res = await api.post('/applications/apply', {
        documentTypeCode: selectedDocCode,
        formData,
        attachments: attachmentsPayload,
        assignedMentorId: selectedMentor || undefined
      });

      if (res.data.success) {
        onSuccess(res.data.application);
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-teal-700 to-sky-800 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-white/20 rounded-lg">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Apply for Academic Document</h2>
              <p className="text-xs text-teal-100">Step 1 of 1 &bull; Submit request &amp; supporting attachments</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start space-x-3 text-rose-800 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {/* Document Type Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Select Document Type
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {docTypes.map((dt) => (
                <button
                  key={dt.code}
                  type="button"
                  onClick={() => setSelectedDocCode(dt.code)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    selectedDocCode === dt.code
                      ? 'border-teal-500 bg-teal-50/80 ring-2 ring-teal-200'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="text-xs font-bold text-slate-900">{dt.name}</div>
                  <div className="text-[10px] text-teal-700 font-semibold mt-1">
                    SLA: {dt.expectedHours || 48} hrs
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">
                    {dt.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {currentDocType && (
            <>
              {/* Dynamic Required Fields */}
              <div className="space-y-4 pt-2 border-t border-slate-100">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Required Application Details
                </h3>

                {currentDocType.requiredFields.map((field) => (
                  <div key={field.key}>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {field.label} {field.required && <span className="text-rose-500">*</span>}
                    </label>

                    {field.type === 'textarea' ? (
                      <textarea
                        rows={3}
                        required={field.required}
                        value={formData[field.key] || ''}
                        onChange={(e) => handleFieldChange(field.key, e.target.value)}
                        placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                        className="block w-full text-xs sm:text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                      />
                    ) : field.type === 'number' ? (
                      <input
                        type="number"
                        min="1"
                        max="10"
                        required={field.required}
                        value={formData[field.key] || ''}
                        onChange={(e) => handleFieldChange(field.key, e.target.value)}
                        placeholder={field.placeholder || '1'}
                        className="block w-full text-xs sm:text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                      />
                    ) : (
                      <input
                        type="text"
                        required={field.required}
                        value={formData[field.key] || ''}
                        onChange={(e) => handleFieldChange(field.key, e.target.value)}
                        placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                        className="block w-full text-xs sm:text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                      />
                    )}
                  </div>
                ))}

                {/* Faculty Mentor Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Assigned Faculty Mentor / Reviewer</span>
                    <span className="text-[10px] text-slate-400">Department Faculty</span>
                  </label>
                  <select
                    value={selectedMentor}
                    onChange={(e) => setSelectedMentor(e.target.value)}
                    className="block w-full text-xs sm:text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors bg-white"
                  >
                    {facultyList.map((fac) => (
                      <option key={fac._id} value={fac._id}>
                        {fac.name} &bull; {fac.designation || 'Faculty Member'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dynamic Required Attachments (Multer Upload) */}
              <div className="space-y-4 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Required Supporting Documents (Max 5 MB each)
                  </h3>
                  <span className="text-[10px] text-slate-400">PDF, JPG, PNG</span>
                </div>

                {currentDocType.requiredAttachments.map((att) => {
                  const isUploaded = !!uploadedAttachments[att.key];
                  const isUploading = !!uploadingKeys[att.key];
                  const uploadedFile = uploadedAttachments[att.key];

                  return (
                    <div
                      key={att.key}
                      className={`p-4 rounded-xl border transition-all ${
                        isUploaded
                          ? 'bg-emerald-50/60 border-emerald-300'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="text-xs font-bold text-slate-800">
                            {att.label} {att.required && <span className="text-rose-500">*</span>}
                          </div>
                          {att.description && (
                            <p className="text-[11px] text-slate-500 mt-0.5">{att.description}</p>
                          )}
                        </div>

                        {isUploaded && (
                          <span className="inline-flex items-center text-xs font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            Ready
                          </span>
                        )}
                      </div>

                      {isUploaded ? (
                        <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-emerald-200">
                          <div className="flex items-center space-x-2 text-xs text-slate-700 truncate">
                            <File className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span className="font-medium truncate">{uploadedFile.originalName}</span>
                            <span className="text-[10px] text-slate-400 shrink-0">
                              ({(uploadedFile.size / 1024).toFixed(1)} KB)
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveAttachment(att.key)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                            title="Remove attachment"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="relative border-2 border-dashed border-slate-300 hover:border-teal-500 rounded-lg p-4 text-center cursor-pointer transition-colors bg-white">
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                            onChange={(e) => handleFileUpload(att.key, e.target.files[0])}
                            disabled={isUploading}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          <div className="flex flex-col items-center justify-center space-y-1">
                            {isUploading ? (
                              <>
                                <Loader2 className="w-6 h-6 text-teal-600 animate-spin" />
                                <span className="text-xs font-medium text-teal-700">Uploading &amp; scanning file...</span>
                              </>
                            ) : (
                              <>
                                <Upload className="w-6 h-6 text-slate-400" />
                                <span className="text-xs font-medium text-slate-700">
                                  Click or drag file to upload
                                </span>
                                <span className="text-[10px] text-slate-400">PDF, JPG, or PNG up to 5 MB</span>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Workflow Stepper Preview */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div className="font-bold text-slate-700 mb-1">Approval Sequence:</div>
                <div className="flex items-center space-x-2 text-slate-500 flex-wrap">
                  {currentDocType.workflowStages.map((st, i) => (
                    <React.Fragment key={st.stageNumber}>
                      <span className="font-semibold text-teal-700 capitalize">
                        {st.role}
                      </span>
                      {i < currentDocType.workflowStages.length - 1 && (
                        <span>&rarr;</span>
                      )}
                    </React.Fragment>
                  ))}
                  <span>&rarr; Issuance</span>
                </div>
              </div>
            </>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 transition-colors"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating Application &amp; Workflow...
                </>
              ) : (
                <>
                  Submit Application
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
