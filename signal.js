const https = require('https');

// Market → TradingView scanner mapping
const MARKET_MAP = {
    'EURUSD': { screener: 'forex', symbol: 'FX_IDC:EURUSD' },
    'GBPUSD': { screener: 'forex', symbol: 'FX_IDC:GBPUSD' },
    'USDJPY': { screener: 'forex', symbol: 'FX_IDC:USDJPY' },
    'USDCAD': { screener: 'forex', symbol: 'FX_IDC:USDCAD' },
    'AUDUSD': { screener: 'forex', symbol: 'FX_IDC:AUDUSD' },
    'NZDUSD': { screener: 'forex', symbol: 'FX_IDC:NZDUSD' },
    'EURJPY': { screener: 'forex', symbol: 'FX_IDC:EURJPY' },
    'GBPJPY': { screener: 'forex', symbol: 'FX_IDC:GBPJPY' },
    'EURGBP': { screener: 'forex', symbol: 'FX_IDC:EURGBP' },
    'CADJPY': { screener: 'forex', symbol: 'FX_IDC:CADJPY' },
    'XAUUSD': { screener: 'cfd', symbol: 'TVC:GOLD' },
    'XAGUSD': { screener: 'cfd', symbol: 'TVC:SILVER' },
    'USOIL':  { screener: 'cfd', symbol: 'TVC:USOIL' },
    'US30':   { screener: 'cfd', symbol: 'TVC:DJI' },
    'US500':  { screener: 'cfd', symbol: 'TVC:SPX' },
    'BTCUSDT': { screener: 'crypto', symbol: 'BINANCE:BTCUSDT' },
    'ETHUSDT': { screener: 'crypto', symbol: 'BINANCE:ETHUSDT' }
};

// Technical analysis indicators to fetch (1-min + 5-min for confirmation)
const COLUMNS = [
    'Recommend.All|1',
    'Recommend.MA|1',
    'Recommend.Other|1',
    'RSI|1',
    'Stoch.K|1',
    'Stoch.D|1',
    'CCI20|1',
    'ADX|1',
    'MACD.macd|1',
    'MACD.signal|1',
    'Mom|1',
    'Recommend.All|5',
    'Recommend.MA|5',
    'Recommend.Other|5',
    'close|1'
];

/**
 * Fetch real-time technical analysis from TradingView scanner API
 */
function fetchTradingView(screener, symbol) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            symbols: { tickers: [symbol] },
            columns: COLUMNS
        });

        const options = {
            hostname: 'scanner.tradingview.com',
            path: `/${screener}/scan`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData),
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 8000
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(new Error('Invalid JSON from TradingView'));
                }
            });
        });

        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('TradingView request timeout')); });
        req.write(postData);
        req.end();
    });
}

/**
 * Analyze TradingView data and produce a trading signal
 * Uses 15+ technical indicators: Moving Averages, RSI, MACD, Stochastic, CCI, ADX, Momentum
 */
