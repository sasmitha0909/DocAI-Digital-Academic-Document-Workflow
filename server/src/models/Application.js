const mongoose = require('mongoose');

const stageSchema = new mongoose.Schema({
  stageNumber: {
    type: Number,
    required: true
  },
  role: {
    type: String,
    required: true,
    enum: ['faculty', 'hod', 'admin', 'principal']
  },
  stepName: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'CORRECTION_REQUESTED'],
    default: 'PENDING'
  },
  actionBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  actionDate: {
    type: Date,
    default: null
  },
  remarks: {
    type: String,
    default: ''
  },
  durationHours: {
    type: Number,
    default: 0
  }
});

const applicationSchema = new mongoose.Schema(
  {
    applicationId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: true
    },
    documentType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DocumentType',
      required: true
    },
    status: {
      type: String,
      required: true,
      enum: [
        'SUBMITTED',
        'UNDER_REVIEW',
        'CORRECTION_REQUIRED',
        'RESUBMITTED',
        'APPROVED',
        'REJECTED',
        'PROCESSING',
        'COMPLETED',
        'DELAYED'
      ],
      default: 'SUBMITTED'
    },
    currentStage: {
      type: Number,
      default: 1
    },
    currentRole: {
      type: String,
      enum: ['faculty', 'hod', 'admin', 'principal', 'completed'],
      default: 'faculty'
    },
    assignedMentor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    formData: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    attachments: [
      {
        key: { type: String, required: true },
        attachment: { type: mongoose.Schema.Types.ObjectId, ref: 'Attachment', required: true }
      }
    ],
    stages: [stageSchema],
    rejectionDetails: {
      rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      role: { type: String },
      reason: { type: String },
      date: { type: Date }
    },
    correctionDetails: {
      requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      role: { type: String },
      reason: { type: String },
      date: { type: Date }
    },
    history: [
      {
        action: { type: String, required: true },
        stageNumber: { type: Number },
        role: { type: String },
        performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        remarks: { type: String },
        date: { type: Date, default: Date.now },
        snapshotFormData: mongoose.Schema.Types.Mixed,
        snapshotAttachments: [mongoose.Schema.Types.Mixed]
      }
    ]
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Application', applicationSchema);
