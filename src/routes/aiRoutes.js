/**
 * 🧭 Mahin AI - AI Routes Configuration with Security Guards
 * পরিচালক ও সিইও: Tanvir Rahman (Mahin Ltd)
 */

const express = require('express');
const multer = require('multer');
const router = express.Router();
const {
	generateChatResponse,
	generateChatStream,
	generateImageResponse,
	generateVisionResponse,
	generateDocumentChat,
	getDownloadAssetHandler
} = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');
const chatRateLimiter = require('../middleware/rateLimiter');

const upload = multer({
	storage: multer.memoryStorage(),
	limits: {
		fileSize: Number(process.env.AI_UPLOAD_LIMIT_BYTES || 10 * 1024 * 1024)
	}
});

router.post('/chat', chatRateLimiter, protect, generateChatResponse);
router.post('/chat/stream', chatRateLimiter, protect, generateChatStream);
router.post('/chat/sse', chatRateLimiter, protect, generateChatStream);
router.post('/generate-image', chatRateLimiter, protect, generateImageResponse);
router.post('/vision', chatRateLimiter, protect, upload.single('image'), generateVisionResponse);
router.post('/document-chat', chatRateLimiter, protect, upload.single('file'), generateDocumentChat);
router.get('/download/:assetId', protect, getDownloadAssetHandler);

module.exports = router;