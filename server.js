/**
 * 🌟 Mahin AI - Master Enterprise Backend Server
 * অর্গানাইজেশন: Mahin Ltd
 * পরিচালক ও সিইও: Tanvir Rahman
 * অফিশিয়াল সাপোর্ট: info.mahin.ltd@gmail.com
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

// ডাটাবেজ কানেকশন এবং কনফিগ ইমপোর্ট
const connectDB = require('./src/config/db');
const seedAdminRole = require('./src/utils/seedAdminRole');
const logger = require('./src/utils/logger');
const { validateStartupEnv } = require('./src/config/env');

// রাউট ফাইলসমূহ ইমপোর্ট
const authRoutes = require('./src/routes/authRoutes');
const aiRoutes = require('./src/routes/aiRoutes');
const paymentRoutes = require('./src/routes/paymentRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const conversationRoutes = require('./src/routes/conversationRoutes');
const userRoutes = require('./src/routes/userRoutes');

validateStartupEnv();

const app = express();

app.disable('x-powered-by');
app.use(helmet());

// ২. মিডলওয়্যার কনফিগারেশন (Body Parser & Security Layers)
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '5mb' })); // JSON পে-লোড রিড করার জন্য
app.use(express.urlencoded({ extended: true, limit: process.env.URLENCODED_BODY_LIMIT || '5mb' }));

// ১০x কর্স প্রোটেকশন (CORS Policy Setup)
// প্রোডাকশনে আপনার ফ্রন্টএন্ড ডোমেইনটি (যেমন: https://mahinai.app) এখানে সেট করে দেবেন
const allowedOrigins = new Set([
    'http://localhost:3000',
    'http://localhost:5173',
    'https://mahinai.app',
    process.env.CLIENT_URL
].filter(Boolean));
app.use(cors({
    origin: function (origin, callback) {
        // মোবাইল অ্যাপ বা ব্রাউজার এক্সটেনশন ছাড়া ডাইরেক্ট ব্রাউজার রিকোয়েস্ট চেক
        if (!origin || allowedOrigins.has(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Blocked by Mahin Ltd Security Protocol (CORS)'));
        }
    },
    credentials: true // কুকি বা অথেনটিকেশন হেডার এলাও করার জন্য
}));

// ৩. লাইভ রুট গেটওয়ে লিংক-আপ (API Endpoint Mounting)
app.use('/api/v1/auth', authRoutes);       // অথেনটিকেশন রুট
app.use('/api/v1/ai', aiRoutes);         // কোর এআই রোটেশন রুট
app.use('/api/v1/payment', paymentRoutes); // পেমেন্ট ও সাবস্ক্রিপশন রুট
app.use('/api/v1/admin', adminRoutes);     // সিইও কমান্ড সেন্টার রুট
app.use('/api/v1/conversations', conversationRoutes); // চ্যাট হিস্ট্রি রুট
app.use('/api/v1/user', userRoutes); // ইউজার প্রোফাইল রুট

// ৪. বেস বা হেলথ-চেক রাউট (সার্ভার সচল আছে কি না তা দূর থেকে চেক করার জন্য)
app.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        project: "Mahin AI Core Engine",
        organization: "Mahin Ltd",
        status: "Running Smoothly",
        environment: process.env.NODE_ENV || 'production'
    });
});

// ৫. গ্লোবাল ৪0৪ এরর হ্যান্ডলার (ভুল এপিআই কল ঠেকাতে)
app.use((req, res, next) => {
    res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'The requested API endpoint does not exist.'
    });
});

// ৬. গ্লোবাল ৫00 সেন্ট্রাল এরর ক্যাচার (সার্ভার ক্র্যাশ প্রটেকশন)
app.use((err, req, res, next) => {
    logger.error('Global server error', {
        error: err.message,
        stack: err.stack,
        path: req.originalUrl,
        method: req.method
    });
    res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'An internal server error occurred.'
    });
});

const PORT = process.env.PORT || 5000;

// কোনো আনহ্যান্ডেলড রিজেকশন হলে সার্ভারকে নিরাপদভাবে ম্যানেজ করা
process.on('unhandledRejection', (err, promise) => {
    logger.error('Unhandled promise rejection', {
        error: err && err.message ? err.message : 'Unknown rejection reason'
    });
    // সার্ভার ক্র্যাশ না করিয়ে ব্যাকলগ লক করা বেস্ট প্র্যাকটিস
});

const startServer = async () => {
    await connectDB();
    await seedAdminRole();

    app.listen(PORT, () => {
        logger.info('Mahin AI enterprise server started', {
            port: PORT,
            environment: process.env.NODE_ENV || 'production',
            owner: 'Tanvir Rahman (Mahin Ltd)'
        });
    });
};

startServer().catch((error) => {
    logger.error('Server bootstrap failed', {
        error: error.message
    });
    process.exit(1);
});