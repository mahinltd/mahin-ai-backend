/**
 * 💳 Mahin AI - Payment & Subscription Controller
 * পরিচালক ও সিইও: Tanvir Rahman (Mahin Ltd)
 */

const Payment = require('../models/Payment');
const Config = require('../models/Config');
const User = require('../models/User');
const axios = require('axios');
const sendEmail = require('../utils/sendEmail');
const logger = require('../utils/logger');
const { escapeHtml, isDuplicateKeyError } = require('../utils/security');

const isSafeTransactionId = (value) => typeof value === 'string' && /^[A-Za-z0-9_-]{5,100}$/.test(value.trim());

const isSafePhoneNumber = (value) => typeof value === 'string' && /^\+?[0-9]{7,20}$/.test(value.trim());

const isSafePayPalOrderId = (value) => typeof value === 'string' && /^[A-Za-z0-9-]{5,128}$/.test(value.trim());

const isValidPlan = (value) => ['pro', 'max'].includes(String(value || '').trim().toLowerCase());

const getPagination = (query) => {
    const pageValue = Number.parseInt(query?.page, 10);
    const limitValue = Number.parseInt(query?.limit, 10);
    const page = Number.isInteger(pageValue) && pageValue > 0 ? pageValue : 1;
    const limit = Number.isInteger(limitValue) && limitValue > 0 ? Math.min(limitValue, 100) : 20;
    const skip = (page - 1) * limit;

    return { page, limit, skip };
};

const getPlanPricing = (systemConfig, plan, currency) => {
    const normalizedPlan = String(plan || 'pro').trim().toLowerCase();
    const normalizedCurrency = String(currency || '').toUpperCase();

    if (normalizedPlan === 'max') {
        return normalizedCurrency === 'USD'
            ? Number(systemConfig?.priceMaxUSD || 10)
            : Number(systemConfig?.priceMaxBDT || 599);
    }

    return normalizedCurrency === 'USD'
        ? Number(systemConfig?.priceUSD || 5)
        : Number(systemConfig?.priceBDT || 299);
};

const getPayPalBaseUrl = () => {
    const mode = String(process.env.PAYPAL_ENV || process.env.PAYPAL_MODE || 'sandbox').toLowerCase();
    return mode === 'live' || mode === 'production'
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com';
};

