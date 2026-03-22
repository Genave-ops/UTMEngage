const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  time: {
    type: String,
    required: true
  },
  status: {
    type: String,
    default: 'pending',
    enum: ['pending', 'approved', 'rejected']
  },
  type: String,
  category: String,
  proposer: {
    type: String,
    required: true
  },
  proposerId: {
    type: String,
    required: true,
    ref: 'User'
  },
  proposerRole: String,
  location: String,
  capacity: {
    type: Number,
    default: 100
  },
  image: String,
  description: String,
  tags: {
    type: [String],
    default: []
  }
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
});

eventSchema.index({ status: 1 });
eventSchema.index({ proposerId: 1 });
eventSchema.index({ date: 1 });
eventSchema.index({ category: 1 });

module.exports = mongoose.model('Event', eventSchema);
