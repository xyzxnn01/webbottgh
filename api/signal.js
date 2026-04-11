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

// ============================================================
// 88 INDICATORS across 3 TIMEFRAMES (1m, 5m, 15m)
// Covers: MAs, Oscillators, Momentum, S/R, Volatility
// ============================================================
const COLUMNS = [
    // ===== 1-MINUTE (Entry Timeframe) =====
    // TradingView Combined Recommendations (26 built-in indicators each)
    'Recommend.All|1', 'Recommend.MA|1', 'Recommend.Other|1',
    // Price Action (OHLC)
    'open|1', 'high|1', 'low|1', 'close|1',
    // Moving Averages
    'EMA5|1', 'EMA10|1', 'EMA20|1', 'EMA50|1', 'EMA200|1',
    'SMA10|1', 'SMA20|1', 'SMA50|1',
    // RSI (14) + Previous
    'RSI|1', 'RSI[1]|1',
    // Stochastic (14,3,3) + Previous (for crossover detection)
    'Stoch.K|1', 'Stoch.D|1', 'Stoch.K[1]|1', 'Stoch.D[1]|1',
    // CCI (20) + Previous
    'CCI20|1', 'CCI20[1]|1',
    // ADX (14) + Directional Indicators + Previous
    'ADX|1', 'ADX+DI|1', 'ADX-DI|1', 'ADX+DI[1]|1', 'ADX-DI[1]|1',
    // Awesome Oscillator + Previous
    'AO|1', 'AO[1]|1',
    // Momentum + Previous
    'Mom|1', 'Mom[1]|1',
    // MACD (12,26,9)
    'MACD.macd|1', 'MACD.signal|1',
    // Williams %R (14)
    'W.R|1',
    // Ultimate Oscillator
    'UO|1',
    // Bollinger Bands (20,2)
    'BB.upper|1', 'BB.lower|1',
    // Hull Moving Average (9)
    'HullMA9|1',
    // Volume Weighted MA (20)
    'VWMA|1',
    // Average True Range (14) — volatility
    'ATR|1',
    // Ichimoku Base Line
    'Ichimoku.BLine|1',
    // Pivot Points — Classic (Monthly as S/R reference)
    'Pivot.M.Classic.S3|1', 'Pivot.M.Classic.S2|1', 'Pivot.M.Classic.S1|1',
    'Pivot.M.Classic.Middle|1',
    'Pivot.M.Classic.R1|1', 'Pivot.M.Classic.R2|1', 'Pivot.M.Classic.R3|1',

    // ===== 5-MINUTE (Short-term Trend Confirmation) =====
    'Recommend.All|5', 'Recommend.MA|5', 'Recommend.Other|5',
    'open|5', 'close|5',
    'EMA10|5', 'EMA20|5', 'EMA50|5',
    'SMA20|5', 'SMA50|5',
    'RSI|5',
    'Stoch.K|5', 'Stoch.D|5',
    'ADX|5', 'ADX+DI|5', 'ADX-DI|5',
    'MACD.macd|5', 'MACD.signal|5',
    'Mom|5', 'CCI20|5', 'W.R|5',
    'BB.upper|5', 'BB.lower|5',

    // ===== 15-MINUTE (Major Trend Direction) =====
    'Recommend.All|15', 'Recommend.MA|15', 'Recommend.Other|15',
    'close|15',
    'EMA20|15', 'EMA50|15', 'EMA200|15',
    'SMA20|15', 'SMA50|15',
    'RSI|15',
    'ADX|15', 'ADX+DI|15', 'ADX-DI|15',
    'MACD.macd|15', 'MACD.signal|15',
    'Mom|15',
];

