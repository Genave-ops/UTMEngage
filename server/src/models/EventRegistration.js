const mongoose = require('mongoose');

const eventRegistrationSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Event'
  },
  userId: {
    type: String,
    required: true,
    ref: 'User'
  },
  registeredAt: {
    type: Date,
    default: Date.now
  },
  checkInCode: {
    type: String,
    default: null
  },
  checkedIn: {
    type: Boolean,
    default: false
  },
  checkedInAt: {
    type: Date,
    default: null
  },
  checkedInBy: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

eventRegistrationSchema.index({ eventId: 1 });
eventRegistrationSchema.index({ userId: 1 });
eventRegistrationSchema.index({ eventId: 1, userId: 1 }, { unique: true });
eventRegistrationSchema.index({ checkInCode: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('EventRegistration', eventRegistrationSchema);
