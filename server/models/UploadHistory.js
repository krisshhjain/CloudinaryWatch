const mongoose = require('mongoose');

const uploadHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    publicId: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    secureUrl: {
      type: String,
    },
    folder: {
      type: String,
      default: '',
    },
    format: {
      type: String,
    },
    bytes: {
      type: Number,
    },
    width: {
      type: Number,
    },
    height: {
      type: Number,
    },
    resourceType: {
      type: String,
      default: 'image',
    },
    status: {
      type: String,
      enum: ['success', 'failed'],
      default: 'success',
    },
  },
  { timestamps: true }
);

// Indexes for fast queries
uploadHistorySchema.index({ userId: 1, createdAt: -1 });
uploadHistorySchema.index({ createdAt: -1 });

module.exports = mongoose.model('UploadHistory', uploadHistorySchema);
