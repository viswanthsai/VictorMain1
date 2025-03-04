const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const notificationSchema = new Schema({
  recipientId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  senderId: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  type: {
    type: String,
    required: true,
    enum: ['message', 'offer_accepted', 'offer_received', 'task_completed', 'task_reminder', 'system']
  },
  message: {
    type: String,
    required: true
  },
  taskId: {
    type: Schema.Types.ObjectId,
    ref: 'Task'
  },
  offerId: {
    type: Schema.Types.ObjectId,
    ref: 'Offer'
  },
  chatId: {
    type: Schema.Types.ObjectId,
    ref: 'Chat'
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

// Index for faster queries
notificationSchema.index({ recipientId: 1, read: 1 });
notificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