/**
 * Fetch real-time data from TradingView scanner API
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
            timeout: 10000
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); }
                catch (e) { reject(new Error('Invalid JSON from TradingView')); }
            });
        });

        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('TradingView request timeout')); });
        req.write(postData);
        req.end();
    });
}

// Helper: check if value is a valid number
function ok(v) { return v !== null && v !== undefined && !isNaN(v); }
function sf(val, dec) { return ok(val) ? parseFloat(Number(val).toFixed(dec)) : null; }

/**
 * SMART SIGNAL ANALYSIS ENGINE v6
 *
 * Architecture: SIMPLE TREND-FOLLOWING
 * 
 * Philosophy: Follow the candle trend. Use TradingView's own aggregated
 * recommendations as the PRIMARY signal source (26 indicators each).
 * Momentum indicators CONFIRM the trend. NO reversal unless ALL timeframes extreme.
 * 
 * Score breakdown:
 *   1. TV Recommendations (PRIMARY ~50%): 1m*10, 5m*8, 15m*10 → up to ±28
 *   2. Trend confirmation (~25%): EMA ribbon, price vs MAs, ADX DI → up to ±12
 *   3. Momentum support (~25%): MACD, RSI, Stoch, Mom, AO → up to ±12
 *   4. Reversal guard: only when 4+ OB/OS indicators agree → ±6
 *   5. SKIP threshold: 6 (more signals, faster)
 */
