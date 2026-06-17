/**
 * 🕵️‍♂️ Mahin AI - Enterprise Request & Geo-IP Tracker
 * পরিচালক ও সিইও: Tanvir Rahman (Mahin Ltd)
 */

const useragent = require('useragent');
const geoip = require('geoip-lite');
const logger = require('../utils/logger');

const tracker = (req, res, next) => {
    try {
        // ১. আইপি অ্যাড্রেস বের করা (লোকালহোস্ট এবং প্রক্সি হ্যান্ডেল সহ)
        let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        
        // লোকালহোস্ট আইপি হলে টেস্টের জন্য একটি ডামি গ্লোবাল আইপি সেট করা (যেমন গুগলের আইপি)
        if (ip === '::1' || ip === '127.0.0.1') {
            ip = '8.8.8.8'; // প্রোডাকশনে এটি আসল ইউজারের আইপি রিড করবে
        } else if (ip.includes(',')) {
            ip = ip.split(',')[0].trim(); // একাধিক প্রক্সি আইপি থাকলে মেইন আইপি আলাদা করা
        }

        // ২. ইউজার এজেন্ট (Device & Browser) স্ক্র্যাপ করা
        const agent = useragent.parse(req.headers['user-agent']);
        const device = agent.device.toString() === 'Other 0.0.0' ? 'Desktop / Laptop' : agent.device.toString();
        const browser = `${agent.toAgent()} on ${agent.os.toString()}`;

        // ৩. Geo-IP Lookup দিয়ে লোকেশন (দেশ ও শহর) বের করা
        const geo = geoip.lookup(ip);
        let location = 'Unknown Location';
        if (geo) {
            const city = geo.city ? `${geo.city}, ` : '';
            const country = geo.country || 'Unknown Country';
            location = `${city}${country}`;
        }

        // ৪. এই ডেটাগুলো রিকোয়েস্ট (req) অবজেক্টে পাস করে দেওয়া, যাতে কন্ট্রোলার সরাসরি ডাটাবেজে সেভ করতে পারে
        req.trackingData = {
            lastIp: ip,
            device: device,
            browser: browser,
            location: location
        };

        next();
    } catch (error) {
        logger.warn('Tracking middleware error', {
            error: error.message
        });
        next(); // ট্র্যাকিং ফেল করলেও যেন মেইন ইউজার এক্সপেরিয়েন্স আটকে না যায়
    }
};

module.exports = tracker;