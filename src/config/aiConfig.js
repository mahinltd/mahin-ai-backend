/**
 * 🚀 Mahin AI - Master Token Rotator Engine (Fixed & Optimized)
 * অর্গানাইজেশন: Mahin Ltd
 * পরিচালক ও সিইও: Tanvir Rahman
 */

// ফাইলের শুরুতেই dotenv নিশ্চিত করা যাতে কোনো কী মিস না হয়
require('dotenv').config();
const logger = require('../utils/logger');

// এনভায়রনমেন্ট ভ্যারিয়েবল থেকে ডাইনামিকালি সচল কী-গুলো খুঁজে বের করার হেল্পার ফাংশন
const loadAvailableKeys = (prefix) => {
    const keys = [];
    for (let i = 1; i <= 10; i++) {
        const key = process.env[`${prefix}${i}`] || process.env[`${prefix}_${i}`];
        if (key && key.trim() !== '') {
            keys.push(key.trim());
        }
    }
    return keys;
};

// আপনার .env ফাইলের (ce2db5fa-88e9-4003-a8cf-0e9c13fe8b37) হুবহু নাম মেইনটেইন করা হয়েছে
const configPools = {
    puter: loadAvailableKeys('PUTER_AUTH_TOKEN'),
    gemini: loadAvailableKeys('GEMINI_API_KEY'),
    groq: loadAvailableKeys('GROQ_API_KEY'),
    huggingface: loadAvailableKeys('HUGGINGFACE_API_KEY') // আপনার ফাইলের বানান অনুযায়ী ফিক্সড
};

// প্রতিবার কোন ইনডেক্সের কী ব্যবহার হচ্ছে তা ট্র্যাক রাখার অবজেক্ট
const currentIndices = {
    puter: 0,
    gemini: 0,
    groq: 0,
    huggingface: 0
};

logger.info('Loading token pools', {
    puterTokens: configPools.puter.length,
    geminiKeys: configPools.gemini.length,
    groqKeys: configPools.groq.length,
    huggingFaceKeys: configPools.huggingface.length
});

/**
 * মেইন রোটেশন ফাংশন (Round-Robin Method)
 * @param {String} provider - 'puter' | 'gemini' | 'groq' | 'huggingface'
 * @returns {String} - একটি সচল এপিআই কী বা টোকেন
 */
const getActiveKey = (provider) => {
    const pool = configPools[provider];
    
    if (!pool || pool.length === 0) {
        logger.error('No keys found for AI provider', { provider });
        return null;
    }

    const activeKey = pool[currentIndices[provider]];
    currentIndices[provider] = (currentIndices[provider] + 1) % pool.length;

    return activeKey;
};

module.exports = {
    getActiveKey,
    poolsCount: {
        puter: configPools.puter.length,
        gemini: configPools.gemini.length,
        groq: configPools.groq.length,
        huggingface: configPools.huggingface.length
    }
};