function analyzeSignal(data) {
    if (!data || !data.data || !data.data[0] || !data.data[0].d) {
        return null;
    }

    const v = data.data[0].d;
    const rec1      = v[0];   // Recommend.All 1-min (combined: -1 to 1)
    const recMA1    = v[1];   // Recommend.MA 1-min (moving averages: -1 to 1)
    const recOsc1   = v[2];   // Recommend.Other 1-min (oscillators: -1 to 1)
    const rsi1      = v[3];   // RSI 1-min
    const stochK1   = v[4];   // Stochastic %K 1-min
    const stochD1   = v[5];   // Stochastic %D 1-min
    const cci1      = v[6];   // CCI(20) 1-min
    const adx1      = v[7];   // ADX 1-min
    const macd1     = v[8];   // MACD 1-min
    const macdSig1  = v[9];   // MACD Signal 1-min
    const mom1      = v[10];  // Momentum 1-min
    const rec5      = v[11];  // Recommend.All 5-min
    const recMA5    = v[12];  // Recommend.MA 5-min
    const recOsc5   = v[13];  // Recommend.Other 5-min
    const close     = v[14];  // Current close price

    // === DIRECTION DECISION ===
    // Primary: 1-min combined recommendation (26+ indicators)
    let direction;
    if (rec1 > 0.1) {
        direction = 'CALL';
    } else if (rec1 < -0.1) {
        direction = 'PUT';
    } else {
        // Neutral zone — use Moving Averages as tiebreaker
        direction = (recMA1 || 0) >= 0 ? 'CALL' : 'PUT';
    }

    // === SIGNAL STRENGTH CALCULATION (55% - 95%) ===
    let strength = 50;
    const absRec = Math.abs(rec1 || 0);

    // 1) Main signal from combined recommendation (adds 0-30)
    strength += absRec * 30;

    // 2) 5-min trend confirmation (adds/subtracts up to 10)
    if (rec5 !== null && rec5 !== undefined) {
        const sameDir5 = (rec1 > 0 && rec5 > 0) || (rec1 < 0 && rec5 < 0);
        if (sameDir5) {
            strength += Math.min(10, Math.abs(rec5) * 10);
        } else if (Math.abs(rec5 || 0) > 0.1) {
            strength -= 5; // 5-min disagrees → lower confidence
        }
    }

    // 3) Moving Average confirmation (adds 0-5)
    if (recMA1 !== null && recMA1 !== undefined) {
        const maAgrees = (direction === 'CALL' && recMA1 > 0) || (direction === 'PUT' && recMA1 < 0);
        if (maAgrees) strength += Math.min(5, Math.abs(recMA1) * 5);
    }

    // 4) RSI confirmation (adds/subtracts up to 5)
    if (rsi1 !== null && rsi1 !== undefined) {
        if ((direction === 'CALL' && rsi1 < 30) || (direction === 'PUT' && rsi1 > 70)) {
            strength += 5; // RSI confirms reversal signal
        } else if ((direction === 'CALL' && rsi1 > 75) || (direction === 'PUT' && rsi1 < 25)) {
            strength -= 3; // RSI contradicts
        }
    }

    // 5) ADX trend intensity bonus (adds 0-3)
    if (adx1 !== null && adx1 !== undefined && adx1 > 25) {
        strength += 3; // Strong trend present
    }

    // 6) MACD confirmation (adds 0-2)
    if (macd1 !== null && macdSig1 !== null && macd1 !== undefined && macdSig1 !== undefined) {
        const macdBullish = macd1 > macdSig1;
        if ((direction === 'CALL' && macdBullish) || (direction === 'PUT' && !macdBullish)) {
            strength += 2;
        }
    }

    // Clamp to 55-95 range
    strength = Math.min(95, Math.max(55, Math.round(strength)));

    // Build analysis summary
    const safe = (val, decimals) => (val !== null && val !== undefined) ? parseFloat(val.toFixed(decimals)) : null;

    return {
        direction,
        strength,
        analysis: {
            recommend_all_1m: safe(rec1, 4),
            recommend_ma_1m: safe(recMA1, 4),
            recommend_osc_1m: safe(recOsc1, 4),
            recommend_all_5m: safe(rec5, 4),
            rsi: safe(rsi1, 2),
            stoch_k: safe(stochK1, 2),
            stoch_d: safe(stochD1, 2),
            cci: safe(cci1, 2),
            adx: safe(adx1, 2),
            macd: safe(macd1, 6),
            macd_signal: safe(macdSig1, 6),
            momentum: safe(mom1, 4),
            close: close
        }
    };
}

module.exports = async (req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Cache at Vercel CDN for 30s, serve stale up to 60s while revalidating
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');

    const market = (req.query.market || 'EURUSD').toUpperCase();
    const config = MARKET_MAP[market];

    if (!config) {
        return res.status(400).json({ success: false, message: 'Unsupported market: ' + market });
    }

    try {
        const data = await fetchTradingView(config.screener, config.symbol);
        const result = analyzeSignal(data);

        if (!result) {
            return res.status(502).json({ success: false, message: 'No analysis data available for ' + market });
        }

        return res.json({
            success: true,
            market,
            direction: result.direction,
            strength: result.strength + '%',
            timeframe: '1 Minute',
            analysis: result.analysis
        });

    } catch (error) {
        return res.status(502).json({ success: false, message: 'Analysis failed: ' + error.message });
    }
};
