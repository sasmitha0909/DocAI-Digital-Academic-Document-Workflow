const applicationService = require('../services/applicationService');

async function apply(req, res, next) {
  try {
    const { documentTypeCode, formData, attachments, assignedMentorId } = req.body;
    const application = await applicationService.createApplication({
      studentId: req.user.id,
      documentTypeCode,
      formData,
      attachments,
      assignedMentorId
    });

    return res.status(201).json({
      success: true,
      message: `Application ${application.applicationId} submitted successfully`,
      application
    });
  } catch (err) {
    next(err);
  }
}

async function getMyApplications(req, res, next) {
  try {
    const applications = await applicationService.getStudentApplications(req.user.id);
    return res.status(200).json({
      success: true,
      count: applications.length,
      applications
    });
  } catch (err) {
    next(err);
  }
}

async function getMyStats(req, res, next) {
  try {
    const stats = await applicationService.getStudentDashboardStats(req.user.id);
    return res.status(200).json({
      success: true,
      stats
    });
  } catch (err) {
    next(err);
  }
}

async function getApplication(req, res, next) {
  try {
    const result = await applicationService.getApplicationById(req.params.id, req.user);
    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  apply,
  getMyApplications,
  getMyStats,
  getApplication
};
