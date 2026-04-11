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
 * COMPREHENSIVE SIGNAL ANALYSIS ENGINE
 *
 * Uses 5 analysis categories across 3 timeframes:
 *   1. Trend Analysis — MA ribbon, price position, Hull MA, VWMA, Ichimoku
 *   2. Oscillator Momentum — RSI, Stochastic, MACD, CCI, W%R, AO, Mom, UO
 *   3. ADX Trend Strength — ADX value, +DI/-DI crossover
 *   4. Support/Resistance — Pivot points, Bollinger Bands
 *   5. Multi-Timeframe — 5m and 15m confirmation
 *
 * Score range: -100 (strong PUT) to +100 (strong CALL)
 * Signal threshold: |score| >= 20, else SKIP
 * Filters: Low ADX penalty, timeframe conflict penalty, RSI extreme, BB squeeze
 */
function analyzeSignal(data) {
    if (!data || !data.data || !data.data[0] || !data.data[0].d) return null;

    const v = data.data[0].d;

    // ===== PARSE 1-MINUTE DATA =====
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

    // ===== PARSE 5-MINUTE DATA =====
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

    // ===== PARSE 15-MINUTE DATA =====
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

    // ===== SCORING ENGINE =====
    let score = 0;
    const breakdown = {};
    const add = (name, pts) => {
        const p = Math.round(pts);
        if (p !== 0) { score += p; breakdown[name] = p; }
    };

    // Category scores for detailed output
    let trendScore = 0, momentumScore = 0, adxScore = 0, srScore = 0, mtfScore = 0;

    // ==========================================================
    // SECTION 1: TREND ANALYSIS (max ~25 pts)
    // ==========================================================

    // 1.1 EMA Ribbon — Perfect alignment = strong trend
    if (ok(m1.ema5) && ok(m1.ema10) && ok(m1.ema20) && ok(m1.ema50)) {
        const bullRibbon = m1.ema5 > m1.ema10 && m1.ema10 > m1.ema20 && m1.ema20 > m1.ema50;
        const bearRibbon = m1.ema5 < m1.ema10 && m1.ema10 < m1.ema20 && m1.ema20 < m1.ema50;
        if (bullRibbon) { add('ema_ribbon', 8); trendScore += 8; }
        else if (bearRibbon) { add('ema_ribbon', -8); trendScore -= 8; }
        else {
            let align = 0;
            if (m1.ema5 > m1.ema10) align++; else align--;
            if (m1.ema10 > m1.ema20) align++; else align--;
            if (m1.ema20 > m1.ema50) align++; else align--;
            const pts = align * 2;
            add('ema_ribbon', pts); trendScore += pts;
        }
    }

    // 1.2 Price vs Key Moving Averages
    if (ok(m1.close)) {
        let maVotes = 0;
        if (ok(m1.ema20)) maVotes += m1.close > m1.ema20 ? 1 : -1;
        if (ok(m1.ema50)) maVotes += m1.close > m1.ema50 ? 1 : -1;
        if (ok(m1.sma20)) maVotes += m1.close > m1.sma20 ? 1 : -1;
        if (ok(m1.sma50)) maVotes += m1.close > m1.sma50 ? 1 : -1;
        if (ok(m1.ema200)) maVotes += m1.close > m1.ema200 ? 1 : -1;
        const pts = Math.round(maVotes * 1.5);
        add('price_vs_ma', pts); trendScore += pts;
    }

    // 1.3 Hull Moving Average (very responsive trend indicator)
    if (ok(m1.close) && ok(m1.hull)) {
        const pts = m1.close > m1.hull ? 3 : -3;
        add('hull_ma', pts); trendScore += pts;
    }

    // 1.4 VWMA — volume-weighted trend
    if (ok(m1.close) && ok(m1.vwma)) {
        const pts = m1.close > m1.vwma ? 2 : -2;
        add('vwma', pts); trendScore += pts;
    }

    // 1.5 Ichimoku Base Line
    if (ok(m1.close) && ok(m1.ichiBL)) {
        const pts = m1.close > m1.ichiBL ? 2 : -2;
        add('ichimoku', pts); trendScore += pts;
    }

    // 1.6 TradingView MA Recommendation (15 MAs combined)
    if (ok(m1.recMA)) {
        const pts = Math.round(m1.recMA * 5);
        add('tv_ma_rec', pts); trendScore += pts;
    }

    // ==========================================================
    // SECTION 2: OSCILLATOR MOMENTUM (max ~38 pts)
    // ==========================================================

    // 2.1 RSI (14)
    if (ok(m1.rsi)) {
        // Momentum direction
        if (m1.rsi > 55) { const p = Math.min(4, Math.round((m1.rsi - 50) / 5)); add('rsi_momentum', p); momentumScore += p; }
        else if (m1.rsi < 45) { const p = Math.max(-4, -Math.round((50 - m1.rsi) / 5)); add('rsi_momentum', p); momentumScore += p; }

        // Extreme zone caution
        if (m1.rsi > 80) { add('rsi_extreme', -2); momentumScore -= 2; }
        else if (m1.rsi < 20) { add('rsi_extreme', 2); momentumScore += 2; }

        // RSI direction
        if (ok(m1.rsiPrev)) {
            const p = m1.rsi > m1.rsiPrev ? 2 : m1.rsi < m1.rsiPrev ? -2 : 0;
            add('rsi_direction', p); momentumScore += p;
        }
    }

    // 2.2 Stochastic (14,3,3) — Crossover + Level
    if (ok(m1.stochK) && ok(m1.stochD)) {
        // Crossover detection
        if (ok(m1.stochKPrev) && ok(m1.stochDPrev)) {
            const wasBelow = m1.stochKPrev <= m1.stochDPrev;
            const nowAbove = m1.stochK > m1.stochD;
            const crossUp = wasBelow && nowAbove;
            const crossDown = m1.stochKPrev >= m1.stochDPrev && m1.stochK < m1.stochD;

            if (crossUp) {
                const p = m1.stochK < 30 ? 7 : 4;
                add('stoch_cross', p); momentumScore += p;
            } else if (crossDown) {
                const p = m1.stochK > 70 ? -7 : -4;
                add('stoch_cross', p); momentumScore += p;
            }
        }

        // Current position
        const sPos = m1.stochK > m1.stochD ? 2 : -2;
        add('stoch_position', sPos); momentumScore += sPos;

        // Extreme zone bonus
        if (m1.stochK < 20) { add('stoch_oversold', 2); momentumScore += 2; }
        else if (m1.stochK > 80) { add('stoch_overbought', -2); momentumScore -= 2; }
    }

    // 2.3 MACD — Position relative to signal line
    if (ok(m1.macd) && ok(m1.macdSig)) {
        const p = m1.macd > m1.macdSig ? 6 : -6;
        add('macd', p); momentumScore += p;
    }

    // 2.4 CCI (20) — Momentum strength
    if (ok(m1.cci)) {
        let p = 0;
        if (m1.cci > 100) p = 3;
        else if (m1.cci > 0) p = 2;
        else if (m1.cci < -100) p = -3;
        else p = -2;
        add('cci', p); momentumScore += p;

        // CCI direction
        if (ok(m1.cciPrev)) {
            const d = m1.cci > m1.cciPrev ? 1 : -1;
            add('cci_dir', d); momentumScore += d;
        }
    }

    // 2.5 Williams %R — Momentum position
    if (ok(m1.wr)) {
        let p = 0;
        if (m1.wr > -20) p = -3;       // Overbought
        else if (m1.wr > -50) p = 1;    // Upper neutral
        else if (m1.wr > -80) p = -1;   // Lower neutral
        else p = 3;                      // Oversold
        add('williams_r', p); momentumScore += p;
    }

    // 2.6 Awesome Oscillator — Zero-line & direction
    if (ok(m1.ao)) {
        const p = m1.ao > 0 ? 3 : -3;
        add('awesome_osc', p); momentumScore += p;

        if (ok(m1.aoPrev)) {
            const acc = m1.ao > m1.aoPrev ? 2 : -2;
            add('ao_accel', acc); momentumScore += acc;
        }
    }

    // 2.7 Momentum — Direction & acceleration
    if (ok(m1.mom)) {
        const p = m1.mom > 0 ? 3 : -3;
        add('momentum', p); momentumScore += p;

        if (ok(m1.momPrev)) {
            const acc = m1.mom > m1.momPrev ? 2 : -2;
            add('mom_accel', acc); momentumScore += acc;
        }
    }

    // 2.8 Ultimate Oscillator — Multi-period momentum
    if (ok(m1.uo)) {
        let p = 0;
        if (m1.uo > 70) p = -2;
        else if (m1.uo > 50) p = 2;
        else if (m1.uo > 30) p = -2;
        else p = 2;
        add('ultimate_osc', p); momentumScore += p;
    }

    // 2.9 TradingView Oscillator Recommendation
    if (ok(m1.recOsc)) {
        const p = Math.round(m1.recOsc * 4);
        add('tv_osc_rec', p); momentumScore += p;
    }

    // ==========================================================
    // SECTION 3: ADX TREND STRENGTH (max ~10 pts)
    // ==========================================================

    // 3.1 ADX +DI / -DI — Directional dominance
    if (ok(m1.pdi) && ok(m1.mdi)) {
        const p = m1.pdi > m1.mdi ? 5 : -5;
        add('adx_di', p); adxScore += p;

        // DI crossover
        if (ok(m1.pdiPrev) && ok(m1.mdiPrev)) {
            const crossUp = m1.pdiPrev <= m1.mdiPrev && m1.pdi > m1.mdi;
            const crossDown = m1.pdiPrev >= m1.mdiPrev && m1.pdi < m1.mdi;
            if (crossUp) { add('di_crossover', 5); adxScore += 5; }
            else if (crossDown) { add('di_crossover', -5); adxScore -= 5; }
        }
    }

    // ==========================================================
    // SECTION 4: SUPPORT / RESISTANCE (max ~12 pts)
    // ==========================================================

    // 4.1 Bollinger Band Position
    if (ok(m1.close) && ok(m1.bbUp) && ok(m1.bbLow)) {
        const bbRange = m1.bbUp - m1.bbLow;
        if (bbRange > 0) {
            const bbPos = (m1.close - m1.bbLow) / bbRange;
            if (bbPos <= 0.05) { add('bb_touch_lower', 5); srScore += 5; }
            else if (bbPos >= 0.95) { add('bb_touch_upper', -5); srScore -= 5; }
            else if (bbPos < 0.2) { add('bb_near_lower', 3); srScore += 3; }
            else if (bbPos > 0.8) { add('bb_near_upper', -3); srScore -= 3; }
            else if (bbPos < 0.45) { add('bb_lower_half', 1); srScore += 1; }
            else if (bbPos > 0.55) { add('bb_upper_half', -1); srScore -= 1; }
        }
    }

    // 4.2 Pivot Point Support/Resistance
    if (ok(m1.close) && ok(m1.atr) && m1.atr > 0) {
        const proximity = m1.atr * 0.3;

        // Near Support → bullish
        if (ok(m1.pS1) && Math.abs(m1.close - m1.pS1) < proximity) { add('near_support_s1', 4); srScore += 4; }
        else if (ok(m1.pS2) && Math.abs(m1.close - m1.pS2) < proximity) { add('near_support_s2', 3); srScore += 3; }
        else if (ok(m1.pS3) && Math.abs(m1.close - m1.pS3) < proximity) { add('near_support_s3', 2); srScore += 2; }

        // Near Resistance → bearish
        if (ok(m1.pR1) && Math.abs(m1.close - m1.pR1) < proximity) { add('near_resist_r1', -4); srScore -= 4; }
        else if (ok(m1.pR2) && Math.abs(m1.close - m1.pR2) < proximity) { add('near_resist_r2', -3); srScore -= 3; }
        else if (ok(m1.pR3) && Math.abs(m1.close - m1.pR3) < proximity) { add('near_resist_r3', -2); srScore -= 2; }

        // Pivot midpoint position
        if (ok(m1.pM)) {
            const p = m1.close > m1.pM ? 2 : -2;
            add('pivot_position', p); srScore += p;
        }
    }

    // 4.3 Candle Body Direction
    if (ok(m1.open) && ok(m1.close)) {
        const bodyPct = Math.abs(m1.close - m1.open) / (ok(m1.atr) && m1.atr > 0 ? m1.atr : 1);
        if (bodyPct > 0.3) {
            const p = m1.close > m1.open ? 2 : -2;
            add('candle_body', p); srScore += p;
        }
    }

    // ==========================================================
    // SECTION 5: MULTI-TIMEFRAME CONFIRMATION (max ~22 pts)
    // ==========================================================

    // 5.1 — 5-Minute Trend
    if (ok(m5.recAll)) {
        const p = Math.round(m5.recAll * 6);
        add('m5_recommendation', p); mtfScore += p;
    }
    if (ok(m5.recMA)) {
        const p = Math.round(m5.recMA * 3);
        add('m5_ma_trend', p); mtfScore += p;
    }
    if (ok(m5.macd) && ok(m5.macdSig)) {
        const p = m5.macd > m5.macdSig ? 2 : -2;
        add('m5_macd', p); mtfScore += p;
    }
    if (ok(m5.pdi) && ok(m5.mdi)) {
        const p = m5.pdi > m5.mdi ? 2 : -2;
        add('m5_di', p); mtfScore += p;
    }
    if (ok(m5.rsi)) {
        if (m5.rsi > 60) { add('m5_rsi', 2); mtfScore += 2; }
        else if (m5.rsi < 40) { add('m5_rsi', -2); mtfScore -= 2; }
    }

    // 5.2 — 15-Minute Trend (heaviest single MTF factor)
    if (ok(m15.recAll)) {
        const p = Math.round(m15.recAll * 8);
        add('m15_recommendation', p); mtfScore += p;
    }
    if (ok(m15.recMA)) {
        const p = Math.round(m15.recMA * 4);
        add('m15_ma_trend', p); mtfScore += p;
    }
    if (ok(m15.macd) && ok(m15.macdSig)) {
        const p = m15.macd > m15.macdSig ? 3 : -3;
        add('m15_macd', p); mtfScore += p;
    }
    if (ok(m15.pdi) && ok(m15.mdi)) {
        const p = m15.pdi > m15.mdi ? 3 : -3;
        add('m15_di', p); mtfScore += p;
    }

    // ==========================================================
    // SECTION 6: FILTERS & ADJUSTMENTS
    // ==========================================================
    const filters = {};

    // 6.1 Low ADX = No clear trend → reduce confidence
    if (ok(m1.adx)) {
        if (m1.adx < 15) {
            score = Math.round(score * 0.5);
            filters.low_adx = 'Very weak trend (ADX < 15) — confidence halved';
        } else if (m1.adx < 20) {
            score = Math.round(score * 0.7);
            filters.weak_adx = 'Weak trend (ADX < 20) — confidence reduced';
        }
    }

    // 6.2 5-Minute strongly disagrees → penalize
    if (ok(m5.recAll)) {
        const disagree5 = (score > 0 && m5.recAll < -0.3) || (score < 0 && m5.recAll > 0.3);
        if (disagree5) {
            score = Math.round(score * 0.6);
            filters.m5_conflict = '5-min trend conflicts — confidence reduced';
        }
    }

    // 6.3 15-Minute strongly disagrees → heavy penalize
    if (ok(m15.recAll)) {
        const disagree15 = (score > 0 && m15.recAll < -0.3) || (score < 0 && m15.recAll > 0.3);
        if (disagree15) {
            score = Math.round(score * 0.5);
            filters.m15_conflict = '15-min trend conflicts — confidence halved';
        }
    }

    // 6.4 RSI extreme + wrong direction = dangerous
    if (ok(m1.rsi)) {
        if ((score > 0 && m1.rsi > 85) || (score < 0 && m1.rsi < 15)) {
            score = Math.round(score * 0.7);
            filters.rsi_danger = 'RSI at extreme against potential reversal';
        }
    }

    // 6.5 BB squeeze (low volatility) — direction uncertain
    if (ok(m5.bbUp) && ok(m5.bbLow) && ok(m5.close) && m5.close > 0) {
        const bbWidth5 = (m5.bbUp - m5.bbLow) / m5.close;
        if (bbWidth5 < 0.001) {
            score = Math.round(score * 0.7);
            filters.bb_squeeze = 'Bollinger squeeze — low volatility';
        }
    }

    // ==========================================================
    // SECTION 7: FINAL DECISION
    // ==========================================================
    const absScore = Math.abs(score);

    // Build analysis output
    const analysis = {
        close: sf(m1.close, 5),
        trend_score: trendScore,
        momentum_score: momentumScore,
        adx_score: adxScore,
        sr_score: srScore,
        mtf_score: mtfScore,
        total_raw_score: score,
        rsi_1m: sf(m1.rsi, 2),
        stoch_k_1m: sf(m1.stochK, 2),
        stoch_d_1m: sf(m1.stochD, 2),
        macd_1m: ok(m1.macd) && ok(m1.macdSig) ? (m1.macd > m1.macdSig ? 'Bullish' : 'Bearish') : null,
        cci_1m: sf(m1.cci, 2),
        williams_r_1m: sf(m1.wr, 2),
        adx_1m: sf(m1.adx, 2),
        adx_pdi_1m: sf(m1.pdi, 2),
        adx_mdi_1m: sf(m1.mdi, 2),
        ao_1m: sf(m1.ao, 4),
        momentum_1m: sf(m1.mom, 4),
        uo_1m: sf(m1.uo, 2),
        bb_upper: sf(m1.bbUp, 5),
        bb_lower: sf(m1.bbLow, 5),
        pivot_s1: sf(m1.pS1, 5),
        pivot_mid: sf(m1.pM, 5),
        pivot_r1: sf(m1.pR1, 5),
        ema20: sf(m1.ema20, 5),
        ema50: sf(m1.ema50, 5),
        sma20: sf(m1.sma20, 5),
        hull_ma: sf(m1.hull, 5),
        m5_trend: ok(m5.recAll) ? (m5.recAll > 0.1 ? 'CALL' : m5.recAll < -0.1 ? 'PUT' : 'NEUTRAL') : null,
        m15_trend: ok(m15.recAll) ? (m15.recAll > 0.1 ? 'CALL' : m15.recAll < -0.1 ? 'PUT' : 'NEUTRAL') : null,
        m5_rsi: sf(m5.rsi, 2),
        m15_rsi: sf(m15.rsi, 2),
        atr: sf(m1.atr, 6),
        filters: Object.keys(filters).length > 0 ? filters : null,
        indicator_breakdown: breakdown,
    };

    // SKIP if score too weak
    if (absScore < 20) {
        return {
            direction: 'SKIP',
            strength: 0,
            reason: 'Indicators conflicting or too weak — no clear signal',
            analysis
        };
    }

    // Direction from score sign
    const direction = score > 0 ? 'CALL' : 'PUT';

    // Map score (20-100) → strength (60-95%)
    const clampedScore = Math.min(absScore, 100);
    let strength = Math.round(60 + (clampedScore - 20) * (35 / 80));
    strength = Math.min(95, Math.max(60, strength));

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

    // Short cache — 3s for fresh binary trading signals
    res.setHeader('Cache-Control', 's-maxage=3, stale-while-revalidate=5');

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

        // SKIP signal — tell frontend to wait
        if (result.direction === 'SKIP') {
            return res.json({
                success: true,
                market,
                direction: 'SKIP',
                strength: '0%',
                timeframe: '1 Minute',
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
            analysis: result.analysis
        });

    } catch (error) {
        return res.status(502).json({ success: false, message: 'Analysis failed: ' + error.message });
    }
};
