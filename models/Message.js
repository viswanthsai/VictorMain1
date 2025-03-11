const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  chatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  senderName: {
    type: String,
    required: false
  },
  content: {
    type: String,
    required: true
  },
  read: {
    type: Boolean,
    default: false
  },
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  },
  taskTitle: String,
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  recipientName: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Add index for faster querying
messageSchema.index({ chatId: 1, createdAt: 1 });
messageSchema.index({ senderId: 1 });
messageSchema.index({ recipientId: 1, read: 1 });

module.exports = mongoose.model('Message', messageSchema);
