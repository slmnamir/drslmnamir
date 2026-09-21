const { RSI, MACD, EMA, SMA, BollingerBands, ATR } = require('technicalindicators');

class SignalAnalyzer {
  constructor() {
    this.priceHistory = new Map();
    this.volumeHistory = new Map();
    this.maxHistoryLength = 200;
  }

  analyze(symbol, data, strategy) {
    // Update history
    this.updateHistory(symbol, data);
    
    const prices = this.priceHistory.get(symbol);
    const volumes = this.volumeHistory.get(symbol);
    
    if (!prices || prices.length < 50) {
      return null; // Not enough data
    }

    // Calculate indicators
    const rsi = this.calculateRSI(prices);
    const macd = this.calculateMACD(prices);
    const ema20 = this.calculateEMA(prices, 20);
    const ema50 = this.calculateEMA(prices, 50);
    const bb = this.calculateBollingerBands(prices);
    const atr = this.calculateATR(
      prices.slice(-22),
      this.priceHistory.get(symbol)?.slice(-22).map((p, i) => ({
        high: p,
        low: p,
        close: p
      })) || []
    );

    const currentPrice = prices[prices.length - 1];
    const prevPrice = prices[prices.length - 2];
    const volume = volumes[volumes.length - 1];
    const avgVolume = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;

    let signal = null;

    // Apply strategy-specific logic
    switch (strategy.type) {
      case 'momentum':
        signal = this.momentumStrategy(currentPrice, prevPrice, rsi, macd, ema20, ema50, volume, avgVolume, symbol);
        break;
      case 'mean_reversion':
        signal = this.meanReversionStrategy(currentPrice, rsi, bb, atr, symbol);
        break;
      case 'breakout':
        signal = this.breakoutStrategy(currentPrice, prevPrice, volume, avgVolume, prices, symbol);
        break;
      case 'volume_surge':
        signal = this.volumeSurgeStrategy(currentPrice, volume, avgVolume, rsi, symbol);
        break;
      default:
        signal = this.momentumStrategy(currentPrice, prevPrice, rsi, macd, ema20, ema50, volume, avgVolume, symbol);
    }

    if (signal) {
      signal.confidence = this.calculateConfidence(signal, rsi, macd, volume, avgVolume);
      signal.riskRewardRatio = this.calculateRiskReward(signal);
    }

    return signal;
  }

  momentumStrategy(currentPrice, prevPrice, rsi, macd, ema20, ema50, volume, avgVolume, symbol) {
    // Long signal
    if (rsi < 35 && macd.histogram > 0 && currentPrice > ema20 && volume > avgVolume * 1.2) {
      const entryPrice = currentPrice;
      const stopLoss = entryPrice * 0.97;
      const takeProfit1 = entryPrice * 1.02;
      const takeProfit2 = entryPrice * 1.04;
      const takeProfit3 = entryPrice * 1.06;

      return {
        symbol,
        type: 'LONG',
        entryPrice,
        stopLoss,
        takeProfits: [takeProfit1, takeProfit2, takeProfit3],
        reason: 'Momentum reversal with RSI oversold and MACD bullish',
        timeframe: 'short'
      };
    }

    // Short signal
    if (rsi > 70 && macd.histogram < 0 && currentPrice < ema20 && volume > avgVolume * 1.2) {
      const entryPrice = currentPrice;
      const stopLoss = entryPrice * 1.03;
      const takeProfit1 = entryPrice * 0.98;
      const takeProfit2 = entryPrice * 0.96;
      const takeProfit3 = entryPrice * 0.94;

      return {
        symbol,
        type: 'SHORT',
        entryPrice,
        stopLoss,
        takeProfits: [takeProfit1, takeProfit2, takeProfit3],
        reason: 'Momentum reversal with RSI overbought and MACD bearish',
        timeframe: 'short'
      };
    }

    return null;
  }

  meanReversionStrategy(currentPrice, rsi, bb, atr, symbol) {
    if (!bb) return null;

    const { upper, middle, lower } = bb;

    // Long signal - price at lower band
    if (currentPrice <= lower && rsi < 30) {
      const entryPrice = currentPrice;
      const stopLoss = lower * 0.98;
      const takeProfit1 = middle;
      const takeProfit2 = upper;
      const takeProfit3 = upper * 1.02;

      return {
        symbol,
        type: 'LONG',
        entryPrice,
        stopLoss,
        takeProfits: [takeProfit1, takeProfit2, takeProfit3],
        reason: 'Mean reversion - price at lower Bollinger Band with oversold RSI',
        timeframe: 'medium'
      };
    }

    // Short signal - price at upper band
    if (currentPrice >= upper && rsi > 70) {
      const entryPrice = currentPrice;
      const stopLoss = upper * 1.02;
      const takeProfit1 = middle;
      const takeProfit2 = lower;
      const takeProfit3 = lower * 0.98;

      return {
        symbol,
        type: 'SHORT',
        entryPrice,
        stopLoss,
        takeProfits: [takeProfit1, takeProfit2, takeProfit3],
        reason: 'Mean reversion - price at upper Bollinger Band with overbought RSI',
        timeframe: 'medium'
      };
    }

    return null;
  }

