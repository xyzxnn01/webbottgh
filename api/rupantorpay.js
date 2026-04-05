// Vercel Serverless Function — RupantorPay Proxy
// Browser can't call RupantorPay directly (CORS), so this proxies the request server-side

const RUPANTORPAY_API_KEY = 'AU2em4XZBL7aIJQfR6tzP59W7OeJ4MIKmMGzxLK0SiyFkLip6X';
const RUPANTORPAY_CHECKOUT_URL = 'https://payment.rupantorpay.com/api/payment/checkout';
const RUPANTORPAY_VERIFY_URL = 'https://payment.rupantorpay.com/api/payment/verify-payment';

module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    const { action, ...payload } = req.body || {};

    if (!action) {
        return res.status(400).json({ success: false, message: 'Missing action parameter' });
    }

    const headers = {
        'accept': 'application/json',
        'X-API-KEY': RUPANTORPAY_API_KEY,
        'content-type': 'application/json',
    };

    try {
        let targetUrl;

        if (action === 'checkout') {
            targetUrl = RUPANTORPAY_CHECKOUT_URL;
        } else if (action === 'verify') {
            targetUrl = RUPANTORPAY_VERIFY_URL;
        } else {
            return res.status(400).json({ success: false, message: 'Invalid action' });
        }

        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload),
        });

        const data = await response.json();
        return res.status(200).json(data);

    } catch (error) {
        console.error('[RupantorPay Proxy] Error:', error.message);
        return res.status(502).json({ success: false, message: 'Payment gateway temporarily unavailable' });
    }
};
