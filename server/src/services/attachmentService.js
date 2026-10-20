const path = require('path');
const fs = require('fs');
const Attachment = require('../models/Attachment');
const Application = require('../models/Application');
const { UPLOAD_DIR } = require('../middleware/upload');

/**
 * Create attachment record after multer upload
 */
async function saveUploadedFile({ file, fieldName, userId, applicationId = null }) {
  if (!file) {
    const error = new Error('No file was provided');
    error.statusCode = 400;
    throw error;
  }

  const attachment = await Attachment.create({
    application: applicationId,
    uploadedBy: userId,
    fieldName,
    originalName: file.originalname,
    filename: file.filename,
    mimeType: file.mimetype,
    size: file.size,
    filePath: file.path
  });

  return attachment;
}

/**
 * Verify if a user is authorized to view/download an attachment
 */
async function verifyAttachmentAccess(attachmentId, user) {
  const attachment = await Attachment.findById(attachmentId).populate('application');
  if (!attachment) {
    const error = new Error('Attachment not found');
    error.statusCode = 404;
    throw error;
  }

  // Admins and Principals have global read access
  if (user.role === 'admin' || user.role === 'principal') {
    return attachment;
  }

  // Owner (the student who uploaded) has access
  if (attachment.uploadedBy.toString() === user.id.toString()) {
    return attachment;
  }

  // If attached to an application, check departmental reviewer access
  if (attachment.application) {
    const app = await Application.findById(attachment.application._id);
    if (app) {
      // Check if user is HOD or Faculty of the same department
      if (
        (user.role === 'hod' || user.role === 'faculty') &&
        user.department &&
        app.department &&
        user.department.toString() === app.department.toString()
      ) {
        return attachment;
      }
      // Check if user is the assigned mentor
      if (app.assignedMentor && app.assignedMentor.toString() === user.id.toString()) {
        return attachment;
      }
    }
  }

  const error = new Error('Access forbidden: you do not have permission to view or download this document');
  error.statusCode = 403;
  throw error;
}

module.exports = {
  saveUploadedFile,
  verifyAttachmentAccess
};
