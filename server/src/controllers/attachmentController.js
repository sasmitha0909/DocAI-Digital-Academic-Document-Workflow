const fs = require('fs');
const attachmentService = require('../services/attachmentService');

async function uploadFile(req, res, next) {
  try {
    const file = req.file;
    const fieldName = req.body.fieldName || 'document';
    const attachment = await attachmentService.saveUploadedFile({
      file,
      fieldName,
      userId: req.user.id
    });

    return res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      attachment: {
        id: attachment._id,
        fieldName: attachment.fieldName,
        originalName: attachment.originalName,
        mimeType: attachment.mimeType,
        size: attachment.size
      }
    });
  } catch (err) {
    next(err);
  }
}

async function previewAttachment(req, res, next) {
  try {
    const attachment = await attachmentService.verifyAttachmentAccess(req.params.id, req.user);
    if (!fs.existsSync(attachment.filePath)) {
      return res.status(404).json({ success: false, message: 'File not found on disk' });
    }

    res.setHeader('Content-Type', attachment.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(attachment.originalName)}"`);
    const stream = fs.createReadStream(attachment.filePath);
    return stream.pipe(res);
  } catch (err) {
    next(err);
  }
}

async function downloadAttachment(req, res, next) {
  try {
    const attachment = await attachmentService.verifyAttachmentAccess(req.params.id, req.user);
    if (!fs.existsSync(attachment.filePath)) {
      return res.status(404).json({ success: false, message: 'File not found on disk' });
    }

    return res.download(attachment.filePath, attachment.originalName);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  uploadFile,
  previewAttachment,
  downloadAttachment
};
