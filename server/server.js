// server/server.js - Updated with FREE Indian Market APIs

import express from 'express';
import cors from 'cors';
import axios from 'axios';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Import our FREE Indian Markets API module
import { fetchIndianStockData } from './indian-markets-api.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200
});
app.use('/api/', limiter);

// API Configurations
const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
const ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query';

// Cache
const cache = new Map();
const CACHE_DURATION = 60000; // 1 minute

// Market Classifications
const INDIAN_SYMBOLS = ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'HINDUNILVR', 'ITC', 'SBIN', 'BHARTIARTL', 'ASIANPAINT', 'MARUTI'];
const GLOBAL_SYMBOLS = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX', 'BRK.B', 'JPM'];

// Cache functions
const getCachedData = (key) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
};

const setCachedData = (key, data) => {
  cache.set(key, { data, timestamp: Date.now() });
};

// =============================================================================
// GLOBAL MARKET DATA FETCHER (Alpha Vantage)
// =============================================================================

const fetchGlobalStockData = async (symbol) => {
  try {
    const response = await axios.get(ALPHA_VANTAGE_BASE_URL, {
      params: {
        function: 'GLOBAL_QUOTE',
        symbol: symbol,
        apikey: ALPHA_VANTAGE_API_KEY
      },
      timeout: 10000
    });

    const quote = response.data['Global Quote'];
    if (!quote || Object.keys(quote).length === 0) {
      throw new Error(`No data for ${symbol}`);
    }

    return {
      symbol: symbol,
      name: getGlobalCompanyName(symbol),
      price: parseFloat(quote['05. price']) || 0,
      change: parseFloat(quote['09. change']) || 0,
      changePercent: quote['10. change percent'] ? 
        parseFloat(quote['10. change percent'].replace('%', '')) : 0,
      high: parseFloat(quote['03. high']) || 0,
      low: parseFloat(quote['04. low']) || 0,
      volume: parseInt(quote['06. volume']) || 0,
      marketCap: calculateGlobalMarketCap(symbol, parseFloat(quote['05. price'])),
      sector: getGlobalSector(symbol),
      exchange: 'NASDAQ',
      currency: 'USD',
      marketOpen: isGlobalMarketOpen(),
      timestamp: new Date().toISOString(),
      source: 'Alpha_Vantage'
    };
  } catch (error) {
    console.error(`Error fetching global stock ${symbol}:`, error);
    throw error;
  }
};

// =============================================================================
// 📊 UNIFIED TICKER ENDPOINT (Now with FREE Indian APIs)
// =============================================================================

