const mongoose = require('mongoose');

const configSchema = new mongoose.Schema({
    // মডেলগুলোর কাস্টম নাম (যেমন: MahinAi-Light, MahinAi-Pro)
    modelNameLight: { type: String, default: 'MahinAi-Light' },
    modelNamePro: { type: String, default: 'MahinAi-Pro' },
    modelNameMax: { type: String, default: 'MahinAi-Max' },
    
    // দ্য কিল সুইচ (অ্যাডমিন প্যানেল থেকে মডেল সাময়িকভাবে অফ করার জন্য)
    isProModelActive: { type: Boolean, default: true },
    isMaxModelActive: { type: Boolean, default: true },
    
    // ডাইনামিক প্রাইসিং আপডেট
    priceBDT: { type: Number, default: 299 },
    priceUSD: { type: Number, default: 5 },
    priceMaxBDT: { type: Number, default: 599 },
    priceMaxUSD: { type: Number, default: 10 },
    
    // ডাইনামিক সিএমএস পেজ (Markdown টেক্সট সেভ থাকবে)
    privacyPolicy: { type: String, default: '# Privacy Policy\nWelcome to Mahin AI.' },
    termsConditions: { type: String, default: '# Terms and Conditions\nUsage rules of Mahin AI.' }
}, {
    timestamps: true
});

module.exports = mongoose.model('Config', configSchema);