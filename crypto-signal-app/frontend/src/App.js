import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const socket = io(API_URL);

function App() {
  const [activeTab, setActiveTab] = useState('signals');
  const [signals, setSignals] = useState([]);
  const [explosiveCoins, setExplosiveCoins] = useState([]);
  const [performance, setPerformance] = useState(null);
  const [marketData, setMarketData] = useState({});
  const [currentStrategy, setCurrentStrategy] = useState(null);
  const [connected, setConnected] = useState(false);
  const [symbols, setSymbols] = useState([]);
  const [selectedSymbol, setSelectedSymbol] = useState('ALL');

  useEffect(() => {
    // Initial data fetch
    fetchData();

    // Socket connections
    socket.on('connect', () => {
      setConnected(true);
      console.log('✅ Connected to signal engine');
    });

    socket.on('disconnect', () => {
      setConnected(false);
      console.log('❌ Disconnected from signal engine');
    });

    socket.on('signals-update', (data) => {
      setSignals(data);
    });

    socket.on('explosive-coins-update', (data) => {
      setExplosiveCoins(data);
    });

    socket.on('performance-update', (data) => {
      setPerformance(data);
    });

    socket.on('market-data-update', (data) => {
      setMarketData(data);
    });

    socket.on('strategy-update', (data) => {
      setCurrentStrategy(data);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('signals-update');
      socket.off('explosive-coins-update');
      socket.off('performance-update');
      socket.off('market-data-update');
      socket.off('strategy-update');
    };
  }, []);

  const fetchData = async () => {
    try {
      const [signalsRes, explosiveRes, performanceRes, symbolsRes] = await Promise.all([
        axios.get(`${API_URL}/api/signals`),
        axios.get(`${API_URL}/api/explosive-coins`),
        axios.get(`${API_URL}/api/performance`),
        axios.get(`${API_URL}/api/all-symbols`)
      ]);

      setSignals(signalsRes.data.signals || []);
      setExplosiveCoins(explosiveRes.data.coins || []);
      setPerformance(performanceRes.data);
      setSymbols(symbolsRes.data.symbols || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const executeSignal = async (signalId, action) => {
    try {
      await axios.post(`${API_URL}/api/execute-signal`, {
        signalId,
        action
      });
      alert(`Signal ${action} successfully recorded!`);
      fetchData();
    } catch (error) {
      console.error('Error executing signal:', error);
      alert('Failed to execute signal');
    }
  };

  const filteredSignals = selectedSymbol === 'ALL' 
    ? signals 
    : signals.filter(s => s.symbol === selectedSymbol);

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1>🚀 Crypto Signal Pro</h1>
          <div className="connection-status">
            <span className={`status-indicator ${connected ? 'connected' : 'disconnected'}`}></span>
            {connected ? 'Live' : 'Disconnected'}
          </div>
        </div>
        <p className="subtitle">AI-Powered Adaptive Trading Strategy • Real-Time Binance Data</p>
      </header>

      <nav className="tab-navigation">
        <button 
          className={`tab-btn ${activeTab === 'signals' ? 'active' : ''}`}
          onClick={() => setActiveTab('signals')}
        >
          📊 Trading Signals
        </button>
        <button 
          className={`tab-btn ${activeTab === 'explosive' ? 'active' : ''}`}
          onClick={() => setActiveTab('explosive')}
        >
          💰 Explosive Coins
        </button>
        <button 
          className={`tab-btn ${activeTab === 'performance' ? 'active' : ''}`}
          onClick={() => setActiveTab('performance')}
        >
          📈 Performance
        </button>
      </nav>

      <main className="main-content">
        {activeTab === 'signals' && (
          <SignalsTab 
            signals={filteredSignals}
            symbols={symbols}
            selectedSymbol={selectedSymbol}
            setSelectedSymbol={setSelectedSymbol}
            onExecute={executeSignal}
          />
        )}
        
        {activeTab === 'explosive' && (
          <ExplosiveCoinsTab coins={explosiveCoins} />
        )}
        
        {activeTab === 'performance' && (
          <PerformanceTab performance={performance} />
        )}
      </main>

      <footer className="app-footer">
        <p>⚠️ Trading involves risk. Use signals at your own discretion.</p>
        <p>Powered by Binance Real-Time Data • Adaptive Strategy Engine</p>
      </footer>
    </div>
  );
}

function SignalsTab({ signals, symbols, selectedSymbol, setSelectedSymbol, onExecute }) {
  return (
    <div className="tab-content">
      <div className="tab-header">
        <h2>Active Trading Signals</h2>
        <select 
          value={selectedSymbol} 
          onChange={(e) => setSelectedSymbol(e.target.value)}
          className="symbol-filter"
        >
          <option value="ALL">All Symbols ({signals.length})</option>
          {symbols.slice(0, 50).map(symbol => (
            <option key={symbol} value={symbol}>{symbol}</option>
          ))}
        </select>
      </div>

      {signals.length === 0 ? (
        <div className="no-data">
          <p>⏳ Waiting for signals...</p>
          <p>Analyzing {symbols.length} pairs in real-time</p>
        </div>
      ) : (
        <div className="signals-grid">
          {signals.map((signal, index) => (
            <div key={signal.id || index} className={`signal-card ${signal.type.toLowerCase()}`}>
              <div className="signal-header">
                <h3>{signal.symbol}</h3>
                <span className={`signal-type ${signal.type.toLowerCase()}`}>
                  {signal.type}
                </span>
              </div>
              
              <div className="signal-details">
                <div className="detail-row">
                  <span>Entry:</span>
                  <strong>${signal.entryPrice?.toFixed(signal.entryPrice < 1 ? 6 : 2)}</strong>
                </div>
                <div className="detail-row">
                  <span>Stop Loss:</span>
                  <strong className="sl">${signal.stopLoss?.toFixed(signal.stopLoss < 1 ? 6 : 2)}</strong>
                </div>
                <div className="detail-row">
                  <span>Take Profits:</span>
                  <div className="tp-levels">
                    {signal.takeProfits?.map((tp, i) => (
                      <span key={i} className="tp">TP{i + 1}: ${tp.toFixed(tp < 1 ? 6 : 2)}</span>
                    ))}
                  </div>
                </div>
                <div className="detail-row">
                  <span>Confidence:</span>
                  <div className="confidence-bar">
                    <div 
                      className="confidence-fill" 
                      style={{ width: `${signal.confidence || 60}%` }}
                    ></div>
                    <span>{signal.confidence || 60}%</span>
                  </div>
                </div>
                <div className="detail-row">
                  <span>Risk/Reward:</span>
                  <strong>1:{signal.riskRewardRatio || 'N/A'}</strong>
                </div>
                <div className="detail-row">
                  <span>Strategy:</span>
                  <span className="strategy-tag">{signal.strategy}</span>
                </div>
                <div className="detail-row">
                  <span>Reason:</span>
                  <p className="signal-reason">{signal.reason}</p>
                </div>
                <div className="detail-row">
                  <span>Timeframe:</span>
                  <span className="timeframe">{signal.timeframe}</span>
                </div>
              </div>

              <div className="signal-actions">
                <button 
                  className="btn-execute"
                  onClick={() => onExecute(signal.id, 'executed')}
                >
                  ✅ Execute
                </button>
                <button 
                  className="btn-cancel"
                  onClick={() => onExecute(signal.id, 'cancelled')}
                >
                  ❌ Cancel
                </button>
              </div>

              <div className="signal-timestamp">
                {signal.timestamp ? new Date(signal.timestamp).toLocaleString() : 'Just now'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ExplosiveCoinsTab({ coins }) {
  return (
    <div className="tab-content">
      <div className="tab-header">
        <h2>💰 Potential Explosive Coins</h2>
        <p className="info-text">
          Detected using consolidation patterns, volume analysis, and momentum indicators
        </p>
      </div>

      {coins.length === 0 ? (
        <div className="no-data">
          <p>🔍 Scanning market for explosive opportunities...</p>
          <p>Analyzing consolidation patterns and volume surges across all pairs</p>
        </div>
      ) : (
        <div className="explosive-grid">
          {coins.map((coin, index) => (
            <div key={coin.symbol + index} className="explosive-card">
              <div className="explosive-header">
                <h3>{coin.symbol}</h3>
                <span className="confidence-badge">
                  {coin.confidence}% Confidence
                </span>
              </div>
              
              <div className="explosive-details">
                <div className="detail-row">
                  <span>Current Price:</span>
                  <strong>${coin.currentPrice?.toFixed(coin.currentPrice < 1 ? 6 : 2)}</strong>
                </div>
                <div className="detail-row">
                  <span>24h Change:</span>
                  <strong className={coin.priceChange24h >= 0 ? 'positive' : 'negative'}>
                    {coin.priceChange24h?.toFixed(2)}%
                  </strong>
                </div>
                <div className="detail-row">
                  <span>Volume Spike:</span>
                  <strong>{coin.volumeSpike}x</strong>
                </div>
                <div className="detail-row">
                  <span>Consolidation Score:</span>
                  <div className="consolidation-meter">
                    <div 
                      className="meter-fill" 
                      style={{ width: `${coin.consolidationScore}%` }}
                    ></div>
                    <span>{coin.consolidationScore}%</span>
                  </div>
                </div>
                <div className="detail-row">
                  <span>Expected Timeframe:</span>
                  <span>{coin.expectedTimeframe}</span>
                </div>
                <div className="detail-row">
                  <span>Detected At:</span>
                  <span>{new Date(coin.detectedAt).toLocaleString()}</span>
                </div>
              </div>

              <div className="explosive-insight">
                <p>💡 High probability of significant price movement based on technical confluence</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PerformanceTab({ performance }) {
  if (!performance) {
    return (
      <div className="tab-content">
        <div className="loading">Loading performance data...</div>
      </div>
    );
  }

  return (
    <div className="tab-content">
      <div className="tab-header">
        <h2>📈 Strategy Performance</h2>
        <p className="info-text">
          Real-time tracking of all executed signals and strategy effectiveness
        </p>
      </div>

      <div className="performance-overview">
        <div className="stat-card">
          <h3>Total Signals</h3>
          <div className="stat-value">{performance.totalSignals}</div>
        </div>
        <div className="stat-card">
          <h3>Win Rate</h3>
          <div className={`stat-value ${performance.winRate >= 0.5 ? 'positive' : 'negative'}`}>
            {(performance.winRate * 100).toFixed(1)}%
          </div>
        </div>
        <div className="stat-card">
          <h3>Total P&L</h3>
          <div className={`stat-value ${performance.totalProfitPercent >= 0 ? 'positive' : 'negative'}`}>
            {performance.totalProfitPercent >= 0 ? '+' : ''}{performance.totalProfitPercent.toFixed(2)}%
          </div>
        </div>
        <div className="stat-card">
          <h3>Profit Factor</h3>
          <div className={`stat-value ${performance.profitFactor >= 1.5 ? 'positive' : performance.profitFactor >= 1 ? 'neutral' : 'negative'}`}>
            {performance.profitFactor.toFixed(2)}
          </div>
        </div>
        <div className="stat-card">
          <h3>Avg Win</h3>
          <div className="stat-value positive">+{performance.averageWinPercent.toFixed(2)}%</div>
        </div>
        <div className="stat-card">
          <h3>Avg Loss</h3>
          <div className="stat-value negative">-{performance.averageLossPercent.toFixed(2)}%</div>
        </div>
      </div>

      {performance.strategyBreakdown && Object.keys(performance.strategyBreakdown).length > 0 && (
        <div className="strategy-breakdown">
          <h3>Strategy Performance Breakdown</h3>
          <div className="strategy-grid">
            {Object.entries(performance.strategyBreakdown).map(([name, stats]) => (
              <div key={name} className="strategy-card">
                <h4>{name.replace('_', ' ').toUpperCase()}</h4>
                <div className="strategy-stats">
                  <div className="detail-row">
                    <span>Signals:</span>
                    <strong>{stats.totalSignals}</strong>
                  </div>
                  <div className="detail-row">
                    <span>Wins:</span>
                    <strong className="positive">{stats.wins}</strong>
                  </div>
                  <div className="detail-row">
                    <span>Losses:</span>
                    <strong className="negative">{stats.losses}</strong>
                  </div>
                  <div className="detail-row">
                    <span>Win Rate:</span>
                    <strong className={stats.winRate >= 0.5 ? 'positive' : 'negative'}>
                      {(stats.winRate * 100).toFixed(1)}%
                    </strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {performance.recentExecutions && performance.recentExecutions.length > 0 && (
        <div className="recent-executions">
          <h3>Recent Executions</h3>
          <table className="executions-table">
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Type</th>
                <th>Strategy</th>
                <th>Entry</th>
                <th>Action</th>
                <th>P&L %</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {performance.recentExecutions.slice(-10).reverse().map((exec, index) => (
                <tr key={index}>
                  <td><strong>{exec.symbol}</strong></td>
                  <td>
                    <span className={`signal-type-small ${exec.type.toLowerCase()}`}>
                      {exec.type}
                    </span>
                  </td>
                  <td>{exec.strategy}</td>
                  <td>${exec.entryPrice.toFixed(exec.entryPrice < 1 ? 6 : 2)}</td>
                  <td>
                    <span className={`action-badge ${exec.action}`}>
                      {exec.action}
                    </span>
                  </td>
                  <td className={exec.profitLossPercent >= 0 ? 'positive' : 'negative'}>
                    {exec.profitLossPercent >= 0 ? '+' : ''}{exec.profitLossPercent.toFixed(2)}%
                  </td>
                  <td>{new Date(exec.executedAt).toLocaleTimeString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default App;
