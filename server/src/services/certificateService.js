const mongoose = require('mongoose');
const Certificate = require('../models/Certificate');
const Application = require('../models/Application');
const AuditLog = require('../models/AuditLog');
const { createNotification } = require('./notificationService');

async function getStudentCertificates(studentId) {
  return Certificate.find({ student: studentId })
    .populate('documentType')
    .populate('department', 'name code')
    .populate('application', 'applicationId createdAt')
    .sort({ issueDate: -1 });
}

async function getAllCertificates(filters = {}) {
  const query = {};
  if (filters.status) query.status = filters.status;
  if (filters.departmentId) query.department = filters.departmentId;

  return Certificate.find(query)
    .populate('student', 'name email registerNumber')
    .populate('documentType')
    .populate('department', 'name code')
    .populate('application', 'applicationId')
    .populate('revocationDetails.revokedBy', 'name role')
    .sort({ issueDate: -1 });
}

async function verifyCertificateAccess(identifier, user) {
  if (!user) {
    const error = new Error('Authentication required');
    error.statusCode = 401;
    throw error;
  }

  if (!identifier) {
    const error = new Error('Document identifier required');
    error.statusCode = 400;
    throw error;
  }

  const cleanIdentifier = String(identifier).trim();
  const query = mongoose.Types.ObjectId.isValid(cleanIdentifier)
    ? { $or: [{ _id: cleanIdentifier }, { documentId: cleanIdentifier.toUpperCase() }] }
    : { documentId: cleanIdentifier.toUpperCase() };

  const cert = await Certificate.findOne(query)
    .populate('student', 'name email registerNumber')
    .populate('documentType')
    .populate('department', 'name code')
    .populate({
      path: 'application',
      populate: ['student', 'department', 'documentType', 'assignedMentor']
    });

  if (!cert) {
    const error = new Error('Document not found');
    error.statusCode = 404;
    throw error;
  }

  // Admin and Principal have global access
  if (user.role === 'admin' || user.role === 'principal') {
    return cert;
  }

  // Student owner has access
  const studentId = cert.student?._id ? cert.student._id.toString() : cert.student.toString();
  const currentUserId = user.id ? user.id.toString() : (user._id ? user._id.toString() : '');
  if (studentId === currentUserId) {
    return cert;
  }

  // Faculty and HOD of the student's department have access
  if ((user.role === 'faculty' || user.role === 'hod') && user.department) {
    const certDeptId = cert.department?._id ? cert.department._id.toString() : cert.department.toString();
    if (certDeptId === user.department.toString()) {
      return cert;
    }
  }

  const error = new Error('Access forbidden: you do not have permission to view or download this document');
  error.statusCode = 403;
  throw error;
}

async function revokeCertificate({ documentId, adminUser, reason }) {
  if (adminUser.role !== 'admin') {
    const error = new Error('Access forbidden: only Administrators can revoke issued documents');
    error.statusCode = 403;
    throw error;
  }

  if (!reason || !reason.trim()) {
    const error = new Error('Revocation reason is mandatory');
    error.statusCode = 400;
    throw error;
  }

  const cert = await Certificate.findOne({ documentId: documentId.toUpperCase() });
  if (!cert) {
    const error = new Error('Document not found');
    error.statusCode = 404;
    throw error;
  }

  cert.status = 'Revoked';
  cert.revocationDetails = {
    revokedBy: adminUser._id,
    reason: reason.trim(),
    date: new Date()
  };
  await cert.save();

  // Update application status
  if (cert.application) {
    await Application.findByIdAndUpdate(cert.application, { status: 'REVOKED' });

    await AuditLog.create({
      applicationId: cert.application,
      performedBy: adminUser._id,
      role: 'admin',
      action: 'REVOKED',
      stageNumber: 3,
      stageName: 'Document Revocation',
      remarks: `Document ${cert.documentId} revoked: ${reason.trim()}`
    });
  }

  // Notify student
  await createNotification({
    recipient: cert.student,
    title: `Document Revoked: ${cert.documentId}`,
    message: `Your document has been revoked by the Administration. Reason: ${reason.trim()}`,
    type: 'REJECTED',
    link: `/student`
  });

  return cert;
}

module.exports = {
  getStudentCertificates,
  getAllCertificates,
  verifyCertificateAccess,
  revokeCertificate
};
