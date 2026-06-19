const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { init } = require('@heyputer/puter.js/src/init.cjs');
const logger = require('../utils/logger');
const { uploadToCloudinary } = require('../utils/cloudinary');
const { getActiveKey } = require('../config/aiConfig');

const DATA_DIR = path.join(process.cwd(), 'tmp', 'mahin-ai-assets');
const DOWNLOAD_INDEX = new Map();

const ensureDataDir = () => {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    return DATA_DIR;
};

const safeFileName = (name) => String(name || 'asset').replace(/[^a-zA-Z0-9._-]+/g, '_');

const persistAsset = (buffer, options = {}) => {
    ensureDataDir();
    const extension = String(options.extension || 'bin').replace(/[^a-z0-9]/gi, '').toLowerCase() || 'bin';
    const fileName = `${Date.now()}_${crypto.randomBytes(8).toString('hex')}.${extension}`;
    const filePath = path.join(DATA_DIR, fileName);
    fs.writeFileSync(filePath, buffer);

    const id = crypto.createHash('sha1').update(fileName).digest('hex');
    DOWNLOAD_INDEX.set(id, {
        id,
        filePath,
        fileName,
        contentType: options.contentType || 'application/octet-stream',
        dispositionName: safeFileName(options.dispositionName || fileName),
        source: options.source || 'local'
    });

    return DOWNLOAD_INDEX.get(id);
};

const getDownloadAsset = (id) => DOWNLOAD_INDEX.get(id) || null;

const sendEvent = (res, event, data) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
};

const buildSystemPrompt = (extraContext = '') => {
    const base = `You are Mahin AI, an advanced AI system proudly created and developed by Mahin Ltd. The Director and Chief Executive Officer (CEO) of Mahin Ltd is Tanvir Rahman. If any user asks you in any language about who created you, who made you, who is your owner, developer, boss, or CEO, you must answer politely and professionally by proudly highlighting Mahin Ltd and CEO Tanvir Rahman. Under no circumstances should you mention OpenAI, Google, or any other entity as your creator. Provide answers in markdown format.`;
    return extraContext ? `${base}\n\nAdditional context:\n${extraContext}` : base;
};

const normalizeReply = (response) => {
    if (typeof response === 'string') {
        return response;
    }

    return response?.message?.content || response?.choices?.[0]?.message?.content || response?.data?.message?.content || response?.data?.choices?.[0]?.message?.content || '';
};

const callPuterChat = async ({ messages, model }) => {
    const token = getActiveKey('puter');
    if (!token) {
        throw new Error('No active Puter token found.');
    }

    const puter = init(token);
    const result = await puter.ai.chat(messages, { model, temperature: 0.7 });
    return normalizeReply(result);
};

const callGeminiRest = async ({ messages, model = 'gemini-2.0-flash', imageBase64, mimeType }) => {
    const apiKey = getActiveKey('gemini');
    if (!apiKey) {
        throw new Error('No active Gemini key found.');
    }

    const contents = messages.map((message) => ({
        role: message.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: String(message.content || '') }]
    }));

    if (imageBase64) {
        contents.push({
            role: 'user',
            parts: [
                { inline_data: { mime_type: mimeType || 'image/png', data: imageBase64 } },
                { text: 'Extract text and analyze the image.' }
            ]
        });
    }

    const response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        contents,
        generationConfig: { temperature: 0.4 }
    }, {
        timeout: 30000
    });

    return normalizeReply(response.data);
};

const callGroqSearch = async (query) => {
    const apiKey = getActiveKey('groq');
    if (!apiKey) {
        throw new Error('No active Groq key found.');
    }

    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const response = await axios.get(searchUrl, {
        timeout: 15000,
        headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; MahinAI/1.0)'
        }
    });

    const matches = [...String(response.data || '').matchAll(/result__title"[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>[\s\S]*?result__snippet"[^>]*>(.*?)<\/a>/g)].slice(0, 3);
    return matches.map((entry) => ({
        url: entry[1],
        title: entry[2].replace(/<[^>]+>/g, '').trim(),
        snippet: entry[3].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
    }));
};

const maybeLoadDocumentText = async ({ buffer, originalName, mimeType }) => {
    const lowerName = String(originalName || '').toLowerCase();
    const lowerMime = String(mimeType || '').toLowerCase();

    if (lowerMime.includes('pdf') || lowerName.endsWith('.pdf')) {
        const parsed = await pdfParse(buffer);
        return parsed.text || '';
    }

    if (lowerName.endsWith('.docx') || lowerMime.includes('wordprocessingml')) {
        const parsed = await mammoth.extractRawText({ buffer });
        return parsed.value || '';
    }

    return buffer.toString('utf8');
};

