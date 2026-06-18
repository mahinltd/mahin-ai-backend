const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a name'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Please add an email'],
        unique: true,
        match: [
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
            'Please add a valid email'
        ]
    },
    authProvider: {
        type: String,
        enum: ['google', 'local'],
        default: 'local'
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    passwordHash: {
        type: String,
        required: function() {
            // ইউজার গুগল দিয়ে লগইন করলে পাসওয়ার্ডের প্রয়োজন নেই, লোকাল হলে রিকোয়ার্ড
            return this.authProvider === 'local';
        }
    },
    passwordResetTokenHash: {
        type: String,
        default: ''
    },
    passwordResetTokenExpires: {
        type: Date,
        default: null
    },
    currentPlan: {
        type: String,
        enum: ['free', 'pro', 'max'],
        default: 'free'
    },
    accountStatus: {
        type: String,
        enum: ['active', 'banned'],
        default: 'active'
    },
    avatar: {
        type: String,
        default: ''
    },
    preferences: {
        theme: { type: String, default: 'system' },
        language: { type: String, default: 'en' },
        notifications: { type: Boolean, default: true }
    },
    // ১০x ডিভাইস ও লোকেশন ট্র্যাকিং ডেটা
    tracking: {
        lastIp: { type: String, default: '' },
        device: { type: String, default: '' },
        browser: { type: String, default: '' },
        location: { type: String, default: 'Unknown' }
    }
}, {
    timestamps: true // এটি স্বয়ংক্রিয়ভাবে createdAt এবং updatedAt ট্র্যাক করবে
});

module.exports = mongoose.model('User', userSchema);