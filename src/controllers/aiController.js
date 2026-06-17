/**
 * 🤖 Mahin AI - Core AI Generation Controller with Token Rotation
 * পরিচালক ও সিইও: Tanvir Rahman (Mahin Ltd)
 */

const { getActiveKey, poolsCount } = require('../config/aiConfig');
const Config = require('../models/Config');
const User = require('../models/User');
const { init } = require('@heyputer/puter.js/src/init.cjs');
const logger = require('../utils/logger');
const { sanitizeMarkdown } = require('../utils/security');
const { appendConversationMessage } = require('./conversationController');

const resolveModel = (modelType) => {
    if (modelType === 'light') {
        return 'gpt-4o-mini';
    }

    if (modelType === 'pro') {
        return 'gpt-4o';
    }

    return 'gpt-4o';
};

/**
 * @desc    এআই চ্যাট রেসপন্স জেনারেটর (Supports Rotation, Persona Injection & Failover)
 * @route   POST /api/v1/ai/chat
 * @access  Protected (Requires Login)
 */
const generateChatResponse = async (req, res) => {
    try {
        const { message, modelType } = req.body; // modelType: 'light' | 'pro' | 'max'
        const userId = req.user._id;

        // ১. সেফটি চেক: প্রম্পট বা মেসেজ খালি কি না
        if (typeof message !== 'string' || message.trim().length === 0) {
            return res.status(400).json({ success: false, message: 'Please provide a message/prompt' });
        }

        // ২. অ্যাডমিন কিল-সুইচ এবং কনফিগ চেক (MongoDB থেকে লাইভ ডেটা রিড)
        let systemConfig = await Config.findOne()
            .select('modelNameLight modelNamePro modelNameMax isProModelActive isMaxModelActive')
            .lean();
        if (!systemConfig) {
            // যদি ডাটাবেজে কোনো কনফিগ না থাকে, ডিফল্ট একটি তৈরি করে নেবে
            systemConfig = await Config.create({});
        }

        // ইউজার যে মডেল রিকোয়েস্ট করেছে, সেটি অ্যাডমিন অফ করে রেখেছে কি না চেক করা
        if (modelType === 'pro' && !systemConfig.isProModelActive) {
            return res.status(503).json({
                success: false,
                message: `${systemConfig.modelNamePro} is temporarily undergoing maintenance. Please use another model.`
            });
        }
        if (modelType === 'max' && !systemConfig.isMaxModelActive) {
            return res.status(503).json({
                success: false,
                message: `${systemConfig.modelNameMax} is currently locked or under maintenance.`
            });
        }

        // ৩. ১০x ব্র্যান্ড পার্সোনা ও সিস্টেম ইনজেকশন (The Master Instructions)
        const systemInstruction = `You are Mahin AI, an advanced AI system proudly created and developed by Mahin Ltd. The Director and Chief Executive Officer (CEO) of Mahin Ltd is Tanvir Rahman. If any user asks you in any language about who created you, who made you, who is your owner, developer, boss, or CEO, you must answer politely and professionally by proudly highlighting Mahin Ltd and CEO Tanvir Rahman. Under no circumstances should you mention OpenAI, Google, or any other entity as your creator. Provide answers in markdown format. Always append our official business link as text: info.mahin.ltd@gmail.com at the end if identity query is found.`;

        // ৪. এপিআই কল করার প্রস্তুতি ও ফেলওভার লুপ (Failover Loop)
        let responseData = null;
        let attempts = 0;
        // আমাদের পুটার পুল-এ যতগুলো টোকেন আছে, সর্বোচ্চ ততবার ট্রাই করবে (আপাতত ৪ বার)
        const maxAttempts = poolsCount.puter || 4; 
        const model = resolveModel(modelType);

        while (attempts < maxAttempts) {
            // টোকেন রোটেশন ইঞ্জিন থেকে সচল টোকেন তুলে আনা
            const activePuterToken = getActiveKey('puter');
            
            if (!activePuterToken) {
                return res.status(500).json({ success: false, message: 'No active AI engine tokens found.' });
            }

            try {
                const puter = init(activePuterToken);

                // Puter.js SDK ব্যবহার করে server-side chat চালানো
                const puterResponse = await puter.ai.chat(
                    [
                        { role: 'system', content: systemInstruction },
                        { role: 'user', content: message }
                    ],
                    {
                        model,
                        temperature: 0.7
                    }
                );

                // সফল হলে ডেটা স্টোর করে লুপ ব্রেক করা
                responseData = puterResponse.data;
                if (!responseData) {
                    responseData = puterResponse;
                }
                break; 

            } catch (apiError) {
                logger.warn('AI token failed, rotating to next token', {
                    attempt: attempts + 1,
                    error: apiError.message
                });
                attempts++;
                // যদি সব টোকেন শেষ হয়ে যায় এবং কোনোটিই কাজ না করে
                if (attempts === maxAttempts) {
                    throw new Error('All allocated AI core engines are currently exhausted or rate-limited. Please try again in a few moments.');
                }
            }
        }

        // ৫. সফল রেসপন্স ফ্রন্টএন্ডে পাঠানো
        const replyText =
            typeof responseData === 'string'
                ? responseData
                : responseData && responseData.message && typeof responseData.message.content === 'string'
                    ? responseData.message.content
                    : responseData && responseData.choices && responseData.choices[0] && responseData.choices[0].message
                        ? responseData.choices[0].message.content
                        : null;

        const sanitizedReply = sanitizeMarkdown(replyText || '');

        if (replyText) {
            const conversationId = req.body.conversationId;

            appendConversationMessage({
                userId,
                conversationId,
                userMessage: message,
                assistantMessage: replyText,
                title: req.body.title
            }).catch((saveError) => {
                logger.warn('Conversation save failed', {
                    error: saveError.message,
                    userId: String(userId)
                });
            });

            return res.status(200).json({
                success: true,
                modelUsed: modelType === 'light' ? systemConfig.modelNameLight : (modelType === 'pro' ? systemConfig.modelNamePro : systemConfig.modelNameMax),
                reply: sanitizedReply || replyText
            });
        } else {
            throw new Error('Invalid response structure received from AI engine.');
        }

    } catch (error) {
        logger.error('Core AI generation error', {
            error: error.message
        });
        return res.status(500).json({
            success: false,
            error: 'AI Generation Failed',
            message: 'AI generation failed.'
        });
    }
};

module.exports.generateChatResponse = generateChatResponse;