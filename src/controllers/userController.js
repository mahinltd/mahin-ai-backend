const bcrypt = require('bcryptjs');
const User = require('../models/User');
const logger = require('../utils/logger');
const { trimString, escapeHtml } = require('../utils/security');
const { uploadToCloudinary } = require('../utils/cloudinary');

const isStrongPassword = (value) =>
    typeof value === 'string' &&
    value.length >= 8 &&
    /[a-z]/.test(value) &&
    /[A-Z]/.test(value) &&
    /\d/.test(value) &&
    /[^A-Za-z0-9]/.test(value);

const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-passwordHash').lean();

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        return res.status(200).json({ success: true, user });
    } catch (error) {
        logger.error('Get profile failed', { error: error.message });
        return res.status(500).json({ success: false, message: 'Failed to fetch profile' });
    }
};

const updateProfile = async (req, res) => {
    try {
        const updates = {};

        if (Object.prototype.hasOwnProperty.call(req.body || {}, 'name')) {
            const name = trimString(req.body.name);
            if (!name || name.length < 2 || name.length > 100) {
                return res.status(400).json({ success: false, message: 'Please provide a valid name.' });
            }
            updates.name = name;
        }

        const currentUser = await User.findById(req.user._id);
        if (!currentUser) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (Object.prototype.hasOwnProperty.call(req.body || {}, 'preferences')) {
            const preferences = req.body.preferences || {};
            const nextPreferences = { ...(currentUser.preferences || {}) };

            if (['light', 'dark', 'system'].includes(preferences.theme)) {
                nextPreferences.theme = preferences.theme;
            }

            if (typeof preferences.language === 'string' && preferences.language.trim()) {
                nextPreferences.language = preferences.language.trim().slice(0, 20);
            }

            if (typeof preferences.notifications === 'boolean') {
                nextPreferences.notifications = preferences.notifications;
            }

            updates.preferences = nextPreferences;
        }

        if (req.body && Object.prototype.hasOwnProperty.call(req.body, 'avatar')) {
            const avatarValue = trimString(req.body.avatar);
            if (avatarValue) {
                updates.avatar = avatarValue.slice(0, 2048);
            }
        }

        if (req.file) {
            const uploaded = await uploadToCloudinary(req.file.buffer, 'user_avatars', { maxFileSizeBytes: 5 * 1024 * 1024 });
            updates.avatar = uploaded.secure_url;
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ success: false, message: 'No valid profile fields provided.' });
        }

        if (updates.preferences) {
        }

        const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).select('-passwordHash');

        return res.status(200).json({ success: true, user });
    } catch (error) {
        logger.error('Update profile failed', { error: error.message });
        return res.status(500).json({ success: false, message: 'Failed to update profile' });
    }
};

const changePassword = async (req, res) => {
    try {
        const currentPassword = trimString(req.body?.currentPassword);
        const newPassword = trimString(req.body?.newPassword);

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: 'Please provide current and new password.' });
        }

        if (!isStrongPassword(newPassword)) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 8 characters and include upper, lower, number, and symbol.'
            });
        }

        const user = await User.findById(req.user._id);
        if (!user || user.authProvider !== 'local') {
            return res.status(400).json({ success: false, message: 'Password change is only available for local accounts.' });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
        }

        const salt = await bcrypt.genSalt(10);
        user.passwordHash = await bcrypt.hash(newPassword, salt);
        await user.save();

        return res.status(200).json({ success: true, message: 'Password updated successfully.' });
    } catch (error) {
        logger.error('Change password failed', { error: error.message });
        return res.status(500).json({ success: false, message: 'Failed to change password' });
    }
};

module.exports = {
    getProfile,
    updateProfile,
    changePassword
};