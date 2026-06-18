const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const authRoutes = require('./routes/authRoutes');
const aiRoutes = require('./routes/aiRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const configRoutes = require('./routes/configRoutes');
const adminRoutes = require('./routes/adminRoutes');
const conversationRoutes = require('./routes/conversationRoutes');
const userRoutes = require('./routes/userRoutes');
const logger = require('./utils/logger');

const createApp = () => {
    const app = express();

    app.disable('x-powered-by');
    app.use(helmet());
    app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '5mb' }));
    app.use(express.urlencoded({ extended: true, limit: process.env.URLENCODED_BODY_LIMIT || '5mb' }));

    const allowedOrigins = new Set([
        'http://localhost:3000',
        'http://localhost:5173',
        'https://mahinai.app',
        process.env.CLIENT_URL
    ].filter(Boolean));

    app.use(cors({
        origin(origin, callback) {
            if (!origin || allowedOrigins.has(origin)) {
                callback(null, true);
            } else {
                callback(new Error('Blocked by Mahin Ltd Security Protocol (CORS)'));
            }
        },
        credentials: true
    }));

    app.use('/api/v1/auth', authRoutes);
    app.use('/api/v1/ai', aiRoutes);
    app.use('/api/v1/payment', paymentRoutes);
    app.use('/api/v1/config', configRoutes);
    app.use('/api/v1/admin', adminRoutes);
    app.use('/api/v1/conversations', conversationRoutes);
    app.use('/api/v1/user', userRoutes);

    app.get('/', (req, res) => {
        res.status(200).json({
            success: true,
            project: 'Mahin AI Core Engine',
            organization: 'Mahin Ltd',
            status: 'Running Smoothly',
            environment: process.env.NODE_ENV || 'production'
        });
    });

    app.use((req, res) => {
        res.status(404).json({
            success: false,
            error: 'Not Found',
            message: 'The requested API endpoint does not exist.'
        });
    });

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

    return app;
};

module.exports = { createApp };