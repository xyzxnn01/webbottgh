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
 * SMART SIGNAL ANALYSIS ENGINE v8 — TREND-FOLLOWING
 *
 * Philosophy: Follow the trend. When market is going UP, signal CALL.
 * When going DOWN, signal PUT. Only signal reversal at extreme S/R
 * when there is NO clear trend (ADX low, timeframes disagree).
 *
 * Architecture:
 *   1. TREND DIRECTION (~45%): Multi-TF alignment, EMA stack, ADX+DI, TV recs
 *   2. MOMENTUM CONFIRMATION (~25%): Oscillators confirming trend, not predicting reversals
 *   3. PRICE ACTION (~15%): Candle direction, Marubozu continuation
 *   4. S/R FILTER (~15%): Only in WEAK/NO trend — at extremes, reduce confidence
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
    // SECTION 1: TREND DIRECTION — PRIMARY (~45%)
    // Follow the trend across multiple timeframes
    // ==========================================================

    // 1.1 TradingView Recommendations — HEAVY weight (aggregate of 26 indicators each)
    // These are the most reliable trend indicators from TV's own analysis
    // recAll ranges from -1 (strong sell) to +1 (strong buy)
    if (ok(m1.recAll)) add('tv_1m', Math.round(m1.recAll * 5));
    if (ok(m1.recMA)) add('tv_1m_ma', Math.round(m1.recMA * 4));

    if (ok(m5.recAll)) add('tv_5m', Math.round(m5.recAll * 6));
    if (ok(m5.recMA)) add('tv_5m_ma', Math.round(m5.recMA * 5));

    if (ok(m15.recAll)) add('tv_15m', Math.round(m15.recAll * 7));
    if (ok(m15.recMA)) add('tv_15m_ma', Math.round(m15.recMA * 5));

    // 1.2 Multi-TF Trend Alignment BONUS
    // When all timeframes agree, add a big bonus
    if (ok(m1.recAll) && ok(m5.recAll) && ok(m15.recAll)) {
        const allBull = m1.recAll > 0.1 && m5.recAll > 0.1 && m15.recAll > 0.1;
        const allBear = m1.recAll < -0.1 && m5.recAll < -0.1 && m15.recAll < -0.1;
        if (allBull) add('tf_align', 8);
        else if (allBear) add('tf_align', -8);

        // 2 of 3 agree
        const bullCount = (m1.recAll > 0.1 ? 1 : 0) + (m5.recAll > 0.1 ? 1 : 0) + (m15.recAll > 0.1 ? 1 : 0);
        const bearCount = (m1.recAll < -0.1 ? 1 : 0) + (m5.recAll < -0.1 ? 1 : 0) + (m15.recAll < -0.1 ? 1 : 0);
        if (!allBull && !allBear) {
            if (bullCount >= 2) add('tf_major', 4);
            else if (bearCount >= 2) add('tf_major', -4);
        }
    }

    // 1.3 EMA Stack — strongest trend indicator
    // Bullish: price > EMA5 > EMA10 > EMA20 > EMA50
    // Bearish: price < EMA5 < EMA10 < EMA20 < EMA50
    if (ok(m1.close) && ok(m1.ema5) && ok(m1.ema10) && ok(m1.ema20) && ok(m1.ema50)) {
        const bullStack = m1.close > m1.ema5 && m1.ema5 > m1.ema10 && m1.ema10 > m1.ema20;
        const bearStack = m1.close < m1.ema5 && m1.ema5 < m1.ema10 && m1.ema10 < m1.ema20;
        const fullBullStack = bullStack && m1.ema20 > m1.ema50;
        const fullBearStack = bearStack && m1.ema20 < m1.ema50;

        if (fullBullStack) add('ema_stack', 6);
        else if (fullBearStack) add('ema_stack', -6);
        else if (bullStack) add('ema_stack', 3);
        else if (bearStack) add('ema_stack', -3);

        // Price vs key EMAs
        if (m1.close > m1.ema10 && m1.close > m1.ema20) add('price_ema', 2);
        else if (m1.close < m1.ema10 && m1.close < m1.ema20) add('price_ema', -2);
    }

    // 1.4 5m EMA trend
    if (ok(m5.ema10) && ok(m5.ema20) && ok(m5.ema50)) {
        if (m5.ema10 > m5.ema20 && m5.ema20 > m5.ema50) add('m5_ema', 4);
        else if (m5.ema10 < m5.ema20 && m5.ema20 < m5.ema50) add('m5_ema', -4);
        else if (m5.ema10 > m5.ema20) add('m5_ema', 2);
        else if (m5.ema10 < m5.ema20) add('m5_ema', -2);
    }

    // 1.5 15m EMA trend (strongest timeframe)
    if (ok(m15.ema20) && ok(m15.ema50)) {
        if (m15.ema20 > m15.ema50) add('m15_ema', 4);
        else if (m15.ema20 < m15.ema50) add('m15_ema', -4);
    }
    if (ok(m15.close) && ok(m15.ema200)) {
        add('m15_200', m15.close > m15.ema200 ? 3 : -3);
    }

    // 1.6 ADX + Directional Index — trend STRENGTH and direction
    if (ok(m1.adx) && ok(m1.pdi) && ok(m1.mdi)) {
        const trending = m1.adx > 20;
        const diDiff = m1.pdi - m1.mdi;
        if (trending) {
            // Strong trend — follow DI direction with high weight
            if (diDiff > 10) add('adx_trend', 5);
            else if (diDiff > 0) add('adx_trend', 3);
            else if (diDiff < -10) add('adx_trend', -5);
            else add('adx_trend', -3);
        } else {
            // Weak trend — lower weight
            add('adx_trend', diDiff > 0 ? 1 : -1);
        }
    }

    // 1.7 5m ADX DI
    if (ok(m5.adx) && ok(m5.pdi) && ok(m5.mdi)) {
        if (m5.adx > 20) {
            add('m5_adx', m5.pdi > m5.mdi ? 3 : -3);
        } else {
            add('m5_adx', m5.pdi > m5.mdi ? 1 : -1);
        }
    }

    // 1.8 15m ADX DI
    if (ok(m15.adx) && ok(m15.pdi) && ok(m15.mdi)) {
        if (m15.adx > 20) {
            add('m15_adx', m15.pdi > m15.mdi ? 3 : -3);
        } else {
            add('m15_adx', m15.pdi > m15.mdi ? 1 : -1);
        }
    }

    // 1.9 MACD trend direction — all timeframes
    if (ok(m1.macd) && ok(m1.macdSig)) {
        add('macd_1m', m1.macd > m1.macdSig ? 3 : -3);
    }
    if (ok(m5.macd) && ok(m5.macdSig)) {
        add('macd_5m', m5.macd > m5.macdSig ? 3 : -3);
    }
    if (ok(m15.macd) && ok(m15.macdSig)) {
        add('macd_15m', m15.macd > m15.macdSig ? 3 : -3);
    }

    // ==========================================================
    // SECTION 2: MOMENTUM CONFIRMATION (~25%)
    // Confirming trend, NOT predicting reversals
    // ==========================================================

    // 2.1 RSI — in trend context (NOT overbought/oversold reversal)
    // In uptrend, RSI > 50 confirms; in downtrend, RSI < 50 confirms
    if (ok(m1.rsi)) {
        if (m1.rsi > 60) add('rsi_bull', 2);
        else if (m1.rsi > 50) add('rsi_bull', 1);
        else if (m1.rsi < 40) add('rsi_bear', -2);
        else if (m1.rsi < 50) add('rsi_bear', -1);
    }

    // RSI direction of change — momentum accelerating
    if (ok(m1.rsi) && ok(m1.rsiPrev)) {
        const rsiChg = m1.rsi - m1.rsiPrev;
        if (rsiChg > 3) add('rsi_accel', 2);
        else if (rsiChg < -3) add('rsi_accel', -2);
    }

    // 5m RSI trend confirmation
    if (ok(m5.rsi)) {
        if (m5.rsi > 55) add('m5_rsi', 2);
        else if (m5.rsi < 45) add('m5_rsi', -2);
    }

    // 2.2 Stochastic — trend confirmation (not reversal)
    if (ok(m1.stochK) && ok(m1.stochD)) {
        // In trend: K above D = bullish, K below D = bearish
        if (m1.stochK > m1.stochD) add('stoch', 2);
        else add('stoch', -2);

        // Crossover adds extra weight
        if (ok(m1.stochKPrev) && ok(m1.stochDPrev)) {
            const crossUp = m1.stochKPrev <= m1.stochDPrev && m1.stochK > m1.stochD;
            const crossDown = m1.stochKPrev >= m1.stochDPrev && m1.stochK < m1.stochD;
            if (crossUp) add('stoch_x', 2);
            else if (crossDown) add('stoch_x', -2);
        }
    }

    // 2.3 CCI — trend confirmation
    if (ok(m1.cci)) {
        if (m1.cci > 100) add('cci', 2);
        else if (m1.cci > 0) add('cci', 1);
        else if (m1.cci < -100) add('cci', -2);
        else add('cci', -1);
    }

    // 2.4 Momentum direction
    if (ok(m1.mom) && ok(m1.momPrev)) {
        if (m1.mom > 0 && m1.mom > m1.momPrev) add('mom', 2);
        else if (m1.mom > 0) add('mom', 1);
        else if (m1.mom < 0 && m1.mom < m1.momPrev) add('mom', -2);
        else if (m1.mom < 0) add('mom', -1);
    }

    // 2.5 AO direction
    if (ok(m1.ao)) {
        if (m1.ao > 0) add('ao', 1);
        else add('ao', -1);
        if (ok(m1.aoPrev)) {
            if (m1.ao > m1.aoPrev) add('ao_accel', 1);
            else if (m1.ao < m1.aoPrev) add('ao_accel', -1);
        }
    }

    // 2.6 5m & 15m Momentum
    if (ok(m5.mom)) add('m5_mom', m5.mom > 0 ? 2 : -2);
    if (ok(m15.mom)) add('m15_mom', m15.mom > 0 ? 2 : -2);

    // 2.7 Hull MA — fast trend direction
    if (ok(m1.close) && ok(m1.hull)) {
        add('hull', m1.close > m1.hull ? 1 : -1);
    }

    // ==========================================================
    // SECTION 3: PRICE ACTION (~15%)
    // ==========================================================

    // 3.1 Current 1m candle direction
    if (ok(m1.open) && ok(m1.close) && ok(m1.high) && ok(m1.low)) {
        const bodySize = Math.abs(m1.close - m1.open);
        const totalRange = m1.high - m1.low;
        if (totalRange > 0) {
            const bodyRatio = bodySize / totalRange;
            const isBullish = m1.close > m1.open;

            // Strong Marubozu = strong trend continuation
            if (bodyRatio > 0.75) add('marubozu', isBullish ? 4 : -4);
            else if (bodyRatio > 0.55) add('candle_body', isBullish ? 2 : -2);
            else add('candle_1m', isBullish ? 1 : -1);
        }
    }

    // 3.2 5m candle direction
    if (ok(m5.open) && ok(m5.close)) {
        const m5Bull = m5.close > m5.open;
        add('candle_5m', m5Bull ? 2 : -2);
    }

    // 3.3 Price vs Pivot — above pivot = bullish zone, below = bearish zone
    if (ok(m1.close) && ok(m1.pM)) {
        add('pivot_pos', m1.close > m1.pM ? 2 : -2);
    }

    // 3.4 Ichimoku baseline
    if (ok(m1.close) && ok(m1.ichiBL)) {
        add('ichimoku', m1.close > m1.ichiBL ? 1 : -1);
    }

    // ==========================================================
    // SECTION 4: S/R FILTER — ONLY IN NO/WEAK TREND (~15%)
    // When ADX is low (no clear trend), use S/R for reversal signals
    // When trending, S/R is IGNORED (trend overrides S/R)
    // ==========================================================

    // Determine if there's a clear trend
    const hasTrend = ok(m1.adx) && m1.adx > 25;

    if (!hasTrend) {
        // NO clear trend — S/R mean reversion is valid
        // Bollinger Band position
        if (ok(m1.close) && ok(m1.bbUp) && ok(m1.bbLow)) {
            const bbRange = m1.bbUp - m1.bbLow;
            if (bbRange > 0) {
                const bbPos = (m1.close - m1.bbLow) / bbRange;
                if (bbPos >= 0.95) add('bb_resist', -5);
                else if (bbPos <= 0.05) add('bb_support', 5);
                else if (bbPos >= 0.85) add('bb_resist', -2);
                else if (bbPos <= 0.15) add('bb_support', 2);
            }
        }

        // Williams %R at extremes
        if (ok(m1.wr)) {
            if (m1.wr > -5) add('wr_ob', -3);
            else if (m1.wr < -95) add('wr_os', 3);
        }

        // RSI extreme reversal (only when NO trend)
        if (ok(m1.rsi) && ok(m1.rsiPrev)) {
            if (m1.rsi > 80 && m1.rsi < m1.rsiPrev) add('rsi_rev', -3);
            else if (m1.rsi < 20 && m1.rsi > m1.rsiPrev) add('rsi_rev', 3);
        }

        // UO extreme zones
        if (ok(m1.uo)) {
            if (m1.uo > 70) add('uo', -2);
            else if (m1.uo < 30) add('uo', 2);
        }
    }

    // ==========================================================
    // SECTION 5: FINAL DECISION
    // ==========================================================
    const absScore = Math.abs(score);

    const analysis = {
        close: sf(m1.close, 5),
        total_score: score,
        trend_mode: hasTrend ? 'TRENDING' : 'RANGING',
        tv_1m_rec: sf(m1.recAll, 3),
        tv_5m_rec: sf(m5.recAll, 3),
        tv_15m_rec: sf(m15.recAll, 3),
        rsi_1m: sf(m1.rsi, 2),
        stoch_k_1m: sf(m1.stochK, 2),
        cci_1m: sf(m1.cci, 2),
        macd_1m: ok(m1.macd) && ok(m1.macdSig) ? (m1.macd > m1.macdSig ? 'Bullish' : 'Bearish') : null,
        adx_1m: sf(m1.adx, 2),
        adx_pdi_1m: sf(m1.pdi, 2),
        adx_mdi_1m: sf(m1.mdi, 2),
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
            reason: 'No clear trend or signal',
            analysis
        };
    }

    const direction = score > 0 ? 'CALL' : 'PUT';

    // Map score (5-80) → strength (55-95%)
    const clampedScore = Math.min(absScore, 80);
    let strength = Math.round(55 + (clampedScore - 5) * (40 / 75));
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
