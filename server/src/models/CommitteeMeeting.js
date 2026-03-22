const mongoose = require('mongoose');

const committeeMeetingSchema = new mongoose.Schema({
  committeeId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Committee'
  },
  title: {
    type: String,
    required: true
  },
  description: String,
  date: {
    type: Date,
    required: true
  },
  time: String,
  endTime: String,
  location: String,
  meetingType: {
    type: String,
    enum: ['in-person', 'online', 'hybrid'],
    default: 'in-person'
  },
  meetingLink: String,
  googleEventId: String,
  createdBy: {
    type: String,
    ref: 'User'
  }
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
});

committeeMeetingSchema.index({ committeeId: 1 });
committeeMeetingSchema.index({ date: 1 });

module.exports = mongoose.model('CommitteeMeeting', committeeMeetingSchema);
