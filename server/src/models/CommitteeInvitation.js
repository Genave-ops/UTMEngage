const mongoose = require('mongoose');

const committeeInvitationSchema = new mongoose.Schema({
  committeeId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Committee' },
  committeeName: { type: String, required: true },
  email: { type: String, required: true, lowercase: true },
  invitedBy: { type: String, required: true, ref: 'User' },
  invitedByName: { type: String, required: true },
  token: { type: String, required: true, unique: true },
  status: { type: String, default: 'pending', enum: ['pending', 'accepted', 'declined', 'expired'] },
  expiresAt: { type: Date, required: true }
}, { timestamps: true });

committeeInvitationSchema.index({ token: 1 });
committeeInvitationSchema.index({ committeeId: 1, email: 1 });
committeeInvitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('CommitteeInvitation', committeeInvitationSchema);
