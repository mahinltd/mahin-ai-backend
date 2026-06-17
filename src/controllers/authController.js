/**
 * 🔐 Mahin AI - Core Authentication Controller
 * পরিচালক ও সিইও: Tanvir Rahman (Mahin Ltd)
 */

const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');
const { isDuplicateKeyError } = require('../utils/security');

const isValidEmail = (value) => typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const isStrongPassword = (value) =>
    typeof value === 'string' &&
    value.length >= 8 &&
    /[a-z]/.test(value) &&
    /[A-Z]/.test(value) &&
    /\d/.test(value) &&
    /[^A-Za-z0-9]/.test(value);

// ইউজারের জন্য সিকিউর JWT টোকেন জেনারেট করার হেল্পার ফাংশন (মেয়াদ: ৩০ দিন)
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

/**
 * @desc    ম্যানুয়াল ইমেইল-পাসওয়ার্ড সাইন-আপ
 * @route   POST /api/v1/auth/signup
 * @access  Public
 */
const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const trackingData = req.trackingData; // tracker middleware থেকে আসা ডেটা

        if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) {
            return res.status(400).json({ success: false, message: 'Please provide a valid name.' });
        }
        if (!isValidEmail(email)) {
            return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
        }
        if (!isStrongPassword(password)) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 8 characters and include upper, lower, number, and symbol.'
            });
        }
        if (email.trim().toLowerCase() === String(process.env.ADMIN_EMAIL || '').trim().toLowerCase()) {
            return res.status(403).json({
                success: false,
                message: 'This email is reserved for administrator use.'
            });
        }

        // ১. চেক করা ইউজার আগে থেকে এক্সিস্ট করে কি না
        const normalizedEmail = email.trim().toLowerCase();
        const userExists = await User.findOne({ email: normalizedEmail });
        if (userExists) {
            return res.status(400).json({ success: false, message: 'User already exists with this email' });
        }

        // ২. পাসওয়ার্ড হ্যাশিং (Bcrypt)
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // ৩. নতুন ইউজার তৈরি ও ট্র্যাকিং ডেটা ইনজেকশন
        const user = await User.create({
            name: name.trim(),
            email: normalizedEmail,
            authProvider: 'local',
            passwordHash,
            tracking: trackingData
        });

        if (user) {
            res.status(201).json({
                success: true,
                token: generateToken(user._id),
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    currentPlan: user.currentPlan,
                }
            });
        }
    } catch (error) {
        if (isDuplicateKeyError(error)) {
            return res.status(400).json({ success: false, message: 'User already exists with this email' });
        }

        logger.error('Signup error', {
            error: error.message
        });
        res.status(500).json({ success: false, error: 'Internal Server Error', message: 'An internal server error occurred.' });
    }
};

/**
 * @desc    ম্যানুয়াল ইমেইল-পাসওয়ার্ড লগইন
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        const trackingData = req.trackingData;

        if (!isValidEmail(email) || typeof password !== 'string' || password.length === 0) {
            return res.status(400).json({ success: false, message: 'Please provide valid login credentials.' });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // ১. ইমেইল দিয়ে ইউজার খুঁজে বের করা
        const user = await User.findOne({ email: normalizedEmail });
        if (!user || user.authProvider !== 'local') {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        // ২. অ্যাকাউন্ট ব্যান কি না চেক করা
        if (user.accountStatus === 'banned') {
            return res.status(403).json({ success: false, message: 'Your account has been suspended. Contact support.' });
        }

        // ৩. পাসওয়ার্ড ম্যাচিং
        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        // ৪. ১০x ট্র্যাকিং আপডেট (লগইন করার সাথে সাথে নতুন আইপি/ডিভাইস আপডেট হবে)
        user.tracking = trackingData;
        await user.save();

        res.status(200).json({
            success: true,
            token: generateToken(user._id),
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                currentPlan: user.currentPlan,
            }
        });
    } catch (error) {
        logger.error('Login error', {
            error: error.message
        });
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
};

/**
 * @desc    গুগল ১-ক্লিক সাইন-ইন / লগইন হ্যান্ডলার
 * @route   POST /api/v1/auth/google
 * @access  Public
 */
const googleAuth = async (req, res) => {
    try {
        const { name, email } = req.body; // ফ্রন্টএন্ড গুগলের অফিশিয়াল পপআপ থেকে এই ডেটা পাঠাবে
        const trackingData = req.trackingData;

        if (typeof name !== 'string' || name.trim().length < 2 || !isValidEmail(email)) {
            return res.status(400).json({ success: false, message: 'Please provide valid Google profile data.' });
        }

        const normalizedEmail = email.trim().toLowerCase();
        if (normalizedEmail === String(process.env.ADMIN_EMAIL || '').trim().toLowerCase()) {
            return res.status(403).json({
                success: false,
                message: 'This email is reserved for administrator use.'
            });
        }

        // ১. চেক করা এই গুগল মেইল দিয়ে আগে কোনো অ্যাকাউন্ট আছে কি না
        let user = await User.findOne({ email: normalizedEmail });

        if (user) {
            // ইউজার যদি আগে অন্য মেথডে খুলে থাকে
            if (user.authProvider !== 'google') {
                return res.status(400).json({ success: false, message: 'Please log in using your password.' });
            }
            // অ্যাকাউন্ট ব্যান কি না চেক
            if (user.accountStatus === 'banned') {
                return res.status(403).json({ success: false, message: 'Your account has been suspended.' });
            }
            // পুরনো ইউজার হলে ট্র্যাকিং আপডেট করে লগইন করিয়ে দেওয়া
            user.tracking = trackingData;
            await user.save();
        } else {
            // ২. নতুন ইউজার হলে গুগল প্রোভাইডার দিয়ে অটো-রেজিস্ট্রেশন
            user = await User.create({
                name: name.trim(),
                email: normalizedEmail,
                authProvider: 'google',
                tracking: trackingData
            });
        }

        res.status(200).json({
            success: true,
            token: generateToken(user._id),
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                currentPlan: user.currentPlan,
            }
        });
    } catch (error) {
        if (isDuplicateKeyError(error)) {
            const existingUser = await User.findOne({ email: normalizedEmail });

            if (existingUser) {
                if (existingUser.authProvider !== 'google') {
                    return res.status(400).json({ success: false, message: 'Please log in using your password.' });
                }

                if (existingUser.accountStatus === 'banned') {
                    return res.status(403).json({ success: false, message: 'Your account has been suspended.' });
                }

                existingUser.tracking = trackingData;
                await existingUser.save();

                return res.status(200).json({
                    success: true,
                    token: generateToken(existingUser._id),
                    user: {
                        id: existingUser._id,
                        name: existingUser.name,
                        email: existingUser.email,
                        currentPlan: existingUser.currentPlan,
                    }
                });
            }
        }

        logger.error('Google auth error', {
            error: error.message
        });
        res.status(500).json({ success: false, error: 'Google Authentication Failed' });
    }
};

module.exports = { registerUser, loginUser, googleAuth };