  breakoutStrategy(currentPrice, prevPrice, volume, avgVolume, prices, symbol) {
    if (prices.length < 50) return null;

    const highestHigh = Math.max(...prices.slice(-20));
    const lowestLow = Math.min(...prices.slice(-20));
    
    // Bullish breakout
    if (currentPrice > highestHigh && volume > avgVolume * 2) {
      const entryPrice = currentPrice;
      const stopLoss = highestHigh * 0.97;
      const takeProfit1 = entryPrice * 1.03;
      const takeProfit2 = entryPrice * 1.05;
      const takeProfit3 = entryPrice * 1.08;

      return {
        symbol,
        type: 'LONG',
        entryPrice,
        stopLoss,
        takeProfits: [takeProfit1, takeProfit2, takeProfit3],
        reason: 'Breakout above 20-period high with volume surge',
        timeframe: 'short'
      };
    }

    // Bearish breakout
    if (currentPrice < lowestLow && volume > avgVolume * 2) {
      const entryPrice = currentPrice;
      const stopLoss = lowestLow * 1.03;
      const takeProfit1 = entryPrice * 0.97;
      const takeProfit2 = entryPrice * 0.95;
      const takeProfit3 = entryPrice * 0.92;

      return {
        symbol,
        type: 'SHORT',
        entryPrice,
        stopLoss,
        takeProfits: [takeProfit1, takeProfit2, takeProfit3],
        reason: 'Breakout below 20-period low with volume surge',
        timeframe: 'short'
      };
    }

    return null;
  }

  volumeSurgeStrategy(currentPrice, volume, avgVolume, rsi, symbol) {
    const volumeMultiplier = volume / avgVolume;

    // Massive volume surge with neutral RSI (potential accumulation)
    if (volumeMultiplier > 3 && rsi > 40 && rsi < 60) {
      const entryPrice = currentPrice;
      const stopLoss = entryPrice * 0.96;
      const takeProfit1 = entryPrice * 1.03;
      const takeProfit2 = entryPrice * 1.06;
      const takeProfit3 = entryPrice * 1.10;

      return {
        symbol,
        type: 'LONG',
        entryPrice,
        stopLoss,
        takeProfits: [takeProfit1, takeProfit2, takeProfit3],
        reason: `Massive volume surge (${(volumeMultiplier).toFixed(1)}x) indicating potential accumulation`,
        timeframe: 'medium'
      };
    }

    return null;
  }

  detectExplosiveCoin(symbol, data) {
    const prices = this.priceHistory.get(symbol);
    const volumes = this.volumeHistory.get(symbol);

    if (!prices || prices.length < 100) {
      return null;
    }

    const currentPrice = prices[prices.length - 1];
    const price24hAgo = prices[prices.length - 100]; // Approximate 24h on 15m chart
    const currentVolume = volumes[volumes.length - 1];
    const avgVolume = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;

    const priceChange24h = ((currentPrice - price24hAgo) / price24hAgo) * 100;
    const volumeSpike = currentVolume / avgVolume;

    // Detect early signs of explosion
    const isConsolidating = this.checkConsolidation(prices.slice(-50));
    const isVolumeIncreasing = volumes.slice(-10).every((v, i, arr) => 
      i === 0 || v >= arr[i - 1] * 0.9
    );
    const rsi = this.calculateRSI(prices);

    // Explosive coin criteria
    if (
      isConsolidating &&
      isVolumeIncreasing &&
      volumeSpike > 1.5 &&
      rsi > 45 && rsi < 65 &&
      priceChange24h > -5 && priceChange24h < 15
    ) {
      return {
        symbol,
        currentPrice,
        priceChange24h,
        volumeSpike: volumeSpike.toFixed(2),
        consolidationScore: this.calculateConsolidationScore(prices.slice(-50)),
        expectedTimeframe: 'hours to days',
        confidence: this.calculateExplosionConfidence(isConsolidating, isVolumeIncreasing, volumeSpike, rsi),
        detectedAt: new Date().toISOString()
      };
    }

    return null;
  }

  checkConsolidation(prices) {
    if (prices.length < 20) return false;
    
    const recentPrices = prices.slice(-20);
    const maxPrice = Math.max(...recentPrices);
    const minPrice = Math.min(...recentPrices);
    const avgPrice = recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length;
    
    // Consolidation if price range is within 3%
    const range = (maxPrice - minPrice) / avgPrice;
    return range < 0.03;
  }

