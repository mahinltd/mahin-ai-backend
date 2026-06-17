const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    role: {
        type: String,
        enum: ['user', 'assistant'],
        required: true
    },
    content: {
        type: String,
        required: true,
        trim: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
}, { _id: false });

const conversationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    title: {
        type: String,
        default: 'New conversation',
        trim: true
    },
    messages: {
        type: [messageSchema],
        default: []
    }
}, {
    timestamps: true
});

conversationSchema.index({ userId: 1, updatedAt: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);