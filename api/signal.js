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
 * SMART SIGNAL ANALYSIS ENGINE v2
 *
 * Dual-mode: TREND-FOLLOWING + MEAN-REVERSION
 * 
 * Mode 1 (Strong Trend): ADX > 25, all TFs align → go WITH trend
 * Mode 2 (Reversal): Oscillators at extremes → go AGAINST trend
 * Mode 3 (SKIP): No clear setup → don't trade
 *
 * For 1-minute binary options:
 *   - Overbought (RSI>70, Stoch>80, BB upper) → PUT
 *   - Oversold  (RSI<30, Stoch<20, BB lower) → CALL
 *   - Strong trend + pullback → WITH trend
 *   - Conflicting signals → SKIP
 *
 * Requires minimum CONFLUENCE of 4+ indicators agreeing
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
    // Each indicator votes CALL (+) or PUT (-) with a weight
    let score = 0;
    const breakdown = {};
    const add = (name, pts) => {
        const p = Math.round(pts);
        if (p !== 0) { score += p; breakdown[name] = p; }
    };

    let trendScore = 0, momentumScore = 0, adxScore = 0, srScore = 0, mtfScore = 0;

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
    // SECTION 1: TREND ANALYSIS (reduced weight for 1-min)
    // ==========================================================

    // 1.1 EMA Ribbon (reduced from 8 to 4)
    if (ok(m1.ema5) && ok(m1.ema10) && ok(m1.ema20) && ok(m1.ema50)) {
        const bullRibbon = m1.ema5 > m1.ema10 && m1.ema10 > m1.ema20 && m1.ema20 > m1.ema50;
        const bearRibbon = m1.ema5 < m1.ema10 && m1.ema10 < m1.ema20 && m1.ema20 < m1.ema50;
        if (bullRibbon) { add('ema_ribbon', 4); trendScore += 4; }
        else if (bearRibbon) { add('ema_ribbon', -4); trendScore -= 4; }
        else {
            let align = 0;
            if (m1.ema5 > m1.ema10) align++; else align--;
            if (m1.ema10 > m1.ema20) align++; else align--;
            if (m1.ema20 > m1.ema50) align++; else align--;
            const pts = align; // reduced
            add('ema_ribbon', pts); trendScore += pts;
        }
    }

    // 1.2 Price vs Key MAs (reduced from 1.5x to 1x)
    if (ok(m1.close)) {
        let maVotes = 0;
        if (ok(m1.ema20)) maVotes += m1.close > m1.ema20 ? 1 : -1;
        if (ok(m1.ema50)) maVotes += m1.close > m1.ema50 ? 1 : -1;
        if (ok(m1.sma20)) maVotes += m1.close > m1.sma20 ? 1 : -1;
        if (ok(m1.sma50)) maVotes += m1.close > m1.sma50 ? 1 : -1;
        if (ok(m1.ema200)) maVotes += m1.close > m1.ema200 ? 1 : -1;
        const pts = maVotes; // was maVotes * 1.5
        add('price_vs_ma', pts); trendScore += pts;
    }

    // 1.3 Hull MA
    if (ok(m1.close) && ok(m1.hull)) {
        const pts = m1.close > m1.hull ? 2 : -2;
        add('hull_ma', pts); trendScore += pts;
    }

    // 1.4 VWMA
    if (ok(m1.close) && ok(m1.vwma)) {
        const pts = m1.close > m1.vwma ? 1 : -1;
        add('vwma', pts); trendScore += pts;
    }

    // 1.5 Ichimoku
    if (ok(m1.close) && ok(m1.ichiBL)) {
        const pts = m1.close > m1.ichiBL ? 1 : -1;
        add('ichimoku', pts); trendScore += pts;
    }

    // 1.6 TradingView MA Rec (reduced from 5x to 3x)
    if (ok(m1.recMA)) {
        const pts = Math.round(m1.recMA * 3);
        add('tv_ma_rec', pts); trendScore += pts;
    }

    // ==========================================================
    // SECTION 2: OSCILLATOR & REVERSAL (INCREASED weight)
    // ==========================================================

    // 2.1 RSI — REVERSAL-focused for 1-min binary
    if (ok(m1.rsi)) {
        // Reversal zones (MAIN signal for 1-min)
        if (m1.rsi > 75) {
            const p = -Math.min(8, Math.round((m1.rsi - 70) / 2));
            add('rsi_reversal', p); momentumScore += p;
        } else if (m1.rsi < 25) {
            const p = Math.min(8, Math.round((30 - m1.rsi) / 2));
            add('rsi_reversal', p); momentumScore += p;
        }
        // Moderate zones — momentum direction
        else if (m1.rsi > 55) {
            add('rsi_momentum', 2); momentumScore += 2;
        } else if (m1.rsi < 45) {
            add('rsi_momentum', -2); momentumScore -= 2;
        }

        // RSI divergence detection
        if (ok(m1.rsiPrev)) {
            if (m1.rsi < m1.rsiPrev && ok(m1.close) && ok(m1.open) && m1.close > m1.open) {
                // Price going up but RSI going down → bearish divergence
                add('rsi_divergence', -3); momentumScore -= 3;
            } else if (m1.rsi > m1.rsiPrev && ok(m1.close) && ok(m1.open) && m1.close < m1.open) {
                // Price going down but RSI going up → bullish divergence
                add('rsi_divergence', 3); momentumScore += 3;
            }
        }
    }

    // 2.2 Stochastic — Crossover in extreme zones (strongest 1-min signal)
    if (ok(m1.stochK) && ok(m1.stochD)) {
        if (ok(m1.stochKPrev) && ok(m1.stochDPrev)) {
            const wasBelow = m1.stochKPrev <= m1.stochDPrev;
            const nowAbove = m1.stochK > m1.stochD;
            const crossUp = wasBelow && nowAbove;
            const crossDown = m1.stochKPrev >= m1.stochDPrev && m1.stochK < m1.stochD;

            if (crossUp && m1.stochK < 25) {
                add('stoch_cross', 10); momentumScore += 10; // Strong oversold crossover → CALL
            } else if (crossUp) {
                add('stoch_cross', 3); momentumScore += 3;
            } else if (crossDown && m1.stochK > 75) {
                add('stoch_cross', -10); momentumScore -= 10; // Strong overbought crossover → PUT
            } else if (crossDown) {
                add('stoch_cross', -3); momentumScore -= 3;
            }
        }

        // Extreme zone reversal
        if (m1.stochK > 85) { add('stoch_extreme', -4); momentumScore -= 4; }
        else if (m1.stochK < 15) { add('stoch_extreme', 4); momentumScore += 4; }

        // Position
        const sPos = m1.stochK > m1.stochD ? 1 : -1;
        add('stoch_pos', sPos); momentumScore += sPos;
    }

    // 2.3 MACD — Direction + crossover
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

    // 2.4 CCI — Extreme reversal
    if (ok(m1.cci)) {
        if (m1.cci > 200) { add('cci', -4); momentumScore -= 4; }      // Extreme OB → PUT
        else if (m1.cci > 100) { add('cci', -2); momentumScore -= 2; } // OB → PUT
        else if (m1.cci < -200) { add('cci', 4); momentumScore += 4; } // Extreme OS → CALL
        else if (m1.cci < -100) { add('cci', 2); momentumScore += 2; } // OS → CALL
        else if (m1.cci > 0) { add('cci', 1); momentumScore += 1; }
        else { add('cci', -1); momentumScore -= 1; }
    }

    // 2.5 Williams %R — Mean reversion
    if (ok(m1.wr)) {
        if (m1.wr > -10) { add('williams_r', -5); momentumScore -= 5; }       // Extreme OB
        else if (m1.wr > -20) { add('williams_r', -3); momentumScore -= 3; }  // OB
        else if (m1.wr < -90) { add('williams_r', 5); momentumScore += 5; }   // Extreme OS
        else if (m1.wr < -80) { add('williams_r', 3); momentumScore += 3; }   // OS
        else if (m1.wr > -50) { add('williams_r', 1); momentumScore += 1; }
        else { add('williams_r', -1); momentumScore -= 1; }
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
        const p = m1.pdi > m1.mdi ? 3 : -3;
        add('adx_di', p); adxScore += p;

        if (ok(m1.pdiPrev) && ok(m1.mdiPrev)) {
            const crossUp = m1.pdiPrev <= m1.mdiPrev && m1.pdi > m1.mdi;
            const crossDown = m1.pdiPrev >= m1.mdiPrev && m1.pdi < m1.mdi;
            if (crossUp) { add('di_crossover', 4); adxScore += 4; }
            else if (crossDown) { add('di_crossover', -4); adxScore -= 4; }
        }
    }

    // ==========================================================
    // SECTION 4: SUPPORT / RESISTANCE & BB
    // ==========================================================

    // 4.1 Bollinger Band — REVERSAL indicator (INCREASED weight)
    if (ok(m1.close) && ok(m1.bbUp) && ok(m1.bbLow)) {
        const bbRange = m1.bbUp - m1.bbLow;
        if (bbRange > 0) {
            const bbPos = (m1.close - m1.bbLow) / bbRange;
            if (bbPos >= 0.98) { add('bb_extreme_upper', -7); srScore -= 7; }      // At upper band → strong PUT
            else if (bbPos >= 0.90) { add('bb_near_upper', -4); srScore -= 4; }
            else if (bbPos <= 0.02) { add('bb_extreme_lower', 7); srScore += 7; }  // At lower band → strong CALL
            else if (bbPos <= 0.10) { add('bb_near_lower', 4); srScore += 4; }
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
                    // Long upper wick → bearish reversal signal
                    add('pin_bar', -3); srScore -= 3;
                } else if (lowerWick > upperWick * 2) {
                    // Long lower wick → bullish reversal signal
                    add('pin_bar', 3); srScore += 3;
                }
            }
        }
    }

    // ==========================================================
    // SECTION 5: MULTI-TIMEFRAME (reduced weight, confirmation only)
    // ==========================================================

    // 5-Minute
    if (ok(m5.recAll)) {
        const p = Math.round(m5.recAll * 3); // was 6
        add('m5_rec', p); mtfScore += p;
    }
    if (ok(m5.macd) && ok(m5.macdSig)) {
        const p = m5.macd > m5.macdSig ? 1 : -1;
        add('m5_macd', p); mtfScore += p;
    }
    if (ok(m5.rsi)) {
        // 5-min RSI extreme → strong reversal confirmation
        if (m5.rsi > 75) { add('m5_rsi_ob', -3); mtfScore -= 3; }
        else if (m5.rsi < 25) { add('m5_rsi_os', 3); mtfScore += 3; }
    }

    // 15-Minute
    if (ok(m15.recAll)) {
        const p = Math.round(m15.recAll * 4); // was 8
        add('m15_rec', p); mtfScore += p;
    }
    if (ok(m15.macd) && ok(m15.macdSig)) {
        const p = m15.macd > m15.macdSig ? 2 : -2;
        add('m15_macd', p); mtfScore += p;
    }
    if (ok(m15.rsi)) {
        // 15-min RSI extreme → very strong reversal confirmation
        if (m15.rsi > 75) { add('m15_rsi_ob', -4); mtfScore -= 4; }
        else if (m15.rsi < 25) { add('m15_rsi_os', 4); mtfScore += 4; }
    }

    // ==========================================================
    // SECTION 6: CONFLUENCE BOOST & FILTERS
    // ==========================================================
    const filters = {};

    // 6.1 OVERBOUGHT CONFLUENCE → Strong PUT override
    if (isOverbought) {
        // Multiple oscillators agree: market is overbought → expect downward reversal
        const boost = -8;
        score += boost;
        breakdown['ob_confluence'] = boost;
        filters.overbought = 'Multiple indicators overbought — reversal expected';
    }

    // 6.2 OVERSOLD CONFLUENCE → Strong CALL override
    if (isOversold) {
        const boost = 8;
        score += boost;
        breakdown['os_confluence'] = boost;
        filters.oversold = 'Multiple indicators oversold — reversal expected';
    }

    // 6.3 Low ADX = ranging market → boost reversal signals, reduce trend signals
    if (isWeakTrend) {
        // In ranging market, oscillator/reversal signals are more reliable
        // Reduce trend component
        const trendReduction = Math.round(trendScore * 0.5);
        score -= trendReduction;
        if (trendReduction !== 0) breakdown['weak_trend_adj'] = -trendReduction;
        filters.ranging = 'Weak trend (ADX<20) — trend signals reduced';
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

    // 6.5 Trend vs Score direction conflict in strong trend
    if (isStrongTrend && ok(m1.pdi) && ok(m1.mdi)) {
        const trendDir = m1.pdi > m1.mdi ? 1 : -1; // +1 = bullish trend, -1 = bearish trend
        const scoreDir = score > 0 ? 1 : score < 0 ? -1 : 0;
        // If we're going against a very strong trend, need extra confirmation
        if (isVeryStrongTrend && scoreDir !== 0 && scoreDir !== trendDir && !isOverbought && !isOversold) {
            score = Math.round(score * 0.5);
            filters.against_strong_trend = 'Against very strong trend without reversal confirmation';
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

    // SKIP if score too weak (raised threshold for accuracy)
    if (absScore < 25) {
        return {
            direction: 'SKIP',
            strength: 0,
            reason: 'Indicators conflicting or too weak — no clear signal',
            analysis
        };
    }

    // Direction from score sign
    const direction = score > 0 ? 'CALL' : 'PUT';

    // Map score (25-100) → strength (60-95%)
    const clampedScore = Math.min(absScore, 100);
    let strength = Math.round(60 + (clampedScore - 25) * (35 / 75));
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
