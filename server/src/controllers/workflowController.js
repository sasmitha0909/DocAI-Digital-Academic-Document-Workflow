const workflowService = require('../services/workflowService');

async function approve(req, res, next) {
  try {
    const { remarks } = req.body;
    const result = await workflowService.approveApplication({
      applicationId: req.params.id,
      reviewerUser: req.user,
      remarks
    });

    return res.status(200).json({
      success: true,
      message: result.completed ? 'Application approved and certificate issued' : 'Application approved and moved to next stage',
      ...result
    });
  } catch (err) {
    next(err);
  }
}

async function reject(req, res, next) {
  try {
    const { reason } = req.body;
    const application = await workflowService.rejectApplication({
      applicationId: req.params.id,
      reviewerUser: req.user,
      reason
    });

    return res.status(200).json({
      success: true,
      message: 'Application rejected',
      application
    });
  } catch (err) {
    next(err);
  }
}

async function requestCorrection(req, res, next) {
  try {
    const { reason } = req.body;
    const application = await workflowService.requestCorrection({
      applicationId: req.params.id,
      reviewerUser: req.user,
      reason
    });

    return res.status(200).json({
      success: true,
      message: 'Correction requested from student',
      application
    });
  } catch (err) {
    next(err);
  }
}

async function resubmit(req, res, next) {
  try {
    const { formData, remarks } = req.body;
    const attachments = req.body.attachments || req.body.replacementAttachments || [];
    const application = await workflowService.resubmitApplication({
      applicationId: req.params.id,
      studentUser: req.user,
      updatedFormData: formData,
      newAttachments: attachments,
      remarks
    });

    return res.status(200).json({
      success: true,
      message: 'Application resubmitted successfully',
      application
    });
  } catch (err) {
    next(err);
  }
}

async function getQueue(req, res, next) {
  try {
    const applications = await workflowService.getReviewerQueue(req.user, req.query);
    return res.status(200).json({
      success: true,
      count: applications.length,
      applications
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  approve,
  reject,
  requestCorrection,
  resubmit,
  getQueue
};
