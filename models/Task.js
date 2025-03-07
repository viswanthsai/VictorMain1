const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    default: 'Other'
  },
  location: {
    type: String,
    default: 'Remote'
  },
  specificLocation: {
    type: String,
    default: null
  },
  contactDetails: {
    phone: {
      type: String,
      default: null
    },
    email: {
      type: String,
      default: null
    },
    preferredMethod: {
      type: String,
      default: 'platform',
      enum: ['phone', 'email', 'platform']
    }
  },
  status: {
    type: String,
    enum: ['Open', 'In Progress', 'Completed', 'Cancelled'],
    default: 'Open'
  },
  budget: {
    type: Number,
    default: null
  },
  deadline: {
    type: Date,
    default: null
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdBy: {
    type: String,
    required: true
  },
  acceptedById: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  acceptedBy: {
    type: String,
    default: null
  },
  acceptedAt: {
    type: Date,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  },
  urgent: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const Task = mongoose.model('Task', taskSchema);

module.exports = Task;
