const adminService = require('../services/adminService');

async function getAnalytics(req, res, next) {
  try {
    const analytics = await adminService.getSystemAnalytics();
    return res.status(200).json({
      success: true,
      analytics
    });
  } catch (err) {
    next(err);
  }
}

async function getDelayed(req, res, next) {
  try {
    const delayed = await adminService.getDelayedApplications(req.query);
    return res.status(200).json({
      success: true,
      count: delayed.length,
      delayed
    });
  } catch (err) {
    next(err);
  }
}

async function searchApps(req, res, next) {
  try {
    const applications = await adminService.searchApplications(req.query);
    return res.status(200).json({
      success: true,
      count: applications.length,
      applications
    });
  } catch (err) {
    next(err);
  }
}

async function getLogs(req, res, next) {
  try {
    const logs = await adminService.getAuditLogs(req.query);
    return res.status(200).json({
      success: true,
      count: logs.length,
      logs
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAnalytics,
  getDelayed,
  searchApps,
  getLogs
};
