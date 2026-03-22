const mongoose = require('mongoose');

const committeeDocumentSchema = new mongoose.Schema({
  committeeId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Committee'
  },
  name: {
    type: String,
    required: true
  },
  size: String,
  url: String,
  uploadedBy: {
    type: String,
    ref: 'User'
  },
  uploadedByName: String,
  uploadedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

committeeDocumentSchema.index({ committeeId: 1 });

module.exports = mongoose.model('CommitteeDocument', committeeDocumentSchema);
