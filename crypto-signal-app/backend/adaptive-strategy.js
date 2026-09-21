class AdaptiveStrategy {
  constructor(performanceTracker) {
    this.performanceTracker = performanceTracker;
    
    // Available strategies
    this.strategies = [
      {
        name: 'momentum',
        type: 'momentum',
        description: 'Momentum-based trading using RSI and MACD',
        weight: 25,
        parameters: {
          rsiOversold: 35,
          rsiOverbought: 70,
          volumeMultiplier: 1.2
        }
      },
      {
        name: 'mean_reversion',
        type: 'mean_reversion',
        description: 'Mean reversion using Bollinger Bands',
        weight: 25,
        parameters: {
          bbPeriod: 20,
          bbStdDev: 2,
          rsiExtreme: 30
        }
      },
      {
        name: 'breakout',
        type: 'breakout',
        description: 'Breakout trading with volume confirmation',
        weight: 25,
        parameters: {
          lookbackPeriod: 20,
          volumeMultiplier: 2
        }
      },
      {
        name: 'volume_surge',
        type: 'volume_surge',
        description: 'Volume surge detection for early entries',
        weight: 25,
        parameters: {
          volumeMultiplier: 3,
          rsiRange: [40, 60]
        }
      }
    ];

    this.currentStrategyIndex = 0;
    this.adaptationHistory = [];
    this.lastAdaptationTime = Date.now();
    this.adaptationCooldown = 300000; // 5 minutes between adaptations
  }

  getCurrentStrategy() {
    return this.strategies[this.currentStrategyIndex];
  }

  getAllStrategies() {
    return this.strategies;
  }

  adapt(performanceStats) {
    const now = Date.now();
    
    // Cooldown check
    if (now - this.lastAdaptationTime < this.adaptationCooldown) {
      console.log('⏳ Adaptation on cooldown');
      return false;
    }

    console.log('🔄 Adapting strategy based on performance...');
    
    const strategyPerformance = this.performanceTracker.getStrategyPerformance();
    
    // Calculate performance scores for each strategy
    const scores = this.strategies.map((strategy, index) => {
      const perf = strategyPerformance[strategy.name];
      
      if (!perf || perf.totalSignals < 3) {
        // Not enough data, use default weight
        return {
          index,
          score: strategy.weight,
          winRate: 0,
          totalSignals: perf ? perf.totalSignals : 0
        };
      }

      const winRate = perf.wins / perf.totalSignals;
      const profitFactor = perf.averageLoss > 0 ? perf.averageWin / perf.averageLoss : 0;
      
      // Score based on win rate and profit factor
      const score = (winRate * 0.6 + Math.min(profitFactor / 2, 1) * 0.4) * 100;
      
      return {
        index,
        score,
        winRate,
        profitFactor,
        totalSignals: perf.totalSignals
      };
    });

    // Sort by score
    scores.sort((a, b) => b.score - a.score);

    // Update weights based on performance
    const totalScore = scores.reduce((sum, s) => sum + s.score, 0);
    
    scores.forEach((s, i) => {
      if (totalScore > 0) {
        this.strategies[s.index].weight = (s.score / totalScore) * 100;
      }
    });

    // Select best performing strategy
    const bestStrategy = scores[0];
    
    // Only switch if the best strategy is significantly better
    const currentStrategyPerf = strategyPerformance[this.getCurrentStrategy().name];
    const currentWinRate = currentStrategyPerf && currentStrategyPerf.totalSignals >= 3
      ? currentStrategyPerf.wins / currentStrategyPerf.totalSignals
      : 0.5;

    if (bestStrategy.winRate > currentWinRate + 0.1 && bestStrategy.totalSignals >= 3) {
      const oldStrategy = this.getCurrentStrategy().name;
      this.currentStrategyIndex = bestStrategy.index;
      const newStrategy = this.getCurrentStrategy().name;
      
      console.log(`📊 Strategy switched: ${oldStrategy} → ${newStrategy}`);
      console.log(`   Win rate improvement: ${(currentWinRate * 100).toFixed(1)}% → ${(bestStrategy.winRate * 100).toFixed(1)}%`);
      
      this.adaptationHistory.push({
        timestamp: new Date().toISOString(),
        fromStrategy: oldStrategy,
        toStrategy: newStrategy,
        reason: 'Better win rate',
        previousWinRate: currentWinRate,
        newWinRate: bestStrategy.winRate
      });

      this.lastAdaptationTime = now;
      return true;
    }

    // Keep current strategy but adjust parameters
    this.adjustParameters(bestStrategy);
    
    this.lastAdaptationTime = now;
    return false;
  }

  adjustParameters(bestStrategy) {
    const currentStrategy = this.getCurrentStrategy();
    
    // Fine-tune parameters based on recent performance
    switch (currentStrategy.type) {
      case 'momentum':
        // Adjust RSI thresholds based on market conditions
        if (bestStrategy.winRate < 0.45) {
          currentStrategy.parameters.rsiOversold = Math.max(25, currentStrategy.parameters.rsiOversold - 5);
          currentStrategy.parameters.rsiOverbought = Math.min(80, currentStrategy.parameters.rsiOverbought + 5);
          console.log('🔧 Adjusted momentum RSI thresholds for stricter signals');
        }
        break;
        
      case 'mean_reversion':
        // Adjust Bollinger Band deviation
        if (bestStrategy.winRate < 0.45) {
          currentStrategy.parameters.bbStdDev = Math.min(2.5, currentStrategy.parameters.bbStdDev + 0.1);
          console.log('🔧 Adjusted BB deviation for mean reversion');
        }
        break;
        
      case 'breakout':
        // Adjust volume requirements
        if (bestStrategy.winRate < 0.45) {
          currentStrategy.parameters.volumeMultiplier = Math.min(2.5, currentStrategy.parameters.volumeMultiplier + 0.2);
          console.log('🔧 Increased volume requirement for breakouts');
        }
        break;
        
      case 'volume_surge':
        // Adjust volume surge threshold
        if (bestStrategy.winRate < 0.45) {
          currentStrategy.parameters.volumeMultiplier = Math.min(4, currentStrategy.parameters.volumeMultiplier + 0.3);
          console.log('🔧 Increased volume surge threshold');
        }
        break;
    }
  }

  getAdaptationHistory() {
    return this.adaptationHistory.slice(-20);
  }

  getStrategyWeights() {
    return this.strategies.map(s => ({
      name: s.name,
      weight: s.weight.toFixed(2),
      type: s.type,
      description: s.description
    }));
  }

  reset() {
    this.currentStrategyIndex = 0;
    this.strategies.forEach(s => s.weight = 25);
    this.adaptationHistory = [];
    console.log('🔄 Strategy weights reset to default');
  }
}

module.exports = AdaptiveStrategy;
