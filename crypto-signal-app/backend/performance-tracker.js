class PerformanceTracker {
  constructor() {
    this.executedSignals = [];
    this.performanceHistory = [];
    this.strategyPerformance = new Map();
  }

  recordExecution(signal, action) {
    const execution = {
      signalId: signal.id,
      symbol: signal.symbol,
      type: signal.type,
      strategy: signal.strategy,
      entryPrice: signal.entryPrice,
      stopLoss: signal.stopLoss,
      takeProfits: signal.takeProfits,
      action: action, // 'executed', 'cancelled', 'hit_sl', 'hit_tp'
      executedAt: new Date().toISOString(),
      outcome: null,
      profitLoss: 0,
      profitLossPercent: 0
    };

    this.executedSignals.push(execution);
    
    // Track by strategy
    if (!this.strategyPerformance.has(signal.strategy)) {
      this.strategyPerformance.set(signal.strategy, {
        totalSignals: 0,
        wins: 0,
        losses: 0,
        totalProfit: 0,
        averageWin: 0,
        averageLoss: 0
      });
    }

    // Keep only last 1000 executions
    if (this.executedSignals.length > 1000) {
      this.executedSignals.shift();
    }
  }

  updateOutcome(signalId, outcome, exitPrice) {
    const execution = this.executedSignals.find(s => s.signalId === signalId);
    
    if (execution) {
      execution.outcome = outcome;
      execution.exitPrice = exitPrice;
      
      if (execution.type === 'LONG') {
        execution.profitLoss = exitPrice - execution.entryPrice;
        execution.profitLossPercent = ((exitPrice - execution.entryPrice) / execution.entryPrice) * 100;
      } else {
        execution.profitLoss = execution.entryPrice - exitPrice;
        execution.profitLossPercent = ((execution.entryPrice - exitPrice) / execution.entryPrice) * 100;
      }

      // Update strategy performance
      const strategyStats = this.strategyPerformance.get(execution.strategy);
      if (strategyStats) {
        strategyStats.totalSignals++;
        
        if (execution.profitLoss > 0) {
          strategyStats.wins++;
          strategyStats.totalProfit += execution.profitLossPercent;
          strategyStats.averageWin = strategyStats.totalProfit / strategyStats.wins;
        } else {
          strategyStats.losses++;
          strategyStats.averageLoss = Math.abs(strategyStats.totalProfit / strategyStats.losses);
        }
      }

      this.performanceHistory.push({
        ...execution,
        updatedAt: new Date().toISOString()
      });
    }
  }

  getStats() {
    const totalSignals = this.executedSignals.length;
    const completedSignals = this.executedSignals.filter(s => s.outcome !== null);
    
    const winningTrades = completedSignals.filter(s => s.profitLoss > 0);
    const losingTrades = completedSignals.filter(s => s.profitLoss <= 0);
    
    const totalProfit = completedSignals.reduce((sum, s) => sum + s.profitLossPercent, 0);
    const avgWin = winningTrades.length > 0 
      ? winningTrades.reduce((sum, s) => sum + s.profitLossPercent, 0) / winningTrades.length 
      : 0;
    const avgLoss = losingTrades.length > 0 
      ? Math.abs(losingTrades.reduce((sum, s) => sum + s.profitLossPercent, 0) / losingTrades.length) 
      : 0;

    const winRate = completedSignals.length > 0 
      ? winningTrades.length / completedSignals.length 
      : 0;

    const profitFactor = avgLoss > 0 ? avgWin / avgLoss : 0;

    // Strategy breakdown
    const strategyBreakdown = {};
    this.strategyPerformance.forEach((stats, strategyName) => {
      strategyBreakdown[strategyName] = {
        ...stats,
        winRate: stats.totalSignals > 0 ? stats.wins / stats.totalSignals : 0
      };
    });

    return {
      totalSignals,
      completedSignals: completedSignals.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate: parseFloat(winRate.toFixed(4)),
      totalProfitPercent: parseFloat(totalProfit.toFixed(2)),
      averageWinPercent: parseFloat(avgWin.toFixed(2)),
      averageLossPercent: parseFloat(avgLoss.toFixed(2)),
      profitFactor: parseFloat(profitFactor.toFixed(2)),
      strategyBreakdown,
      recentExecutions: this.executedSignals.slice(-20)
    };
  }

  getStrategyPerformance() {
    const result = {};
    this.strategyPerformance.forEach((stats, strategyName) => {
      result[strategyName] = {
        ...stats,
        winRate: stats.totalSignals > 0 ? (stats.wins / stats.totalSignals * 100).toFixed(2) : 0
      };
    });
    return result;
  }

  exportPerformance() {
    return {
      executedSignals: this.executedSignals,
      performanceHistory: this.performanceHistory,
      summary: this.getStats()
    };
  }
}

module.exports = PerformanceTracker;
