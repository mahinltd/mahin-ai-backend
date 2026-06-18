/**
 * 🌟 Mahin AI - Master Enterprise Backend Server
 * অর্গানাইজেশন: Mahin Ltd
 * পরিচালক ও সিইও: Tanvir Rahman
 * অফিশিয়াল সাপোর্ট: info.mahin.ltd@gmail.com
 */

require('dotenv').config();

const connectDB = require('./src/config/db');
const seedAdminRole = require('./src/utils/seedAdminRole');
const logger = require('./src/utils/logger');
const { validateStartupEnv } = require('./src/config/env');
const { createApp } = require('./src/app');

validateStartupEnv();

const app = createApp();
const PORT = process.env.PORT || 5000;

process.on('unhandledRejection', (err) => {
    logger.error('Unhandled promise rejection', {
        error: err && err.message ? err.message : 'Unknown rejection reason'
    });
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