/**
 * 👑 Mahin AI - Enterprise Admin Command Center Controller
 * পরিচালক ও সিইও: Tanvir Rahman (Mahin Ltd)
 */

const User = require('../models/User');
const Payment = require('../models/Payment');
const Config = require('../models/Config');
const sendEmail = require('../utils/sendEmail');
const logger = require('../utils/logger');
const { sanitizeMarkdown, trimString } = require('../utils/security');

const MAX_ADMIN_PAGE_SIZE = 100;

const getPaginationParams = (req) => {
    const pageValue = Number.parseInt(req.query.page, 10);
    const limitValue = Number.parseInt(req.query.limit, 10);

    const page = Number.isInteger(pageValue) && pageValue > 0 ? pageValue : 1;
    const limit = Number.isInteger(limitValue) && limitValue > 0 ? Math.min(limitValue, MAX_ADMIN_PAGE_SIZE) : null;

    return { page, limit };
};

const normalizeConfigUpdates = (updates = {}) => {
    const sanitized = {};
    const allowedKeys = [
        'modelNameLight',
        'modelNamePro',
        'modelNameMax',
        'isProModelActive',
        'isMaxModelActive',
        'priceBDT',
        'priceUSD',
        'priceMaxBDT',
        'priceMaxUSD',
        'privacyPolicy',
        'termsConditions'
    ];

    allowedKeys.forEach((key) => {
        if (!Object.prototype.hasOwnProperty.call(updates, key)) {
            return;
        }

        const value = updates[key];

        if (key === 'privacyPolicy' || key === 'termsConditions') {
            sanitized[key] = sanitizeMarkdown(String(value || ''));
            return;
        }

        if (key === 'isProModelActive' || key === 'isMaxModelActive') {
            sanitized[key] = value === true || value === 'true';
            return;
        }

        if (key === 'priceBDT' || key === 'priceUSD' || key === 'priceMaxBDT' || key === 'priceMaxUSD') {
            const parsedValue = Number(value);
            if (Number.isFinite(parsedValue) && parsedValue >= 0) {
                sanitized[key] = parsedValue;
            }
            return;
        }

        sanitized[key] = trimString(String(value || ''));
    });

    return sanitized;
};

/**
 * @desc    প্ল্যাটফর্মের সব ইউজারের লিস্ট দেখা (অ্যাডমিন ড্যাশবোর্ড)
 * @route   GET /api/v1/admin/users
 * @access  Private (Admin Only)
 */
const getAllUsers = async (req, res) => {
    try {
        const { page, limit } = getPaginationParams(req);

        if (!limit) {
            const users = await User.find().select('-passwordHash').sort({ createdAt: -1 }).lean();
            return res.status(200).json({ success: true, count: users.length, users });
        }

        const skip = (page - 1) * limit;
        const [users, total] = await Promise.all([
            User.find().select('-passwordHash').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
            User.countDocuments()
        ]);

        res.status(200).json({
            success: true,
            count: users.length,
            users,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.max(1, Math.ceil(total / limit))
            }
        });
    } catch (error) {
        logger.error('Failed to fetch users', {
            error: error.message
        });
        res.status(500).json({ success: false, error: 'Failed to fetch users' });
    }
};

/**
 * @desc    ইউজার অ্যাকাউন্ট স্ট্যাটাস চেঞ্জ (Ban / Unban User)
 * @route   PUT /api/v1/admin/user-status/:id
 * @access  Private (Admin Only)
 */
const updateUserStatus = async (req, res) => {
    try {
        const { status } = req.body; // status: 'active' | 'banned'
        
        if (!['active', 'banned'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status type.' });
        }

        const user = await User.findByIdAndUpdate(
            req.params.id, 
            { accountStatus: status }, 
            { new: true }
        ).select('-passwordHash');

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        res.status(200).json({ 
            success: true, 
            message: `User account status successfully updated to ${status}.`, 
            user 
        });
    } catch (error) {
        logger.error('Failed to update user status', {
            error: error.message
        });
        res.status(500).json({ success: false, error: 'Failed to update user status' });
    }
};

/**
 * @desc    পেন্ডিং পেমেন্ট রিকোয়েস্টগুলোর লিস্ট দেখা
 * @route   GET /api/v1/admin/payments/pending
 * @access  Private (Admin Only)
 */
const getPendingPayments = async (req, res) => {
    try {
        const { page, limit } = getPaginationParams(req);

        if (!limit) {
            const payments = await Payment.find({ status: 'pending' })
                .populate('userId', 'name email')
                .sort({ createdAt: -1 })
                .lean();

            return res.status(200).json({ success: true, count: payments.length, payments });
        }

        const skip = (page - 1) * limit;
        const [payments, total] = await Promise.all([
            Payment.find({ status: 'pending' })
                .populate('userId', 'name email')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Payment.countDocuments({ status: 'pending' })
        ]);

        res.status(200).json({
            success: true,
            count: payments.length,
            payments,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.max(1, Math.ceil(total / limit))
            }
        });
    } catch (error) {
        logger.error('Failed to fetch pending payments', {
            error: error.message
        });
        res.status(500).json({ success: false, error: 'Failed to fetch pending payments' });
    }
};