const getPayPalAccessToken = async () => {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        throw new Error('PayPal credentials are missing. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.');
    }

    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const response = await axios.post(
        `${getPayPalBaseUrl()}/v1/oauth2/token`,
        'grant_type=client_credentials',
        {
            headers: {
                Authorization: `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            timeout: 15000
        }
    );

    return response.data.access_token;
};

const verifyPayPalOrder = async (orderId) => {
    const accessToken = await getPayPalAccessToken();
    const response = await axios.get(
        `${getPayPalBaseUrl()}/v2/checkout/orders/${encodeURIComponent(orderId)}`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            timeout: 15000
        }
    );

    return response.data;
};

/**
 * @desc    বিকাশ/নগদ/রকেট ম্যানুয়াল পেমেন্ট সাবমিশন (৳২৯৯)
 * @route   POST /api/v1/payment/manual-submit
 * @access  Protected (Requires Login)
 */
const submitManualPayment = async (req, res) => {
    try {
        const { gateway, transactionId, senderNumber, plan } = req.body;
        const userId = req.user._id;
        const normalizedPlan = String(plan || 'pro').trim().toLowerCase();

        // ১. ইনপুট ভ্যালিডেশন
        if (!['bkash', 'nagad', 'rocket', 'paypal'].includes(gateway) || !isSafeTransactionId(transactionId)) {
            return res.status(400).json({ success: false, message: 'Gateway and Transaction ID are required.' });
        }
        if (!isValidPlan(normalizedPlan)) {
            return res.status(400).json({ success: false, message: 'Invalid plan selection. Use pro or max.' });
        }
        if (senderNumber && !isSafePhoneNumber(senderNumber)) {
            return res.status(400).json({ success: false, message: 'Please provide a valid sender number.' });
        }

        // ২. লাইভ ডাটাবেজ থেকে বর্তমান BDT প্রাইস রিড করা (Default: 299)
        const systemConfig = await Config.findOne();
        const currentAmount = getPlanPricing(systemConfig, normalizedPlan, 'BDT');

        // ৩. অ্যান্টি-ফ্রড চেক (Anti-Fraud Check): একই TrxID ডাটাবেজে অলরেডি আছে কি না চেক
        const trxExists = await Payment.findOne({ transactionId: transactionId.trim() });
        if (trxExists) {
            return res.status(400).json({ 
                success: false, 
                message: 'This Transaction ID has already been used or is currently under review.' 
            });
        }

        // ৪. পেমেন্ট রেকর্ড তৈরি (Status: pending)
        const payment = await Payment.create({
            userId,
            gateway,
            amount: currentAmount,
            currency: 'BDT',
            transactionId: transactionId.trim(),
            senderNumber: senderNumber || '',
            plan: normalizedPlan,
            status: 'pending'
        });

        // ৫. ১০x অ্যাডমিন অ্যালার্ট (Resend API দিয়ে প্রধান পরিচালকের মেইলে তাৎক্ষণিক নোটিফিকেশন)
        const emailHtml = `
            <h3>New Payment Request Received - Mahin AI</h3>
            <p><strong>User:</strong> ${escapeHtml(req.user.name)} (${escapeHtml(req.user.email)})</p>
            <p><strong>Method:</strong> ${escapeHtml(String(gateway).toUpperCase())}</p>
            <p><strong>Sender No:</strong> ${escapeHtml(senderNumber || 'N/A')}</p>
            <p><strong>TrxID:</strong> ${escapeHtml(transactionId)}</p>
            <p><strong>Plan:</strong> ${escapeHtml(normalizedPlan.toUpperCase())}</p>
            <p><strong>Amount:</strong> ৳${currentAmount}</p>
            <p>Please review this transaction from your Admin Control Room to Approve the user.</p>
        `;
        
        // ব্যাকগ্রাউন্ডে অ্যাডমিনকে মেইল পাঠানো (মেইন প্রসেস ব্লক না করে)
        sendEmail(process.env.ADMIN_EMAIL, '💳 New Payment Request Pending - Mahin AI', emailHtml);

        res.status(201).json({
            success: true,
            message: 'Payment submitted successfully. Your request is under review by Mahin Ltd Admin Team.',
            paymentId: payment._id
        });

    } catch (error) {
        if (isDuplicateKeyError(error)) {
            return res.status(400).json({
                success: false,
                message: 'This Transaction ID has already been used or is currently under review.'
            });
        }

        logger.error('Manual payment submission error', {
            error: error.message
        });
        res.status(500).json({ success: false, error: 'Payment Processing Failed', message: 'An internal server error occurred.' });
    }
};

/**
 * @desc    পেপাল সফল পেমেন্ট অটো-ইন্টিগ্রেশন ($5)
 * @route   POST /api/v1/payment/paypal-success
 * @access  Protected (Requires Login)
 */
const paypalSuccessHandler = async (req, res) => {
    try {
        const { orderId, transactionId, plan } = req.body; // ফ্রন্টএন্ড পেপাল SDK সফল পেমেন্টের পর এই ডেটা দেবে
        const userId = req.user._id;
        const normalizedPlan = String(plan || 'pro').trim().toLowerCase();

        const systemConfig = await Config.findOne();
        const expectedUSD = getPlanPricing(systemConfig, normalizedPlan, 'USD');

        if (!isSafePayPalOrderId(orderId)) {
            return res.status(400).json({ success: false, message: 'Invalid PayPal order data.' });
        }

        if (!isValidPlan(normalizedPlan)) {
            return res.status(400).json({ success: false, message: 'Invalid plan selection. Use pro or max.' });
        }

        const paypalOrder = await verifyPayPalOrder(orderId.trim());
        const paypalStatus = String(paypalOrder.status || '').toUpperCase();
        const purchaseUnit = paypalOrder.purchase_units && paypalOrder.purchase_units[0];
        const capturedPayment = purchaseUnit && purchaseUnit.payments && purchaseUnit.payments.captures && purchaseUnit.payments.captures[0];
        const verifiedAmount = Number(purchaseUnit && purchaseUnit.amount && purchaseUnit.amount.value);
        const verifiedCurrency = String((purchaseUnit && purchaseUnit.amount && purchaseUnit.amount.currency_code) || '').toUpperCase();
        const verifiedTransactionId = capturedPayment && capturedPayment.id ? String(capturedPayment.id).trim() : orderId.trim();

        if (paypalStatus !== 'COMPLETED') {
            return res.status(400).json({ success: false, message: 'PayPal order is not completed yet.' });
        }

        if (verifiedCurrency !== 'USD' || Number.isNaN(verifiedAmount) || Math.abs(verifiedAmount - Number(expectedUSD)) > 0.01) {
            return res.status(400).json({ success: false, message: 'PayPal amount or currency does not match the expected plan price.' });
        }

        if (transactionId && String(transactionId).trim() !== verifiedTransactionId) {
            return res.status(400).json({ success: false, message: 'Transaction data does not match PayPal verification.' });
        }

        // ১. ট্রানজেকশন আইডি ইউনিক কি না চেক
        const trxExists = await Payment.findOne({ transactionId: verifiedTransactionId });
        if (trxExists) {
            return res.status(400).json({ success: false, message: 'Duplicate transaction processed.' });
        }

        // ২. PayPal থেকে যাচাই করা পেমেন্টকে approved হিসেবে সংরক্ষণ করা
        const payment = await Payment.create({
            userId,
            gateway: 'paypal',
            amount: verifiedAmount,
            currency: 'USD',
            transactionId: verifiedTransactionId,
            paypalOrderId: orderId.trim(),
            plan: normalizedPlan,
            status: 'approved'
        });

        // ৩. ইউজারের নির্বাচিত plan সরাসরি সক্রিয় করা কারণ পেমেন্ট সার্ভার-সাইডে যাচাই করা হয়েছে
        await User.findByIdAndUpdate(userId, { currentPlan: normalizedPlan });

        // ৪. ইউজার ও অ্যাডমিনকে নোটিফাই করা
        const userEmailHtml = `
            <h2>PayPal payment verified</h2>
            <p>Dear ${escapeHtml(req.user.name)}, your PayPal payment of $${verifiedAmount} has been verified successfully.</p>
            <p>Your <strong>Mahin AI ${escapeHtml(normalizedPlan.toUpperCase())}</strong> subscription is now active.</p>
        `;
        sendEmail(req.user.email, '⚡ Subscription Activated - Mahin AI', userEmailHtml);

        const adminEmailHtml = `
            <h3>New PayPal Payment Verified</h3>
            <p><strong>User:</strong> ${escapeHtml(req.user.name)} (${escapeHtml(req.user.email)})</p>
            <p><strong>Order ID:</strong> ${escapeHtml(orderId)}</p>
            <p><strong>Capture ID:</strong> ${escapeHtml(verifiedTransactionId)}</p>
            <p><strong>Amount:</strong> $${verifiedAmount}</p>
            <p>The payment has been verified directly against PayPal and the user was upgraded to ${escapeHtml(normalizedPlan.toUpperCase())}.</p>
        `;
        sendEmail(process.env.ADMIN_EMAIL, '✅ PayPal Payment Verified - Mahin AI', adminEmailHtml);

        res.status(200).json({
            success: true,
            message: 'PayPal payment verified and Pro access granted.',
            paymentId: payment._id
        });

    } catch (error) {
        if (isDuplicateKeyError(error)) {
            return res.status(400).json({ success: false, message: 'Duplicate transaction processed.' });
        }

        logger.error('PayPal success handler error', {
            error: error.message
        });
        res.status(500).json({ success: false, error: 'PayPal processing failed' });
    }
};

const getPaymentHistory = async (req, res) => {
    try {
        const { page, limit, skip } = getPagination(req.query);

        const [payments, total] = await Promise.all([
            Payment.find({ userId: req.user._id })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .select('gateway amount currency transactionId paypalOrderId senderNumber plan status createdAt updatedAt')
                .lean(),
            Payment.countDocuments({ userId: req.user._id })
        ]);

        return res.status(200).json({
            success: true,
            count: payments.length,
            payments,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.max(1, Math.ceil(total / limit))
            }
        });
    } catch (error) {
        logger.error('Payment history error', { error: error.message });
        return res.status(500).json({ success: false, message: 'Failed to fetch payment history.' });
    }
};

module.exports = { submitManualPayment, paypalSuccessHandler, getPaymentHistory };