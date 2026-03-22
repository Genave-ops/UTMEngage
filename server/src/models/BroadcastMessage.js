const mongoose = require('mongoose');

const broadcastMessageSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true
  },
  senderId: {
    type: String,
    required: true
  },
  senderName: {
    type: String,
    required: true
  },
  senderRole: {
    type: String,
    required: true
  },
  targetType: {
    type: String,
    enum: ['all', 'category', 'specific', 'leaders'],
    default: 'all'
  },
  targetCategory: {
    type: String,
    default: null
  },
  targetCommittees: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Committee'
  }],
  priority: {
    type: String,
    enum: ['normal', 'important', 'urgent'],
    default: 'normal'
  },
  status: {
    type: String,
    enum: ['sent', 'scheduled', 'draft'],
    default: 'sent'
  },
  scheduledFor: {
    type: Date,
    default: null
  },
  readBy: [{
    type: String
  }],
  recipientCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
broadcastMessageSchema.index({ createdAt: -1 });
broadcastMessageSchema.index({ senderId: 1 });
broadcastMessageSchema.index({ targetType: 1 });
broadcastMessageSchema.index({ status: 1 });
broadcastMessageSchema.index({ priority: 1 });

module.exports = mongoose.model('BroadcastMessage', broadcastMessageSchema);
