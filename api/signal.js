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
 * SMART SIGNAL ANALYSIS ENGINE v7
 *
 * Architecture: SUPPORT/RESISTANCE + MOMENTUM DIRECTION
 * 
 * Philosophy: For 1-minute binary options, predict the NEXT candle direction.
 * S/R levels tell us WHERE price will bounce/reverse.
 * Momentum DIRECTION (rising/falling) tells us current micro-trend.
 * TV recommendations are CONTEXT only, not primary.
 * 
 * Score breakdown:
 *   1. Support/Resistance (~40%): BB position, pivot proximity, mean reversion
 *   2. Momentum Direction (~30%): RSI/Stoch/CCI/Mom/AO direction of CHANGE
 *   3. Candlestick Patterns (~15%): Marubozu, pin bars, engulfing
 *   4. Trend Context (~15%): TV recs (low weight), ADX DI, EMA short-term
 *   5. SKIP threshold: 5
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
    // SECTION 1: SUPPORT/RESISTANCE ANALYSIS — PRIMARY (~40%)
    // Where is price relative to key S/R levels?
    // Near resistance → PUT pressure, near support → CALL pressure
    // ==========================================================

    // 1.1 Bollinger Band Position — strongest dynamic S/R
    if (ok(m1.close) && ok(m1.bbUp) && ok(m1.bbLow)) {
        const bbRange = m1.bbUp - m1.bbLow;
        if (bbRange > 0) {
            const bbPos = (m1.close - m1.bbLow) / bbRange;
            if (bbPos >= 0.97) add('bb_resist', -8);
            else if (bbPos >= 0.90) add('bb_resist', -5);
            else if (bbPos >= 0.80) add('bb_resist', -3);
            else if (bbPos <= 0.03) add('bb_support', 8);
            else if (bbPos <= 0.10) add('bb_support', 5);
            else if (bbPos <= 0.20) add('bb_support', 3);
            else if (bbPos > 0.65) add('bb_upper', -1);
            else if (bbPos < 0.35) add('bb_lower', 1);
        }
    }

    // 1.2 5m Bollinger Band Position — higher TF S/R
    if (ok(m1.close) && ok(m5.bbUp) && ok(m5.bbLow)) {
        const bbRange5 = m5.bbUp - m5.bbLow;
        if (bbRange5 > 0) {
            const bbPos5 = (m1.close - m5.bbLow) / bbRange5;
            if (bbPos5 >= 0.95) add('bb5_resist', -4);
            else if (bbPos5 <= 0.05) add('bb5_support', 4);
            else if (bbPos5 >= 0.85) add('bb5_resist', -2);
            else if (bbPos5 <= 0.15) add('bb5_support', 2);
        }
    }

    // 1.3 Pivot Point Proximity — classic S/R levels
    if (ok(m1.close) && ok(m1.atr) && m1.atr > 0) {
        const prox = m1.atr * 0.3;
        if (ok(m1.pR2) && Math.abs(m1.close - m1.pR2) < prox) add('near_R2', -6);
        else if (ok(m1.pR1) && Math.abs(m1.close - m1.pR1) < prox) add('near_R1', -4);
        else if (ok(m1.pS2) && Math.abs(m1.close - m1.pS2) < prox) add('near_S2', 6);
        else if (ok(m1.pS1) && Math.abs(m1.close - m1.pS1) < prox) add('near_S1', 4);

        if (ok(m1.pM)) add('pivot_pos', m1.close > m1.pM ? 1 : -1);
    }

    // 1.4 Price distance from EMA20 — mean reversion when overextended
    if (ok(m1.close) && ok(m1.ema20) && ok(m1.atr) && m1.atr > 0) {
        const dist = (m1.close - m1.ema20) / m1.atr;
        if (dist > 2.0) add('overextend_up', -4);
        else if (dist > 1.5) add('overextend_up', -2);
        else if (dist < -2.0) add('overextend_down', 4);
        else if (dist < -1.5) add('overextend_down', 2);
    }

    // 1.5 Williams %R — S/R zone indicator
    if (ok(m1.wr)) {
        if (m1.wr > -5) add('wr_ob', -3);
        else if (m1.wr > -15) add('wr_ob', -1);
        else if (m1.wr < -95) add('wr_os', 3);
        else if (m1.wr < -85) add('wr_os', 1);
    }

    // ==========================================================
    // SECTION 2: MOMENTUM DIRECTION — SECONDARY (~30%)
    // Not absolute values but DIRECTION OF CHANGE
    // "Is momentum accelerating or decelerating?"
    // ==========================================================

    // 2.1 RSI Direction — rising = bullish push, falling = bearish push
    if (ok(m1.rsi) && ok(m1.rsiPrev)) {
        const rsiChg = m1.rsi - m1.rsiPrev;
        if (rsiChg > 3) add('rsi_rising', 3);
        else if (rsiChg > 0.5) add('rsi_rising', 1);
        else if (rsiChg < -3) add('rsi_falling', -3);
        else if (rsiChg < -0.5) add('rsi_falling', -1);

        // RSI at extreme AND reversing = strong reversal signal
        if (m1.rsi > 75 && rsiChg < -1) add('rsi_rev_ob', -3);
        else if (m1.rsi < 25 && rsiChg > 1) add('rsi_rev_os', 3);
    }

    // 2.2 Stochastic Crossover + Direction
    if (ok(m1.stochK) && ok(m1.stochD) && ok(m1.stochKPrev) && ok(m1.stochDPrev)) {
        const wasBelow = m1.stochKPrev <= m1.stochDPrev;
        const nowAbove = m1.stochK > m1.stochD;
        const crossUp = wasBelow && nowAbove;
        const crossDown = !wasBelow && m1.stochK < m1.stochD;

        if (crossUp) add('stoch_cross', m1.stochK < 30 ? 5 : 2);
        else if (crossDown) add('stoch_cross', m1.stochK > 70 ? -5 : -2);

        // Stochastic direction of change
        const stochChg = m1.stochK - m1.stochKPrev;
        if (stochChg > 5) add('stoch_dir', 2);
        else if (stochChg < -5) add('stoch_dir', -2);
    }

    // 2.3 CCI Direction + extreme reversal
    if (ok(m1.cci) && ok(m1.cciPrev)) {
        const cciChg = m1.cci - m1.cciPrev;
        if (cciChg > 20) add('cci_rising', 2);
        else if (cciChg < -20) add('cci_falling', -2);

        // CCI extreme + reversing
        if (m1.cci > 150 && cciChg < 0) add('cci_rev', -3);
        else if (m1.cci < -150 && cciChg > 0) add('cci_rev', 3);
    }

    // 2.4 MACD cross direction
    if (ok(m1.macd) && ok(m1.macdSig)) {
        add('macd', m1.macd > m1.macdSig ? 3 : -3);
    }

    // 2.5 Momentum direction of change
    if (ok(m1.mom) && ok(m1.momPrev)) {
        if (m1.mom > m1.momPrev) add('mom_dir', 2);
        else if (m1.mom < m1.momPrev) add('mom_dir', -2);
    }

    // 2.6 AO direction of change
    if (ok(m1.ao) && ok(m1.aoPrev)) {
        if (m1.ao > m1.aoPrev) add('ao_dir', 2);
        else if (m1.ao < m1.aoPrev) add('ao_dir', -2);
    }

    // 2.7 UO extreme zones
    if (ok(m1.uo)) {
        if (m1.uo > 70) add('uo_ob', -2);
        else if (m1.uo < 30) add('uo_os', 2);
    }

    // ==========================================================
    // SECTION 3: CANDLESTICK PATTERNS (~15%)
    // ==========================================================

    // 3.1 Current 1m candle analysis
    if (ok(m1.open) && ok(m1.close) && ok(m1.high) && ok(m1.low)) {
        const bodySize = Math.abs(m1.close - m1.open);
        const totalRange = m1.high - m1.low;
        if (totalRange > 0) {
            const bodyRatio = bodySize / totalRange;
            const upperWick = m1.high - Math.max(m1.open, m1.close);
            const lowerWick = Math.min(m1.open, m1.close) - m1.low;
            const isBullish = m1.close > m1.open;

            // Strong Marubozu — continuation
            if (bodyRatio > 0.75) {
                add('marubozu', isBullish ? 4 : -4);
            }
            // Pin bar — reversal at extremes
            else if (bodyRatio < 0.3) {
                if (upperWick > lowerWick * 2.5) {
                    // Shooting star / bearish pin bar
                    let pinScore = -3;
                    if (ok(m1.bbUp) && m1.high >= m1.bbUp * 0.998) pinScore = -5;
                    add('pin_bar', pinScore);
                } else if (lowerWick > upperWick * 2.5) {
                    // Hammer / bullish pin bar
                    let pinScore = 3;
                    if (ok(m1.bbLow) && m1.low <= m1.bbLow * 1.002) pinScore = 5;
                    add('pin_bar', pinScore);
                }
            }

            // Current candle direction — small weight
            add('candle_1m', isBullish ? 1 : -1);
        }
    }

    // 3.2 5m candle direction
    if (ok(m5.open) && ok(m5.close)) {
        add('candle_5m', m5.close > m5.open ? 1 : -1);
    }

    // ==========================================================
    // SECTION 4: TREND CONTEXT — SUPPORTING (~15%)
    // TV recs as LOW weight context, not primary
    // ==========================================================

    // 4.1 TV Recommendations — LOW weight (context only)
    if (ok(m1.recAll)) add('tv_1m', Math.round(m1.recAll * 3));
    if (ok(m5.recAll)) add('tv_5m', Math.round(m5.recAll * 2));
    if (ok(m15.recAll)) add('tv_15m', Math.round(m15.recAll * 3));

    // 4.2 ADX DI — current trend direction
    if (ok(m1.pdi) && ok(m1.mdi)) {
        add('adx_di', m1.pdi > m1.mdi ? 2 : -2);
    }

    // 4.3 Short-term EMA trend
    if (ok(m1.ema5) && ok(m1.ema20)) {
        add('ema_short', m1.ema5 > m1.ema20 ? 1 : -1);
    }

    // 4.4 5m MACD context
    if (ok(m5.macd) && ok(m5.macdSig)) {
        add('m5_macd', m5.macd > m5.macdSig ? 1 : -1);
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
        rsi_prev: sf(m1.rsiPrev, 2),
        stoch_k_1m: sf(m1.stochK, 2),
        stoch_k_prev: sf(m1.stochKPrev, 2),
        cci_1m: sf(m1.cci, 2),
        cci_prev: sf(m1.cciPrev, 2),
        macd_1m: ok(m1.macd) && ok(m1.macdSig) ? (m1.macd > m1.macdSig ? 'Bullish' : 'Bearish') : null,
        adx_1m: sf(m1.adx, 2),
        adx_pdi_1m: sf(m1.pdi, 2),
        adx_mdi_1m: sf(m1.mdi, 2),
        williams_r: sf(m1.wr, 2),
        bb_pos: ok(m1.close) && ok(m1.bbUp) && ok(m1.bbLow) && (m1.bbUp - m1.bbLow) > 0
            ? sf((m1.close - m1.bbLow) / (m1.bbUp - m1.bbLow), 3) : null,
        m5_trend: ok(m5.recAll) ? (m5.recAll > 0.1 ? 'CALL' : m5.recAll < -0.1 ? 'PUT' : 'NEUTRAL') : null,
        m15_trend: ok(m15.recAll) ? (m15.recAll > 0.1 ? 'CALL' : m15.recAll < -0.1 ? 'PUT' : 'NEUTRAL') : null,
        atr: sf(m1.atr, 6),
        indicator_breakdown: breakdown,
    };

    // SKIP if score too weak
    if (absScore < 5) {
        return {
            direction: 'SKIP',
            strength: 0,
            reason: 'No clear S/R or momentum signal',
            analysis
        };
    }

    const direction = score > 0 ? 'CALL' : 'PUT';

    // Map score (5-50) → strength (55-95%)
    const clampedScore = Math.min(absScore, 50);
    let strength = Math.round(55 + (clampedScore - 5) * (40 / 45));
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
