const assert = require('assert');
const http = require('http');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/mahin-ai-test';
process.env.ENABLE_ADMIN_BOOTSTRAP = 'false';
process.env.PUTER_AUTH_TOKEN1 = process.env.PUTER_AUTH_TOKEN1 || 'test-puter-1';
process.env.PUTER_AUTH_TOKEN2 = process.env.PUTER_AUTH_TOKEN2 || 'test-puter-2';
process.env.GEMINI_API_KEY1 = process.env.GEMINI_API_KEY1 || 'test-gemini-1';
process.env.GEMINI_API_KEY2 = process.env.GEMINI_API_KEY2 || 'test-gemini-2';
process.env.GROQ_API_KEY1 = process.env.GROQ_API_KEY1 || 'test-groq-1';
process.env.HUGGINGFACE_API_KEY1 = process.env.HUGGINGFACE_API_KEY1 || 'test-hf-1';

const jwt = require('jsonwebtoken');
const { createApp } = require('./src/app');
const aiService = require('./src/services/aiService');
const Config = require('./src/models/Config');
const User = require('./src/models/User');

const app = createApp();
app.locals.aiProviderOverrides = {
    puter: async () => {
        throw new Error('429 simulated on key 1');
    },
    gemini: async () => 'rotated-success'
};

const userId = '64a000000000000000000001';
const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '1h' });

User.findById = () => ({
    select: async () => ({ _id: userId, accountStatus: 'active' })
});
User.findOne = async () => null;
User.create = async () => ({ _id: userId, save: async () => ({}) });
Config.findOne = () => ({
    select: () => ({
        lean: async () => ({
            modelNameLight: 'MahinAi-Light',
            modelNamePro: 'MahinAi-Pro',
            modelNameMax: 'MahinAi-Max',
            isProModelActive: true,
            isMaxModelActive: true
        })
    })
});
Config.create = async () => ({
    modelNameLight: 'MahinAi-Light',
    modelNamePro: 'MahinAi-Pro',
    modelNameMax: 'MahinAi-Max',
    isProModelActive: true,
    isMaxModelActive: true
});

const originalGenerateImageAsset = aiService.generateImageAsset;
const originalPersistAsset = aiService.persistAsset;
const originalGetDownloadAsset = aiService.getDownloadAsset;

aiService.generateImageAsset = async () => ({
    url: '/api/v1/ai/download/test-asset',
    assetId: 'test-asset',
    buffer: Buffer.from('fake-image-bytes'),
    contentType: 'image/png'
});

aiService.persistAsset = () => ({ id: 'test-asset', filePath: __filename, contentType: 'image/png', dispositionName: 'generated-image.png' });
aiService.getDownloadAsset = () => ({ id: 'test-asset', filePath: __filename, contentType: 'image/png', dispositionName: 'generated-image.png' });

const server = app.listen(0);

const request = (method, path, body, headers = {}) => new Promise((resolve, reject) => {
    const { port } = server.address();
    const payload = body ? Buffer.from(JSON.stringify(body)) : null;
    const options = {
        method,
        host: '127.0.0.1',
        port,
        path,
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': payload ? payload.length : 0,
            Authorization: `Bearer ${token}`,
            ...headers
        }
    };

    const req = http.request(options, (res) => {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body: data }));
    });

    req.on('error', reject);
    if (payload) {
        req.write(payload);
    }
    req.end();
});

const requestStream = () => new Promise((resolve, reject) => {
    const { port } = server.address();
    const payload = Buffer.from(JSON.stringify({ message: 'hello stream' }));
    const req = http.request({
        method: 'POST',
        host: '127.0.0.1',
        port,
        path: '/api/v1/ai/chat/stream',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': payload.length,
            Authorization: `Bearer ${token}`,
            Accept: 'text/event-stream'
        }
    }, (res) => {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
            data += chunk;
            if (data.includes('event: done')) {
                req.destroy();
                resolve({ statusCode: res.statusCode, headers: res.headers, body: data });
            }
        });
        res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body: data }));
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
});

const run = async () => {
    try {
        const liveChat = await request('POST', '/api/v1/ai/chat', { message: 'Hello Mahin AI' });
        assert.strictEqual(liveChat.statusCode, 200);
        assert.ok(liveChat.body.includes('success'));

        const stream = await requestStream();
        assert.strictEqual(stream.statusCode, 200);
        assert.ok(stream.body.includes('event: token') || stream.body.includes('event: done'));

        const image = await request('POST', '/api/v1/ai/generate-image', { prompt: 'a futuristic AI studio' });
        assert.strictEqual(image.statusCode, 200);
        assert.ok(image.body.includes('/api/v1/ai/download/') || image.body.includes('.png'));

        const download = await request('GET', '/api/v1/ai/download/test-asset');
        assert.strictEqual(download.statusCode, 200);
        assert.ok(download.headers['content-disposition']);

        console.log('test-ecosystem: all integration checks passed');
        process.exitCode = 0;
    } catch (error) {
        console.error('test-ecosystem: failed', error);
        process.exitCode = 1;
    } finally {
        server.close();
        aiService.generateImageAsset = originalGenerateImageAsset;
        aiService.persistAsset = originalPersistAsset;
        aiService.getDownloadAsset = originalGetDownloadAsset;
    }
};

run();