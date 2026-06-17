/**
 * 👑 Mahin AI - Administrator Authorization Guard
 * পরিচালক ও সিইও: Tanvir Rahman (Mahin Ltd)
 */

const User = require('../models/User');
const logger = require('../utils/logger');

const authorizeAdmin = async (req, res, next) => {
    try {
        if (!req.user || !req.user._id) {
            return res.status(403).json({
                success: false,
                error: 'Access Denied',
                message: 'Forbidden. Admin authentication is required.'
            });
        }

        const user = await User.findById(req.user._id).select('email role accountStatus');
        if (!user || user.accountStatus === 'banned') {
            return res.status(403).json({
                success: false,
                error: 'Access Denied',
                message: 'Forbidden. This account is not allowed to access admin resources.'
            });
        }

        if (user.role === 'admin' || user.email === process.env.ADMIN_EMAIL) {
            req.user = user;
            next(); // ইউজার যদি প্রধান পরিচালক (Tanvir Rahman) হন, তবে অনুমতি দেওয়া হবে
        } else {
            // সাধারণ ইউজার বা অন্য কেউ হলে ৪0৩ ফরবিডেন এরর দেওয়া
            return res.status(403).json({
                success: false,
                error: 'Access Denied',
                message: 'Forbidden. This area is strictly restricted to the Director & CEO of Mahin Ltd.'
            });
        }
    } catch (error) {
        logger.error('Admin authorization error', {
            error: error.message
        });
        return res.status(500).json({
            success: false,
            error: 'Server Error',
            message: 'An internal error occurred during authorization.'
        });
    }
};

module.exports = authorizeAdmin;