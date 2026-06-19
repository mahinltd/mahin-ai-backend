const Config = require('../models/Config');
const logger = require('../utils/logger');

const getPublicConfig = async (req, res) => {
    try {
        let config = await Config.findOne()
            .select('modelNameLight modelNamePro modelNameMax priceBDT priceUSD priceMaxBDT priceMaxUSD isProModelActive isMaxModelActive privacyPolicy termsConditions')
            .lean();

        if (!config) {
            config = await Config.create({});
        }

        return res.status(200).json({
            success: true,
            config: {
                modelNameLight: config.modelNameLight,
                modelNamePro: config.modelNamePro,
                modelNameMax: config.modelNameMax,
                priceBDT: config.priceBDT,
                priceUSD: config.priceUSD,
                priceMaxBDT: config.priceMaxBDT,
                priceMaxUSD: config.priceMaxUSD,
                isProModelActive: config.isProModelActive,
                isMaxModelActive: config.isMaxModelActive,
                privacyPolicy: config.privacyPolicy,
                termsConditions: config.termsConditions
            }
        });
    } catch (error) {
        logger.error('Public config fetch error', { error: error.message });
        return res.status(500).json({ success: false, message: 'Failed to fetch public config.' });
    }
};

module.exports = { getPublicConfig };