/**
 * @desc    ম্যানুয়াল পements অ্যাপ্রুভ বা রিজেক্ট করা
 * @route   PUT /api/v1/admin/payment-action/:id
 * @access  Private (Admin Only)
 */
const processPaymentAction = async (req, res) => {
    try {
        const { action } = req.body; // action: 'approved' | 'rejected'
        
        if (!['approved', 'rejected'].includes(action)) {
            return res.status(400).json({ success: false, message: 'Invalid action. Use approved or rejected.' });
        }

        const payment = await Payment.findById(req.params.id).populate('userId');
        if (!payment) {
            return res.status(404).json({ success: false, message: 'Payment record not found.' });
        }

        if (payment.status !== 'pending') {
            return res.status(400).json({ success: false, message: 'This transaction has already been processed.' });
        }

        // পেমেন্ট স্ট্যাটাস আপডেট করা
        payment.status = action;
        await payment.save();

        if (action === 'approved') {
            // ইউজারের নির্বাচিত plan আপগ্রেড করা
            await User.findByIdAndUpdate(payment.userId._id, { currentPlan: payment.plan === 'max' ? 'max' : 'pro' });

            // ইউজারকে প্রফেশনাল সাকসেস ইমেইল পাঠানো
            const successHtml = `
                <h2>Payment Approved! Welcome to Mahin AI ${String(payment.plan || 'pro').toUpperCase()}</h2>
                <p>Dear ${payment.userId.name},</p>
                <p>We have verified your transaction (TrxID: <strong>${payment.transactionId}</strong>) via ${payment.gateway.toUpperCase()}.</p>
                <p>Your subscription has been successfully upgraded to the <strong>${String(payment.plan || 'pro').toUpperCase()} Plan</strong>.</p>
                <p>Enjoy elite access to all our advanced models without restrictions.</p>
                <br>
                <p>Best Regards,</p>
                <p><strong>Tanvir Rahman</strong><br>Director & CEO, Mahin Ltd</p>
            `;
            sendEmail(payment.userId.email, '⚡ Mahin AI - Pro Plan Activated!', successHtml);
        }

        res.status(200).json({ success: true, message: `Payment has been successfully ${action}.` });

    } catch (error) {
        logger.error('Failed to process payment action', {
            error: error.message
        });
        res.status(500).json({ success: false, error: 'Failed to process payment action' });
    }
};

/**
 * @desc    লাইভ সিস্টেম কনফিগারেশন ও কিল-সুইচ কন্ট্রোল আপডেট করা
 * @route   PUT /api/v1/admin/config-update
 * @access  Private (Admin Only)
 */
const updateSystemConfig = async (req, res) => {
    try {
        const updates = normalizeConfigUpdates(req.body);

        // ডাটাবেজে যদি একটিও কনফিগ ডকুমেন্ট থাকে, সেটি আপডেট হবে। না থাকলে নতুন তৈরি হবে।
        let config = await Config.findOne();
        
        if (!config) {
            config = new Config(updates);
        } else {
            Object.assign(config, updates);
        }

        await config.save();
        res.status(200).json({ success: true, message: 'Live system configurations successfully updated.', config });
    } catch (error) {
        logger.error('Failed to update system config', {
            error: error.message
        });
        res.status(500).json({ success: false, error: 'Failed to update system config' });
    }
};

module.exports = {
    getAllUsers,
    updateUserStatus,
    getPendingPayments,
    processPaymentAction,
    updateSystemConfig
};