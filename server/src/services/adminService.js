const Application = require('../models/Application');
const Certificate = require('../models/Certificate');
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const Department = require('../models/Department');
const DocumentType = require('../models/DocumentType');

/**
 * Get delayed applications where elapsed time exceeds expected SLA hours
 */
async function getDelayedApplications(filters = {}) {
  const query = {
    status: { $in: ['SUBMITTED', 'UNDER_REVIEW', 'RESUBMITTED', 'PROCESSING'] }
  };

  if (filters.departmentId) {
    query.department = filters.departmentId;
  }

  const applications = await Application.find(query)
    .populate('student', 'name email registerNumber year')
    .populate('department', 'name code')
    .populate('documentType')
    .populate('assignedMentor', 'name email')
    .sort({ createdAt: 1 });

  const now = Date.now();
  const delayed = [];

  for (const app of applications) {
    const elapsedHours = (now - new Date(app.createdAt).getTime()) / (1000 * 60 * 60);
    const expectedHours = app.documentType?.expectedHours || 48;

    if (elapsedHours > expectedHours || filters.includeAll) {
      delayed.push({
        ...app.toObject(),
        elapsedHours: Math.round(elapsedHours * 10) / 10,
        expectedHours,
        delayHours: Math.max(0, Math.round((elapsedHours - expectedHours) * 10) / 10),
        isDelayed: elapsedHours > expectedHours
      });
    }
  }

  return delayed;
}

/**
 * Search and multi-filter applications via MongoDB queries
 */
async function searchApplications(filters = {}) {
  const query = {};

  // Search by text query (name, register no, application ID, document ID)
  if (filters.search && filters.search.trim()) {
    const searchRegex = new RegExp(filters.search.trim(), 'i');

    // Find student IDs matching search regex
    const matchingStudents = await User.find({
      $or: [
        { name: searchRegex },
        { registerNumber: searchRegex },
        { email: searchRegex }
      ]
    }).select('_id');

    const studentIds = matchingStudents.map(s => s._id);

    query.$or = [
      { applicationId: searchRegex },
      { student: { $in: studentIds } }
    ];
  }

  if (filters.departmentId) {
    query.department = filters.departmentId;
  }

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.documentTypeCode) {
    const dt = await DocumentType.findOne({ code: filters.documentTypeCode.toUpperCase() });
    if (dt) query.documentType = dt._id;
  }

  if (filters.stage) {
    query.currentStage = Number(filters.stage);
  }

  if (filters.startDate || filters.endDate) {
    query.createdAt = {};
    if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      query.createdAt.$lte = end;
    }
  }

  const applications = await Application.find(query)
    .populate('student', 'name email registerNumber year')
    .populate('department', 'name code')
    .populate('documentType')
    .populate('assignedMentor', 'name email designation')
    .sort({ createdAt: -1 });

  return applications;
}

/**
 * Get comprehensive analytics for Admin and Principal dashboards
 */
async function getSystemAnalytics() {
  const [
    totalApps,
    totalUsers,
    totalCerts,
    statusCounts,
    deptCounts,
    typeCounts,
    delayedList
  ] = await Promise.all([
    Application.countDocuments(),
    User.countDocuments(),
    Certificate.countDocuments({ status: 'Valid' }),
    Application.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]),
    Application.aggregate([
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $lookup: { from: 'departments', localField: '_id', foreignField: '_id', as: 'dept' } },
      { $unwind: '$dept' },
      { $project: { name: '$dept.name', code: '$dept.code', count: 1 } }
    ]),
    Application.aggregate([
      { $group: { _id: '$documentType', count: { $sum: 1 } } },
      { $lookup: { from: 'documenttypes', localField: '_id', foreignField: '_id', as: 'docType' } },
      { $unwind: '$docType' },
      { $project: { name: '$docType.name', code: '$docType.code', count: 1 } }
    ]),
    getDelayedApplications()
  ]);

  const statusMap = {};
  statusCounts.forEach(s => {
    statusMap[s._id] = s.count;
  });

  const delayedCount = delayedList.filter(d => d.isDelayed).length;
  const slaComplianceRate = totalApps > 0 ? Math.round(((totalApps - delayedCount) / totalApps) * 100) : 100;

  return {
    totalApplications: totalApps,
    totalUsers,
    totalCertificates: totalCerts,
    delayedApplicationsCount: delayedCount,
    slaComplianceRate,
    byStatus: statusMap,
    byDepartment: deptCounts,
    byDocumentType: typeCounts
  };
}

/**
 * Get system-wide audit logs with filters
 */
async function getAuditLogs(filters = {}) {
  const query = {};
  if (filters.action) query.action = filters.action;
  if (filters.role) query.role = filters.role;

  return AuditLog.find(query)
    .populate('performedBy', 'name email role designation')
    .populate('applicationId', 'applicationId')
    .sort({ createdAt: -1 })
    .limit(100);
}

module.exports = {
  getDelayedApplications,
  searchApplications,
  getSystemAnalytics,
  getAuditLogs
};
