const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const messageSchema = new Schema({
  chatId: {
    type: Schema.Types.ObjectId,
    ref: 'Chat',
    required: true
  },
  senderId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  senderName: {
    type: String
  },
  content: {
    type: String,
    required: true
  },
  recipientId: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  recipientName: {
    type: String
  },
  taskId: {
    type: Schema.Types.ObjectId,
    ref: 'Task'
  },
  taskTitle: {
    type: String
  },
  read: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Message', messageSchema);