const generateReplyWithRotation = async ({ messages, preferredProviders, model, providerOverrides = {} }) => {
    const providers = preferredProviders || ['puter', 'gemini', 'groq'];

    for (const provider of providers) {
        try {
            if (provider === 'puter') {
                if (typeof providerOverrides.puter === 'function') {
                    return await providerOverrides.puter({ messages, model: model || 'gpt-4o-mini' });
                }

                return await callPuterChat({ messages, model: model || 'gpt-4o-mini' });
            }

            if (provider === 'gemini') {
                if (typeof providerOverrides.gemini === 'function') {
                    return await providerOverrides.gemini({ messages, model: model || 'gemini-2.0-flash' });
                }

                return await callGeminiRest({ messages, model: model || 'gemini-2.0-flash' });
            }

            if (provider === 'groq') {
                if (typeof providerOverrides.groq === 'function') {
                    return await providerOverrides.groq({ messages, model: model || 'gpt-4o-mini' });
                }

                const groqNote = await callGroqSearch(messages[messages.length - 1]?.content || '');
                const context = groqNote.map((item) => `- ${item.title}: ${item.snippet} (${item.url})`).join('\n');
                const enhancedMessages = [
                    ...messages.slice(0, -1),
                    { role: 'system', content: buildSystemPrompt(context) },
                    messages[messages.length - 1]
                ];
                return await callPuterChat({ messages: enhancedMessages, model: model || 'gpt-4o-mini' });
            }
        } catch (error) {
            logger.warn('AI provider rotation failed', { provider, error: error.message });
        }
    }

    return String(messages[messages.length - 1]?.content || 'No response generated.');
};

const generateImageAsset = async ({ prompt }) => {
    const promptText = String(prompt || '').trim();
    if (!promptText) {
        throw new Error('Please provide an image prompt.');
    }

    const hfKey = getActiveKey('huggingface');
    let imageBuffer;

    if (hfKey) {
        try {
            const response = await axios.post('https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0', {
                inputs: promptText
            }, {
                responseType: 'arraybuffer',
                timeout: 60000,
                headers: {
                    Authorization: `Bearer ${hfKey}`,
                    Accept: 'image/png'
                }
            });

            imageBuffer = Buffer.from(response.data);
        } catch (error) {
            logger.warn('HuggingFace image generation failed, using deterministic fallback', { error: error.message });
        }
    }

    if (!imageBuffer) {
        const svg = `
            <svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
                <defs>
                    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#0f172a"/>
                        <stop offset="100%" stop-color="#1d4ed8"/>
                    </linearGradient>
                </defs>
                <rect width="1024" height="1024" fill="url(#g)"/>
                <text x="64" y="120" fill="#ffffff" font-size="54" font-family="Arial, Helvetica, sans-serif">Mahin AI Image</text>
                <text x="64" y="210" fill="#cbd5e1" font-size="32" font-family="Arial, Helvetica, sans-serif">${promptText.replace(/[<>&"]/g, '')}</text>
            </svg>
        `;
        imageBuffer = Buffer.from(svg.trim(), 'utf8');
    }

    let uploaded;
    try {
        uploaded = await uploadToCloudinary(imageBuffer, 'mahin_ai_generated');
    } catch (error) {
        logger.warn('Cloudinary upload unavailable, persisting locally', { error: error.message });
    }

    const asset = persistAsset(imageBuffer, {
        extension: uploaded ? 'png' : 'svg',
        contentType: uploaded ? 'image/png' : 'image/svg+xml',
        dispositionName: 'generated-image'
    });

    return {
        url: uploaded?.secure_url || `/api/v1/ai/download/${asset.id}`,
        assetId: asset.id,
        buffer: imageBuffer,
        contentType: asset.contentType
    };
};

const streamChatReply = async ({ res, message, modelType, title, conversationId, userId, context = '', providerOverrides = {} }) => {
    const model = modelType === 'light' ? 'gpt-4o-mini' : 'gpt-4o';
    const reply = await generateReplyWithRotation({
        messages: [
            { role: 'system', content: buildSystemPrompt(context) },
            { role: 'user', content: message }
        ],
        preferredProviders: ['puter', 'gemini', 'groq'],
        model,
        providerOverrides
    });

    const chunks = String(reply || '').match(/.{1,80}/g) || [String(reply || '')];
    for (const chunk of chunks) {
        sendEvent(res, 'token', { token: chunk });
    }

    sendEvent(res, 'done', { success: true, reply });
    res.end();

    return { reply, conversationId, title, userId };
};

module.exports = {
    buildSystemPrompt,
    callGeminiRest,
    callGroqSearch,
    callPuterChat,
    DOWNLOAD_INDEX,
    generateImageAsset,
    generateReplyWithRotation,
    callPuterChat,
    callGeminiRest,
    callGroqSearch,
    getDownloadAsset,
    maybeLoadDocumentText,
    persistAsset,
    sendEvent,
    streamChatReply,
    ensureDataDir
};