const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      default: null,
      index: true
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      required: true,
      enum: ['student', 'faculty', 'hod', 'admin', 'principal', 'system']
    },
    action: {
      type: String,
      required: true,
      enum: [
        'SUBMITTED',
        'UNDER_REVIEW',
        'APPROVED',
        'REJECTED',
        'CORRECTION_REQUIRED',
        'RESUBMITTED',
        'PROCESSING',
        'COMPLETED',
        'REVOKED'
      ]
    },
    stageNumber: {
      type: Number,
      default: 1
    },
    stageName: {
      type: String,
      default: ''
    },
    remarks: {
      type: String,
      default: ''
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('AuditLog', auditLogSchema);
