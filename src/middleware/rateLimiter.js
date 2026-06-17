/**
 * 🛡️ Mahin AI - Anti-Spam & Request Rate Limiter
 * পরিচালক ও সিইও: Tanvir Rahman (Mahin Ltd)
 */

const rateLimit = require('express-rate-limit');

// ফ্রি ইউজার এবং গেস্টদের স্প্যামিং আটকানোর জন্য লিমিটার
const chatRateLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // ১ মিনিট (Time window)
    max: 10, // প্রতি আইপি থেকে ১ মিনিটে সর্বোচ্চ ১০টি রিকোয়েস্ট পাঠানো যাবে
    standardHeaders: true, // রেট লিমিট ইনফো রেসপন্স হেডারে পাঠানো (RateLimit-Limit)
    legacyHeaders: false, // পুরোনো এক্স-রেট-লিমিট হেডার অফ করা
    handler: (req, res) => {
        // লিমিট ক্রস করলে জেমিনি/চ্যাটজিপিটির মতো প্রিমিয়াম এরর রেসপন্স দেওয়া
        res.status(429).json({
            success: false,
            error: "You are moving too fast!",
            message: "Too many requests from this device. Please wait 1 minute before trying again."
        });
    }
});

module.exports = chatRateLimiter;