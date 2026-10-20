const fs = require('fs');
const path = require('path');
const certificateService = require('../services/certificateService');
const pdfService = require('../services/pdfService');

async function getMyCertificates(req, res, next) {
  try {
    const certificates = await certificateService.getStudentCertificates(req.user.id);
    return res.status(200).json({
      success: true,
      count: certificates.length,
      certificates
    });
  } catch (err) {
    next(err);
  }
}

async function getAllCertificates(req, res, next) {
  try {
    const certificates = await certificateService.getAllCertificates(req.query);
    return res.status(200).json({
      success: true,
      count: certificates.length,
      certificates
    });
  } catch (err) {
    next(err);
  }
}

async function downloadCertificate(req, res, next) {
  try {
    const identifier = req.params.id || req.params.documentId;
    const cert = await certificateService.verifyCertificateAccess(identifier, req.user);

    let targetPath = cert.filePath;
    if (!targetPath || !fs.existsSync(targetPath)) {
      // Check legacy directory
      const legacyPath = path.join(pdfService.LEGACY_CERTIFICATE_DIR, `${cert.documentId}.pdf`);
      if (fs.existsSync(legacyPath)) {
        targetPath = legacyPath;
      } else {
        // Automatically regenerate on download if physical file was lost
        console.log(`[Document Download] File not found on disk for ${cert.documentId}. Regenerating PDF...`);
        targetPath = await pdfService.regeneratePDFForCertificate(cert);
      }
    }

    cert.downloadCount = (cert.downloadCount || 0) + 1;
    await cert.save();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${cert.documentId}.pdf"`);

    const stream = fs.createReadStream(targetPath);
    stream.on('error', (streamErr) => next(streamErr));
    return stream.pipe(res);
  } catch (err) {
    next(err);
  }
}

async function previewCertificate(req, res, next) {
  try {
    const identifier = req.params.id || req.params.documentId;
    const cert = await certificateService.verifyCertificateAccess(identifier, req.user);

    let targetPath = cert.filePath;
    if (!targetPath || !fs.existsSync(targetPath)) {
      const legacyPath = path.join(pdfService.LEGACY_CERTIFICATE_DIR, `${cert.documentId}.pdf`);
      if (fs.existsSync(legacyPath)) {
        targetPath = legacyPath;
      } else {
        targetPath = await pdfService.regeneratePDFForCertificate(cert);
      }
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${cert.documentId}.pdf"`);
    const stream = fs.createReadStream(targetPath);
    stream.on('error', (streamErr) => next(streamErr));
    return stream.pipe(res);
  } catch (err) {
    next(err);
  }
}

async function revoke(req, res, next) {
  try {
    const { reason } = req.body;
    const identifier = req.params.id || req.params.documentId;
    const cert = await certificateService.revokeCertificate({
      documentId: identifier,
      adminUser: req.user,
      reason
    });

    return res.status(200).json({
      success: true,
      message: `Document ${cert.documentId} revoked successfully`,
      certificate: cert
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getMyCertificates,
  getAllCertificates,
  downloadCertificate,
  previewCertificate,
  revoke
};
