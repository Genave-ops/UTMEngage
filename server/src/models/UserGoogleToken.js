const mongoose = require('mongoose');

const userGoogleTokenSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    ref: 'User'
  },
  accessToken: {
    type: String,
    required: true
  },
  refreshToken: {
    type: String,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  scope: {
    type: String
  },
  tokenType: {
    type: String,
    default: 'Bearer'
  }
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
});

userGoogleTokenSchema.index({ userId: 1 });
userGoogleTokenSchema.index({ expiresAt: 1 });

module.exports = mongoose.model('UserGoogleToken', userGoogleTokenSchema);
