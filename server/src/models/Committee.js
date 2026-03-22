const mongoose = require('mongoose');

const committeeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: String,
  category: String,
  banner: {
    type: String,
    default: 'bg-blue-600'
  },
  status: {
    type: String,
    default: 'pending',
    enum: ['pending', 'active', 'rejected']
  },
  creatorId: {
    type: String,
    required: true,
    ref: 'User'
  },
  creatorRole: String,
  leader: String,
  nextMeeting: Date
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
});

committeeSchema.index({ status: 1 });
committeeSchema.index({ creatorId: 1 });
committeeSchema.index({ category: 1 });

module.exports = mongoose.model('Committee', committeeSchema);
