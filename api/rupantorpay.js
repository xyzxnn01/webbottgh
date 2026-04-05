// Vercel Serverless Function — RupantorPay Proxy
// Proxies requests to RupantorPay API (avoids CORS + PythonAnywhere outbound block)

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
        return res.status(400).json({ success: false, message: 'Missing action' });
    }

    try {
        if (action === 'checkout') {
            // Create RupantorPay checkout
            const { api_key, amount, callback_url, success_url, cancel_url, customer_name, customer_email, order_id } = payload;

            if (!api_key || !amount) {
                return res.status(400).json({ success: false, message: 'Missing api_key or amount' });
            }

            const body = {
                api_key,
                amount: parseFloat(amount),
                callback_url: callback_url || '',
                success_url: success_url || '',
                cancel_url: cancel_url || '',
                customer_name: customer_name || '',
                customer_email: customer_email || '',
                metadata: JSON.stringify({ order_id: order_id || '' })
            };

            const response = await fetch('https://payment.rupantorpay.com/api/payment/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const data = await response.json();
            return res.status(200).json(data);

        } else if (action === 'verify') {
            // Verify RupantorPay payment
            const { api_key, order_id } = payload;

            if (!api_key || !order_id) {
                return res.status(400).json({ success: false, message: 'Missing api_key or order_id' });
            }

            const response = await fetch('https://payment.rupantorpay.com/api/payment/verify-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ api_key, order_id })
            });

            const data = await response.json();
            return res.status(200).json(data);

        } else {
            return res.status(400).json({ success: false, message: 'Invalid action. Use checkout or verify' });
        }

    } catch (error) {
        console.error('[RupantorPay Proxy] Error:', error.message);
        return res.status(502).json({ success: false, message: 'RupantorPay temporarily unavailable' });
    }
};