app.get('/api/stocks/ticker', async (req, res) => {
  try {
    const includeIndian = req.query.indian !== 'false';
    const includeGlobal = req.query.global !== 'false';
    const limit = parseInt(req.query.limit) || 12;
    
    const cacheKey = `unified-ticker-${includeIndian}-${includeGlobal}-${limit}`;
    
    // Check cache
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    const allStocks = [];
    const promises = [];

    // 🇮🇳 Fetch Indian stocks using FREE APIs
    if (includeIndian) {
      const indianSymbols = INDIAN_SYMBOLS.slice(0, Math.ceil(limit * 0.6));
      console.log(`🇮🇳 Fetching ${indianSymbols.length} Indian stocks using FREE APIs...`);
      
      promises.push(
        ...indianSymbols.map(symbol => 
          fetchIndianStockData(symbol).catch(err => ({
            symbol,
            error: err.message,
            source: 'Indian_Market_Error'
          }))
        )
      );
    }

    // 🌍 Fetch Global stocks using Alpha Vantage
    if (includeGlobal) {
      const globalSymbols = GLOBAL_SYMBOLS.slice(0, Math.floor(limit * 0.4));
      console.log(`🌍 Fetching ${globalSymbols.length} Global stocks using Alpha Vantage...`);
      
      promises.push(
        ...globalSymbols.map(symbol => 
          fetchGlobalStockData(symbol).catch(err => ({
            symbol,
            error: err.message,
            source: 'Global_Market_Error'
          }))
        )
      );
    }

    const results = await Promise.allSettled(promises);
    
    results.forEach(result => {
      if (result.status === 'fulfilled' && !result.value.error) {
        allStocks.push(result.value);
      }
    });

    // Sort by market relevance and market cap
    allStocks.sort((a, b) => {
      // Prioritize Indian stocks during Indian market hours
      if (isIndianMarketOpen() && a.currency === 'INR' && b.currency === 'USD') return -1;
      if (isIndianMarketOpen() && a.currency === 'USD' && b.currency === 'INR') return 1;
      return b.marketCap - a.marketCap;
    });

    const finalData = allStocks.slice(0, limit);
    
    // Add summary info
    const summary = {
      total: finalData.length,
      indian: finalData.filter(s => s.currency === 'INR').length,
      global: finalData.filter(s => s.currency === 'USD').length,
      sources: [...new Set(finalData.map(s => s.source))],
      cached: false,
      timestamp: new Date().toISOString()
    };

    const response = {
      summary,
      data: finalData
    };
    
    // Cache results
    setCachedData(cacheKey, response);
    
    console.log(`✅ Ticker response: ${summary.indian} Indian + ${summary.global} Global stocks`);
    res.json(response);
  } catch (error) {
    console.error('Error in unified ticker:', error);
    res.status(500).json({ error: 'Failed to fetch unified ticker data' });
  }
});

// =============================================================================
// 📈 INDIVIDUAL STOCK DETAILS
// =============================================================================

app.get('/api/stocks/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const cacheKey = `stock-details-${symbol}`;
    
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    let stockData;
    
    // Determine if it's an Indian or Global stock
    const isIndianStock = INDIAN_SYMBOLS.includes(symbol.replace('.NS', '').replace('.BO', ''));
    
    if (isIndianStock) {
      console.log(`🇮🇳 Fetching Indian stock: ${symbol}`);
      stockData = await fetchIndianStockData(symbol);
    } else {
      console.log(`🌍 Fetching Global stock: ${symbol}`);
      stockData = await fetchGlobalStockData(symbol);
    }

    // Add additional analysis
    stockData.analysis = {
      trend: calculateTrend(stockData.changePercent),
      volatility: calculateVolatility(stockData.high, stockData.low, stockData.price),
      strength: calculateStrength(stockData.volume, stockData.marketCap)
    };

    setCachedData(cacheKey, stockData);
    res.json(stockData);
  } catch (error) {
    console.error(`Error fetching stock ${req.params.symbol}:`, error);
    res.status(404).json({ error: 'Stock not found or data unavailable' });
  }
});

// =============================================================================
// 🏛️ MARKET STATUS WITH API SOURCES
// =============================================================================

app.get('/api/markets/status', (req, res) => {
  const now = new Date();
  const istTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
  const usTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));

  res.json({
    indian: {
      open: isIndianMarketOpen(),
      nextSession: getNextIndianSession(),
      timezone: 'IST',
      currentTime: istTime.toLocaleString(),
      dataSources: [
        { name: 'Yahoo Finance', status: 'FREE', limit: '2000/hour' },
        { name: 'Financial Modeling Prep', status: process.env.FMP_API_KEY ? 'Configured' : 'Not Configured', limit: '250/day' },
        { name: 'Polygon.io', status: process.env.POLYGON_API_KEY ? 'Configured' : 'Not Configured', limit: '5/minute' },
        { name: 'Alpha Vantage (Indian)', status: process.env.ALPHA_VANTAGE_API_KEY ? 'Configured' : 'Not Configured', limit: '500/day' }
      ]
    },
    global: {
      nyse: {
        open: isGlobalMarketOpen(),
        nextSession: getNextUSSession(),
        timezone: 'EST',
        currentTime: usTime.toLocaleString()
      },
      dataSources: [
        { name: 'Alpha Vantage', status: process.env.ALPHA_VANTAGE_API_KEY ? 'Configured' : 'Not Configured', limit: '500/day' }
      ]
    }
  });
});

