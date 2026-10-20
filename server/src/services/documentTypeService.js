const DocumentType = require('../models/DocumentType');

async function getActiveDocumentTypes() {
  return DocumentType.find({ isActive: true }).sort({ name: 1 });
}

async function getDocumentTypeByCode(code) {
  const docType = await DocumentType.findOne({ code: code.toUpperCase(), isActive: true });
  if (!docType) {
    const error = new Error(`Document type '${code}' not found`);
    error.statusCode = 404;
    throw error;
  }
  return docType;
}

module.exports = {
  getActiveDocumentTypes,
  getDocumentTypeByCode
};
