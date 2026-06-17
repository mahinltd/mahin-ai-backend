const writeLog = (level, message, meta = {}) => {
    const payload = {
        level,
        message,
        ...meta,
        timestamp: new Date().toISOString()
    };

    const line = JSON.stringify(payload);

    if (level === 'error') {
        console.error(line);
        return;
    }

    if (level === 'warn') {
        console.warn(line);
        return;
    }

    console.log(line);
};

const logger = {
    info: (message, meta) => writeLog('info', message, meta),
    warn: (message, meta) => writeLog('warn', message, meta),
    error: (message, meta) => writeLog('error', message, meta)
};

module.exports = logger;