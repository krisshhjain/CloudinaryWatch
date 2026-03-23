const mongoose = require('mongoose');

const loginHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    ip: {
      type: String,
      required: true,
    },
    userAgent: {
      type: String,
      default: '',
    },
    method: {
      type: String,
      enum: ['email', 'google'],
      default: 'email',
    },
    loginAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Indexes for fast queries
loginHistorySchema.index({ userId: 1, loginAt: -1 });
loginHistorySchema.index({ loginAt: -1 });

module.exports = mongoose.model('LoginHistory', loginHistorySchema);
