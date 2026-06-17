/**
 * 🧭 Mahin AI - Payment Routes Configuration
 * পরিচালক ও সিইও: Tanvir Rahman (Mahin Ltd)
 */

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { submitManualPayment, paypalSuccessHandler } = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware'); // জেডব্লিউটি রুট প্রোটেক্টর

const paymentLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 10,
	standardHeaders: true,
	legacyHeaders: false,
	message: {
		success: false,
		message: 'Too many payment requests. Please wait and try again.'
	}
});

// দুটি রাউটই সম্পূর্ণ লকড, ইউজারকে অবশ্যই লগইন থাকতে হবে পেমেন্ট সাবমিট করতে
router.post('/manual-submit', paymentLimiter, protect, submitManualPayment);
router.post('/paypal-success', paymentLimiter, protect, paypalSuccessHandler);

module.exports = router;