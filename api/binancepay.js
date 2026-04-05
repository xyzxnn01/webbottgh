// Vercel Serverless Function — Binance Pay Proxy
// Signs and proxies requests to Binance Pay API (avoids CORS + PythonAnywhere outbound block)

const crypto = require('crypto');

const BINANCE_PAY_BASE = 'https://bpay.binanceapi.com';

function generateSignature(apiSecret, timestamp, nonce, body) {
    const payload = `${timestamp}\n${nonce}\n${body}\n`;
    return crypto.createHmac('sha512', apiSecret).update(payload).digest('hex').toUpperCase();
}

function generateNonce(len = 32) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < len; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

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

    const { action, api_key, api_secret, ...payload } = req.body || {};

    if (!action || !api_key || !api_secret) {
        return res.status(400).json({ success: false, message: 'Missing action, api_key, or api_secret' });
    }

    try {
        let targetPath;
        let bodyData;

        if (action === 'create-order') {
            targetPath = '/binancepay/openapi/v3/order';
            bodyData = JSON.stringify({
                env: { terminalType: 'WEB' },
                merchantTradeNo: payload.merchantTradeNo,
                orderAmount: parseFloat(payload.orderAmount),
                currency: payload.currency || 'USDT',
                description: payload.description || 'Finorix Pro Subscription',
                goodsDetails: [{
                    goodsType: '02',
                    goodsCategory: 'D000',
                    referenceGoodsId: 'subscription',
                    goodsName: 'Monthly Subscription',
                    goodsDetail: 'Finorix Pro Monthly Subscription'
                }],
                returnUrl: payload.returnUrl || '',
                cancelUrl: payload.cancelUrl || ''
            });
        } else if (action === 'query-order') {
            targetPath = '/binancepay/openapi/v2/order/query';
            bodyData = JSON.stringify({
                merchantTradeNo: payload.merchantTradeNo
            });
        } else {
            return res.status(400).json({ success: false, message: 'Invalid action. Use create-order or query-order' });
        }

        const timestamp = Date.now().toString();
        const nonce = generateNonce(32);
        const signature = generateSignature(api_secret, timestamp, nonce, bodyData);

        const response = await fetch(`${BINANCE_PAY_BASE}${targetPath}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'BinancePay-Timestamp': timestamp,
                'BinancePay-Nonce': nonce,
                'BinancePay-Certificate-SN': api_key,
                'BinancePay-Signature': signature,
            },
            body: bodyData,
        });

        const data = await response.json();
        return res.status(200).json(data);

    } catch (error) {
        console.error('[BinancePay Proxy] Error:', error.message);
        return res.status(502).json({ success: false, message: 'Binance Pay temporarily unavailable' });
    }
};
