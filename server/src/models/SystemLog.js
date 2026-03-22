const mongoose = require('mongoose');

const systemLogSchema = new mongoose.Schema({
  // Action information
  action: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['auth', 'user', 'event', 'committee', 'moderation', 'system', 'security', 'feedback', 'broadcast'],
    default: 'system'
  },
  type: {
    type: String,
    default: 'info',
    enum: ['info', 'success', 'warning', 'error']
  },
  details: String,

  // User who performed the action
  userId: {
    type: String,
    ref: 'User'
  },
  userName: String,
  userEmail: String,
  userRole: String,

  // Target of the action (what was acted upon)
  targetType: {
    type: String,
    enum: ['user', 'event', 'committee', 'post', 'report', 'system', null]
  },
  targetId: String,
  targetName: String,

  // Request information
  ipAddress: String,
  userAgent: String,
  method: String,
  path: String,

  // Additional metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  // Status for tracking
  status: {
    type: String,
    enum: ['success', 'failure', 'pending'],
    default: 'success'
  }
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
});

// Indexes for efficient querying
systemLogSchema.index({ createdAt: -1 });
systemLogSchema.index({ category: 1 });
systemLogSchema.index({ type: 1 });
systemLogSchema.index({ userId: 1 });
systemLogSchema.index({ action: 1 });
systemLogSchema.index({ targetType: 1, targetId: 1 });

module.exports = mongoose.model('SystemLog', systemLogSchema);