function analyzeSignal(data) {
    if (!data || !data.data || !data.data[0] || !data.data[0].d) return null;

    const v = data.data[0].d;

    // ===== PARSE DATA =====
    const m1 = {
        recAll: v[0], recMA: v[1], recOsc: v[2],
        open: v[3], high: v[4], low: v[5], close: v[6],
        ema5: v[7], ema10: v[8], ema20: v[9], ema50: v[10], ema200: v[11],
        sma10: v[12], sma20: v[13], sma50: v[14],
        rsi: v[15], rsiPrev: v[16],
        stochK: v[17], stochD: v[18], stochKPrev: v[19], stochDPrev: v[20],
        cci: v[21], cciPrev: v[22],
        adx: v[23], pdi: v[24], mdi: v[25], pdiPrev: v[26], mdiPrev: v[27],
        ao: v[28], aoPrev: v[29],
        mom: v[30], momPrev: v[31],
        macd: v[32], macdSig: v[33],
        wr: v[34], uo: v[35],
        bbUp: v[36], bbLow: v[37],
        hull: v[38], vwma: v[39], atr: v[40],
        ichiBL: v[41],
        pS3: v[42], pS2: v[43], pS1: v[44], pM: v[45],
        pR1: v[46], pR2: v[47], pR3: v[48],
    };

    const m5 = {
        recAll: v[49], recMA: v[50], recOsc: v[51],
        open: v[52], close: v[53],
        ema10: v[54], ema20: v[55], ema50: v[56],
        sma20: v[57], sma50: v[58],
        rsi: v[59],
        stochK: v[60], stochD: v[61],
        adx: v[62], pdi: v[63], mdi: v[64],
        macd: v[65], macdSig: v[66],
        mom: v[67], cci: v[68], wr: v[69],
        bbUp: v[70], bbLow: v[71],
    };

    const m15 = {
        recAll: v[72], recMA: v[73], recOsc: v[74],
        close: v[75],
        ema20: v[76], ema50: v[77], ema200: v[78],
        sma20: v[79], sma50: v[80],
        rsi: v[81],
        adx: v[82], pdi: v[83], mdi: v[84],
        macd: v[85], macdSig: v[86],
        mom: v[87],
    };

    let score = 0;
    const breakdown = {};
    const add = (name, pts) => {
        const p = Math.round(pts);
        if (p !== 0) { score += p; breakdown[name] = p; }
    };

    // ==========================================================
    // SECTION 1: TRADINGVIEW RECOMMENDATIONS — PRIMARY (50% weight)
    // recAll ranges from -1 (STRONG SELL) to +1 (STRONG BUY)
    // Already aggregates 26 indicators internally
    // ==========================================================
    if (ok(m1.recAll)) add('tv_1m', Math.round(m1.recAll * 10));
    if (ok(m1.recMA))  add('tv_1m_ma', Math.round(m1.recMA * 5));
    if (ok(m1.recOsc)) add('tv_1m_osc', Math.round(m1.recOsc * 3));

    if (ok(m5.recAll)) add('tv_5m', Math.round(m5.recAll * 8));
    if (ok(m5.recMA))  add('tv_5m_ma', Math.round(m5.recMA * 3));

    if (ok(m15.recAll)) add('tv_15m', Math.round(m15.recAll * 10));
    if (ok(m15.recMA))  add('tv_15m_ma', Math.round(m15.recMA * 4));

    // ==========================================================
    // SECTION 2: TREND CONFIRMATION (25% weight)
    // ==========================================================

    // 2.1 EMA Ribbon — trend direction
    if (ok(m1.ema5) && ok(m1.ema10) && ok(m1.ema20) && ok(m1.ema50)) {
        const bullRibbon = m1.ema5 > m1.ema10 && m1.ema10 > m1.ema20 && m1.ema20 > m1.ema50;
        const bearRibbon = m1.ema5 < m1.ema10 && m1.ema10 < m1.ema20 && m1.ema20 < m1.ema50;
        if (bullRibbon) add('ema_ribbon', 4);
        else if (bearRibbon) add('ema_ribbon', -4);
        else {
            let align = 0;
            if (m1.ema5 > m1.ema10) align++; else align--;
            if (m1.ema10 > m1.ema20) align++; else align--;
            if (m1.ema20 > m1.ema50) align++; else align--;
            add('ema_ribbon', align);
        }
    }

    // 2.2 Price vs Key MAs
    if (ok(m1.close)) {
        let maVotes = 0;
        if (ok(m1.ema20)) maVotes += m1.close > m1.ema20 ? 1 : -1;
        if (ok(m1.ema50)) maVotes += m1.close > m1.ema50 ? 1 : -1;
        if (ok(m1.sma20)) maVotes += m1.close > m1.sma20 ? 1 : -1;
        if (ok(m1.sma50)) maVotes += m1.close > m1.sma50 ? 1 : -1;
        if (ok(m1.ema200)) maVotes += m1.close > m1.ema200 ? 1 : -1;
        add('price_vs_ma', maVotes);
    }

    // 2.3 ADX DI — trend direction indicator
    if (ok(m1.pdi) && ok(m1.mdi)) {
        const p = m1.pdi > m1.mdi ? 3 : -3;
        add('adx_di', p);
    }

    // ==========================================================
    // SECTION 3: MOMENTUM SUPPORT (25% weight)
    // ==========================================================

    // 3.1 MACD
    if (ok(m1.macd) && ok(m1.macdSig)) {
        add('macd', m1.macd > m1.macdSig ? 3 : -3);
    }

    // 3.2 RSI momentum (NOT reversal — follow the direction)
    if (ok(m1.rsi)) {
        if (m1.rsi > 60) add('rsi', 2);
        else if (m1.rsi < 40) add('rsi', -2);
    }

    // 3.3 Stochastic position
    if (ok(m1.stochK) && ok(m1.stochD)) {
        add('stoch', m1.stochK > m1.stochD ? 2 : -2);
    }

    // 3.4 Momentum
    if (ok(m1.mom)) {
        add('momentum', m1.mom > 0 ? 2 : -2);
    }

    // 3.5 Awesome Oscillator
    if (ok(m1.ao)) {
        add('ao', m1.ao > 0 ? 2 : -2);
    }

    // 3.6 Current candle direction
    if (ok(m1.open) && ok(m1.close)) {
        add('candle_dir', m1.close > m1.open ? 1 : -1);
    }

    // ==========================================================
    // SECTION 4: REVERSAL GUARD — only at TRUE EXTREMES
    // Requires 4+ OB/OS indicators to agree
    // ==========================================================
    let obSignals = 0, osSignals = 0;
    if (ok(m1.rsi) && m1.rsi > 80) obSignals++;
    if (ok(m1.rsi) && m1.rsi < 20) osSignals++;
    if (ok(m1.stochK) && m1.stochK > 90) obSignals++;
    if (ok(m1.stochK) && m1.stochK < 10) osSignals++;
    if (ok(m1.wr) && m1.wr > -5) obSignals++;
    if (ok(m1.wr) && m1.wr < -95) osSignals++;
    if (ok(m1.cci) && m1.cci > 200) obSignals++;
    if (ok(m1.cci) && m1.cci < -200) osSignals++;
    if (ok(m5.rsi) && m5.rsi > 80) obSignals++;
    if (ok(m5.rsi) && m5.rsi < 20) osSignals++;

    if (obSignals >= 4) {
        add('extreme_ob', -6);
        breakdown['reversal_guard'] = 'TRUE extreme overbought (4+ indicators)';
    }
    if (osSignals >= 4) {
        add('extreme_os', 6);
        breakdown['reversal_guard'] = 'TRUE extreme oversold (4+ indicators)';
    }

    // ==========================================================
    // SECTION 5: FINAL DECISION
    // ==========================================================
    const absScore = Math.abs(score);

    const analysis = {
        close: sf(m1.close, 5),
        total_score: score,
        tv_1m_rec: sf(m1.recAll, 3),
        tv_5m_rec: sf(m5.recAll, 3),
        tv_15m_rec: sf(m15.recAll, 3),
        rsi_1m: sf(m1.rsi, 2),
        stoch_k_1m: sf(m1.stochK, 2),
        macd_1m: ok(m1.macd) && ok(m1.macdSig) ? (m1.macd > m1.macdSig ? 'Bullish' : 'Bearish') : null,
        adx_1m: sf(m1.adx, 2),
        adx_pdi_1m: sf(m1.pdi, 2),
        adx_mdi_1m: sf(m1.mdi, 2),
        m5_trend: ok(m5.recAll) ? (m5.recAll > 0.1 ? 'CALL' : m5.recAll < -0.1 ? 'PUT' : 'NEUTRAL') : null,
        m15_trend: ok(m15.recAll) ? (m15.recAll > 0.1 ? 'CALL' : m15.recAll < -0.1 ? 'PUT' : 'NEUTRAL') : null,
        m5_rsi: sf(m5.rsi, 2),
        m15_rsi: sf(m15.rsi, 2),
        atr: sf(m1.atr, 6),
        ob_signals: obSignals,
        os_signals: osSignals,
        indicator_breakdown: breakdown,
    };

    // SKIP if score too weak
    if (absScore < 6) {
        return {
            direction: 'SKIP',
            strength: 0,
            reason: 'No clear trend direction',
            analysis
        };
    }

    const direction = score > 0 ? 'CALL' : 'PUT';

    // Map score (6-60) → strength (55-95%)
    const clampedScore = Math.min(absScore, 60);
    let strength = Math.round(55 + (clampedScore - 6) * (40 / 54));
    strength = Math.min(95, Math.max(55, strength));

    return { direction, strength, analysis };
}

