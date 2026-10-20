const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema(
  {
    documentId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true
    },
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      required: true,
      unique: true,
      index: true
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    documentType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DocumentType',
      required: true
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: true
    },
    filePath: {
      type: String,
      required: true
    },
    issueDate: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['Generated', 'Valid', 'Revoked'],
      default: 'Valid'
    },
    revocationDetails: {
      revokedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      reason: { type: String, default: '' },
      date: { type: Date }
    },
    downloadCount: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Certificate', certificateSchema);
