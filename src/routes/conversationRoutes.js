const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
    createConversation,
    getAllConversations,
    getConversationById,
    renameConversation,
    deleteConversation
} = require('../controllers/conversationController');

router.use(protect);

router.post('/', createConversation);
router.get('/', getAllConversations);
router.get('/:id', getConversationById);
router.put('/:id', renameConversation);
router.delete('/:id', deleteConversation);

module.exports = router;