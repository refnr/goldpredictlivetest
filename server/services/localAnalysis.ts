import { analyzeMarket } from '../prediction';

export async function generateMarketAnalysis(): Promise<string> {
  try {
    const result = await analyzeMarket({ symbol: 'XAUUSD', timeframe: '1h' });
    
    const price = result.currentPrice;
    const direction = result.direction;
    const confidence = result.confidence;
    const predicted = result.predictedPrice;
    const analysis = result.analysis;

    const rsiValue = typeof analysis.rsi === 'number' ? analysis.rsi : null;
    const macdData = analysis.macd;
    const smaValue = typeof analysis.sma === 'number' ? analysis.sma : null;

    const change = predicted - price;
    const changePct = ((change / price) * 100).toFixed(2);
    const priceFormatted = price.toFixed(2);
    const predictedFormatted = predicted.toFixed(2);

    let trendLabel = 'Neutral';
    let trendReason = 'Mixed signals across indicators';
    if (direction === 'UP') {
      trendLabel = 'Bullish';
      if (rsiValue !== null && rsiValue < 40) trendReason = 'Oversold conditions suggest a bounce';
      else if (macdData && macdData.histogram > 0) trendReason = 'Positive momentum building';
      else trendReason = 'Indicators favor upside continuation';
    } else if (direction === 'DOWN') {
      trendLabel = 'Bearish';
      if (rsiValue !== null && rsiValue > 70) trendReason = 'Overbought conditions suggest a pullback';
      else if (macdData && macdData.histogram < 0) trendReason = 'Selling pressure increasing';
      else trendReason = 'Indicators suggest downside risk';
    }

    let rsiText = 'Momentum data unavailable';
    if (rsiValue !== null) {
      const rsiStr = rsiValue.toFixed(1);
      if (rsiValue > 70) rsiText = `Momentum index at ${rsiStr} — overbought territory, potential reversal or consolidation ahead`;
      else if (rsiValue > 60) rsiText = `Momentum index at ${rsiStr} — bullish momentum, approaching overbought zone`;
      else if (rsiValue > 40) rsiText = `Momentum index at ${rsiStr} — neutral zone, no extreme momentum detected`;
      else if (rsiValue > 30) rsiText = `Momentum index at ${rsiStr} — bearish momentum, nearing oversold territory`;
      else rsiText = `Momentum index at ${rsiStr} — oversold territory, potential bounce or reversal`;
    }

    let macdText = 'Trend convergence data unavailable';
    if (macdData) {
      const hist = macdData.histogram.toFixed(2);
      if (macdData.histogram > 0 && macdData.signal < macdData.macd) {
        macdText = `Bullish crossover active, histogram at ${hist} — upward momentum`;
      } else if (macdData.histogram < 0 && macdData.signal > macdData.macd) {
        macdText = `Bearish crossover active, histogram at ${hist} — downward pressure`;
      } else if (macdData.histogram > 0) {
        macdText = `Histogram positive (${hist}), supporting bullish bias`;
      } else {
        macdText = `Histogram negative (${hist}), suggesting bearish momentum`;
      }
    }

    let smaText = '';
    if (smaValue !== null) {
      const smaStr = smaValue.toFixed(2);
      if (price > smaValue) {
        smaText = `Price above moving average (${smaStr}), bullish positioning`;
      } else {
        smaText = `Price below moving average (${smaStr}), bearish positioning`;
      }
    }

    const supportLevel = (price * 0.995).toFixed(2);
    const resistanceLevel = (price * 1.005).toFixed(2);
    const strongSupport = (price * 0.99).toFixed(2);
    const strongResistance = (price * 1.01).toFixed(2);

    let suggestion = '';
    if (direction === 'UP' && confidence > 60) {
      suggestion = `Bullish setup favored. Consider entries near $${supportLevel} with target at $${resistanceLevel}. Use stop-loss below $${strongSupport}. Confidence: ${confidence}%.`;
    } else if (direction === 'DOWN' && confidence > 60) {
      suggestion = `Bearish setup favored. Watch for shorts near $${resistanceLevel} with target at $${supportLevel}. Use stop-loss above $${strongResistance}. Confidence: ${confidence}%.`;
    } else {
      suggestion = `Market is consolidating. Wait for a clear break above $${resistanceLevel} (bullish) or below $${supportLevel} (bearish) before entering. Confidence: ${confidence}%.`;
    }

    const sections = [
      `[SECTION:TREND] ${trendLabel}`,
      `Gold at $${priceFormatted}. ${trendReason}. Model targets $${predictedFormatted} (${change >= 0 ? '+' : ''}${changePct}%).`,
      '',
      `[SECTION:LEVELS]`,
      `Resistance: $${resistanceLevel} / $${strongResistance}`,
      `Support: $${supportLevel} / $${strongSupport}`,
      '',
      `[SECTION:SIGNALS]`,
      rsiText,
      macdText,
      smaText,
      '',
      `[SECTION:OUTLOOK]`,
      suggestion,
    ].filter(line => line !== undefined);

    return sections.join('\n');
  } catch (error) {
    console.error('Local analysis error:', error);
    return [
      '[SECTION:TREND] Unable to determine',
      'Market data temporarily unavailable. Please try again in a moment.',
      '',
      '[SECTION:LEVELS]',
      'Levels are being recalculated...',
      '',
      '[SECTION:SIGNALS]',
      'Indicators are being recalculated.',
      '',
      '[SECTION:OUTLOOK]',
      'Wait for data to refresh before making decisions.',
    ].join('\n');
  }
}