// =============================================================================
// 🏥 ENHANCED HEALTH CHECK
// =============================================================================

app.get('/api/health', (req, res) => {
  const apiStatus = {
    // FREE Indian APIs
    yahooFinance: 'Available (No API Key Required)',
    financialModelingPrep: process.env.FMP_API_KEY ? '✅ Configured (FREE: 250/day)' : '⚠️ Not Configured',
    polygonIo: process.env.POLYGON_API_KEY ? '✅ Configured (FREE: 5/min)' : '⚠️ Not Configured',
    
    // Global APIs
    alphaVantage: process.env.ALPHA_VANTAGE_API_KEY ? '✅ Configured' : '❌ Missing',
    
    // System
    cacheSize: cache.size,
    uptime: Math.floor(process.uptime()),
    memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB'
  };

  res.json({ 
    status: 'OK',
    timestamp: new Date().toISOString(),
    markets: {
      indian: '🇮🇳 FREE APIs (Yahoo Finance + FMP + Polygon)',
      global: '🌍 Alpha Vantage'
    },
    apis: apiStatus,
    instructions: {
      setup: 'See /api/setup for API key configuration guide'
    }
  });
});

// =============================================================================
// 📚 API SETUP GUIDE ENDPOINT
// =============================================================================

app.get('/api/setup', (req, res) => {
  res.json({
    title: '🆓 FREE Indian Market APIs Setup Guide',
    freeApis: {
      yahooFinance: {
        name: 'Yahoo Finance (Primary)',
        cost: 'Completely FREE',
        setup: 'No API key required',
        limits: '2000 requests/hour',
        coverage: 'All NSE/BSE stocks',
        reliability: '⭐⭐⭐⭐⭐',
        status: 'Already working!'
      },
      financialModelingPrep: {
        name: 'Financial Modeling Prep',
        cost: 'FREE (250 calls/day)',
        setup: [
          '1. Go to https://financialmodelingprep.com/developer/docs',
          '2. Sign up for free account',
          '3. Get your free API key',
          '4. Add to server/.env: FMP_API_KEY=your_key_here'
        ],
        limits: '250 requests/day',
        coverage: 'Major NSE stocks',
        reliability: '⭐⭐⭐⭐'
      },
      polygonIo: {
        name: 'Polygon.io',
        cost: 'FREE (5 calls/minute)',
        setup: [
          '1. Go to https://polygon.io/pricing',
          '2. Sign up for free tier',
          '3. Get your free API key',
          '4. Add to server/.env: POLYGON_API_KEY=your_key_here'
        ],
        limits: '5 requests/minute',
        coverage: 'NSE stocks',
        reliability: '⭐⭐⭐⭐⭐'
      },
      alphaVantage: {
        name: 'Alpha Vantage (Indian Stocks)',
        cost: 'FREE (500 calls/day)',
        setup: [
          '1. Go to https://www.alphavantage.co/support/#api-key',
          '2. Sign up for free account',
          '3. Get your free API key',
          '4. Add to server/.env: ALPHA_VANTAGE_API_KEY=your_key_here'
        ],
        limits: '500 requests/day',
        coverage: 'Major BSE stocks',
        reliability: '⭐⭐⭐⭐'
      }
    },
    currentStatus: {
      working: 'Yahoo Finance (No setup required)',
      needSetup: 'FMP, Polygon, Alpha Vantage'
    },
    quickStart: [
      '1. Your app already works with Yahoo Finance (FREE)',
      '2. Optionally add other FREE APIs for redundancy',
      '3. All APIs combined give you comprehensive coverage',
      '4. No paid subscriptions required!'
    ]
  });
});

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

