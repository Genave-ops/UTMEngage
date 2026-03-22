const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    ref: 'User'
  },
  userName: {
    type: String,
    required: true
  },
  userEmail: {
    type: String
  },
  userRole: {
    type: String
  },
  type: {
    type: String,
    enum: ['bug', 'feature', 'improvement', 'general'],
    default: 'general'
  },
  subject: {
    type: String
  },
  message: {
    type: String,
    required: true
  },
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  status: {
    type: String,
    enum: ['new', 'reviewed', 'archived'],
    default: 'new'
  },
  adminNotes: {
    type: String
  },
  reviewedBy: {
    type: String,
    ref: 'User'
  },
  reviewedByName: {
    type: String
  },
  reviewedAt: {
    type: Date
  }
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
});

feedbackSchema.index({ status: 1 });
feedbackSchema.index({ type: 1 });
feedbackSchema.index({ userId: 1 });
feedbackSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Feedback', feedbackSchema);
