const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    default: 'Other'
  },
  location: {
    type: String,
    default: 'Remote'
  },
  budget: {
    type: Number,
    default: null
  },
  deadline: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['Open', 'In Progress', 'Completed'],
    default: 'Open'
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
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  acceptedById: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  acceptedAt: Date,
  completedAt: Date
});

module.exports = mongoose.model('Task', taskSchema);