const isIndianMarketOpen = () => {
  const now = new Date();
  const ist = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
  const hour = ist.getHours();
  const day = ist.getDay();
  return day >= 1 && day <= 5 && hour >= 9 && hour < 15;
};

const isGlobalMarketOpen = () => {
  const now = new Date();
  const est = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
  const hour = est.getHours();
  const day = est.getDay();
  return day >= 1 && day <= 5 && hour >= 9 && hour < 16;
};

const GLOBAL_COMPANIES = {
  'AAPL': { name: 'Apple Inc.', sector: 'Technology' },
  'GOOGL': { name: 'Alphabet Inc.', sector: 'Technology' },
  'MSFT': { name: 'Microsoft Corporation', sector: 'Technology' },
  'AMZN': { name: 'Amazon.com Inc.', sector: 'E-commerce' },
  'TSLA': { name: 'Tesla Inc.', sector: 'Electric Vehicles' },
  'META': { name: 'Meta Platforms Inc.', sector: 'Social Media' },
  'NVDA': { name: 'NVIDIA Corporation', sector: 'Semiconductors' },
  'NFLX': { name: 'Netflix Inc.', sector: 'Entertainment' }
};

const getGlobalCompanyName = (symbol) => {
  return GLOBAL_COMPANIES[symbol]?.name || symbol;
};

const getGlobalSector = (symbol) => {
  return GLOBAL_COMPANIES[symbol]?.sector || 'Unknown';
};

const calculateGlobalMarketCap = (symbol, price) => {
  const shares = {
    'AAPL': 15.7, 'GOOGL': 12.9, 'MSFT': 7.4, 'AMZN': 10.7,
    'TSLA': 3.2, 'META': 2.5, 'NVDA': 2.5, 'NFLX': 0.44
  };
  return Math.round((shares[symbol] || 1) * price * 1000);
};

const calculateTrend = (changePercent) => {
  if (changePercent > 2) return 'Strong Bullish';
  if (changePercent > 0.5) return 'Bullish';
  if (changePercent < -2) return 'Strong Bearish';
  if (changePercent < -0.5) return 'Bearish';
  return 'Neutral';
};

const calculateVolatility = (high, low, price) => {
  const range = ((high - low) / price) * 100;
  if (range > 5) return 'High';
  if (range > 2) return 'Medium';
  return 'Low';
};

const calculateStrength = (volume, marketCap) => {
  const turnover = (volume * 100) / marketCap;
  if (turnover > 0.1) return 'Strong';
  if (turnover > 0.05) return 'Medium';
  return 'Weak';
};

const getNextIndianSession = () => {
  const now = new Date();
  const ist = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
  const nextDay = new Date(ist);
  nextDay.setDate(ist.getDate() + 1);
  nextDay.setHours(9, 15, 0, 0);
  return nextDay.toISOString();
};

const getNextUSSession = () => {
  const now = new Date();
  const est = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
  const nextDay = new Date(est);
  nextDay.setDate(est.getDate() + 1);
  nextDay.setHours(9, 30, 0, 0);
  return nextDay.toISOString();
};

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: error.message 
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Vibha StockAlerts Dual-Market Server running on port ${PORT}`);
  console.log(`🇮🇳 Indian Markets: FREE APIs (Yahoo Finance + FMP + Polygon + Alpha Vantage)`);
  console.log(`🌍 Global Markets: ${ALPHA_VANTAGE_API_KEY ? '✅ Alpha Vantage Connected' : '❌ Alpha Vantage API Key Missing'}`);
  console.log(`📊 Cache System: Active`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`📚 Setup Guide: http://localhost:${PORT}/api/setup`);
  console.log(`📈 Unified Ticker: http://localhost:${PORT}/api/stocks/ticker`);
  console.log(`💡 Yahoo Finance is working WITHOUT any API keys!`);
});
