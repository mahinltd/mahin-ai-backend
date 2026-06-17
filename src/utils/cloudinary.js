/**
 * 🎨 Mahin AI - Cloudinary Asset Management Utility
 * পরিচালক ও সিইও: Tanvir Rahman (Mahin Ltd)
 */

const cloudinary = require('cloudinary').v2;
require('dotenv').config();
const logger = require('./logger');

const DEFAULT_MAX_FILE_SIZE_BYTES = Number(process.env.CLOUDINARY_MAX_FILE_SIZE_BYTES || 5 * 1024 * 1024);
const SAFE_FOLDER_PATTERN = /^[A-Za-z0-9/_-]{1,100}$/;

const isAllowedUploadInput = (value) => {
    if (Buffer.isBuffer(value)) {
        return value.length > 0;
    }

    return typeof value === 'string' && value.trim().length > 0;
};

// .env ফাইল থেকে ক্লাউডিনারি কনফিগার করা
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * ক্লাউডিনারিতে ইমেজ আপলোড করার ফাংশন
 * @param {String} fileBufferOrUrl - ইমেজের বাফার ডেটা বা সাময়িক ইউআরএল
 * @param {String} folderName - ক্লাউডিনারির ভেতরের ফোল্ডার (যেমন: 'user_images', 'ai_generated')
 * @returns {Object} - আপলোড হওয়া ইমেজের সিকিউর ইউআরএল এবং পাবলিক আইডি
 */
const uploadToCloudinary = async (fileBufferOrUrl, folderName = 'mahin_ai_assets', options = {}) => {
    try {
        const maxFileSizeBytes = Number(options.maxFileSizeBytes || DEFAULT_MAX_FILE_SIZE_BYTES);

        if (!SAFE_FOLDER_PATTERN.test(String(folderName || ''))) {
            throw new Error('Invalid Cloudinary folder name.');
        }

        if (!isAllowedUploadInput(fileBufferOrUrl)) {
            throw new Error('Invalid upload input.');
        }

        if (Buffer.isBuffer(fileBufferOrUrl) && fileBufferOrUrl.length > maxFileSizeBytes) {
            throw new Error(`File exceeds the allowed size limit of ${maxFileSizeBytes} bytes.`);
        }

        const result = await cloudinary.uploader.upload(fileBufferOrUrl, {
            folder: folderName,
            resource_type: 'auto', // ইমেজ, ভিডিও বা অন্য কোনো ফাইল অটো ডিটেক্ট করবে
            quality: 'auto:good'   // অপ্টিমাইজড সাইজ ও গুড কোয়ালিটি নিশ্চিত করবে
        });

        return {
            secure_url: result.secure_url,
            public_id: result.public_id
        };
    } catch (error) {
        logger.error('Cloudinary upload error', {
            error: error.message
        });
        throw new Error('Image upload to cloud failed.');
    }
};

module.exports = { uploadToCloudinary };