/**
 * ✉️ Mahin AI - Enterprise Email Dispatcher (Resend API)
 * পরিচালক ও সিইও: Tanvir Rahman (Mahin Ltd)
 */

const { Resend } = require('resend');
require('dotenv').config();
const logger = require('./logger');

// .env থেকে রেসেন্ড ক্লায়েন্ট ইনিশিয়ালাইজ করা
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * ইমেইল পাঠানোর গ্লোবাল ফাংশন
 * @param {String} to - প্রাপকের ইমেইল (ইউজার বা অ্যাডমিন)
 * @param {String} subject - ইমেইলের বিষয়বস্তু
 * @param {String} htmlContent - ইমেইলের বডিতে থাকা HTML টেমপ্লেট
 * @returns {Object} - রেসেন্ড এপিআই রেসপন্স
 */
const sendEmail = async (to, subject, htmlContent) => {
    try {
        const data = await resend.emails.send({
            from: `Mahin AI <${process.env.SERVICE_EMAIL || 'no-reply@mahinai.app'}>`,
            to: [to],
            subject: subject,
            html: htmlContent
        });

        logger.info('Email sent successfully', {
            to,
            messageId: data.data?.id
        });
        return { success: true, data };
    } catch (error) {
        logger.error('Resend email error', {
            error: error.message,
            to,
            subject
        });
        return { success: false, error: error.message };
    }
};

module.exports = sendEmail;