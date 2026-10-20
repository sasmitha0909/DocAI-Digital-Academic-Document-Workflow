const documentTypeService = require('../services/documentTypeService');

async function getDocumentTypes(req, res, next) {
  try {
    const documentTypes = await documentTypeService.getActiveDocumentTypes();
    return res.status(200).json({
      success: true,
      documentTypes
    });
  } catch (err) {
    next(err);
  }
}

async function getDocumentTypeByCode(req, res, next) {
  try {
    const documentType = await documentTypeService.getDocumentTypeByCode(req.params.code);
    return res.status(200).json({
      success: true,
      documentType
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDocumentTypes,
  getDocumentTypeByCode
};
