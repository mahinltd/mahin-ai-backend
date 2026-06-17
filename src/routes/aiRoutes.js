/**
 * 🧭 Mahin AI - AI Routes Configuration with Security Guards
 * পরিচালক ও সিইও: Tanvir Rahman (Mahin Ltd)
 */

const express = require('express');
const router = express.Router();
const { generateChatResponse } = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware'); // জেডব্লিউটি ভেরিফায়ার
const chatRateLimiter = require('../middleware/rateLimiter'); // স্প্যাম প্রোটেক্টর

// এআই চ্যাট রাউট অ্যাক্টিভেশন: প্রথমে স্প্যাম রেট লিমিট হবে, তারপর লগইন টোকেন ভেরিফাই হবে, তারপর চ্যাট জেনারেট হবে
router.post('/chat', chatRateLimiter, protect, generateChatResponse);

module.exports = router;