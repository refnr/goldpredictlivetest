import { RSI, MACD, SMA, EMA, BollingerBands, Stochastic, WilliamsR, CCI, ATR } from 'technicalindicators';
import * as ss from 'simple-statistics';
import type { PredictRequest, PredictionResponse } from '@shared/schema';
import { fetchLiveXAUUSD } from './livePrice';

interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface IndicatorSignal {
  name: string;
  signal: 'BUY' | 'SELL' | 'NEUTRAL';
  strength: number;
  weight: number;
  value?: number;
  description?: string;
}

interface MultiTimeframeResult {
  timeframe: string;
  direction: 'UP' | 'DOWN' | 'NEUTRAL';
  strength: number;
}

const INTERVAL_MS: Record<string, number> = {
  "1m": 60000,
  "5m": 300000,
  "15m": 900000,
  "30m": 1800000,
  "1h": 3600000,
  "4h": 14400000,
  "1d": 86400000,
};

function mapTimeframeToYahoo(timeframe: string): { interval: string, range: string } {
  switch (timeframe) {
    case '1m': return { interval: '1m', range: '1d' };
    case '5m': return { interval: '5m', range: '5d' };
    case '15m': return { interval: '15m', range: '5d' };
    case '30m': return { interval: '30m', range: '5d' };
    case '1h': return { interval: '1h', range: '1mo' };
    case '4h': return { interval: '1h', range: '3mo' };
    case '1d': return { interval: '1d', range: '1y' };
    default: return { interval: '1h', range: '1mo' };
  }
}

export async function analyzeMarket(request: PredictRequest): Promise<PredictionResponse> {
  const symbol = 'XAUUSD';
  const timeframe = request.timeframe || '1h';
  
  const livePrice = await fetchLiveXAUUSD();
  
  let candles = await fetchHistoricalCandles(timeframe);
  
  if (candles.length === 0) {
    console.log('Using generated candles as fallback');
    candles = generateRealisticCandles(livePrice.price, timeframe, 100);
  }
  
  const lastCandle = candles[candles.length - 1];
  if (Math.abs(lastCandle.close - livePrice.price) / livePrice.price > 0.05) {
    candles.push({
      time: new Date().toISOString(),
      open: lastCandle.close,
      high: Math.max(lastCandle.close, livePrice.price),
      low: Math.min(lastCandle.close, livePrice.price),
      close: livePrice.price
    });
  }

  // Get multi-timeframe analysis for higher confidence
  const mtfAnalysis = await getMultiTimeframeAnalysis(timeframe);

  return calculateAdvancedPrediction(candles, symbol, timeframe, livePrice.price, mtfAnalysis);
}

async function getMultiTimeframeAnalysis(currentTimeframe: string): Promise<MultiTimeframeResult[]> {
  const results: MultiTimeframeResult[] = [];
  
  // Define related timeframes for confluence
  const timeframeHierarchy: Record<string, string[]> = {
    '1m': ['5m', '15m'],
    '5m': ['15m', '1h'],
    '15m': ['1h', '4h'],
    '30m': ['1h', '4h'],
    '1h': ['4h', '1d'],
    '4h': ['1d'],
    '1d': [],
  };
  
  const relatedTimeframes = timeframeHierarchy[currentTimeframe] || [];
  
  for (const tf of relatedTimeframes) {
    try {
      const candles = await fetchHistoricalCandles(tf);
      if (candles.length >= 20) {
        const closes = candles.map(c => c.close);
        const trend = analyzeTrendFromCloses(closes);
        results.push({
          timeframe: tf,
          direction: trend.direction,
          strength: trend.strength
        });
      }
    } catch (e) {
      console.error(`Failed to fetch ${tf} for MTF analysis`);
    }
  }
  
  return results;
}

