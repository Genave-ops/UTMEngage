const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  // Reporter information
  reporterId: {
    type: String,
    required: true,
    ref: 'User'
  },
  reporterName: String,
  reporterEmail: String,

  // Content being reported
  contentType: {
    type: String,
    required: true,
    enum: ['post', 'comment', 'event', 'committee', 'user']
  },
  contentId: {
    type: String,
    required: true
  },
  contentPreview: String,

  // Content author information
  contentAuthorId: String,
  contentAuthorName: String,

  // Report details
  reason: {
    type: String,
    required: true,
    enum: ['spam', 'harassment', 'hate_speech', 'misinformation', 'inappropriate', 'other']
  },
  description: String,

  // Status and resolution
  status: {
    type: String,
    default: 'pending',
    enum: ['pending', 'reviewing', 'resolved', 'dismissed']
  },

  // Resolution details
  resolvedBy: String,
  resolvedByName: String,
  resolvedAt: Date,
  resolution: {
    type: String,
    enum: ['content_removed', 'user_warned', 'user_banned', 'no_action', null]
  },
  resolutionNotes: String,

  // Priority based on reason
  priority: {
    type: String,
    default: 'medium',
    enum: ['low', 'medium', 'high', 'critical']
  }
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
});

reportSchema.index({ status: 1 });
reportSchema.index({ reporterId: 1 });
reportSchema.index({ contentType: 1 });
reportSchema.index({ priority: 1 });
reportSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Report', reportSchema);
