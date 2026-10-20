const mongoose = require('mongoose');
const Application = require('../models/Application');
const Certificate = require('../models/Certificate');
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const Attachment = require('../models/Attachment');
const { createNotification } = require('./notificationService');
const { generateDocumentId, generatePDF } = require('./pdfService');

/**
 * Helper to build query by ID or applicationId without CastError
 */
function buildAppLookupQuery(idOrAppId, extra = {}) {
  const isObjectId = mongoose.Types.ObjectId.isValid(idOrAppId) && String(new mongoose.Types.ObjectId(idOrAppId)) === String(idOrAppId);
  if (isObjectId) {
    return {
      $or: [{ _id: idOrAppId }, { applicationId: String(idOrAppId).toUpperCase() }],
      ...extra
    };
  }
  return {
    applicationId: String(idOrAppId).toUpperCase(),
    ...extra
  };
}

/**
 * Helper to calculate stage duration in hours
 */
function calculateStageDuration(startDate, endDate) {
  if (!startDate || !endDate) return 0;
  const diffMs = Math.abs(new Date(endDate) - new Date(startDate));
  return Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10;
}

/**
 * Approve application and transition to next stage (or generate final certificate)
 */
async function approveApplication({ applicationId, reviewerUser, remarks = '' }) {
  const application = await Application.findOne(buildAppLookupQuery(applicationId))
    .populate('student')
    .populate('department')
    .populate('documentType')
    .populate('assignedMentor');

  if (!application) {
    const error = new Error('Application not found');
    error.statusCode = 404;
    throw error;
  }

  if (['APPROVED', 'REJECTED', 'COMPLETED'].includes(application.status)) {
    const error = new Error(`Application is already in terminal state: ${application.status}`);
    error.statusCode = 400;
    throw error;
  }

  // Authorize reviewer role for current stage
  const currentStageIndex = application.currentStage - 1;
  const currentStageObj = application.stages[currentStageIndex];

  if (!currentStageObj) {
    const error = new Error('Invalid workflow stage');
    error.statusCode = 400;
    throw error;
  }

  const isRoleMatch = reviewerUser.role === currentStageObj.role || reviewerUser.role === 'admin';
  if (!isRoleMatch) {
    const error = new Error(`Access forbidden: this stage requires approval by role '${currentStageObj.role}'`);
    error.statusCode = 403;
    throw error;
  }

  // Departmental match check for Faculty / HOD
  if ((reviewerUser.role === 'faculty' || reviewerUser.role === 'hod') && reviewerUser.department) {
    if (application.department && reviewerUser.department.toString() !== application.department._id.toString()) {
      const error = new Error('Access forbidden: application belongs to another department');
      error.statusCode = 403;
      throw error;
    }
  }

  // Update current stage
  const stageStartTime = application.stages[currentStageIndex].actionDate || application.updatedAt || application.createdAt;
  const actionDate = new Date();
  currentStageObj.status = 'APPROVED';
  currentStageObj.actionBy = reviewerUser._id;
  currentStageObj.actionDate = actionDate;
  currentStageObj.remarks = remarks;
  currentStageObj.durationHours = calculateStageDuration(stageStartTime, actionDate);

  // Write AuditLog
  await AuditLog.create({
    applicationId: application._id,
    performedBy: reviewerUser._id,
    role: reviewerUser.role,
    action: 'APPROVED',
    stageNumber: application.currentStage,
    stageName: currentStageObj.stepName,
    remarks: remarks || `Approved by ${reviewerUser.name} (${reviewerUser.role})`
  });

  const isFinalStage = application.currentStage >= application.stages.length;

  if (isFinalStage) {
    // FINAL APPROVAL: Generate Official PDF Document
    application.status = 'COMPLETED';
    application.currentRole = 'completed';

    // Collect signers
    const [hodUser, principalUser] = await Promise.all([
      User.findOne({ department: application.department._id, role: 'hod' }),
      User.findOne({ role: 'principal' })
    ]);

    const signers = {
      faculty: application.assignedMentor || reviewerUser,
      hod: hodUser,
      principal: principalUser
    };

    const documentId = await generateDocumentId();
    const pdfResult = await generatePDF({
      application,
      documentId,
      signers
    });

    // Create Certificate in database
    const certificate = await Certificate.create({
      documentId,
      application: application._id,
      student: application.student._id,
      documentType: application.documentType._id,
      department: application.department._id,
      filePath: pdfResult.filePath,
      issueDate: new Date(),
      status: 'Valid'
    });

    // Notify Student
    await createNotification({
      recipient: application.student._id,
      title: `Document Issued: ${documentId}`,
      message: `Your document is ready. Please collect the original from the Admin office.`,
      type: 'SUCCESS',
      link: `/student`
    });

    await application.save();

    return {
      application,
      certificate,
      completed: true
    };
  } else {
    // Advance to next stage
    application.currentStage += 1;
    const nextStageObj = application.stages[application.currentStage - 1];
    application.currentRole = nextStageObj.role;
    application.status = 'UNDER_REVIEW';

    // Notify next stage reviewers
    let nextReviewers = [];
    if (nextStageObj.role === 'hod') {
      nextReviewers = await User.find({ department: application.department._id, role: 'hod' });
    } else if (nextStageObj.role === 'principal') {
      nextReviewers = await User.find({ role: 'principal' });
    } else if (nextStageObj.role === 'admin') {
      nextReviewers = await User.find({ role: 'admin' });
    }

    for (const rev of nextReviewers) {
      await createNotification({
        recipient: rev._id,
        title: `Pending Approval: ${application.applicationId}`,
        message: `Application for ${application.documentType.name} endorsed by ${reviewerUser.name}. Your review is now required.`,
        type: 'ACTION_REQUIRED',
        link: `/${nextStageObj.role}`
      });
    }

    // Also notify student of forward progression
    await createNotification({
      recipient: application.student._id,
      title: `Progress Update: ${application.applicationId}`,
      message: `Stage ${currentStageObj.stageNumber} approved by ${reviewerUser.name}. Advanced to ${nextStageObj.stepName}.`,
      type: 'INFO',
      link: `/student`
    });

    await application.save();

    return {
      application,
      completed: false
    };
  }
}

