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
 * SMART SIGNAL ANALYSIS ENGINE v5
 *
 * Architecture: TREND-FOLLOWING with REVERSAL GUARD
 * 
 * Philosophy: Follow the market trend. Oscillators CONFIRM momentum direction.
 * Reversal only fires when 3+ indicators reach TRUE extremes.
 * 
 * v5 changes:
 *   - Trend cap dynamic: ADX>30 → ±15, ADX>25 → ±12, ADX>20 → ±8, else ±5
 *   - Oscillators in MOMENTUM MODE: RSI/CCI/W%R support trend direction in middle zones
 *   - Reversal only at TRUE extremes (RSI>80/<20, 3+ OB/OS indicators)
 *   - MTF: recAll trend scores restored for trend confirmation
 *   - Stochastic position vote restored (momentum)
 *   - ADX DI weight increased (trend direction indicator)
 * 
 * Decision flow:
 *   1. Calculate trend score (dynamic cap based on ADX strength)
 *   2. Oscillators: momentum mode (support trend) + extreme reversal guard
 *   3. Multi-TF trend confirmation + extreme reversal only
 *   4. Reversal guard: 3+ OB/OS indicators required
 *   5. If |total| < 10 → SKIP
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

    // ===== VOTE-BASED SCORING =====
    // Oscillator = PRIMARY (uncapped), Trend = SECONDARY (CAPPED ±10)
    let score = 0;
    const breakdown = {};
    const add = (name, pts) => {
        const p = Math.round(pts);
        if (p !== 0) { score += p; breakdown[name] = p; }
    };

    let trendScore = 0, momentumScore = 0, adxScore = 0, srScore = 0, mtfScore = 0;
    // Track raw trend before capping
    let rawTrend = 0;
    const addTrend = (name, pts) => {
        const p = Math.round(pts);
        if (p !== 0) { rawTrend += p; breakdown[name] = p; }
    };

    // ===== DETECT MARKET MODE =====
    const isStrongTrend = ok(m1.adx) && m1.adx > 25;
    const isVeryStrongTrend = ok(m1.adx) && m1.adx > 35;
    const isWeakTrend = ok(m1.adx) && m1.adx < 20;

    // Detect overbought/oversold confluence
    let obSignals = 0, osSignals = 0; // overbought / oversold counters
    if (ok(m1.rsi)) {
        if (m1.rsi > 70) obSignals++;
        if (m1.rsi > 80) obSignals++;
        if (m1.rsi < 30) osSignals++;
        if (m1.rsi < 20) osSignals++;
    }
    if (ok(m1.stochK)) {
        if (m1.stochK > 80) obSignals++;
        if (m1.stochK < 20) osSignals++;
    }
    if (ok(m1.wr)) {
        if (m1.wr > -20) obSignals++;
        if (m1.wr < -80) osSignals++;
    }
    if (ok(m1.cci)) {
        if (m1.cci > 150) obSignals++;
        if (m1.cci < -150) osSignals++;
    }

    const isOverbought = obSignals >= 3;
    const isOversold = osSignals >= 3;

    // ==========================================================
    // SECTION 1: TREND ANALYSIS (CAPPED at ±10 total)
    // Uses addTrend() — accumulated into rawTrend, capped later
    // ==========================================================

    // 1.1 EMA Ribbon
    if (ok(m1.ema5) && ok(m1.ema10) && ok(m1.ema20) && ok(m1.ema50)) {
        const bullRibbon = m1.ema5 > m1.ema10 && m1.ema10 > m1.ema20 && m1.ema20 > m1.ema50;
        const bearRibbon = m1.ema5 < m1.ema10 && m1.ema10 < m1.ema20 && m1.ema20 < m1.ema50;
        if (bullRibbon) addTrend('ema_ribbon', 3);
        else if (bearRibbon) addTrend('ema_ribbon', -3);
        else {
            let align = 0;
            if (m1.ema5 > m1.ema10) align++; else align--;
            if (m1.ema10 > m1.ema20) align++; else align--;
            if (m1.ema20 > m1.ema50) align++; else align--;
            addTrend('ema_ribbon', align);
        }
    }

    // 1.2 Price vs Key MAs
    if (ok(m1.close)) {
        let maVotes = 0;
        if (ok(m1.ema20)) maVotes += m1.close > m1.ema20 ? 1 : -1;
        if (ok(m1.ema50)) maVotes += m1.close > m1.ema50 ? 1 : -1;
        if (ok(m1.sma20)) maVotes += m1.close > m1.sma20 ? 1 : -1;
        if (ok(m1.sma50)) maVotes += m1.close > m1.sma50 ? 1 : -1;
        if (ok(m1.ema200)) maVotes += m1.close > m1.ema200 ? 1 : -1;
        addTrend('price_vs_ma', Math.round(maVotes * 0.6));
    }

    // 1.3 Hull MA
    if (ok(m1.close) && ok(m1.hull)) {
        addTrend('hull_ma', m1.close > m1.hull ? 1 : -1);
    }

    // 1.4 VWMA
    if (ok(m1.close) && ok(m1.vwma)) {
        addTrend('vwma', m1.close > m1.vwma ? 1 : -1);
    }

    // 1.5 Ichimoku
    if (ok(m1.close) && ok(m1.ichiBL)) {
        addTrend('ichimoku', m1.close > m1.ichiBL ? 1 : -1);
    }

    // 1.6 TradingView MA Rec
    if (ok(m1.recMA)) {
        addTrend('tv_ma_rec', Math.round(m1.recMA * 2));
    }

    // *** CAP trend score — dynamic based on ADX strength ***
    // Stronger trend = higher cap = trend has more power
    const trendCap = isVeryStrongTrend ? 15 : isStrongTrend ? 12 : isWeakTrend ? 5 : 8;
    trendScore = Math.max(-trendCap, Math.min(trendCap, rawTrend));
    score += trendScore;
    breakdown['trend_capped'] = trendScore;
    if (rawTrend !== trendScore) breakdown['trend_raw_before_cap'] = rawTrend;

    // ==========================================================
    // SECTION 2: OSCILLATOR & REVERSAL — PRIMARY SIGNAL SOURCE
    // ==========================================================

    // 2.1 RSI — MOMENTUM mode (supports trend) + reversal only at TRUE extremes
    if (ok(m1.rsi)) {
        if (m1.rsi > 80) {
            add('rsi_extreme', -8); momentumScore -= 8;  // TRUE extreme OB → reversal
        } else if (m1.rsi < 20) {
            add('rsi_extreme', 8); momentumScore += 8;   // TRUE extreme OS → reversal
        } else if (m1.rsi > 65) {
            add('rsi_momentum', 3); momentumScore += 3;  // Strong bullish momentum
        } else if (m1.rsi > 50) {
            add('rsi_momentum', 1); momentumScore += 1;  // Bullish momentum
        } else if (m1.rsi < 35) {
            add('rsi_momentum', -3); momentumScore -= 3; // Strong bearish momentum
        } else if (m1.rsi < 50) {
            add('rsi_momentum', -1); momentumScore -= 1; // Bearish momentum
        }

        // RSI divergence detection
        if (ok(m1.rsiPrev)) {
            if (m1.rsi < m1.rsiPrev && ok(m1.close) && ok(m1.open) && m1.close > m1.open) {
                add('rsi_divergence', -3); momentumScore -= 3;
            } else if (m1.rsi > m1.rsiPrev && ok(m1.close) && ok(m1.open) && m1.close < m1.open) {
                add('rsi_divergence', 3); momentumScore += 3;
            }
        }
    }

    // 2.2 Stochastic — Crossover in extreme zones
    if (ok(m1.stochK) && ok(m1.stochD)) {
        if (ok(m1.stochKPrev) && ok(m1.stochDPrev)) {
            const wasBelow = m1.stochKPrev <= m1.stochDPrev;
            const nowAbove = m1.stochK > m1.stochD;
            const crossUp = wasBelow && nowAbove;
            const crossDown = m1.stochKPrev >= m1.stochDPrev && m1.stochK < m1.stochD;

            if (crossUp && m1.stochK < 25) {
                add('stoch_cross', 12); momentumScore += 12;
            } else if (crossUp) {
                add('stoch_cross', 3); momentumScore += 3;
            } else if (crossDown && m1.stochK > 75) {
                add('stoch_cross', -12); momentumScore -= 12;
            } else if (crossDown) {
                add('stoch_cross', -3); momentumScore -= 3;
            }
        }

        // Extreme zone reversal (only TRUE extremes)
        if (m1.stochK > 90) { add('stoch_extreme', -4); momentumScore -= 4; }
        else if (m1.stochK < 10) { add('stoch_extreme', 4); momentumScore += 4; }

        // Momentum position — supports trend direction
        const sPos = m1.stochK > m1.stochD ? 2 : -2;
        add('stoch_pos', sPos); momentumScore += sPos;
    }

    // 2.3 MACD — Direction + crossover (strong momentum indicator)
    if (ok(m1.macd) && ok(m1.macdSig)) {
        const p = m1.macd > m1.macdSig ? 4 : -4;
        add('macd', p); momentumScore += p;

        // MACD histogram decreasing = losing momentum
        const hist = m1.macd - m1.macdSig;
        if (Math.abs(hist) < 0.0001 && ok(m1.atr) && m1.atr > 0) {
            // Very close to crossing → potential reversal
            add('macd_near_cross', hist > 0 ? -2 : 2); momentumScore += (hist > 0 ? -2 : 2);
        }
    }

    // 2.4 CCI — Momentum mode + extreme reversal
    if (ok(m1.cci)) {
        if (m1.cci > 200) { add('cci', -4); momentumScore -= 4; }       // TRUE extreme → reversal
        else if (m1.cci > 100) { add('cci', 2); momentumScore += 2; }   // Strong bullish momentum
        else if (m1.cci > 0) { add('cci', 1); momentumScore += 1; }     // Bullish momentum
        else if (m1.cci < -200) { add('cci', 4); momentumScore += 4; }  // TRUE extreme → reversal
        else if (m1.cci < -100) { add('cci', -2); momentumScore -= 2; } // Strong bearish momentum
        else { add('cci', -1); momentumScore -= 1; }                    // Bearish momentum
    }

    // 2.5 Williams %R — Momentum mode + extreme reversal
    if (ok(m1.wr)) {
        if (m1.wr > -5) { add('williams_r', -5); momentumScore -= 5; }   // TRUE extreme OB → reversal
        else if (m1.wr > -20) { add('williams_r', 2); momentumScore += 2; }  // Strong bullish momentum
        else if (m1.wr > -50) { add('williams_r', 1); momentumScore += 1; }  // Bullish momentum
        else if (m1.wr < -95) { add('williams_r', 5); momentumScore += 5; }  // TRUE extreme OS → reversal
        else if (m1.wr < -80) { add('williams_r', -2); momentumScore -= 2; } // Strong bearish momentum
        else { add('williams_r', -1); momentumScore -= 1; }                  // Bearish momentum
    }

    // 2.6 Awesome Oscillator
    if (ok(m1.ao)) {
        const p = m1.ao > 0 ? 2 : -2;
        add('awesome_osc', p); momentumScore += p;

        if (ok(m1.aoPrev)) {
            // AO direction change = momentum shift
            if (m1.ao > 0 && m1.ao < m1.aoPrev) { add('ao_weakening', -2); momentumScore -= 2; }
            else if (m1.ao < 0 && m1.ao > m1.aoPrev) { add('ao_weakening', 2); momentumScore += 2; }
            else {
                const acc = m1.ao > m1.aoPrev ? 1 : -1;
                add('ao_accel', acc); momentumScore += acc;
            }
        }
    }

    // 2.7 Momentum
    if (ok(m1.mom)) {
        const p = m1.mom > 0 ? 2 : -2;
        add('momentum', p); momentumScore += p;

        if (ok(m1.momPrev)) {
            // Momentum weakening = reversal potential
            if (m1.mom > 0 && m1.mom < m1.momPrev) { add('mom_weakening', -1); momentumScore -= 1; }
            else if (m1.mom < 0 && m1.mom > m1.momPrev) { add('mom_weakening', 1); momentumScore += 1; }
        }
    }

    // 2.8 Ultimate Oscillator
    if (ok(m1.uo)) {
        if (m1.uo > 70) { add('ultimate_osc', -3); momentumScore -= 3; }
        else if (m1.uo > 50) { add('ultimate_osc', 1); momentumScore += 1; }
        else if (m1.uo < 30) { add('ultimate_osc', 3); momentumScore += 3; }
        else { add('ultimate_osc', -1); momentumScore -= 1; }
    }

    // 2.9 TradingView Oscillator Rec
    if (ok(m1.recOsc)) {
        const p = Math.round(m1.recOsc * 3);
        add('tv_osc_rec', p); momentumScore += p;
    }

    // ==========================================================
    // SECTION 3: ADX TREND STRENGTH
    // ==========================================================
    if (ok(m1.pdi) && ok(m1.mdi)) {
        const diWeight = isStrongTrend ? 4 : 2;
        const p = m1.pdi > m1.mdi ? diWeight : -diWeight;
        add('adx_di', p); adxScore += p;

        if (ok(m1.pdiPrev) && ok(m1.mdiPrev)) {
            const crossUp = m1.pdiPrev <= m1.mdiPrev && m1.pdi > m1.mdi;
            const crossDown = m1.pdiPrev >= m1.mdiPrev && m1.pdi < m1.mdi;
            if (crossUp) { add('di_crossover', 5); adxScore += 5; }
            else if (crossDown) { add('di_crossover', -5); adxScore -= 5; }
        }
    }

    // ==========================================================
    // SECTION 4: SUPPORT / RESISTANCE & BB
    // ==========================================================

    // 4.1 Bollinger Band — REVERSAL indicator (strongest for extremes)
    if (ok(m1.close) && ok(m1.bbUp) && ok(m1.bbLow)) {
        const bbRange = m1.bbUp - m1.bbLow;
        if (bbRange > 0) {
            const bbPos = (m1.close - m1.bbLow) / bbRange;
            if (bbPos >= 0.98) { add('bb_extreme', -10); srScore -= 10; }
            else if (bbPos >= 0.92) { add('bb_near_upper', -6); srScore -= 6; }
            else if (bbPos >= 0.85) { add('bb_upper', -3); srScore -= 3; }
            else if (bbPos <= 0.02) { add('bb_extreme', 10); srScore += 10; }
            else if (bbPos <= 0.08) { add('bb_near_lower', 6); srScore += 6; }
            else if (bbPos <= 0.15) { add('bb_lower', 3); srScore += 3; }
            else if (bbPos > 0.65) { add('bb_upper_zone', -1); srScore -= 1; }
            else if (bbPos < 0.35) { add('bb_lower_zone', 1); srScore += 1; }
        }
    }

    // 4.2 Pivot Point Proximity
    if (ok(m1.close) && ok(m1.atr) && m1.atr > 0) {
        const proximity = m1.atr * 0.3;

        if (ok(m1.pS1) && Math.abs(m1.close - m1.pS1) < proximity) { add('near_support', 3); srScore += 3; }
        else if (ok(m1.pS2) && Math.abs(m1.close - m1.pS2) < proximity) { add('near_support', 2); srScore += 2; }

        if (ok(m1.pR1) && Math.abs(m1.close - m1.pR1) < proximity) { add('near_resist', -3); srScore -= 3; }
        else if (ok(m1.pR2) && Math.abs(m1.close - m1.pR2) < proximity) { add('near_resist', -2); srScore -= 2; }

        if (ok(m1.pM)) {
            const p = m1.close > m1.pM ? 1 : -1;
            add('pivot_position', p); srScore += p;
        }
    }

    // 4.3 Candle Pattern
    if (ok(m1.open) && ok(m1.close) && ok(m1.high) && ok(m1.low)) {
        const bodySize = Math.abs(m1.close - m1.open);
        const totalRange = m1.high - m1.low;
        if (totalRange > 0) {
            const bodyRatio = bodySize / totalRange;
            // Pin bar / doji detection (small body, long wick = reversal)
            if (bodyRatio < 0.3 && totalRange > 0) {
                const upperWick = m1.high - Math.max(m1.open, m1.close);
                const lowerWick = Math.min(m1.open, m1.close) - m1.low;
                if (upperWick > lowerWick * 2) {
                    add('pin_bar', -5); srScore -= 5;
                } else if (lowerWick > upperWick * 2) {
                    add('pin_bar', 5); srScore += 5;
                }
            }
            // Strong directional candle (Marubozu-like)
            if (bodyRatio > 0.75) {
                const p = m1.close > m1.open ? 3 : -3;
                add('strong_candle', p); srScore += p;
            }
        }
    }

    // ==========================================================
    // SECTION 5: MULTI-TIMEFRAME TREND CONFIRMATION
    // Higher TFs confirm trend direction — strongest edge
    // ==========================================================

    // 5-Minute TradingView combined recommendation (trend direction)
    if (ok(m5.recAll)) {
        const p = Math.round(m5.recAll * 4);
        add('m5_rec', p); mtfScore += p;
    }
    if (ok(m5.macd) && ok(m5.macdSig)) {
        const mp = m5.macd > m5.macdSig ? 2 : -2;
        add('m5_macd', mp); mtfScore += mp;
    }
    if (ok(m5.rsi)) {
        // 5m RSI momentum support
        if (m5.rsi > 60) { add('m5_rsi_bull', 2); mtfScore += 2; }
        else if (m5.rsi < 40) { add('m5_rsi_bear', -2); mtfScore -= 2; }
        // Only extreme reversal
        if (m5.rsi > 80) { add('m5_rsi_extreme', -3); mtfScore -= 3; }
        else if (m5.rsi < 20) { add('m5_rsi_extreme', 3); mtfScore += 3; }
    }

    // 15-Minute TradingView combined recommendation (major trend)
    if (ok(m15.recAll)) {
        const p = Math.round(m15.recAll * 5);
        add('m15_rec', p); mtfScore += p;
    }
    if (ok(m15.macd) && ok(m15.macdSig)) {
        const mp = m15.macd > m15.macdSig ? 2 : -2;
        add('m15_macd', mp); mtfScore += mp;
    }
    if (ok(m15.rsi)) {
        if (m15.rsi > 60) { add('m15_rsi_bull', 2); mtfScore += 2; }
        else if (m15.rsi < 40) { add('m15_rsi_bear', -2); mtfScore -= 2; }
    }

    // ==========================================================
    // SECTION 6: CONFLUENCE BOOST & FILTERS
    // ==========================================================
    const filters = {};

    // 6.1 OVERBOUGHT CONFLUENCE → Reversal guard (only at TRUE extremes, 3+ indicators)
    if (isOverbought) {
        const boost = -8;
        score += boost;
        breakdown['ob_confluence'] = boost;
        filters.overbought = 'Multiple indicators overbought (3+) — reversal guard';
    }

    // 6.2 OVERSOLD CONFLUENCE → Reversal guard  
    if (isOversold) {
        const boost = 8;
        score += boost;
        breakdown['os_confluence'] = boost;
        filters.oversold = 'Multiple indicators oversold (3+) — reversal guard';
    }

    // 6.3 Low ADX = ranging market → oscillator signals more reliable, trend already capped
    if (isWeakTrend) {
        filters.ranging = 'Weak trend (ADX<20) — oscillator signals prioritized';
    }

    // 6.4 Multi-TF conflict → reduce confidence
    if (ok(m5.recAll) && ok(m15.recAll)) {
        const m5dir = m5.recAll > 0.1 ? 1 : m5.recAll < -0.1 ? -1 : 0;
        const m15dir = m15.recAll > 0.1 ? 1 : m15.recAll < -0.1 ? -1 : 0;
        if (m5dir !== 0 && m15dir !== 0 && m5dir !== m15dir) {
            score = Math.round(score * 0.6);
            filters.mtf_conflict = '5m and 15m disagree — confidence reduced';
        }
    }

    // 6.5 Trend vs Score direction — in strong trend, penalize counter-trend signals heavily
    if (isStrongTrend && ok(m1.pdi) && ok(m1.mdi)) {
        const trendDir = m1.pdi > m1.mdi ? 1 : -1;
        const scoreDir = score > 0 ? 1 : score < 0 ? -1 : 0;
        if (scoreDir !== 0 && scoreDir !== trendDir && !isOverbought && !isOversold) {
            score = Math.round(score * 0.5);
            filters.against_strong_trend = 'Against trend (ADX>' + Math.round(m1.adx) + ') without extreme OB/OS — heavily reduced';
        }
    }

    // 6.6 BB squeeze — uncertain direction
    if (ok(m5.bbUp) && ok(m5.bbLow) && ok(m5.close) && m5.close > 0) {
        const bbWidth5 = (m5.bbUp - m5.bbLow) / m5.close;
        if (bbWidth5 < 0.001) {
            score = Math.round(score * 0.6);
            filters.bb_squeeze = 'Bollinger squeeze — direction uncertain';
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
        trend_raw: rawTrend,
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
    if (absScore < 10) {
        return {
            direction: 'SKIP',
            strength: 0,
            reason: 'Indicators conflicting or too weak — no clear signal',
            analysis
        };
    }

    // Direction from score sign
    const direction = score > 0 ? 'CALL' : 'PUT';

    // Map score (10-100) → strength (55-95%)
    const clampedScore = Math.min(absScore, 100);
    let strength = Math.round(55 + (clampedScore - 10) * (40 / 90));
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