  calculateConsolidationScore(prices) {
    if (prices.length < 20) return 0;
    
    const recentPrices = prices.slice(-20);
    const maxPrice = Math.max(...recentPrices);
    const minPrice = Math.min(...recentPrices);
    const avgPrice = recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length;
    
    const range = (maxPrice - minPrice) / avgPrice;
    return Math.max(0, (0.05 - range) / 0.05 * 100).toFixed(2);
  }

  calculateExplosionConfidence(isConsolidating, isVolumeIncreasing, volumeSpike, rsi) {
    let confidence = 50;
    
    if (isConsolidating) confidence += 15;
    if (isVolumeIncreasing) confidence += 15;
    if (volumeSpike > 2) confidence += 10;
    if (rsi > 50 && rsi < 60) confidence += 10;
    
    return Math.min(confidence, 95).toFixed(2);
  }

  calculateConfidence(signal, rsi, macd, volume, avgVolume) {
    let confidence = 60;

    // RSI contribution
    if (signal.type === 'LONG' && rsi < 35) confidence += 10;
    if (signal.type === 'SHORT' && rsi > 65) confidence += 10;

    // MACD contribution
    if (macd && ((signal.type === 'LONG' && macd.histogram > 0) || 
                 (signal.type === 'SHORT' && macd.histogram < 0))) {
      confidence += 10;
    }

    // Volume contribution
    const volumeRatio = volume / avgVolume;
    if (volumeRatio > 1.5) confidence += 10;
    if (volumeRatio > 2) confidence += 5;

    return Math.min(confidence, 95);
  }

  calculateRiskReward(signal) {
    const risk = Math.abs(signal.entryPrice - signal.stopLoss);
    const reward = Math.abs(signal.takeProfits[2] - signal.entryPrice);
    return (reward / risk).toFixed(2);
  }

  updateHistory(symbol, data) {
    if (!this.priceHistory.has(symbol)) {
      this.priceHistory.set(symbol, []);
      this.volumeHistory.set(symbol, []);
    }

    const prices = this.priceHistory.get(symbol);
    const volumes = this.volumeHistory.get(symbol);

    // Only add new data points
    if (prices.length === 0 || data.timestamp > prices[prices.length - 1]) {
      prices.push(data.close);
      volumes.push(data.volume);

      // Limit history size
      if (prices.length > this.maxHistoryLength) {
        prices.shift();
        volumes.shift();
      }
    } else if (prices.length > 0 && data.timestamp === prices[prices.length - 1]) {
      // Update latest candle
      prices[prices.length - 1] = data.close;
      volumes[volumes.length - 1] = data.volume;
    }
  }

  calculateRSI(prices, period = 14) {
    if (prices.length < period + 1) return 50;
    
    const inputArray = prices.slice(-period - 1).map(p => p);
    const result = RSI.calculate({ values: inputArray, period });
    
    return result && result.length > 0 ? result[result.length - 1] : 50;
  }

  calculateMACD(prices, fast = 12, slow = 26, signal = 9) {
    if (prices.length < slow + signal) return { histogram: 0 };
    
    const inputArray = prices.slice(-(slow + signal)).map(p => p);
    const result = MACD.calculate({ 
      values: inputArray, 
      fastPeriod: fast, 
      slowPeriod: slow, 
      signalPeriod: signal,
      SimpleMAOscillator: false,
      SimpleMASignal: false
    });
    
    return result && result.length > 0 ? result[result.length - 1] : { histogram: 0 };
  }

  calculateEMA(prices, period) {
    if (prices.length < period) return prices[prices.length - 1];
    
    const inputArray = prices.slice(-period * 2).map(p => p);
    const result = EMA.calculate({ values: inputArray, period });
    
    return result && result.length > 0 ? result[result.length - 1] : prices[prices.length - 1];
  }

  calculateBollingerBands(prices, period = 20, stdDev = 2) {
    if (prices.length < period) return null;
    
    const inputArray = prices.slice(-period * 2).map(p => p);
    const result = BollingerBands.calculate({ 
      values: inputArray, 
      period, 
      stdDev 
    });
    
    return result && result.length > 0 ? result[result.length - 1] : null;
  }

  calculateATR(prices, highs, lows, period = 14) {
    // Simplified ATR calculation
    if (prices.length < period + 1) return 0;
    
    const trueRanges = [];
    for (let i = 1; i < prices.length; i++) {
      const highLow = prices[i] - prices[i]; // Simplified
      const highClose = Math.abs(prices[i] - prices[i - 1]);
      const lowClose = Math.abs(prices[i] - prices[i - 1]);
      trueRanges.push(Math.max(highLow, highClose, lowClose));
    }
    
    const atr = trueRanges.slice(-period).reduce((a, b) => a + b, 0) / period;
    return atr || (prices[prices.length - 1] * 0.02);
  }
}

module.exports = SignalAnalyzer;