/**
 * Reject application (Reason is MANDATORY)
 */
async function rejectApplication({ applicationId, reviewerUser, reason }) {
  if (!reason || !reason.trim()) {
    const error = new Error('Rejection reason is mandatory');
    error.statusCode = 400;
    throw error;
  }

  const application = await Application.findOne(buildAppLookupQuery(applicationId))
    .populate('student')
    .populate('department')
    .populate('documentType');

  if (!application) {
    const error = new Error('Application not found');
    error.statusCode = 404;
    throw error;
  }

  const currentStageIndex = application.currentStage - 1;
  const currentStageObj = application.stages[currentStageIndex];

  if (!currentStageObj) {
    const error = new Error('Invalid workflow stage');
    error.statusCode = 400;
    throw error;
  }

  const isRoleMatch = reviewerUser.role === currentStageObj.role || reviewerUser.role === 'admin';
  if (!isRoleMatch) {
    const error = new Error(`Access forbidden: stage belongs to role '${currentStageObj.role}'`);
    error.statusCode = 403;
    throw error;
  }

  const actionDate = new Date();
  currentStageObj.status = 'REJECTED';
  currentStageObj.actionBy = reviewerUser._id;
  currentStageObj.actionDate = actionDate;
  currentStageObj.remarks = reason.trim();

  application.status = 'REJECTED';
  application.rejectionDetails = {
    rejectedBy: reviewerUser._id,
    role: reviewerUser.role,
    reason: reason.trim(),
    date: actionDate
  };

  // Write AuditLog
  await AuditLog.create({
    applicationId: application._id,
    performedBy: reviewerUser._id,
    role: reviewerUser.role,
    action: 'REJECTED',
    stageNumber: application.currentStage,
    stageName: currentStageObj.stepName,
    remarks: reason.trim()
  });

  // Notify student
  await createNotification({
    recipient: application.student._id,
    title: `Application Rejected: ${application.applicationId}`,
    message: `Rejected by ${reviewerUser.name} (${reviewerUser.role.toUpperCase()}). Reason: ${reason.trim()}`,
    type: 'REJECTED',
    link: `/student`
  });

  await application.save();

  return Application.findById(application._id)
    .populate('rejectionDetails.rejectedBy', 'name role')
    .populate('stages.actionBy', 'name role');
}

