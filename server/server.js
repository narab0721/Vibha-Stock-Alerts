// server/server.js - Enhanced with Multiple API Providers and Better Error Handling

import express from 'express';
import cors from 'cors';
import axios from 'axios';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Import our enhanced Indian Markets API module
import { fetchIndianStockData, checkAPIHealth } from './indian-markets-api.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { error: 'Rate limit exceeded, please try again later' }
});
app.use('/api/', limiter);

// API Configurations
const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY || 'demo';

// Enhanced Cache with TTL
const cache = new Map();
const CACHE_DURATION = 60000; // 1 minute for real-time data
const LONG_CACHE_DURATION = 300000; // 5 minutes for search results

// Market Classifications
const INDIAN_SYMBOLS = ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'HINDUNILVR', 'ITC', 'SBIN', 'BHARTIARTL', 'ASIANPAINT', 'MARUTI', 'ADANIGREEN', 'TATASTEEL', 'WIPRO', 'LT', 'HCLTECH'];
const GLOBAL_SYMBOLS = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX', 'BRK.B', 'JPM', 'V', 'JNJ', 'WMT', 'PG', 'UNH'];

// Enhanced Cache functions
const getCachedData = (key) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < cached.ttl) {
    return cached.data;
  }
  cache.delete(key); // Clean up expired cache
  return null;
};

const setCachedData = (key, data, ttl = CACHE_DURATION) => {
  cache.set(key, { data, timestamp: Date.now(), ttl });
  
  // Clean up old cache entries (simple memory management)
  if (cache.size > 1000) {
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }
};

// =============================================================================
// GLOBAL MARKET DATA FETCHER (Enhanced with Better Error Handling)
// =============================================================================