// ==========================================================
// VERCEL SERVERLESS HANDLER
// ==========================================================
module.exports = async (req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Cache by UTC minute — all users in the same minute get the exact same signal
    // Frontend sends &m=YYYY-MM-DDTHH:MM as cache buster per minute
    const now = new Date();
    const secsLeft = 60 - now.getUTCSeconds();
    res.setHeader('Cache-Control', `s-maxage=${secsLeft}, stale-while-revalidate=5`);

    const market = (req.query.market || 'EURUSD').toUpperCase();
    const minuteKey = req.query.m || now.toISOString().slice(0, 16); // UTC minute key
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

        const entryPrice = result.analysis ? result.analysis.close : null;

        // SKIP signal — tell frontend to wait
        if (result.direction === 'SKIP') {
            return res.json({
                success: true,
                market,
                direction: 'SKIP',
                strength: '0%',
                timeframe: '1 Minute',
                minute_key: minuteKey,
                entry_price: entryPrice,
                reason: result.reason,
                analysis: result.analysis
            });
        }

        return res.json({
            success: true,
            market,
            direction: result.direction,
            strength: result.strength + '%',
            timeframe: '1 Minute',
            minute_key: minuteKey,
            entry_price: entryPrice,
            analysis: result.analysis
        });

    } catch (error) {
        return res.status(502).json({ success: false, message: 'Analysis failed: ' + error.message });
    }
};
