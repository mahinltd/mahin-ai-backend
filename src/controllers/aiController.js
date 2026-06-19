/**
 * 🤖 Mahin AI - Core AI Generation Controller with Token Rotation
 * পরিচালক ও সিইও: Tanvir Rahman (Mahin Ltd)
 */

const fs = require('fs');
const logger = require('../utils/logger');
const { sanitizeMarkdown } = require('../utils/security');
const { appendConversationMessage } = require('./conversationController');
const aiService = require('../services/aiService');
const Config = require('../models/Config');

const resolveModel = (modelType) => {
    if (modelType === 'light') {
        return 'gpt-4o-mini';
    }

    if (modelType === 'pro') {
        return 'gpt-4o';
    }

    return 'gpt-4o';
};

const loadSystemConfig = async () => {
    let systemConfig = await Config.findOne()
        .select('modelNameLight modelNamePro modelNameMax isProModelActive isMaxModelActive')
        .lean();

    if (!systemConfig) {
        systemConfig = await Config.create({});
    }

    return systemConfig;
};

const generateChatResponse = async (req, res) => {
    try {
        const { message, modelType } = req.body;
        const userId = req.user._id;

        if (typeof message !== 'string' || message.trim().length === 0) {
            return res.status(400).json({ success: false, message: 'Please provide a message/prompt' });
        }

        const systemConfig = await loadSystemConfig();

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

        const reply = await aiService.generateReplyWithRotation({
            messages: [
                { role: 'system', content: aiService.buildSystemPrompt() },
                { role: 'user', content: message }
            ],
            preferredProviders: ['puter', 'gemini', 'groq'],
            model: resolveModel(modelType),
            providerOverrides: req.app?.locals?.aiProviderOverrides || {}
        });

        const sanitizedReply = sanitizeMarkdown(reply || '');
        const conversationId = req.body.conversationId;

        if (reply) {
            appendConversationMessage({
                userId,
                conversationId,
                userMessage: message,
                assistantMessage: reply,
                title: req.body.title
            }).catch((saveError) => {
                if (process.env.NODE_ENV !== 'test') {
                    logger.warn('Conversation save failed', {
                        error: saveError.message,
                        userId: String(userId)
                    });
                }
            });

            return res.status(200).json({
                success: true,
                modelUsed: modelType === 'light' ? systemConfig.modelNameLight : (modelType === 'pro' ? systemConfig.modelNamePro : systemConfig.modelNameMax),
                reply: sanitizedReply || reply
            });
        }

        throw new Error('Invalid response structure received from AI engine.');
    } catch (error) {
        logger.error('Core AI generation error', { error: error.message });
        return res.status(500).json({
            success: false,
            error: 'AI Generation Failed',
            message: 'AI generation failed.'
        });
    }
};

const generateChatStream = async (req, res) => {
    try {
        const { message, modelType, title, conversationId } = req.body;

        if (typeof message !== 'string' || message.trim().length === 0) {
            return res.status(400).json({ success: false, message: 'Please provide a message/prompt' });
        }

        res.status(200);
        res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders?.();

        const result = await aiService.streamChatReply({
            res,
            message,
            modelType,
            title,
            conversationId,
            userId: req.user?._id,
            providerOverrides: req.app?.locals?.aiProviderOverrides || {}
        });

        if (result?.reply && req.user?._id) {
            appendConversationMessage({
                userId: req.user._id,
                conversationId,
                userMessage: message,
                assistantMessage: result.reply,
                title
            }).catch((saveError) => {
                if (process.env.NODE_ENV !== 'test') {
                    logger.warn('Conversation save failed', {
                        error: saveError.message,
                        userId: String(req.user._id)
                    });
                }
            });
        }
    } catch (error) {
        logger.error('Stream AI generation error', { error: error.message });
        if (!res.headersSent) {
            return res.status(500).json({ success: false, message: 'Streaming failed' });
        }

        res.write(`event: error\ndata: ${JSON.stringify({ success: false, message: 'Streaming failed' })}\n\n`);
        res.end();
    }
};

const generateImageResponse = async (req, res) => {
    try {
        const prompt = req.body?.prompt || req.body?.message;
        const result = await aiService.generateImageAsset({ prompt });

        return res.status(200).json({
            success: true,
            url: result.url,
            assetId: result.assetId
        });
    } catch (error) {
        logger.error('Image generation error', { error: error.message });
        return res.status(400).json({ success: false, message: error.message });
    }
};

const generateVisionResponse = async (req, res) => {
    try {
        const image = req.file;
        if (!image || !Buffer.isBuffer(image.buffer)) {
            return res.status(400).json({ success: false, message: 'Please upload an image file.' });
        }

        const text = await aiService.callGeminiRest({
            messages: [
                { role: 'user', content: req.body?.prompt || 'Extract text and analyze the image.' }
            ],
            model: 'gemini-2.0-flash',
            imageBase64: image.buffer.toString('base64'),
            mimeType: image.mimetype
        });

        return res.status(200).json({ success: true, text: sanitizeMarkdown(text) });
    } catch (error) {
        logger.error('Vision/OCR error', { error: error.message });
        return res.status(500).json({ success: false, message: 'Vision processing failed.' });
    }
};

const generateDocumentChat = async (req, res) => {
    try {
        const file = req.file;
        if (!file || !Buffer.isBuffer(file.buffer)) {
            return res.status(400).json({ success: false, message: 'Please upload a PDF or DOCX file.' });
        }

        const documentText = await aiService.maybeLoadDocumentText({
            buffer: file.buffer,
            originalName: file.originalname,
            mimeType: file.mimetype
        });

        const prompt = req.body?.prompt || 'Summarize and answer questions from the uploaded document.';
        const reply = await aiService.generateReplyWithRotation({
            messages: [
                { role: 'system', content: aiService.buildSystemPrompt(`Document context:\n${documentText.slice(0, 25000)}`) },
                { role: 'user', content: prompt }
            ],
            preferredProviders: ['puter', 'gemini'],
            model: resolveModel(req.body?.modelType),
            providerOverrides: req.app?.locals?.aiProviderOverrides || {}
        });

        const asset = aiService.persistAsset(Buffer.from(documentText, 'utf8'), {
            extension: 'txt',
            contentType: 'text/plain',
            dispositionName: file.originalname || 'document'
        });

        return res.status(200).json({
            success: true,
            answer: sanitizeMarkdown(reply),
            documentLength: documentText.length,
            downloadUrl: `/api/v1/ai/download/${asset.id}`
        });
    } catch (error) {
        logger.error('Document chat error', { error: error.message });
        return res.status(500).json({ success: false, message: 'Document processing failed.' });
    }
};

const getDownloadAssetHandler = async (req, res) => {
    const asset = aiService.getDownloadAsset(req.params.assetId);

    if (!asset || !fs.existsSync(asset.filePath)) {
        return res.status(404).json({ success: false, message: 'File not found' });
    }

    res.setHeader('Content-Type', asset.contentType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${asset.dispositionName}"`);
    return fs.createReadStream(asset.filePath).pipe(res);
};

module.exports = {
    generateChatResponse,
    generateChatStream,
    generateImageResponse,
    generateVisionResponse,
    generateDocumentChat,
    getDownloadAssetHandler
};