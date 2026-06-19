const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    gateway: {
        type: String,
        enum: ['bkash', 'nagad', 'rocket', 'paypal'],
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        enum: ['BDT', 'USD'],
        required: true
    },
    transactionId: {
        type: String,
        required: true,
        unique: true, // একই TrxID দিয়ে যেন ২ বার রিকোয়েস্ট করা না যায় (Security Lock)
        trim: true
    },
    paypalOrderId: {
        type: String,
        default: '',
        trim: true
    },
    senderNumber: {
        type: String, // বিকাশ/নগদ ম্যানুয়াল পেমেন্টের ক্ষেত্রে প্রযোজ্য
        default: ''
    },
    plan: {
        type: String,
        enum: ['pro', 'max'],
        default: 'pro'
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Payment', paymentSchema);