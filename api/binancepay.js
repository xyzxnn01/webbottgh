// Vercel Serverless Function — Binance Pay Proxy
// Uses Regular Binance API to check Pay transaction history (HMAC-SHA256)

const crypto = require('crypto');

const BINANCE_API_BASE = 'https://api.binance.com';

function sign(queryString, apiSecret) {
    return crypto.createHmac('sha256', apiSecret).update(queryString).digest('hex');
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
        if (action === 'check-transactions') {
            // Check Binance Pay transaction history using regular API
            // GET /sapi/v1/pay/transactions
            const timestamp = Date.now();
            const startTime = payload.startTimestamp || (timestamp - 7200000); // last 2 hours default

            const params = new URLSearchParams();
            params.append('transactionType', '0'); // 0=all
            params.append('startTimestamp', startTime.toString());
            params.append('limit', '100');
            params.append('recvWindow', '10000');
            params.append('timestamp', timestamp.toString());

            const signature = sign(params.toString(), api_secret);
            params.append('signature', signature);

            const response = await fetch(`${BINANCE_API_BASE}/sapi/v1/pay/transactions?${params.toString()}`, {
                method: 'GET',
                headers: {
                    'X-MBX-APIKEY': api_key,
                    'Content-Type': 'application/json'
                }
            });

            let data;
            const respText = await response.text();
            try {
                data = JSON.parse(respText);
            } catch (e) {
                console.error('[BinancePay Proxy] Non-JSON:', respText.substring(0, 500));
                return res.status(502).json({ success: false, message: 'Binance returned invalid response (HTTP ' + response.status + ')' });
            }

            return res.status(200).json(data);

        } else {
            return res.status(400).json({ success: false, message: 'Invalid action. Use check-transactions' });
        }

    } catch (error) {
        console.error('[BinancePay Proxy] Error:', error.message, error.stack);
        return res.status(502).json({ success: false, message: 'Binance API error: ' + error.message });
    }
};
