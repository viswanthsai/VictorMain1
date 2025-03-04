const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const chatSchema = new Schema({
  participants: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  taskId: {
    type: Schema.Types.ObjectId,
    ref: 'Task',
    required: true
  },
  offerId: {
    type: Schema.Types.ObjectId,
    ref: 'Offer'
  },
  lastMessage: {
    text: String,
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
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

// Update the updatedAt timestamp on save
chatSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Chat', chatSchema);
