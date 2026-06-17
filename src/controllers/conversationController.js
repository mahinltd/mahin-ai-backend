const Conversation = require('../models/Conversation');
const logger = require('../utils/logger');
const { trimString, escapeHtml } = require('../utils/security');

const MAX_TITLE_LENGTH = 120;
const MAX_MESSAGE_LENGTH = 12000;
const LIST_LIMIT_MAX = 100;

const normalizeMessageContent = (value) => trimString(String(value || '')).slice(0, MAX_MESSAGE_LENGTH);

const buildConversationTitle = (message) => {
    const baseTitle = trimString(message).replace(/\s+/g, ' ');
    if (!baseTitle) {
        return 'New conversation';
    }

    return baseTitle.length > MAX_TITLE_LENGTH ? `${baseTitle.slice(0, MAX_TITLE_LENGTH - 1)}…` : baseTitle;
};

const createConversation = async (req, res) => {
    try {
        const { title } = req.body || {};
        const conversation = await Conversation.create({
            userId: req.user._id,
            title: trimString(title) || 'New conversation',
            messages: []
        });

        return res.status(201).json({ success: true, conversation });
    } catch (error) {
        logger.error('Create conversation failed', { error: error.message });
        return res.status(500).json({ success: false, message: 'Failed to create conversation' });
    }
};

const getAllConversations = async (req, res) => {
    try {
        const pageValue = Number.parseInt(req.query.page, 10);
        const limitValue = Number.parseInt(req.query.limit, 10);
        const page = Number.isInteger(pageValue) && pageValue > 0 ? pageValue : 1;
        const limit = Number.isInteger(limitValue) && limitValue > 0 ? Math.min(limitValue, LIST_LIMIT_MAX) : 20;
        const skip = (page - 1) * limit;

        const [conversations, total] = await Promise.all([
            Conversation.find({ userId: req.user._id })
                .sort({ updatedAt: -1 })
                .skip(skip)
                .limit(limit)
                .select('title updatedAt createdAt messages')
                .lean(),
            Conversation.countDocuments({ userId: req.user._id })
        ]);

        return res.status(200).json({
            success: true,
            count: conversations.length,
            conversations,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.max(1, Math.ceil(total / limit))
            }
        });
    } catch (error) {
        logger.error('List conversations failed', { error: error.message });
        return res.status(500).json({ success: false, message: 'Failed to fetch conversations' });
    }
};

const getConversationById = async (req, res) => {
    try {
        const conversation = await Conversation.findOne({
            _id: req.params.id,
            userId: req.user._id
        }).lean();

        if (!conversation) {
            return res.status(404).json({ success: false, message: 'Conversation not found' });
        }

        return res.status(200).json({ success: true, conversation });
    } catch (error) {
        logger.error('Get conversation failed', { error: error.message });
        return res.status(500).json({ success: false, message: 'Failed to fetch conversation' });
    }
};

const renameConversation = async (req, res) => {
    try {
        const title = trimString(req.body?.title);

        if (!title) {
            return res.status(400).json({ success: false, message: 'Please provide a conversation title' });
        }

        const conversation = await Conversation.findOneAndUpdate(
            { _id: req.params.id, userId: req.user._id },
            { title: title.slice(0, MAX_TITLE_LENGTH) },
            { new: true }
        ).lean();

        if (!conversation) {
            return res.status(404).json({ success: false, message: 'Conversation not found' });
        }

        return res.status(200).json({ success: true, conversation });
    } catch (error) {
        logger.error('Rename conversation failed', { error: error.message });
        return res.status(500).json({ success: false, message: 'Failed to rename conversation' });
    }
};

const deleteConversation = async (req, res) => {
    try {
        const conversation = await Conversation.findOneAndDelete({
            _id: req.params.id,
            userId: req.user._id
        }).lean();

        if (!conversation) {
            return res.status(404).json({ success: false, message: 'Conversation not found' });
        }

        return res.status(200).json({ success: true, message: 'Conversation deleted successfully' });
    } catch (error) {
        logger.error('Delete conversation failed', { error: error.message });
        return res.status(500).json({ success: false, message: 'Failed to delete conversation' });
    }
};

const appendConversationMessage = async ({ userId, conversationId, userMessage, assistantMessage, title }) => {
    const safeUserMessage = normalizeMessageContent(userMessage);
    const safeAssistantMessage = normalizeMessageContent(assistantMessage);

    if (!safeUserMessage || !safeAssistantMessage) {
        return null;
    }

    let conversation = null;

    if (conversationId) {
        conversation = await Conversation.findOne({ _id: conversationId, userId });
    }

    if (!conversation) {
        conversation = new Conversation({
            userId,
            title: trimString(title) || buildConversationTitle(safeUserMessage),
            messages: []
        });
    }

    if (!conversation.title || conversation.title === 'New conversation') {
        conversation.title = trimString(title) || buildConversationTitle(safeUserMessage);
    }

    conversation.messages.push(
        { role: 'user', content: safeUserMessage, timestamp: new Date() },
        { role: 'assistant', content: safeAssistantMessage, timestamp: new Date() }
    );

    await conversation.save();
    return conversation;
};

module.exports = {
    createConversation,
    getAllConversations,
    getConversationById,
    renameConversation,
    deleteConversation,
    appendConversationMessage
};