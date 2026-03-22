const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
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
  userRole: String,
  avatar: String,
  content: {
    type: String,
    required: true
  },
  image: String
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
});

postSchema.index({ committeeId: 1 });
postSchema.index({ userId: 1 });
postSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Post', postSchema);
