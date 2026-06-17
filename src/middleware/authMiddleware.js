/**
 * 🔒 Mahin AI - JWT Authentication Guard Middleware
 * পরিচালক ও সিইও: Tanvir Rahman (Mahin Ltd)
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

const protect = async (req, res, next) => {
    let token;

    // ১. চেক করা হেডার বা কুকিতে টোকেন আছে কি না (Bearer Token System)
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // হেডার থেকে টোকেন আলাদা করা
            token = req.headers.authorization.split(' ')[1];

            // টোকেন ভেরিফাই করা
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // টোকেন থেকে ইউজার আইডি নিয়ে ডাটাবেজ থেকে পাসওয়ার্ড ছাড়া ইউজার অবজেক্ট বের করা
            req.user = await User.findById(decoded.id).select('-passwordHash');

            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    error: 'Not Authorized',
                    message: 'User account no longer exists. Please sign in again.'
                });
            }

            // ২. ১০x অ্যাকাউন্ট স্ট্যাটাস লক (User Ban Check)
            if (req.user && req.user.accountStatus === 'banned') {
                return res.status(403).json({
                    success: false,
                    error: 'Account Suspended',
                    message: 'Your account has been suspended by the administrator. Please contact support at info.mahin.ltd@gmail.com'
                });
            }

            next();
        } catch (error) {
            logger.warn('JWT verification failed', {
                error: error.message
            });
            return res.status(401).json({
                success: false,
                error: 'Not Authorized',
                message: 'Session expired or invalid token. Please sign in again.'
            });
        }
    }

    // যদি কোনো টোকেন না পাওয়া যায়
    if (!token) {
        return res.status(401).json({
            success: false,
            error: 'Authentication Required',
            message: 'Access denied. No authentication token provided.'
        });
    }
};

module.exports = { protect };