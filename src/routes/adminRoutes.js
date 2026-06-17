/**
 * 🧭 Mahin AI - Super Admin Route Guard Configurations
 * পরিচালক ও সিইও: Tanvir Rahman (Mahin Ltd)
 */

const express = require('express');
const router = express.Router();

// কন্ট্রোলার ইমপোর্ট
const {
    getAllUsers,
    updateUserStatus,
    getPendingPayments,
    processPaymentAction,
    updateSystemConfig
} = require('../controllers/adminController');

// সিকিউরিটি মিডলওয়্যার ইমপোর্ট
const { protect } = require('../middleware/authMiddleware');
const authorizeAdmin = require('../middleware/adminMiddleware');

// 🔒 এই ফাইলের প্রতিটা এন্ডপয়েন্ট অ্যাক্সেস করতে হলে আগে লগইন টোকেন থাকতে হবে, এবং লগইন করা ইউজারকে অবশ্যই মেইন অ্যাডমিন হতে হবে।
router.use(protect);
router.use(authorizeAdmin);

// ইউজার ও পেমেন্ট অ্যাকশন রাউটস
router.get('/users', getAllUsers);
router.put('/user-status/:id', updateUserStatus);
router.get('/payments/pending', getPendingPayments);
router.put('/payment-action/:id', processPaymentAction);

// লাইভ কন্ট্রোল ও কিল-সুইচ রাউট
router.put('/config-update', updateSystemConfig);

module.exports = router;