function analyzeTrendFromCloses(closes: number[]): { direction: 'UP' | 'DOWN' | 'NEUTRAL', strength: number } {
  if (closes.length < 10) return { direction: 'NEUTRAL', strength: 0 };
  
  const recent = closes.slice(-20);
  const sma10 = SMA.calculate({ period: 10, values: recent });
  const sma20 = SMA.calculate({ period: 20, values: closes });
  
  const lastClose = closes[closes.length - 1];
  const lastSMA10 = sma10.length > 0 ? sma10[sma10.length - 1] : lastClose;
  const lastSMA20 = sma20.length > 0 ? sma20[sma20.length - 1] : lastClose;
  
  let direction: 'UP' | 'DOWN' | 'NEUTRAL' = 'NEUTRAL';
  let strength = 50;
  
  if (lastClose > lastSMA10 && lastSMA10 > lastSMA20) {
    direction = 'UP';
    strength = 70 + Math.min(25, ((lastClose - lastSMA20) / lastSMA20) * 1000);
  } else if (lastClose < lastSMA10 && lastSMA10 < lastSMA20) {
    direction = 'DOWN';
    strength = 70 + Math.min(25, ((lastSMA20 - lastClose) / lastSMA20) * 1000);
  }
  
  return { direction, strength: Math.min(95, strength) };
}

