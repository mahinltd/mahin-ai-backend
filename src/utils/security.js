const sanitizeHtml = require('sanitize-html');

const escapeHtml = (value) => {
    if (typeof value !== 'string') {
        return '';
    }

    return value.replace(/[&<>'"]/g, (character) => {
        switch (character) {
            case '&': return '&amp;';
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '"': return '&quot;';
            case "'": return '&#39;';
            default: return character;
        }
    });
};

const sanitizeMarkdown = (value) => {
    if (typeof value !== 'string') {
        return '';
    }

    return sanitizeHtml(value.replace(/\u0000/g, ''), {
        allowedTags: [],
        allowedAttributes: {},
        disallowedTagsMode: 'discard'
    });
};

const trimString = (value) => (typeof value === 'string' ? value.trim() : '');

const isDuplicateKeyError = (error) => Boolean(error && (error.code === 11000 || error.code === 11001));

const safeErrorMessage = (error, fallback = 'Internal Server Error') => {
    if (!error || typeof error.message !== 'string') {
        return fallback;
    }

    return fallback;
};

module.exports = {
    escapeHtml,
    sanitizeMarkdown,
    trimString,
    isDuplicateKeyError,
    safeErrorMessage
};