const logger = require('../utils/logger');

const readFirstEnv = (keys) => {
    for (const key of keys) {
        const value = String(process.env[key] || '').trim();
        if (value) {
            return value;
        }
    }

    return '';
};

const getEnvValue = (key, fallback = '') => {
    const value = process.env[key];
    return typeof value === 'string' && value.trim() !== '' ? value.trim() : fallback;
};

const getEnvNumber = (key, fallback = null) => {
    const value = getEnvValue(key);
    if (value === '') {
        return fallback;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const getEnvBoolean = (key, fallback = false) => {
    const value = getEnvValue(key);
    if (value === '') {
        return fallback;
    }

    return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
};

const loadTokenPool = (prefix) => {
    const tokens = [];

    for (let index = 1; index <= 10; index += 1) {
        const value = readFirstEnv([
            `${prefix}${index}`,
            `${prefix}_${index}`
        ]);

        if (value) {
            tokens.push(value);
        }
    }

    return tokens;
};

const env = {
    PORT: getEnvValue('PORT', '5000'),
    NODE_ENV: getEnvValue('NODE_ENV', 'development'),
    API_BASE_URL: getEnvValue('API_BASE_URL'),
    CLIENT_URL: getEnvValue('CLIENT_URL'),
    JWT_SECRET: getEnvValue('JWT_SECRET'),
    MONGO_URI: getEnvValue('MONGO_URI'),
    MONGODB_URI: getEnvValue('MONGODB_URI'),
    RESEND_API_KEY: getEnvValue('RESEND_API_KEY'),
    FROM_EMAIL: getEnvValue('FROM_EMAIL'),
    SERVICE_EMAIL: getEnvValue('SERVICE_EMAIL'),
    ADMIN_EMAIL: getEnvValue('ADMIN_EMAIL'),
    ADMIN_BOOTSTRAP_NAME: getEnvValue('ADMIN_BOOTSTRAP_NAME'),
    ADMIN_BOOTSTRAP_PASSWORD: getEnvValue('ADMIN_BOOTSTRAP_PASSWORD'),
    CLOUDINARY_CLOUD_NAME: getEnvValue('CLOUDINARY_CLOUD_NAME'),
    CLOUDINARY_API_KEY: getEnvValue('CLOUDINARY_API_KEY'),
    CLOUDINARY_API_SECRET: getEnvValue('CLOUDINARY_API_SECRET'),
    PAYPAL_ENV: getEnvValue('PAYPAL_ENV', 'sandbox'),
    PAYPAL_MODE: getEnvValue('PAYPAL_MODE'),
    PAYPAL_CLIENT_ID: getEnvValue('PAYPAL_CLIENT_ID'),
    PAYPAL_CLIENT_SECRET: getEnvValue('PAYPAL_CLIENT_SECRET'),
    GOOGLE_CLIENT_ID: getEnvValue('GOOGLE_CLIENT_ID'),
    GOOGLE_CLIENT_SECRET: getEnvValue('GOOGLE_CLIENT_SECRET'),
    JSON_BODY_LIMIT: getEnvValue('JSON_BODY_LIMIT', '5mb'),
    URLENCODED_BODY_LIMIT: getEnvValue('URLENCODED_BODY_LIMIT', '5mb'),
    CLOUDINARY_MAX_FILE_SIZE_BYTES: getEnvNumber('CLOUDINARY_MAX_FILE_SIZE_BYTES', 5 * 1024 * 1024),
    ENABLE_ADMIN_BOOTSTRAP: getEnvBoolean('ENABLE_ADMIN_BOOTSTRAP', true),
    PUTER_AUTH_TOKENS: loadTokenPool('PUTER_AUTH_TOKEN'),
    GEMINI_API_KEYS: loadTokenPool('GEMINI_API_KEY'),
    GROQ_API_KEYS: loadTokenPool('GROQ_API_KEY'),
    HUGGINGFACE_API_KEYS: loadTokenPool('HUGGINGFACE_API_KEY')
};

const validateStartupEnv = () => {
    const issues = [];

    if (!readFirstEnv(['MONGO_URI', 'MONGODB_URI'])) {
        issues.push('Missing MongoDB connection string (MONGO_URI or MONGODB_URI).');
    }

    if (!env.JWT_SECRET) {
        issues.push('Missing JWT_SECRET.');
    }

    if (issues.length > 0) {
        throw new Error(issues.join(' '));
    }

    const warnings = [];

    if (!env.RESEND_API_KEY) {
        warnings.push('RESEND_API_KEY is missing. Email notifications will fail until configured.');
    }

    if (!env.ADMIN_EMAIL) {
        warnings.push('ADMIN_EMAIL is missing. Admin bootstrap and authorization fallback may be affected.');
    }

    if (env.PUTER_AUTH_TOKENS.length === 0) {
        warnings.push('No Puter auth token found. AI chat will fail until at least one token is configured.');
    }

    if (!env.PAYPAL_CLIENT_ID || !env.PAYPAL_CLIENT_SECRET) {
        warnings.push('PayPal credentials are missing. PayPal verification will be unavailable.');
    }

    if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
        warnings.push('Cloudinary credentials are missing. Cloud upload helpers will be unavailable.');
    }

    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
        warnings.push('Google OAuth credentials are missing. Google login may be unavailable.');
    }

    warnings.forEach((warning) => logger.warn(warning));
};

module.exports = {
    env,
    validateStartupEnv,
    getEnvValue,
    getEnvNumber,
    getEnvBoolean,
    loadTokenPool,
    readFirstEnv
};