/**
 * Request correction from student (Reason is MANDATORY)
 */
async function requestCorrection({ applicationId, reviewerUser, reason }) {
  if (!reason || !reason.trim()) {
    const error = new Error('Correction reason is mandatory');
    error.statusCode = 400;
    throw error;
  }

  const application = await Application.findOne(buildAppLookupQuery(applicationId))
    .populate('student')
    .populate('department')
    .populate('documentType');

  if (!application) {
    const error = new Error('Application not found');
    error.statusCode = 404;
    throw error;
  }

  const currentStageIndex = application.currentStage - 1;
  const currentStageObj = application.stages[currentStageIndex];

  if (!currentStageObj) {
    const error = new Error('Invalid workflow stage');
    error.statusCode = 400;
    throw error;
  }

  const isRoleMatch = reviewerUser.role === currentStageObj.role || reviewerUser.role === 'admin';
  if (!isRoleMatch) {
    const error = new Error(`Access forbidden: stage belongs to role '${currentStageObj.role}'`);
    error.statusCode = 403;
    throw error;
  }

  const actionDate = new Date();
  currentStageObj.status = 'CORRECTION_REQUESTED';
  currentStageObj.actionBy = reviewerUser._id;
  currentStageObj.actionDate = actionDate;
  currentStageObj.remarks = reason.trim();

  application.status = 'CORRECTION_REQUIRED';
  application.correctionDetails = {
    requestedBy: reviewerUser._id,
    role: reviewerUser.role,
    reason: reason.trim(),
    date: actionDate
  };

  // Write AuditLog
  await AuditLog.create({
    applicationId: application._id,
    performedBy: reviewerUser._id,
    role: reviewerUser.role,
    action: 'CORRECTION_REQUIRED',
    stageNumber: application.currentStage,
    stageName: currentStageObj.stepName,
    remarks: reason.trim()
  });

  // Notify Student
  await createNotification({
    recipient: application.student._id,
    title: `Correction Requested: ${application.applicationId}`,
    message: `Reviewer ${reviewerUser.name} requested changes: ${reason.trim()}. Please review and resubmit.`,
    type: 'ACTION_REQUIRED',
    link: `/student`
  });

  await application.save();

  return Application.findById(application._id)
    .populate('correctionDetails.requestedBy', 'name role')
    .populate('stages.actionBy', 'name role');
}

/**
 * Student resubmits corrected application (Returns to the same reviewer)
 */
