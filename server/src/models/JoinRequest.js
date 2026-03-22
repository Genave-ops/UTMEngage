const mongoose = require('mongoose');

const joinRequestSchema = new mongoose.Schema({
  committeeId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Committee'
  },
  userId: {
    type: String,
    required: true,
    ref: 'User'
  },
  userName: {
    type: String,
    required: true
  },
  userRole: String,
  status: {
    type: String,
    default: 'pending',
    enum: ['pending', 'approved', 'rejected']
  },
  requestedAt: {
    type: Date,
    default: Date.now
  },
  reviewedAt: Date,
  reviewedBy: {
    type: String,
    ref: 'User'
  }
}, {
  timestamps: true
});

joinRequestSchema.index({ committeeId: 1 });
joinRequestSchema.index({ userId: 1 });
joinRequestSchema.index({ status: 1 });

module.exports = mongoose.model('JoinRequest', joinRequestSchema);
