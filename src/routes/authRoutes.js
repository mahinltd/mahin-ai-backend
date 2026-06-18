/**
 * 🧭 Mahin AI - Authentication Routes Configuration
 * পরিচালক ও সিইও: Tanvir Rahman (Mahin Ltd)
 */

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { registerUser, loginUser, googleAuth, forgotPassword, resetPassword } = require('../controllers/authController');
const tracker = require('../middleware/tracker'); // আমাদের ট্র্যাকিং মডিউল

const authLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 5,
	standardHeaders: true,
	legacyHeaders: false,
	skipSuccessfulRequests: true,
	message: {
		success: false,
		message: 'Too many authentication attempts. Please try again later.'
	}
});

// সব অথ রাউটে ট্র্যাকার মিডলওয়্যারটি পুশ করা হয়েছে (১০x ট্র্যাকিং অ্যাক্টিভেটেড)
router.post('/signup', authLimiter, tracker, registerUser);
router.post('/login', authLimiter, tracker, loginUser);
router.post('/google', authLimiter, tracker, googleAuth);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password', authLimiter, resetPassword);

module.exports = router;