async function resubmitApplication({ applicationId, studentUser, updatedFormData = {}, newAttachments = [], remarks = '' }) {
  const application = await Application.findOne(buildAppLookupQuery(applicationId, { student: studentUser._id }))
    .populate('student')
    .populate('department')
    .populate('documentType');

  if (!application) {
    const error = new Error('Application not found or unauthorized');
    error.statusCode = 404;
    throw error;
  }

  if (application.status !== 'CORRECTION_REQUIRED') {
    const error = new Error(`Application status is '${application.status}'. Only applications in CORRECTION_REQUIRED can be resubmitted.`);
    error.statusCode = 400;
    throw error;
  }

  // 1. Take snapshot of previous state and add to history
  application.history.push({
    action: 'CORRECTION_RESUBMIT',
    stageNumber: application.currentStage,
    role: 'student',
    performedBy: studentUser._id,
    remarks: remarks || 'Student submitted revised documents/details',
    date: new Date(),
    snapshotFormData: application.formData,
    snapshotAttachments: application.attachments
  });

  // 2. Merge/update formData
  application.formData = {
    ...application.formData,
    ...updatedFormData
  };

  // 3. Update attachments if new ones supplied
  const incomingAttachments = Array.isArray(newAttachments)
    ? newAttachments
    : (newAttachments && typeof newAttachments === 'object'
        ? Object.entries(newAttachments).map(([k, v]) => ({
            key: k,
            attachmentId: typeof v === 'object' ? (v.attachmentId || v.id || v._id) : v
          }))
        : []);

  if (incomingAttachments.length > 0) {
    const attMap = {};
    // Keep existing attachments
    application.attachments.forEach(item => {
      attMap[item.key] = item.attachment;
    });
    // Replace updated attachments
    incomingAttachments.forEach(item => {
      if (item && item.key && item.attachmentId) {
        attMap[item.key] = item.attachmentId;
      }
    });

    application.attachments = Object.entries(attMap).map(([key, attachmentId]) => ({
      key,
      attachment: attachmentId
    }));

    // Associate new attachments
    const newAttIds = incomingAttachments.map(i => i.attachmentId).filter(Boolean);
    if (newAttIds.length > 0) {
      await Attachment.updateMany({ _id: { $in: newAttIds } }, { application: application._id });
    }
  }

  // 4. Return to the SAME reviewer: reset current stage status to PENDING
  const currentStageIndex = application.currentStage - 1;
  const currentStageObj = application.stages[currentStageIndex];
  currentStageObj.status = 'PENDING';
  currentStageObj.remarks = remarks || 'Resubmitted after correction';

  application.status = 'RESUBMITTED';
  const lastRequestedBy = application.correctionDetails?.requestedBy;

  // 5. Write AuditLog
  await AuditLog.create({
    applicationId: application._id,
    performedBy: studentUser._id,
    role: 'student',
    action: 'RESUBMITTED',
    stageNumber: application.currentStage,
    stageName: currentStageObj.stepName,
    remarks: remarks || 'Student resubmitted updated files/details'
  });

  // 6. Notify the reviewer who requested correction (or current stage role)
  if (lastRequestedBy) {
    await createNotification({
      recipient: lastRequestedBy,
      title: `Application Resubmitted: ${application.applicationId}`,
      message: `Student ${studentUser.name} has resubmitted corrections for ${application.documentType.name}.`,
      type: 'ACTION_REQUIRED',
      link: `/${currentStageObj.role}`
    });
  }

  await application.save();

  return Application.findById(application._id)
    .populate('documentType')
    .populate('department')
    .populate('attachments.attachment')
    .populate('stages.actionBy', 'name role');
}

/**
 * Get pending review queue for a reviewer based on role and department scope
 */
async function getReviewerQueue(reviewerUser, queryParams = {}) {
  const query = {};

  if (reviewerUser.role === 'faculty') {
    query.currentRole = 'faculty';
    query.status = { $in: ['SUBMITTED', 'UNDER_REVIEW', 'RESUBMITTED'] };
    // Department matching or assigned mentor
    if (reviewerUser.department) {
      query.$or = [
        { department: reviewerUser.department },
        { assignedMentor: reviewerUser.id }
      ];
    }
  } else if (reviewerUser.role === 'hod') {
    query.currentRole = 'hod';
    query.status = { $in: ['UNDER_REVIEW', 'RESUBMITTED'] };
    if (reviewerUser.department) {
      query.department = reviewerUser.department;
    }
  } else if (reviewerUser.role === 'principal') {
    query.currentRole = 'principal';
    query.status = { $in: ['UNDER_REVIEW', 'RESUBMITTED'] };
  } else if (reviewerUser.role === 'admin') {
    // Admin can inspect all or filter by stage
    if (queryParams.stageRole) {
      query.currentRole = queryParams.stageRole;
    }
  }

  if (queryParams.status) {
    query.status = queryParams.status;
  }
  if (queryParams.departmentId) {
    query.department = queryParams.departmentId;
  }
  if (queryParams.documentTypeCode) {
    const dt = await DocumentType.findOne({ code: queryParams.documentTypeCode.toUpperCase() });
    if (dt) query.documentType = dt._id;
  }

  return Application.find(query)
    .populate('student', 'name email registerNumber year designation')
    .populate('department', 'name code')
    .populate('documentType')
    .populate('assignedMentor', 'name email designation')
    .populate('attachments.attachment')
    .sort({ createdAt: -1 });
}

module.exports = {
  approveApplication,
  rejectApplication,
  requestCorrection,
  resubmitApplication,
  getReviewerQueue
};
