# Crypto Signal Pro - AI-Powered Trading Signals

A professional web application for real-time cryptocurrency trading signals with adaptive strategies, connected to Binance live market data.

## Features

### 🎯 Real-Time Trading Signals
- **Multi-Strategy Analysis**: Momentum, Mean Reversion, Breakout, and Volume Surge strategies
- **Entry/Exit Points**: Precise entry prices, stop losses, and multiple take-profit levels
- **Confidence Scoring**: Each signal includes a confidence percentage based on technical confluence
- **Risk/Reward Ratio**: Calculated automatically for every signal

### 💰 Explosive Coin Detection
- Identifies coins consolidating before potential breakouts
- Volume surge analysis for early accumulation detection
- Consolidation scoring system
- Expected timeframe predictions (hours to days)

### 📊 Performance Tracking
- Real-time win rate monitoring
- Profit/Loss tracking per strategy
- Strategy performance breakdown
- Recent executions history with outcomes

### 🔄 Adaptive Strategy Engine
- Automatically switches between strategies based on performance
- Parameter tuning for optimal results
- Cooldown mechanism to prevent over-adaptation
- Performance-based weight allocation

### 📈 Market Coverage
- Connected to all 493+ USDT pairs on Binance
- Real-time WebSocket data streaming
- 1-minute candle analysis
- Historical data integration

## Architecture

### Backend (Node.js)
- **Express.js**: REST API server
- **Socket.IO**: Real-time WebSocket communication
- **CCXT**: Cryptocurrency exchange connectivity
- **TechnicalIndicators**: RSI, MACD, Bollinger Bands, EMA, etc.
- **Adaptive Strategy Engine**: Self-improving algorithm

### Frontend (React)
- **React 18**: Modern UI framework
- **Socket.IO Client**: Real-time updates
- **Responsive Design**: Works on desktop and mobile
- **Dark Theme**: Professional trading interface

## Installation

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Backend Setup

```bash
cd crypto-signal-app/backend
npm install
npm start
```

The backend will start on `http://localhost:5000`

### Frontend Setup

```bash
cd crypto-signal-app/frontend
npm install
npm start
```

The frontend will start on `http://localhost:3000`

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/signals` | GET | Get all active trading signals |
| `/api/explosive-coins` | GET | Get detected explosive coins |
| `/api/performance` | GET | Get performance statistics |
| `/api/market-data/:symbol` | GET | Get market data for specific symbol |
| `/api/all-symbols` | GET | Get all available trading symbols |
| `/api/execute-signal` | POST | Record signal execution |

## WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `signals-update` | Server → Client | New trading signals |
| `explosive-coins-update` | Server → Client | New explosive coin detections |
| `performance-update` | Server → Client | Performance statistics update |
| `market-data-update` | Server → Client | Real-time market data |
| `strategy-update` | Server → Client | Strategy change notification |

## Strategies

### 1. Momentum Strategy
- Uses RSI and MACD indicators
- Detects momentum reversals
- Volume confirmation required

### 2. Mean Reversion Strategy
- Bollinger Bands based
- Trades extreme deviations from mean
- RSI confirmation for oversold/overbought conditions

### 3. Breakout Strategy
- 20-period high/low breakouts
- Volume surge confirmation (2x average)
- Quick entries on momentum

### 4. Volume Surge Strategy
- Detects unusual volume activity (3x+ average)
- Neutral RSI indicates accumulation
- Early entry before price movement

## Risk Disclaimer

⚠️ **Trading cryptocurrencies involves substantial risk of loss.** This application provides technical analysis signals only and should not be considered financial advice. Always do your own research and never invest more than you can afford to lose.

- Past performance does not guarantee future results
- The adaptive strategy may not always perform optimally
- Market conditions can change rapidly
- Use proper risk management techniques

## Configuration

### Environment Variables (Optional)

Backend:
```
PORT=5000
```

Frontend:
```
REACT_APP_API_URL=http://localhost:5000
```

## License

MIT License - Feel free to use and modify for your needs.

## Support

For issues and feature requests, please open an issue on the repository.

---

**Built with ❤️ for traders who demand precision and adaptability**
