const mongoose = require('mongoose');

const committeeMemberSchema = new mongoose.Schema({
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
  userRole: {
    type: String,
    required: true
  },
  isLeader: {
    type: Boolean,
    default: false
  },
  joinedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

committeeMemberSchema.index({ committeeId: 1 });
committeeMemberSchema.index({ userId: 1 });
committeeMemberSchema.index({ committeeId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('CommitteeMember', committeeMemberSchema);
