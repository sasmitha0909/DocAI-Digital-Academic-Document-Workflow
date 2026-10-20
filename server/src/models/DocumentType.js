const mongoose = require('mongoose');

const workflowStageSchema = new mongoose.Schema({
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
  isFinal: {
    type: Boolean,
    default: false
  }
});

const requiredFieldSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true
  },
  label: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['text', 'textarea', 'number', 'select', 'date']
  },
  required: {
    type: Boolean,
    default: true
  },
  options: [{
    type: String
  }],
  placeholder: {
    type: String,
    default: ''
  }
});

const requiredAttachmentSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true
  },
  label: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  required: {
    type: Boolean,
    default: true
  },
  allowedTypes: [{
    type: String,
    default: ['application/pdf', 'image/jpeg', 'image/png']
  }]
});

const documentTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },
    description: {
      type: String,
      default: ''
    },
    expectedHours: {
      type: Number,
      default: 48
    },
    workflowStages: [workflowStageSchema],
    requiredFields: [requiredFieldSchema],
    requiredAttachments: [requiredAttachmentSchema],
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('DocumentType', documentTypeSchema);
