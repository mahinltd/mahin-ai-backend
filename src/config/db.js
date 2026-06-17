const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
    try {
        const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

        if (!mongoUri) {
            throw new Error('MongoDB connection string is missing. Set MONGO_URI or MONGODB_URI in .env');
        }

        const conn = await mongoose.connect(mongoUri, {
            // Mongoose 6+ সংস্করণে এই অপশনগুলো অটোমেটিক হ্যান্ডেল হয়, 
            // তবে প্রোডাকশন সার্ভারে সিকিউর ট্রাফিকের জন্য এটি বেস্ট প্র্যাকটিস
            autoIndex: true, 
        });

        logger.info('MongoDB connected successfully', {
            host: conn.connection.host
        });
    } catch (error) {
        logger.error('MongoDB connection error', {
            error: error.message
        });
        // ডাটাবেজ কানেক্ট না হলে পুরো সার্ভার ডাউন করে প্রসেস এক্সিট করা (নিরাপত্তার স্বার্থে)
        process.exit(1);
    }
};

module.exports = connectDB;