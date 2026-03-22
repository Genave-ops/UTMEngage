const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: String,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: [
      'event_approved',
      'event_rejected',
      'new_event',
      'committee_approved',
      'committee_rejected',
      'join_request_received',
      'join_request_approved',
      'join_request_rejected',
      'new_post',
      'post_liked',
      'post_commented',
      'broadcast',
      'meeting_scheduled',
      'event_checkin',
      'event_registration',
      'committee_invitation'
    ]
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  relatedId: { type: String },
  relatedType: {
    type: String,
    enum: ['event', 'committee', 'post', 'broadcast', 'meeting']
  },
  isRead: { type: Boolean, default: false, index: true }
}, { timestamps: true });

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

module.exports = mongoose.model('Notification', notificationSchema);
