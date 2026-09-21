const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const BinanceEngine = require('./binance-engine');
const SignalAnalyzer = require('./signal-analyzer');
const PerformanceTracker = require('./performance-tracker');
const AdaptiveStrategy = require('./adaptive-strategy');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Initialize components
const binanceEngine = new BinanceEngine();
const signalAnalyzer = new SignalAnalyzer();
const performanceTracker = new PerformanceTracker();
const adaptiveStrategy = new AdaptiveStrategy(performanceTracker);

let marketData = {};
let activeSignals = [];
let explosiveCoins = [];

// REST API Endpoints
app.get('/api/signals', (req, res) => {
  res.json({ signals: activeSignals });
});

app.get('/api/explosive-coins', (req, res) => {
  res.json({ coins: explosiveCoins });
});

app.get('/api/performance', (req, res) => {
  const stats = performanceTracker.getStats();
  res.json(stats);
});

app.get('/api/market-data/:symbol', (req, res) => {
  const { symbol } = req.params;
  if (marketData[symbol]) {
    res.json(marketData[symbol]);
  } else {
    res.status(404).json({ error: 'Symbol not found' });
  }
});

app.get('/api/all-symbols', (req, res) => {
  res.json({ symbols: binanceEngine.getAllSymbols() });
});

app.post('/api/execute-signal', (req, res) => {
  const { signalId, action } = req.body;
  const signal = activeSignals.find(s => s.id === signalId);
  
  if (signal) {
    performanceTracker.recordExecution(signal, action);
    res.json({ success: true, message: `Signal ${action} recorded` });
  } else {
    res.status(404).json({ error: 'Signal not found' });
  }
});

// WebSocket connection for real-time updates
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Send current state on connection
  socket.emit('signals-update', activeSignals);
  socket.emit('explosive-coins-update', explosiveCoins);
  socket.emit('performance-update', performanceTracker.getStats());
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Broadcast updates to all clients
function broadcastUpdates() {
  io.emit('signals-update', activeSignals);
  io.emit('explosive-coins-update', explosiveCoins);
  io.emit('market-data-update', marketData);
}

// Main processing loop
async function startProcessing() {
  console.log('🚀 Starting Crypto Signal Engine...');
  
  try {
    // Initialize Binance connection
    await binanceEngine.initialize();
    console.log(`✅ Connected to Binance - ${binanceEngine.getAllSymbols().length} symbols loaded`);
    
    // Start market data streaming
    binanceEngine.onMarketData((symbol, data) => {
      marketData[symbol] = data;
      
      // Analyze for signals
      const signal = signalAnalyzer.analyze(symbol, data, adaptiveStrategy.getCurrentStrategy());
      
      if (signal && !activeSignals.find(s => s.symbol === symbol && s.type === signal.type)) {
        signal.id = Date.now() + '-' + symbol;
        signal.timestamp = new Date().toISOString();
        signal.strategy = adaptiveStrategy.getCurrentStrategy().name;
        activeSignals.unshift(signal);
        
        // Keep only last 100 signals
        if (activeSignals.length > 100) {
          activeSignals = activeSignals.slice(0, 100);
        }
        
        console.log(`🎯 NEW SIGNAL: ${symbol} - ${signal.type} @ ${signal.entryPrice}`);
        broadcastUpdates();
      }
      
      // Check for explosive coins
      const explosive = signalAnalyzer.detectExplosiveCoin(symbol, data);
      if (explosive && !explosiveCoins.find(c => c.symbol === symbol)) {
        explosiveCoins.unshift(explosive);
        if (explosiveCoins.length > 20) {
          explosiveCoins = explosiveCoins.slice(0, 20);
        }
        console.log(`💰 EXPLOSIVE COIN DETECTED: ${symbol}`);
        broadcastUpdates();
      }
    });
    
    // Performance tracking and strategy adaptation
    setInterval(() => {
      const stats = performanceTracker.getStats();
      
      // Adapt strategy if performance drops
      if (stats.totalSignals > 10 && stats.winRate < 0.5) {
        console.log('⚠️  Win rate below 50%, adapting strategy...');
        adaptiveStrategy.adapt(stats);
        io.emit('strategy-update', adaptiveStrategy.getCurrentStrategy());
      }
      
      io.emit('performance-update', stats);
    }, 60000); // Every minute
    
    // Cleanup old signals
    setInterval(() => {
      const now = Date.now();
      activeSignals = activeSignals.filter(signal => {
        const age = now - new Date(signal.timestamp).getTime();
        return age < 3600000; // Keep signals for 1 hour
      });
      broadcastUpdates();
    }, 300000); // Every 5 minutes
    
  } catch (error) {
    console.error('❌ Error starting engine:', error);
    process.exit(1);
  }
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`📡 Server running on port ${PORT}`);
  startProcessing();
});

process.on('SIGINT', () => {
  console.log('\n👋 Shutting down gracefully...');
  binanceEngine.close();
  process.exit(0);
});