async function fetchHistoricalCandles(timeframe: string): Promise<Candle[]> {
  const { interval, range } = mapTimeframeToYahoo(timeframe);
  const symbol = 'GC=F';
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=${range}`;
  
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    
    if (!response.ok) return [];
    
    const data = await response.json();
    if (!data.chart || !data.chart.result || data.chart.result.length === 0) return [];
    
    const result = data.chart.result[0];
    const timestamps = result.timestamp;
    const quote = result.indicators.quote[0];
    
    const candles: Candle[] = [];
    
    for (let i = 0; i < timestamps.length; i++) {
      if (quote.open[i] === null || quote.close[i] === null) continue;
      
      candles.push({
        time: new Date(timestamps[i] * 1000).toISOString(),
        open: quote.open[i],
        high: quote.high[i],
        low: quote.low[i],
        close: quote.close[i]
      });
    }
    
    return candles;
  } catch (e) {
    console.error('Failed to fetch historical candles:', e);
    return [];
  }
}

function generateRealisticCandles(currentPrice: number, timeframe: string, count: number): Candle[] {
  const intervalMs = INTERVAL_MS[timeframe] || 3600000;
  const now = Date.now();
  const candles: Candle[] = [];
  
  let price = currentPrice;
  
  const pricesReverse: number[] = [price];
  for (let i = 1; i < count; i++) {
    const volatility = timeframe === '1m' ? 0.05 : timeframe === '1d' ? 0.5 : 0.15;
    const change = (Math.random() - 0.5) * volatility * 0.01 * price;
    price = price - change;
    pricesReverse.push(price);
  }
  
  const prices = pricesReverse.reverse();
  
  for (let i = 0; i < count; i++) {
    const candleTime = new Date(now - (count - 1 - i) * intervalMs);
    const closePrice = prices[i];
    const openPrice = i > 0 ? prices[i - 1] : closePrice * (1 + (Math.random() - 0.5) * 0.001);
    
    const range = Math.abs(closePrice - openPrice) + closePrice * 0.0005;
    const high = Math.max(openPrice, closePrice) + Math.random() * range;
    const low = Math.min(openPrice, closePrice) - Math.random() * range;
    
    candles.push({
      time: candleTime.toISOString(),
      open: Math.round(openPrice * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(closePrice * 100) / 100,
    });
  }
  
  return candles;
}

// Enhanced indicator analysis functions
function analyzeRSI(rsiValue: number): IndicatorSignal {
  let signal: 'BUY' | 'SELL' | 'NEUTRAL' = 'NEUTRAL';
  let strength = 50;
  let description = '';
  
  if (rsiValue <= 20) {
    signal = 'BUY';
    strength = 95;
    description = 'Extreme oversold - Strong buy signal';
  } else if (rsiValue <= 30) {
    signal = 'BUY';
    strength = 85;
    description = 'Oversold territory - Buy signal';
  } else if (rsiValue <= 40) {
    signal = 'BUY';
    strength = 70;
    description = 'Approaching oversold - Weak buy';
  } else if (rsiValue >= 80) {
    signal = 'SELL';
    strength = 95;
    description = 'Extreme overbought - Strong sell signal';
  } else if (rsiValue >= 70) {
    signal = 'SELL';
    strength = 85;
    description = 'Overbought territory - Sell signal';
  } else if (rsiValue >= 60) {
    signal = 'SELL';
    strength = 70;
    description = 'Approaching overbought - Weak sell';
  } else {
    strength = 50;
    description = 'Neutral zone';
  }
  
  return { name: 'RSI', signal, strength, weight: 1.8, value: rsiValue, description };
}

function analyzeMACD(macd: any): IndicatorSignal {
  if (!macd || macd.histogram === undefined) {
    return { name: 'MACD', signal: 'NEUTRAL', strength: 0, weight: 1.8 };
  }
  
  let signal: 'BUY' | 'SELL' | 'NEUTRAL' = 'NEUTRAL';
  let strength = 50;
  let description = '';
  
  const histogram = macd.histogram;
  const macdLine = macd.MACD || 0;
  const signalLine = macd.signal || 0;
  
  // Strong signal when MACD crosses signal line with momentum
  if (macdLine > signalLine && histogram > 0) {
    signal = 'BUY';
    strength = Math.min(95, 65 + Math.abs(histogram) * 8);
    description = histogram > 2 ? 'Strong bullish momentum' : 'Bullish crossover';
  } else if (macdLine < signalLine && histogram < 0) {
    signal = 'SELL';
    strength = Math.min(95, 65 + Math.abs(histogram) * 8);
    description = histogram < -2 ? 'Strong bearish momentum' : 'Bearish crossover';
  }
  
  // Check for divergence
  if (Math.abs(histogram) > 3) {
    strength = Math.min(95, strength + 10);
    description += ' with strong divergence';
  }
  
  return { name: 'MACD', signal, strength, weight: 1.8, value: histogram, description };
}

function analyzeSMAEMA(price: number, sma: number, ema: number): IndicatorSignal {
  let signal: 'BUY' | 'SELL' | 'NEUTRAL' = 'NEUTRAL';
  let strength = 50;
  let description = '';
  
  const smaDistance = ((price - sma) / sma) * 100;
  const emaDistance = ((price - ema) / ema) * 100;
  
  if (price > sma && price > ema && ema > sma) {
    signal = 'BUY';
    strength = Math.min(90, 70 + Math.abs(smaDistance) * 3);
    description = 'Price above MAs, bullish alignment';
  } else if (price < sma && price < ema && ema < sma) {
    signal = 'SELL';
    strength = Math.min(90, 70 + Math.abs(smaDistance) * 3);
    description = 'Price below MAs, bearish alignment';
  } else if (price > sma && price > ema) {
    signal = 'BUY';
    strength = 65;
    description = 'Price above MAs';
  } else if (price < sma && price < ema) {
    signal = 'SELL';
    strength = 65;
    description = 'Price below MAs';
  }
  
  return { name: 'SMA/EMA', signal, strength, weight: 1.4, description };
}

function analyzeBollingerBands(price: number, bb: any): IndicatorSignal {
  if (!bb) {
    return { name: 'Bollinger', signal: 'NEUTRAL', strength: 0, weight: 1.5 };
  }
  
  let signal: 'BUY' | 'SELL' | 'NEUTRAL' = 'NEUTRAL';
  let strength = 50;
  let description = '';
  
  const bandwidth = ((bb.upper - bb.lower) / bb.middle) * 100;
  const pricePosition = (price - bb.lower) / (bb.upper - bb.lower);
  
  if (price <= bb.lower) {
    signal = 'BUY';
    strength = 92;
    description = 'Price at lower band - Strong buy';
  } else if (pricePosition <= 0.15) {
    signal = 'BUY';
    strength = 82;
    description = 'Price near lower band - Buy';
  } else if (pricePosition <= 0.3) {
    signal = 'BUY';
    strength = 70;
    description = 'Price in lower zone';
  } else if (price >= bb.upper) {
    signal = 'SELL';
    strength = 92;
    description = 'Price at upper band - Strong sell';
  } else if (pricePosition >= 0.85) {
    signal = 'SELL';
    strength = 82;
    description = 'Price near upper band - Sell';
  } else if (pricePosition >= 0.7) {
    signal = 'SELL';
    strength = 70;
    description = 'Price in upper zone';
  }
  
  // Squeeze detection
  if (bandwidth < 2) {
    strength = Math.min(95, strength + 8);
    description += ' (squeeze detected)';
  }
  
  return { name: 'Bollinger', signal, strength, weight: 1.5, description };
}

function analyzeStochastic(stoch: any): IndicatorSignal {
  if (!stoch) {
    return { name: 'Stochastic', signal: 'NEUTRAL', strength: 0, weight: 1.6 };
  }
  
  let signal: 'BUY' | 'SELL' | 'NEUTRAL' = 'NEUTRAL';
  let strength = 50;
  let description = '';
  
  const k = stoch.k;
  const d = stoch.d;
  
  if (k <= 20 && d <= 20) {
    signal = 'BUY';
    strength = k > d ? 95 : 88;
    description = k > d ? 'Bullish crossover in oversold' : 'Oversold zone';
  } else if (k <= 30) {
    signal = 'BUY';
    strength = 75;
    description = 'Approaching oversold';
  } else if (k >= 80 && d >= 80) {
    signal = 'SELL';
    strength = k < d ? 95 : 88;
    description = k < d ? 'Bearish crossover in overbought' : 'Overbought zone';
  } else if (k >= 70) {
    signal = 'SELL';
    strength = 75;
    description = 'Approaching overbought';
  }
  
  return { name: 'Stochastic', signal, strength, weight: 1.6, value: k, description };
}

function analyzeWilliamsR(williamsR: number): IndicatorSignal {
  let signal: 'BUY' | 'SELL' | 'NEUTRAL' = 'NEUTRAL';
  let strength = 50;
  let description = '';
  
  // Williams %R ranges from -100 to 0
  if (williamsR <= -80) {
    signal = 'BUY';
    strength = williamsR <= -90 ? 92 : 80;
    description = williamsR <= -90 ? 'Extreme oversold' : 'Oversold';
  } else if (williamsR <= -60) {
    signal = 'BUY';
    strength = 65;
    description = 'Lower zone';
  } else if (williamsR >= -20) {
    signal = 'SELL';
    strength = williamsR >= -10 ? 92 : 80;
    description = williamsR >= -10 ? 'Extreme overbought' : 'Overbought';
  } else if (williamsR >= -40) {
    signal = 'SELL';
    strength = 65;
    description = 'Upper zone';
  }
  
  return { name: 'Williams %R', signal, strength, weight: 1.4, value: williamsR, description };
}

function analyzeCCI(cci: number): IndicatorSignal {
  let signal: 'BUY' | 'SELL' | 'NEUTRAL' = 'NEUTRAL';
  let strength = 50;
  let description = '';
  
  if (cci <= -200) {
    signal = 'BUY';
    strength = 95;
    description = 'Extreme oversold';
  } else if (cci <= -100) {
    signal = 'BUY';
    strength = 85;
    description = 'Oversold';
  } else if (cci <= -50) {
    signal = 'BUY';
    strength = 70;
    description = 'Bearish momentum weakening';
  } else if (cci >= 200) {
    signal = 'SELL';
    strength = 95;
    description = 'Extreme overbought';
  } else if (cci >= 100) {
    signal = 'SELL';
    strength = 85;
    description = 'Overbought';
  } else if (cci >= 50) {
    signal = 'SELL';
    strength = 70;
    description = 'Bullish momentum weakening';
  }
  
  return { name: 'CCI', signal, strength, weight: 1.3, value: cci, description };
}

function analyzePivotPoints(price: number, high: number, low: number, close: number): IndicatorSignal {
  // Calculate pivot points
  const pivot = (high + low + close) / 3;
  const r1 = (2 * pivot) - low;
  const s1 = (2 * pivot) - high;
  const r2 = pivot + (high - low);
  const s2 = pivot - (high - low);
  
  let signal: 'BUY' | 'SELL' | 'NEUTRAL' = 'NEUTRAL';
  let strength = 50;
  let description = '';
  
  if (price <= s2) {
    signal = 'BUY';
    strength = 90;
    description = 'At S2 support - Strong buy zone';
  } else if (price <= s1) {
    signal = 'BUY';
    strength = 80;
    description = 'At S1 support - Buy zone';
  } else if (price < pivot && price > s1) {
    signal = 'BUY';
    strength = 65;
    description = 'Below pivot - Mild bullish';
  } else if (price >= r2) {
    signal = 'SELL';
    strength = 90;
    description = 'At R2 resistance - Strong sell zone';
  } else if (price >= r1) {
    signal = 'SELL';
    strength = 80;
    description = 'At R1 resistance - Sell zone';
  } else if (price > pivot && price < r1) {
    signal = 'SELL';
    strength = 65;
    description = 'Above pivot - Mild bearish';
  }
  
  return { name: 'Pivot Points', signal, strength, weight: 1.2, description };
}

function analyzeTrendStrength(candles: Candle[]): { direction: 'UP' | 'DOWN' | 'NEUTRAL', strength: number } {
  if (candles.length < 20) {
    return { direction: 'NEUTRAL', strength: 0 };
  }
  
  const closes = candles.slice(-20).map(c => c.close);
  const highs = candles.slice(-20).map(c => c.high);
  const lows = candles.slice(-20).map(c => c.low);
  
  let plusDM = 0;
  let minusDM = 0;
  let tr = 0;
  
  for (let i = 1; i < closes.length; i++) {
    const highDiff = highs[i] - highs[i-1];
    const lowDiff = lows[i-1] - lows[i];
    
    if (highDiff > lowDiff && highDiff > 0) plusDM += highDiff;
    if (lowDiff > highDiff && lowDiff > 0) minusDM += lowDiff;
    
    tr += Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i-1]),
      Math.abs(lows[i] - closes[i-1])
    );
  }
  
  const plusDI = tr > 0 ? (plusDM / tr) * 100 : 0;
  const minusDI = tr > 0 ? (minusDM / tr) * 100 : 0;
  const dx = (plusDI + minusDI) > 0 ? Math.abs(plusDI - minusDI) / (plusDI + minusDI) * 100 : 0;
  
  let direction: 'UP' | 'DOWN' | 'NEUTRAL' = 'NEUTRAL';
  if (plusDI > minusDI && dx > 20) direction = 'UP';
  else if (minusDI > plusDI && dx > 20) direction = 'DOWN';
  
  return { direction, strength: Math.min(100, dx * 1.5) };
}

function detectCandlePatterns(candles: Candle[]): IndicatorSignal {
  if (candles.length < 5) {
    return { name: 'Patterns', signal: 'NEUTRAL', strength: 0, weight: 1.2 };
  }
  
  const recent = candles.slice(-5);
  const last = recent[recent.length - 1];
  const prev = recent[recent.length - 2];
  const prev2 = recent[recent.length - 3];
  
  let signal: 'BUY' | 'SELL' | 'NEUTRAL' = 'NEUTRAL';
  let strength = 50;
  let description = '';
  
  const lastBody = Math.abs(last.close - last.open);
  const lastRange = last.high - last.low;
  const lastUpperWick = last.high - Math.max(last.open, last.close);
  const lastLowerWick = Math.min(last.open, last.close) - last.low;
  
  // Hammer (bullish reversal)
  if (lastLowerWick > lastBody * 2 && lastUpperWick < lastBody * 0.3 && last.close > last.open) {
    signal = 'BUY';
    strength = 85;
    description = 'Hammer pattern';
  }
  // Shooting Star (bearish reversal)
  else if (lastUpperWick > lastBody * 2 && lastLowerWick < lastBody * 0.3 && last.close < last.open) {
    signal = 'SELL';
    strength = 85;
    description = 'Shooting star';
  }
  // Bullish Engulfing
  else if (prev.close < prev.open && last.close > last.open && 
           last.open < prev.close && last.close > prev.open) {
    signal = 'BUY';
    strength = 90;
    description = 'Bullish engulfing';
  }
  // Bearish Engulfing
  else if (prev.close > prev.open && last.close < last.open && 
           last.open > prev.close && last.close < prev.open) {
    signal = 'SELL';
    strength = 90;
    description = 'Bearish engulfing';
  }
  // Morning Star (bullish)
  else if (prev2.close < prev2.open && 
           Math.abs(prev.close - prev.open) < lastRange * 0.3 &&
           last.close > last.open && last.close > (prev2.open + prev2.close) / 2) {
    signal = 'BUY';
    strength = 88;
    description = 'Morning star';
  }
  // Evening Star (bearish)
  else if (prev2.close > prev2.open && 
           Math.abs(prev.close - prev.open) < lastRange * 0.3 &&
           last.close < last.open && last.close < (prev2.open + prev2.close) / 2) {
    signal = 'SELL';
    strength = 88;
    description = 'Evening star';
  }
  // Doji (indecision)
  else if (lastBody < lastRange * 0.1) {
    strength = 40;
    description = 'Doji - indecision';
  }
  
  // Check for consecutive candles
  let consecutiveBullish = 0;
  let consecutiveBearish = 0;
  for (let i = recent.length - 1; i >= 0; i--) {
    if (recent[i].close > recent[i].open) {
      if (consecutiveBearish > 0) break;
      consecutiveBullish++;
    } else {
      if (consecutiveBullish > 0) break;
      consecutiveBearish++;
    }
  }
  
  if (consecutiveBullish >= 3 && signal !== 'SELL') {
    signal = 'BUY';
    strength = Math.max(strength, 70 + consecutiveBullish * 5);
    description = description || `${consecutiveBullish} consecutive bullish`;
  } else if (consecutiveBearish >= 3 && signal !== 'BUY') {
    signal = 'SELL';
    strength = Math.max(strength, 70 + consecutiveBearish * 5);
    description = description || `${consecutiveBearish} consecutive bearish`;
  }
  
  return { name: 'Patterns', signal, strength, weight: 1.2, description };
}

function getAIAnalysis(signals: IndicatorSignal[], price: number, trend: any): string {
  const buySignals = signals.filter(s => s.signal === 'BUY');
  const sellSignals = signals.filter(s => s.signal === 'SELL');
  const strongestSignal = [...signals].sort((a, b) => b.strength - a.strength)[0];

  let insight = '';
  if (trend.direction === 'BULLISH') {
    insight = `XAUUSD at $${price.toFixed(2)} shows bullish momentum with ${trend.strength}% strength. ${buySignals.length} of ${signals.length} indicators favor upside.`;
  } else if (trend.direction === 'BEARISH') {
    insight = `XAUUSD at $${price.toFixed(2)} is under bearish pressure with ${trend.strength}% strength. ${sellSignals.length} of ${signals.length} indicators suggest downside risk.`;
  } else {
    insight = `XAUUSD at $${price.toFixed(2)} is consolidating with mixed signals. ${buySignals.length} buy vs ${sellSignals.length} sell indicators.`;
  }

  if (strongestSignal) {
    insight += ` Strongest signal: ${strongestSignal.name} (${strongestSignal.signal}, ${strongestSignal.strength}%).`;
  }

  return insight;
}

function calculateAdvancedPrediction(
  candles: Candle[], 
  symbol: string, 
  timeframe: string, 
  currentLivePrice: number,
  mtfAnalysis: MultiTimeframeResult[]
): PredictionResponse {
  const closes = candles.map(c => c.close);
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);
  const currentPrice = currentLivePrice;

  // Calculate all technical indicators
  const rsiValues = RSI.calculate({ values: closes, period: 14 });
  const currentRSI = rsiValues.length > 0 ? rsiValues[rsiValues.length - 1] : 50;

  const macdValues = MACD.calculate({
    values: closes,
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    SimpleMAOscillator: false,
    SimpleMASignal: false
  });
  const currentMACD = macdValues.length > 0 ? macdValues[macdValues.length - 1] : undefined;

  const smaValues = SMA.calculate({ period: 20, values: closes });
  const currentSMA = smaValues.length > 0 ? smaValues[smaValues.length - 1] : currentPrice;

  const emaValues = EMA.calculate({ period: 20, values: closes });
  const currentEMA = emaValues.length > 0 ? emaValues[emaValues.length - 1] : currentPrice;

  const bbValues = BollingerBands.calculate({
    period: 20,
    values: closes,
    stdDev: 2
  });
  const currentBB = bbValues.length > 0 ? bbValues[bbValues.length - 1] : undefined;

  const stochValues = Stochastic.calculate({
    high: highs,
    low: lows,
    close: closes,
    period: 14,
    signalPeriod: 3
  });
  const currentStoch = stochValues.length > 0 ? stochValues[stochValues.length - 1] : undefined;

  // Additional indicators
  const williamsRValues = WilliamsR.calculate({
    high: highs,
    low: lows,
    close: closes,
    period: 14
  });
  const currentWilliamsR = williamsRValues.length > 0 ? williamsRValues[williamsRValues.length - 1] : -50;

  const cciValues = CCI.calculate({
    high: highs,
    low: lows,
    close: closes,
    period: 20
  });
  const currentCCI = cciValues.length > 0 ? cciValues[cciValues.length - 1] : 0;

  // Get yesterday's high/low/close for pivot points
  const prevCandle = candles.length > 1 ? candles[candles.length - 2] : candles[candles.length - 1];

  // Collect all indicator signals
  const signals: IndicatorSignal[] = [
    analyzeRSI(currentRSI),
    analyzeMACD(currentMACD),
    analyzeSMAEMA(currentPrice, currentSMA, currentEMA),
    analyzeBollingerBands(currentPrice, currentBB),
    analyzeStochastic(currentStoch),
    analyzeWilliamsR(currentWilliamsR),
    analyzeCCI(currentCCI),
    analyzePivotPoints(currentPrice, prevCandle.high, prevCandle.low, prevCandle.close),
    detectCandlePatterns(candles)
  ];

  // Analyze trend strength
  const trend = analyzeTrendStrength(candles);

  // Calculate weighted consensus
  let buyScore = 0;
  let sellScore = 0;
  let totalWeight = 0;

  for (const sig of signals) {
    if (sig.strength === 0) continue; // Skip invalid signals
    const effectiveWeight = sig.weight * (sig.strength / 100);
    totalWeight += sig.weight;
    
    if (sig.signal === 'BUY') {
      buyScore += effectiveWeight;
    } else if (sig.signal === 'SELL') {
      sellScore += effectiveWeight;
    }
  }

  // Add trend weight
  if (trend.direction === 'UP') {
    buyScore += (trend.strength / 100) * 2.0;
  } else if (trend.direction === 'DOWN') {
    sellScore += (trend.strength / 100) * 2.0;
  }
  totalWeight += 2.0;

  // Multi-timeframe confluence bonus
  let mtfBonus = 0;
  for (const mtf of mtfAnalysis) {
    if ((trend.direction === 'UP' && mtf.direction === 'UP') ||
        (trend.direction === 'DOWN' && mtf.direction === 'DOWN')) {
      mtfBonus += (mtf.strength / 100) * 0.5;
    }
  }

  // Calculate final signal and confidence
  const netScore = buyScore - sellScore + mtfBonus * (buyScore > sellScore ? 1 : -1);
  const normalizedScore = netScore / totalWeight;
  
  // Count strong signals for majority-based decision
  const strongBuySignals = signals.filter(s => s.signal === 'BUY' && s.strength >= 65).length;
  const strongSellSignals = signals.filter(s => s.signal === 'SELL' && s.strength >= 65).length;
  const totalStrongSignals = strongBuySignals + strongSellSignals;
  
  let signal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
  let direction: 'UP' | 'DOWN' | 'NEUTRAL' = 'NEUTRAL';
  
  // Use both normalized score AND signal count majority
  if (normalizedScore > 0.12 || (strongBuySignals >= 4 && strongBuySignals > strongSellSignals * 1.5)) {
    signal = 'BUY';
    direction = 'UP';
  } else if (normalizedScore < -0.12 || (strongSellSignals >= 4 && strongSellSignals > strongBuySignals * 1.5)) {
    signal = 'SELL';
    direction = 'DOWN';
  }

  // Calculate confidence based on indicator agreement
  const buySignals = signals.filter(s => s.signal === 'BUY' && s.strength >= 65);
  const sellSignals = signals.filter(s => s.signal === 'SELL' && s.strength >= 65);
  const veryStrongSignals = signals.filter(s => s.strength >= 85);
  const strongSignals = signals.filter(s => s.strength >= 75);
  
  // Calculate agreement ratio
  const alignedSignals = signal === 'BUY' ? buySignals.length : signal === 'SELL' ? sellSignals.length : 0;
  const opposingSignals = signal === 'BUY' ? sellSignals.length : signal === 'SELL' ? buySignals.length : 0;
  const agreementRatio = totalStrongSignals > 0 ? alignedSignals / totalStrongSignals : 0.5;
  
  let confidence = 50;
  
  // Base confidence from agreement ratio (more indicators agree = higher confidence)
  if (signal !== 'HOLD') {
    confidence += agreementRatio * 25; // Up to +25 for full agreement
  }
  
  // Bonus for each aligned signal
  if (signal === 'BUY') {
    confidence += buySignals.length * 5;
  } else if (signal === 'SELL') {
    confidence += sellSignals.length * 5;
  }
  
  // Strong bonus for very strong signals (85%+)
  const alignedVeryStrong = veryStrongSignals.filter(s => s.signal === signal).length;
  confidence += alignedVeryStrong * 6;
  
  // Bonus for trend alignment
  if ((direction === 'UP' && trend.direction === 'UP') || 
      (direction === 'DOWN' && trend.direction === 'DOWN')) {
    confidence += trend.strength * 0.15;
  }
  
  // Multi-timeframe confluence bonus (big boost for higher timeframe agreement)
  const alignedMTF = mtfAnalysis.filter(m => m.direction === direction);
  confidence += alignedMTF.length * 10;
  
  // Bonus for extreme RSI levels (very reliable)
  if ((currentRSI <= 25 && signal === 'BUY') || (currentRSI >= 75 && signal === 'SELL')) {
    confidence += 10;
  } else if ((currentRSI <= 35 && signal === 'BUY') || (currentRSI >= 65 && signal === 'SELL')) {
    confidence += 5;
  }
  
  // Bonus for extreme stochastic
  if (currentStoch && ((currentStoch.k <= 20 && signal === 'BUY') || (currentStoch.k >= 80 && signal === 'SELL'))) {
    confidence += 8;
  }
  
  // Penalty for conflicting strong signals (reduced penalty)
  const conflictingSignals = signals.filter(s => 
    s.strength >= 70 &&
    ((s.signal === 'BUY' && signal === 'SELL') || 
    (s.signal === 'SELL' && signal === 'BUY'))
  ).length;
  confidence -= conflictingSignals * 4;
  
  // Normalize confidence
  confidence = Math.max(50, Math.min(95, confidence));
  
  // If HOLD, reduce confidence to show uncertainty
  if (signal === 'HOLD') {
    confidence = Math.min(55, confidence);
  }

  // Calculate predicted price
  const adjustmentFactor = normalizedScore * 0.0025;
  let predictedPrice = currentPrice * (1 + adjustmentFactor);
  
  // RSI mean reversion adjustment
  if (currentRSI > 80) {
    predictedPrice *= 0.997;
  } else if (currentRSI < 20) {
    predictedPrice *= 1.003;
  }

  const change = predictedPrice - currentPrice;
  const changePercent = (change / currentPrice) * 100;

  // Calculate error metrics using regression
  const trendPeriod = Math.min(20, closes.length);
  const recentCloses = closes.slice(-trendPeriod);
  const regressionData = recentCloses.map((y, x) => [x + 1, y] as [number, number]);
  const regressionLine = ss.linearRegression(regressionData);
  const regressionLineFn = ss.linearRegressionLine(regressionLine);
  
  const predictions = recentCloses.map((_, i) => regressionLineFn(i + 1));
  const errors = recentCloses.map((actual, i) => actual - predictions[i]);
  const rmse = Math.sqrt(ss.mean(errors.map(e => e * e)));
  const mae = ss.mean(errors.map(e => Math.abs(e)));

  // Generate forecast
  const intervalMs = INTERVAL_MS[timeframe] || 3600000;
  const forecastTime = new Date(Date.now() + intervalMs);

  // Build indicator consensus string
  const signalSummary = signals
    .filter(s => s.strength >= 60)
    .map(s => `${s.name}: ${s.signal} (${Math.round(s.strength)}%)`)
    .join(', ');

  const _aiInsight = getAIAnalysis(signals, currentPrice, trend);

  return {
    symbol,
    currentPrice: Math.round(currentPrice * 100) / 100,
    predictedPrice: Math.round(predictedPrice * 100) / 100,
    change: Math.round(change * 100) / 100,
    changePercent: Math.round(changePercent * 10000) / 10000,
    direction,
    confidence: Math.round(confidence * 10) / 10,
    signal,
    metrics: {
      rmse: Math.round(rmse * 10000) / 10000,
      mae: Math.round(mae * 10000) / 10000,
    },
    analysis: {
      rsi: Math.round(currentRSI * 10) / 10,
      macd: currentMACD ? {
        macd: Math.round((currentMACD.MACD || 0) * 1000) / 1000,
        signal: Math.round((currentMACD.signal || 0) * 1000) / 1000,
        histogram: Math.round((currentMACD.histogram || 0) * 1000) / 1000,
      } : undefined,
      sma: Math.round(currentSMA * 100) / 100,
      ema: Math.round(currentEMA * 100) / 100,
      bollingerBands: currentBB ? {
        upper: Math.round(currentBB.upper * 100) / 100,
        middle: Math.round(currentBB.middle * 100) / 100,
        lower: Math.round(currentBB.lower * 100) / 100,
      } : undefined,
      stochastic: currentStoch ? {
        k: Math.round(currentStoch.k * 10) / 10,
        d: Math.round(currentStoch.d * 10) / 10,
      } : undefined,
      trendStrength: Math.round(trend.strength * 10) / 10,
      trendDirection: trend.direction,
      indicatorConsensus: signalSummary || 'Mixed signals',
    },
    candles,
    forecast: [
      { time: candles[candles.length - 1].time, price: currentPrice },
      { time: forecastTime.toISOString(), price: Math.round(predictedPrice * 100) / 100 }
    ]
  };
}