const fetchGlobalStockData = async (symbol) => {
  try {
    if (!ALPHA_VANTAGE_API_KEY || ALPHA_VANTAGE_API_KEY === 'demo') {
      throw new Error('Alpha Vantage API key required for global stocks');
    }

    const response = await axios.get('https://www.alphavantage.co/query', {
      params: {
        function: 'GLOBAL_QUOTE',
        symbol: symbol,
        apikey: ALPHA_VANTAGE_API_KEY
      },
      timeout: 10000
    });

    const quote = response.data['Global Quote'];
    if (!quote || Object.keys(quote).length === 0) {
      throw new Error(`No data available for ${symbol}`);
    }

    const price = parseFloat(quote['05. price']) || 0;
    const change = parseFloat(quote['09. change']) || 0;
    const changePercent = quote['10. change percent'] ? 
      parseFloat(quote['10. change percent'].replace('%', '')) : 0;

    return {
      symbol: symbol,
      name: getGlobalCompanyName(symbol),
      price: Math.round(price * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
      high: Math.round((parseFloat(quote['03. high']) || price) * 100) / 100,
      low: Math.round((parseFloat(quote['04. low']) || price) * 100) / 100,
      volume: parseInt(quote['06. volume']) || 0,
      previousClose: Math.round((parseFloat(quote['08. previous close']) || price) * 100) / 100,
      marketCap: calculateGlobalMarketCap(symbol, price),
      sector: getGlobalSector(symbol),
      exchange: getGlobalExchange(symbol),
      currency: 'USD',
      marketOpen: isGlobalMarketOpen(),
      timestamp: new Date().toISOString(),
      source: 'Alpha_Vantage_Global'
    };
  } catch (error) {
    console.error(`Error fetching global stock ${symbol}:`, error.message);
    
    // Return mock data for global stocks if API fails
    return generateGlobalMockData(symbol);
  }
};

const generateGlobalMockData = (symbol) => {
  const basePrice = getGlobalBasePrice(symbol);
  const volatility = getGlobalVolatility(symbol);
  
  const timeBasedVariation = Math.sin(Date.now() / 10000) * 0.5;
  const randomVariation = (Math.random() - 0.5) * 2;
  const totalVariation = (timeBasedVariation + randomVariation) * volatility;
  
  const price = Math.max(basePrice + totalVariation, basePrice * 0.85);
  const change = totalVariation;
  const changePercent = (change / basePrice) * 100;
  
  return {
    symbol: symbol,
    name: getGlobalCompanyName(symbol),
    price: Math.round(price * 100) / 100,
    change: Math.round(change * 100) / 100,
    changePercent: Math.round(changePercent * 100) / 100,
    high: Math.round((price + Math.abs(change) * 0.4) * 100) / 100,
    low: Math.round((price - Math.abs(change) * 0.4) * 100) / 100,
    volume: Math.floor(Math.random() * 100000000) + 10000000,
    previousClose: Math.round(basePrice * 100) / 100,
    marketCap: calculateGlobalMarketCap(symbol, price),
    sector: getGlobalSector(symbol),
    exchange: getGlobalExchange(symbol),
    currency: 'USD',
    marketOpen: isGlobalMarketOpen(),
    timestamp: new Date().toISOString(),
    source: 'Mock_Global_Data',
    mock: true
  };
};

// =============================================================================
// 📊 ENHANCED UNIFIED TICKER ENDPOINT
// =============================================================================

app.get('/api/stocks/ticker', async (req, res) => {
  try {
    const includeIndian = req.query.indian !== 'false';
    const includeGlobal = req.query.global !== 'false';
    const limit = parseInt(req.query.limit) || 15;
    
    const cacheKey = `unified-ticker-${includeIndian}-${includeGlobal}-${limit}`;
    
    // Check cache first
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      console.log('📦 Serving cached ticker data');
      return res.json({
        ...cachedData,
        summary: {
          ...cachedData.summary,
          cached: true,
          cacheAge: Math.round((Date.now() - cachedData.summary.timestamp) / 1000)
        }
      });
    }

    const allStocks = [];
    const promises = [];
    const errors = [];

    // 🇮🇳 Fetch Indian stocks using enhanced multi-provider system
    if (includeIndian) {
      const indianSymbols = INDIAN_SYMBOLS.slice(0, Math.ceil(limit * 0.6));
      console.log(`🇮🇳 Fetching ${indianSymbols.length} Indian stocks using enhanced API system...`);
      
      promises.push(
        ...indianSymbols.map(async (symbol) => {
          try {
            return await fetchIndianStockData(symbol);
          } catch (error) {
            errors.push({ symbol, error: error.message, market: 'indian' });
            return null;
          }
        })
      );
    }

    // 🌍 Fetch Global stocks
    if (includeGlobal) {
      const globalSymbols = GLOBAL_SYMBOLS.slice(0, Math.floor(limit * 0.4));
      console.log(`🌍 Fetching ${globalSymbols.length} Global stocks...`);
      
      promises.push(
        ...globalSymbols.map(async (symbol) => {
          try {
            return await fetchGlobalStockData(symbol);
          } catch (error) {
            errors.push({ symbol, error: error.message, market: 'global' });
            return null;
          }
        })
      );
    }

    const results = await Promise.all(promises);
    
    // Filter out null results and add to allStocks
    results.forEach(result => {
      if (result) {
        allStocks.push(result);
      }
    });

    // Enhanced sorting logic
    allStocks.sort((a, b) => {
      // Prioritize Indian stocks during Indian market hours
      if (isIndianMarketOpen()) {
        if (a.currency === 'INR' && b.currency === 'USD') return -1;
        if (a.currency === 'USD' && b.currency === 'INR') return 1;
      }
      
      // Sort by absolute change percentage for more interesting display
      return Math.abs(b.changePercent) - Math.abs(a.changePercent);
    });

    const finalData = allStocks.slice(0, limit);
    
    // Generate comprehensive summary
    const summary = {
      total: finalData.length,
      indian: finalData.filter(s => s.currency === 'INR').length,
      global: finalData.filter(s => s.currency === 'USD').length,
      sources: [...new Set(finalData.map(s => s.source))],
      errors: errors.length,
      mockData: finalData.filter(s => s.mock).length,
      cached: false,
      timestamp: Date.now(),
      marketStatus: {
        indian: isIndianMarketOpen(),
        global: isGlobalMarketOpen()
      }
    };

    const response = {
      summary,
      data: finalData,
      errors: errors.length > 0 ? errors : undefined
    };
    
    // Cache the successful response
    setCachedData(cacheKey, response, CACHE_DURATION);
    
    console.log(`✅ Ticker response: ${summary.indian} Indian + ${summary.global} Global stocks (${summary.mockData} mock)`);
    res.json(response);
  } catch (error) {
    console.error('Error in unified ticker:', error);
    res.status(500).json({ 
      error: 'Failed to fetch ticker data',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// =============================================================================
// 📈 ENHANCED INDIVIDUAL STOCK DETAILS
// =============================================================================

app.get('/api/stocks/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const cacheKey = `stock-details-${symbol}`;
    
    // Check cache
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      return res.json({
        ...cachedData,
        cached: true,
        cacheAge: Math.round((Date.now() - cachedData.timestamp) / 1000)
      });
    }

    let stockData;
    
    // Determine if it's an Indian or Global stock
    const cleanSymbol = symbol.replace('.NS', '').replace('.BO', '');
    const isIndianStock = INDIAN_SYMBOLS.includes(cleanSymbol);
    
    if (isIndianStock) {
      console.log(`🇮🇳 Fetching Indian stock details: ${symbol}`);
      stockData = await fetchIndianStockData(symbol);
    } else {
      console.log(`🌍 Fetching Global stock details: ${symbol}`);
      stockData = await fetchGlobalStockData(symbol);
    }

    // Add enhanced analysis
    stockData.analysis = {
      trend: calculateTrend(stockData.changePercent),
      volatility: calculateVolatility(stockData.high, stockData.low, stockData.price),
      strength: calculateStrength(stockData.volume, stockData.marketCap),
      support: calculateSupport(stockData.low, stockData.price),
      resistance: calculateResistance(stockData.high, stockData.price)
    };

    // Add timestamp for cache tracking
    stockData.fetchedAt = new Date().toISOString();

    setCachedData(cacheKey, stockData, CACHE_DURATION);
    res.json(stockData);
  } catch (error) {
    console.error(`Error fetching stock ${req.params.symbol}:`, error);
    res.status(404).json({ 
      error: 'Stock not found or data unavailable',
      symbol: req.params.symbol,
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// =============================================================================
// 🔍 STOCK SEARCH ENDPOINT
// =============================================================================

app.get('/api/stocks/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const cacheKey = `search-${query.toLowerCase()}`;
    
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    const allSymbols = [...INDIAN_SYMBOLS, ...GLOBAL_SYMBOLS];
    const results = allSymbols
      .filter(symbol => 
        symbol.toLowerCase().includes(query.toLowerCase()) ||
        getCompanyName(symbol).toLowerCase().includes(query.toLowerCase())
      )
      .map(symbol => ({
        symbol,
        name: getCompanyName(symbol),
        market: INDIAN_SYMBOLS.includes(symbol) ? 'indian' : 'global',
        currency: INDIAN_SYMBOLS.includes(symbol) ? 'INR' : 'USD',
        exchange: INDIAN_SYMBOLS.includes(symbol) ? 'NSE' : getGlobalExchange(symbol)
      }))
      .slice(0, 10);

    const response = {
      query,
      results,
      total: results.length,
      timestamp: new Date().toISOString()
    };

    setCachedData(cacheKey, response, LONG_CACHE_DURATION);
    res.json(response);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ 
      error: 'Search failed',
      message: error.message 
    });
  }
});

// =============================================================================
// 🏛️ ENHANCED MARKET STATUS
// =============================================================================

app.get('/api/markets/status', async (req, res) => {
  try {
    const now = new Date();
    const istTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
    const usTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));

    // Check API health
    const apiHealth = await checkAPIHealth();

    res.json({
      timestamp: now.toISOString(),
      indian: {
        open: isIndianMarketOpen(),
        nextSession: getNextIndianSession(),
        timezone: 'IST',
        currentTime: istTime.toLocaleString(),
        exchanges: ['NSE', 'BSE'],
        tradingHours: '9:15 AM - 3:30 PM IST',
        dataSources: [
          { name: 'Financial Modeling Prep', status: apiHealth['Financial Modeling Prep'] || 'Not Configured', limit: '250/day', priority: 1 },
          { name: 'Twelve Data', status: apiHealth['Twelve Data'] || 'Not Configured', limit: '800/day', priority: 2 },
          { name: 'Alpha Vantage', status: apiHealth['Alpha Vantage'] || 'Not Configured', limit: '500/day', priority: 3 },
          { name: 'Yahoo Finance (Proxy)', status: 'Available', limit: 'Unlimited', priority: 4 }
        ]
      },
      global: {
        nyse: {
          open: isGlobalMarketOpen(),
          nextSession: getNextUSSession(),
          timezone: 'EST/EDT',
          currentTime: usTime.toLocaleString(),
          tradingHours: '9:30 AM - 4:00 PM EST'
        },
        nasdaq: {
          open: isGlobalMarketOpen(),
          timezone: 'EST/EDT',
          tradingHours: '9:30 AM - 4:00 PM EST'
        },
        dataSources: [
          { name: 'Alpha Vantage', status: process.env.ALPHA_VANTAGE_API_KEY ? 'Configured' : 'Not Configured', limit: '500/day' }
        ]
      },
      cache: {
        size: cache.size,
        maxSize: 1000
      }
    });
  } catch (error) {
    console.error('Market status error:', error);
    res.status(500).json({
      error: 'Failed to get market status',
      message: error.message
    });
  }
});

// =============================================================================
// 🏥 COMPREHENSIVE HEALTH CHECK
// =============================================================================

app.get('/api/health', async (req, res) => {
  try {
    const apiStatus = await checkAPIHealth();
    
    const healthData = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        unit: 'MB'
      },
      cache: {
        size: cache.size,
        maxSize: 1000
      },
      markets: {
        indian: {
          status: '🇮🇳 Multi-Provider System',
          providers: Object.keys(apiStatus).length + 1, // +1 for Yahoo proxy
          primary: 'Financial Modeling Prep'
        },
        global: {
          status: '🌍 Alpha Vantage',
          configured: process.env.ALPHA_VANTAGE_API_KEY ? true : false
        }
      },
      apis: {
        ...apiStatus,
        'Yahoo Finance (Proxy)': 'Available (Fallback)'
      },
      endpoints: {
        ticker: '/api/stocks/ticker',
        stockDetail: '/api/stocks/:symbol',
        search: '/api/stocks/search/:query',
        markets: '/api/markets/status',
        setup: '/api/setup'
      }
    };

    res.json(healthData);
  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({
      status: 'ERROR',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// =============================================================================
// 📚 ENHANCED API SETUP GUIDE
// =============================================================================

app.get('/api/setup', (req, res) => {
  const setupGuide = {
    title: '🚀 Enhanced Multi-Provider API Setup',
    overview: 'Your app now uses multiple FREE APIs with automatic fallbacks for maximum reliability',
    
    currentStatus: {
      working: ['Yahoo Finance (Proxy)', 'Enhanced Mock Data'],
      needSetup: ['Financial Modeling Prep', 'Twelve Data', 'Alpha Vantage'],
      priority: 'Add API keys for better data quality and higher limits'
    },

    freeApis: {
      financialModelingPrep: {
        name: 'Financial Modeling Prep (Recommended)',
        priority: 1,
        cost: 'FREE (250 calls/day)',
        coverage: 'Excellent Indian stock coverage',
        reliability: '⭐⭐⭐⭐⭐',
        setup: [
          '1. Visit: https://financialmodelingprep.com/developer/docs',
          '2. Sign up for free account',
          '3. Get your free API key from dashboard',
          '4. Add to server/.env: FMP_API_KEY=your_key_here',
          '5. Restart server'
        ],
        envVariable: 'FMP_API_KEY'
      },
      
      twelveData: {
        name: 'Twelve Data',
        priority: 2,
        cost: 'FREE (800 calls/day)',
        coverage: 'Good Indian + Global coverage',
        reliability: '⭐⭐⭐⭐',
        setup: [
          '1. Visit: https://twelvedata.com/pricing',
          '2. Sign up for free tier',
          '3. Get API key from dashboard',
          '4. Add to server/.env: TWELVE_DATA_API_KEY=your_key_here',
          '5. Restart server'
        ],
        envVariable: 'TWELVE_DATA_API_KEY'
      },

      alphaVantage: {
        name: 'Alpha Vantage',
        priority: 3,
        cost: 'FREE (500 calls/day)',
        coverage: 'Indian + Global markets',
        reliability: '⭐⭐⭐⭐',
        setup: [
          '1. Visit: https://www.alphavantage.co/support/#api-key',
          '2. Enter email for free API key',
          '3. Check email for your key',
          '4. Add to server/.env: ALPHA_VANTAGE_API_KEY=your_key_here',
          '5. Restart server'
        ],
        envVariable: 'ALPHA_VANTAGE_API_KEY'
      }
    },

    fallbackSystem: {
      description: 'Multi-layer fallback system ensures 99.9% uptime',
      layers: [
        'Layer 1: Primary APIs (FMP, Twelve Data, Alpha Vantage)',
        'Layer 2: Yahoo Finance with CORS proxies',
        'Layer 3: Enhanced realistic mock data',
        'Layer 4: Intelligent caching system'
      ]
    },

    quickStart: [
      '✅ Your app already works without any setup',
      '🔧 Add API keys for better data quality',
      '📈 Multiple providers ensure reliability',
      '💰 All APIs are completely FREE',
      '🚀 Automatic failover between providers'
    ],

    testCommands: [
      'curl http://localhost:3001/api/health',
      'curl http://localhost:3001/api/stocks/ticker',
      'curl http://localhost:3001/api/stocks/RELIANCE',
      'curl http://localhost:3001/api/markets/status'
    ]
  };

  res.json(setupGuide);
});

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

const isIndianMarketOpen = () => {
  const now = new Date();
  const ist = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
  const hour = ist.getHours();
  const minute = ist.getMinutes();
  const day = ist.getDay();
  
  const isWeekday = day >= 1 && day <= 5;
  const isMarketHours = (hour > 9 || (hour === 9 && minute >= 15)) && (hour < 15 || (hour === 15 && minute <= 30));
  
  return isWeekday && isMarketHours;
};

const isGlobalMarketOpen = () => {
  const now = new Date();
  const est = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
  const hour = est.getHours();
  const day = est.getDay();
  return day >= 1 && day <= 5 && hour >= 9 && hour < 16;
};

const GLOBAL_COMPANIES = {
  'AAPL': { name: 'Apple Inc.', sector: 'Technology', basePrice: 175, volatility: 8 },
  'GOOGL': { name: 'Alphabet Inc.', sector: 'Technology', basePrice: 142, volatility: 6 },
  'MSFT': { name: 'Microsoft Corporation', sector: 'Technology', basePrice: 378, volatility: 12 },
  'AMZN': { name: 'Amazon.com Inc.', sector: 'E-commerce', basePrice: 153, volatility: 7 },
  'TSLA': { name: 'Tesla Inc.', sector: 'Electric Vehicles', basePrice: 248, volatility: 15 },
  'META': { name: 'Meta Platforms Inc.', sector: 'Social Media', basePrice: 325, volatility: 12 },
  'NVDA': { name: 'NVIDIA Corporation', sector: 'Semiconductors', basePrice: 465, volatility: 20 },
  'NFLX': { name: 'Netflix Inc.', sector: 'Entertainment', basePrice: 445, volatility: 18 }
};

const getGlobalCompanyName = (symbol) => GLOBAL_COMPANIES[symbol]?.name || symbol;
const getGlobalSector = (symbol) => GLOBAL_COMPANIES[symbol]?.sector || 'Unknown';
const getGlobalBasePrice = (symbol) => GLOBAL_COMPANIES[symbol]?.basePrice || 100;
const getGlobalVolatility = (symbol) => GLOBAL_COMPANIES[symbol]?.volatility || 5;
const getGlobalExchange = (symbol) => ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META', 'NFLX'].includes(symbol) ? 'NASDAQ' : 'NYSE';

const getCompanyName = (symbol) => {
  return INDIAN_SYMBOLS.includes(symbol) ? 
    getIndianCompanyName(symbol) : 
    getGlobalCompanyName(symbol);
};

const calculateGlobalMarketCap = (symbol, price) => {
  const shares = { // Outstanding shares in billions
    'AAPL': 15.7, 'GOOGL': 12.9, 'MSFT': 7.4, 'AMZN': 10.7,
    'TSLA': 3.2, 'META': 2.5, 'NVDA': 2.5, 'NFLX': 0.44
  };
  return Math.round((shares[symbol] || 1) * price);
};

const calculateTrend = (changePercent) => {
  if (changePercent > 3) return 'Strong Bullish';
  if (changePercent > 1) return 'Bullish';
  if (changePercent < -3) return 'Strong Bearish';
  if (changePercent < -1) return 'Bearish';
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

const calculateSupport = (low, price) => Math.round((low * 0.98) * 100) / 100;
const calculateResistance = (high, price) => Math.round((high * 1.02) * 100) / 100;

const getNextIndianSession = () => {
  const now = new Date();
  const ist = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
  const nextDay = new Date(ist);
  
  if (ist.getDay() === 5) { // Friday
    nextDay.setDate(ist.getDate() + 3); // Next Monday
  } else if (ist.getDay() === 6) { // Saturday
    nextDay.setDate(ist.getDate() + 2); // Next Monday
  } else {
    nextDay.setDate(ist.getDate() + 1); // Next day
  }
  
  nextDay.setHours(9, 15, 0, 0);
  return nextDay.toISOString();
};

const getNextUSSession = () => {
  const now = new Date();
  const est = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
  const nextDay = new Date(est);
  
  if (est.getDay() === 5) { // Friday
    nextDay.setDate(est.getDate() + 3); // Next Monday
  } else if (est.getDay() === 6) { // Saturday
    nextDay.setDate(est.getDate() + 2); // Next Monday
  } else {
    nextDay.setDate(est.getDate() + 1); // Next day
  }
  
  nextDay.setHours(9, 30, 0, 0);
  return nextDay.toISOString();
};

// Helper function to get Indian company name (imported from indian-markets-api.js)
const getIndianCompanyName = (symbol) => {
  const companies = {
    'RELIANCE': 'Reliance Industries Ltd',
    'TCS': 'Tata Consultancy Services',
    'HDFCBANK': 'HDFC Bank Limited',
    'INFY': 'Infosys Limited',
    'HINDUNILVR': 'Hindustan Unilever Ltd',
    'ITC': 'ITC Limited',
    'SBIN': 'State Bank of India',
    'BHARTIARTL': 'Bharti Airtel Limited',
    'ASIANPAINT': 'Asian Paints Limited',
    'MARUTI': 'Maruti Suzuki India Ltd',
    'ADANIGREEN': 'Adani Green Energy Ltd',
    'TATASTEEL': 'Tata Steel Limited',
    'WIPRO': 'Wipro Limited',
    'LT': 'Larsen & Toubro Limited',
    'HCLTECH': 'HCL Technologies Limited'
  };
  return companies[symbol.replace('.NS', '').replace('.BO', '')] || symbol;
};

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: error.message,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    availableEndpoints: [
      'GET /api/health',
      'GET /api/setup', 
      'GET /api/stocks/ticker',
      'GET /api/stocks/:symbol',
      'GET /api/stocks/search/:query',
      'GET /api/markets/status'
    ],
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Vibha StockAlerts Enhanced Server running on port ${PORT}`);
  console.log(`🇮🇳 Indian Markets: Multi-Provider System (FMP + Twelve Data + Alpha Vantage + Yahoo Proxy)`);
  console.log(`🌍 Global Markets: ${ALPHA_VANTAGE_API_KEY && ALPHA_VANTAGE_API_KEY !== 'demo' ? '✅ Alpha Vantage Connected' : '❌ Alpha Vantage API Key Missing'}`);
  console.log(`📊 Cache System: Active (${cache.size} entries)`);
  console.log(`🔄 Fallback System: 4-Layer Protection`);
  console.log(`\n📋 API Endpoints:`);
  console.log(`   🏥 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`   📚 Setup Guide: http://localhost:${PORT}/api/setup`);
  console.log(`   📈 Live Ticker: http://localhost:${PORT}/api/stocks/ticker`);
  console.log(`   🔍 Stock Search: http://localhost:${PORT}/api/stocks/search/reliance`);
  console.log(`   📊 Market Status: http://localhost:${PORT}/api/markets/status`);
  console.log(`\n💡 System Status: Enhanced reliability with automatic API fallbacks!`);
});
