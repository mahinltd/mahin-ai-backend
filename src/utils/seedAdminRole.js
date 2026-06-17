const bcrypt = require('bcryptjs');
const User = require('../models/User');
const logger = require('./logger');

const seedAdminRole = async () => {
    const adminEmail = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();

    if (!adminEmail) {
        logger.warn('ADMIN_EMAIL is not set. Skipping admin role seeding.');
        return;
    }

    const adminUser = await User.findOne({ email: adminEmail });

    if (!adminUser) {
        const bootstrapPassword = String(process.env.ADMIN_BOOTSTRAP_PASSWORD || '').trim();
        const bootstrapName = String(process.env.ADMIN_BOOTSTRAP_NAME || 'Mahin Admin').trim();

        if (!bootstrapPassword) {
            logger.warn('Admin bootstrap password is missing, skipping admin bootstrap', {
                adminEmail
            });
            return;
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(bootstrapPassword, salt);

        await User.create({
            name: bootstrapName,
            email: adminEmail,
            authProvider: 'local',
            passwordHash,
            role: 'admin',
            accountStatus: 'active'
        });

        logger.info('Admin account bootstrapped', {
            adminEmail
        });
        return;
    }

    let changed = false;

    if (adminUser.role !== 'admin') {
        adminUser.role = 'admin';
        changed = true;
    }

    if (adminUser.accountStatus !== 'active') {
        adminUser.accountStatus = 'active';
        changed = true;
    }

    if (changed) {
        await adminUser.save();
        logger.info('Admin role seeded', {
            email: adminUser.email
        });
    } else {
        logger.info('Admin role already seeded', {
            email: adminUser.email
        });
    }
};

module.exports = seedAdminRole;