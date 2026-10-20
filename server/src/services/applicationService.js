const Application = require('../models/Application');
const DocumentType = require('../models/DocumentType');
const Attachment = require('../models/Attachment');
const AuditLog = require('../models/AuditLog');
const Counter = require('../models/Counter');
const User = require('../models/User');
const { createNotification } = require('./notificationService');

/**
 * Generate atomic sequential Application ID: APP-YYYY-00001
 */
async function generateApplicationId() {
  const currentYear = new Date().getFullYear();
  const counterName = `app_${currentYear}`;

  const counter = await Counter.findOneAndUpdate(
    { name: counterName },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  const formattedSeq = String(counter.seq).padStart(5, '0');
  return `APP-${currentYear}-${formattedSeq}`;
}

/**
 * Submit a new application
 */
async function createApplication({ studentId, documentTypeCode, formData = {}, attachments = [], assignedMentorId = null }) {
  // 1. Fetch student
  const student = await User.findById(studentId).populate('department');
  if (!student || student.role !== 'student') {
    const error = new Error('Invalid student account');
    error.statusCode = 403;
    throw error;
  }

  if (!student.department) {
    const error = new Error('Student is not assigned to a department');
    error.statusCode = 400;
    throw error;
  }

  // 2. Fetch document type
  const docType = await DocumentType.findOne({ code: documentTypeCode.toUpperCase(), isActive: true });
  if (!docType) {
    const error = new Error(`Document type '${documentTypeCode}' not found`);
    error.statusCode = 404;
    throw error;
  }

  // 3. Validate required fields
  for (const field of docType.requiredFields) {
    if (field.required) {
      const val = formData[field.key];
      if (val === undefined || val === null || String(val).trim() === '') {
        const error = new Error(`Missing required field: '${field.label}'`);
        error.statusCode = 400;
        throw error;
      }
    }
  }

  // 4. Validate required attachments (BLOCK SUBMIT if required file is missing)
  const attachmentMap = {};
  if (Array.isArray(attachments)) {
    for (const item of attachments) {
      if (item && item.key && (item.attachmentId || item.attachment)) {
        attachmentMap[item.key] = item.attachmentId || item.attachment;
      }
    }
  } else if (attachments && typeof attachments === 'object') {
    for (const [key, value] of Object.entries(attachments)) {
      if (value) {
        attachmentMap[key] = typeof value === 'object' ? (value.attachmentId || value._id || value.id) : value;
      }
    }
  }

  for (const reqAtt of docType.requiredAttachments) {
    if (reqAtt.required) {
      const attId = attachmentMap[reqAtt.key];
      if (!attId) {
        const error = new Error(`Missing required attachment: '${reqAtt.label}'. You must upload all required documents.`);
        error.statusCode = 400;
        throw error;
      }

      // Verify that this attachment exists and was uploaded by this student
      const exists = await Attachment.findOne({ _id: attId, uploadedBy: studentId });
      if (!exists) {
        const error = new Error(`Invalid or unverified attachment for '${reqAtt.label}'`);
        error.statusCode = 400;
        throw error;
      }
    }
  }

  // 5. Generate unique sequential ID
  const applicationId = await generateApplicationId();

  // 6. Build workflow stages
  const initialStages = docType.workflowStages.map((st) => ({
    stageNumber: st.stageNumber,
    role: st.role,
    stepName: st.stepName,
    status: 'PENDING',
    actionBy: null,
    actionDate: null,
    remarks: '',
    durationHours: 0
  }));

  // 7. Resolve assigned mentor or default reviewer
  let mentor = null;
  if (assignedMentorId) {
    mentor = await User.findOne({ _id: assignedMentorId, role: { $in: ['faculty', 'hod'] } });
  }
  if (!mentor) {
    // Pick first faculty from student's department as default reviewer
    mentor = await User.findOne({ department: student.department._id, role: 'faculty' });
  }

  const structuredAttachments = Object.entries(attachmentMap).map(([key, attachmentId]) => ({
    key,
    attachment: attachmentId
  }));

  // 8. Create Application record
  const application = await Application.create({
    applicationId,
    student: student._id,
    department: student.department._id,
    documentType: docType._id,
    status: 'SUBMITTED',
    currentStage: 1,
    currentRole: initialStages[0] ? initialStages[0].role : 'faculty',
    assignedMentor: mentor ? mentor._id : null,
    formData,
    attachments: structuredAttachments,
    stages: initialStages,
    history: [
      {
        action: 'SUBMITTED',
        stageNumber: 1,
        role: 'student',
        performedBy: student._id,
        remarks: 'Application submitted by student',
        date: new Date(),
        snapshotFormData: formData,
        snapshotAttachments: structuredAttachments
      }
    ]
  });

  // 9. Associate uploaded attachments with this application
  const attachmentIds = Object.values(attachmentMap);
  if (attachmentIds.length > 0) {
    await Attachment.updateMany(
      { _id: { $in: attachmentIds } },
      { application: application._id }
    );
  }

  // 10. Write AuditLog
  await AuditLog.create({
    applicationId: application._id,
    performedBy: student._id,
    role: 'student',
    action: 'SUBMITTED',
    stageNumber: 1,
    stageName: initialStages[0]?.stepName || 'Submission',
    remarks: 'Application created and submitted for verification'
  });

  // 11. Notify first reviewer
  if (mentor) {
    await createNotification({
      recipient: mentor._id,
      title: `New Application: ${applicationId}`,
      message: `${student.name} (${student.registerNumber || student.email}) submitted an application for ${docType.name}.`,
      type: 'ACTION_REQUIRED',
      link: `/faculty`
    });
  }

  return Application.findById(application._id)
    .populate('documentType')
    .populate('department')
    .populate('assignedMentor', 'name email designation')
    .populate('attachments.attachment');
}

/**
 * Get applications submitted by a specific student
 */
async function getStudentApplications(studentId) {
  return Application.find({ student: studentId })
    .populate('documentType')
    .populate('department', 'name code')
    .populate('assignedMentor', 'name email designation')
    .populate('attachments.attachment')
    .populate('stages.actionBy', 'name role designation')
    .sort({ createdAt: -1 });
}

/**
 * Get aggregated application counters for student dashboard
 */
async function getStudentDashboardStats(studentId) {
  const [total, underReview, correctionRequired, approved, rejected] = await Promise.all([
    Application.countDocuments({ student: studentId }),
    Application.countDocuments({
      student: studentId,
      status: { $in: ['SUBMITTED', 'UNDER_REVIEW', 'RESUBMITTED', 'PROCESSING'] }
    }),
    Application.countDocuments({
      student: studentId,
      status: 'CORRECTION_REQUIRED'
    }),
    Application.countDocuments({
      student: studentId,
      status: { $in: ['APPROVED', 'COMPLETED'] }
    }),
    Application.countDocuments({
      student: studentId,
      status: 'REJECTED'
    })
  ]);

  return {
    total,
    underReview,
    correctionRequired,
    approved,
    rejected
  };
}

/**
 * Retrieve single application with authorization check
 */
async function getApplicationById(idOrAppId, user) {
  const query = idOrAppId.startsWith('APP-')
    ? { applicationId: idOrAppId.toUpperCase() }
    : { _id: idOrAppId };

  const application = await Application.findOne(query)
    .populate('student', 'name email registerNumber year designation department')
    .populate('department', 'name code')
    .populate('documentType')
    .populate('assignedMentor', 'name email designation')
    .populate('attachments.attachment')
    .populate('stages.actionBy', 'name role designation')
    .populate('rejectionDetails.rejectedBy', 'name role')
    .populate('correctionDetails.requestedBy', 'name role');

  if (!application) {
    const error = new Error('Application not found');
    error.statusCode = 404;
    throw error;
  }

  // Authorization check
  if (user.role === 'student' && application.student._id.toString() !== user.id.toString()) {
    const error = new Error('Access forbidden: you cannot view another student\'s application');
    error.statusCode = 403;
    throw error;
  }

  if (user.role === 'faculty' || user.role === 'hod') {
    const sameDept = user.department && application.department && user.department.toString() === application.department._id.toString();
    const isMentor = application.assignedMentor && application.assignedMentor._id.toString() === user.id.toString();
    if (!sameDept && !isMentor) {
      const error = new Error('Access forbidden: application belongs to another department');
      error.statusCode = 403;
      throw error;
    }
  }

  const auditLogs = await AuditLog.find({ applicationId: application._id })
    .populate('performedBy', 'name role designation')
    .sort({ createdAt: 1 });

  return {
    application,
    auditLogs
  };
}

module.exports = {
  createApplication,
  getStudentApplications,
  getStudentDashboardStats,
  getApplicationById
};
