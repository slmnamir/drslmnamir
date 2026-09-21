const ccxt = require('ccxt');
const WebSocket = require('ws');

class BinanceEngine {
  constructor() {
    this.binance = null;
    this.symbols = [];
    this.wsConnections = new Map();
    this.marketDataCallback = null;
    this.isRunning = false;
  }

  async initialize() {
    try {
      // Initialize CCXT Binance exchange (public data only - no API keys needed for market data)
      this.binance = new ccxt.binance({
        enableRateLimit: true,
        options: {
          defaultType: 'spot',
        }
      });

      // Fetch all trading symbols
      const markets = await this.binance.loadMarkets();
      this.symbols = Object.keys(markets).filter(symbol => 
        symbol.includes('/USDT') && !symbol.includes('DOWN') && !symbol.includes('UP')
      );

      console.log(`Loaded ${this.symbols.length} USDT pairs`);
      return true;
    } catch (error) {
      console.error('Error initializing Binance:', error.message);
      throw error;
    }
  }

  getAllSymbols() {
    return this.symbols;
  }

  onMarketData(callback) {
    this.marketDataCallback = callback;
  }

  async startStreaming() {
    if (this.isRunning) {
      console.log('Streaming already running');
      return;
    }

    this.isRunning = true;
    
    // Connect to Binance WebSocket streams for all symbols
    // Group symbols into streams of 100 to avoid connection limits
    const batchSize = 50;
    const batches = [];
    
    for (let i = 0; i < this.symbols.length; i += batchSize) {
      batches.push(this.symbols.slice(i, i + batchSize));
    }

    batches.forEach((batch, index) => {
      setTimeout(() => {
        this.connectStream(batch);
      }, index * 1000); // Stagger connections
    });
  }

  connectStream(symbols) {
    const streams = symbols.map(symbol => {
      const streamSymbol = symbol.toLowerCase().replace('/', '');
      return `${streamSymbol}@kline_1m`;
    }).join('/');

    const wsUrl = `wss://stream.binance.com:9443/stream?streams=${streams}`;
    const ws = new WebSocket(wsUrl);

    ws.on('open', () => {
      console.log(`Connected to stream with ${symbols.length} symbols`);
    });

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        if (message.data) {
          const kline = message.data.k;
          const symbol = message.data.s;
          
          const formattedData = {
            symbol: symbol,
            open: parseFloat(kline.o),
            high: parseFloat(kline.h),
            low: parseFloat(kline.l),
            close: parseFloat(kline.c),
            volume: parseFloat(kline.v),
            timestamp: kline.t,
            isClosed: kline.x
          };

          if (this.marketDataCallback) {
            this.marketDataCallback(formattedData.symbol, formattedData);
          }
        }
      } catch (error) {
        // Silently handle parse errors
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error.message);
    });

    ws.on('close', () => {
      console.log('WebSocket closed, reconnecting...');
      setTimeout(() => this.connectStream(symbols), 5000);
    });

    this.wsConnections.set(symbols.join(','), ws);
  }

  async getHistoricalData(symbol, timeframe = '1m', limit = 100) {
    try {
      const ohlcv = await this.binance.fetchOHLCV(symbol, timeframe, undefined, limit);
      return ohlcv.map(([timestamp, open, high, low, close, volume]) => ({
        timestamp,
        open,
        high,
        low,
        close,
        volume
      }));
    } catch (error) {
      console.error(`Error fetching historical data for ${symbol}:`, error.message);
      return [];
    }
  }

  close() {
    this.isRunning = false;
    this.wsConnections.forEach(ws => {
      ws.close();
    });
    this.wsConnections.clear();
    console.log('All WebSocket connections closed');
  }
}

module.exports = BinanceEngine;
