// server/server.js - Enhanced Dual-Market Architecture
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200 // Increased for dual markets
});
app.use('/api/', limiter);

// API Configurations
const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
const ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query';

// Enhanced Cache with market separation
const cache = new Map();
const CACHE_DURATION = 60000; // 1 minute for real-time feel
const LONG_CACHE_DURATION = 300000; // 5 minutes for less critical data

// Market Classifications
const INDIAN_MARKETS = {
  BSE: ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'HINDUNILVR', 'ITC', 'SBIN', 'BHARTIARTL', 'ASIANPAINT', 'MARUTI'],
  NSE: ['RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'HINDUNILVR.NS', 'ITC.NS', 'SBIN.NS', 'BHARTIARTL.NS', 'ASIANPAINT.NS', 'MARUTI.NS']
};

const GLOBAL_SYMBOLS = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX', 'BRK.B', 'JPM'];

// Enhanced cache functions
const getCachedData = (key, longCache = false) => {
  const cached = cache.get(key);
  const maxAge = longCache ? LONG_CACHE_DURATION : CACHE_DURATION;
  if (cached && Date.now() - cached.timestamp < maxAge) {
    return cached.data;
  }
  return null;
};

const setCachedData = (key, data) => {
  cache.set(key, { data, timestamp: Date.now() });
};

// 🇮🇳 INDIAN MARKET DATA FETCHERS

// Mock BSE/NSE API (Replace with actual BSE/NSE API)
const fetchIndianStockData = async (symbol) => {
  try {
    // TODO: Replace with actual BSE/NSE API calls
    // For now, generating realistic Indian market data
    
    const basePrice = getIndianBasePrice(symbol);
    const marketHours = isIndianMarketOpen();
    
    // Simulate more realistic Indian market movements
    const volatility = getIndianVolatility(symbol);
    const change = (Math.random() - 0.5) * volatility;
    const price = basePrice + change;
    
    return {
      symbol: symbol.replace('.NS', '').replace('.BO', ''),
      name: getIndianCompanyName(symbol),
      price: Math.round(price * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round((change / basePrice) * 10000) / 100,
      high: Math.round((price + Math.abs(change) * 0.5) * 100) / 100,
      low: Math.round((price - Math.abs(change) * 0.5) * 100) / 100,
      volume: Math.floor(Math.random() * 50000000) + 1000000, // 1M-50M
      marketCap: calculateIndianMarketCap(symbol, price),
      sector: getIndianSector(symbol),
      exchange: symbol.includes('.NS') ? 'NSE' : 'BSE',
      currency: 'INR',
      marketOpen: marketHours,
      timestamp: new Date().toISOString(),
      source: 'BSE/NSE_API'
    };
  } catch (error) {
    console.error(`Error fetching Indian stock ${symbol}:`, error);
    throw error;
  }
};

// 🌍 GLOBAL MARKET DATA FETCHERS (Alpha Vantage)
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
      exchange: getGlobalExchange(symbol),
      currency: 'USD',
      marketOpen: isGlobalMarketOpen(symbol),
      timestamp: new Date().toISOString(),
      source: 'Alpha_Vantage'
    };
  } catch (error) {
    console.error(`Error fetching global stock ${symbol}:`, error);
    throw error;
  }
};

// 📊 UNIFIED TICKER ENDPOINT
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

    // Fetch Indian stocks
    if (includeIndian) {
      const indianSymbols = INDIAN_MARKETS.BSE.slice(0, Math.ceil(limit * 0.6)); // 60% Indian
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

    // Fetch Global stocks
    if (includeGlobal) {
      const globalSymbols = GLOBAL_SYMBOLS.slice(0, Math.floor(limit * 0.4)); // 40% Global
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

    // Sort by market cap and relevance
    allStocks.sort((a, b) => {
      // Prioritize Indian stocks during Indian market hours
      if (isIndianMarketOpen() && a.currency === 'INR' && b.currency === 'USD') return -1;
      if (isIndianMarketOpen() && a.currency === 'USD' && b.currency === 'INR') return 1;
      return b.marketCap - a.marketCap;
    });

    const finalData = allStocks.slice(0, limit);
    
    // Cache results
    setCachedData(cacheKey, finalData);
    
    res.json(finalData);
  } catch (error) {
    console.error('Error in unified ticker:', error);
    res.status(500).json({ error: 'Failed to fetch unified ticker data' });
  }
});

// 🔍 SMART STOCK SEARCH
app.get('/api/stocks/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const searchTerm = query.toLowerCase();
    
    const cacheKey = `search-${searchTerm}`;
    const cachedData = getCachedData(cacheKey, true); // Longer cache for search
    
    if (cachedData) {
      return res.json(cachedData);
    }

    const results = [];

    // Search in Indian companies
    const indianMatches = Object.keys(INDIAN_COMPANIES).filter(symbol =>
      symbol.toLowerCase().includes(searchTerm) ||
      INDIAN_COMPANIES[symbol].name.toLowerCase().includes(searchTerm)
    );

    // Search in Global companies  
    const globalMatches = Object.keys(GLOBAL_COMPANIES).filter(symbol =>
      symbol.toLowerCase().includes(searchTerm) ||
      GLOBAL_COMPANIES[symbol].name.toLowerCase().includes(searchTerm)
    );

    // Combine and format results
    [...indianMatches.slice(0, 5), ...globalMatches.slice(0, 5)].forEach(symbol => {
      const isIndian = INDIAN_COMPANIES[symbol];
      results.push({
        symbol,
        name: isIndian ? INDIAN_COMPANIES[symbol].name : GLOBAL_COMPANIES[symbol].name,
        sector: isIndian ? INDIAN_COMPANIES[symbol].sector : GLOBAL_COMPANIES[symbol].sector,
        market: isIndian ? 'Indian' : 'Global',
        currency: isIndian ? 'INR' : 'USD'
      });
    });

    setCachedData(cacheKey, results);
    res.json(results);
  } catch (error) {
    console.error('Error in stock search:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// 📈 INDIVIDUAL STOCK DETAILS
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
    const isIndianStock = isIndianSymbol(symbol);
    
    if (isIndianStock) {
      stockData = await fetchIndianStockData(symbol);
    } else {
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

// 🏛️ MARKET STATUS ENDPOINT
app.get('/api/markets/status', (req, res) => {
  const now = new Date();
  const istTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
  const usTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));

  res.json({
    indian: {
      open: isIndianMarketOpen(),
      nextSession: getNextIndianSession(),
      timezone: 'IST',
      currentTime: istTime.toLocaleString()
    },
    global: {
      nyse: {
        open: isUSMarketOpen(),
        nextSession: getNextUSSession(),
        timezone: 'EST',
        currentTime: usTime.toLocaleString()
      }
    }
  });
});

// 📊 PORTFOLIO ANALYTICS
app.get('/api/portfolio/analytics', async (req, res) => {
  try {
    const symbols = req.query.symbols ? req.query.symbols.split(',') : [];
    
    if (symbols.length === 0) {
      return res.json({ error: 'No symbols provided' });
    }

    const portfolioData = [];
    
    for (const symbol of symbols) {
      try {
        const isIndian = isIndianSymbol(symbol);
        const stockData = isIndian ? 
          await fetchIndianStockData(symbol) : 
          await fetchGlobalStockData(symbol);
        portfolioData.push(stockData);
      } catch (error) {
        console.error(`Error fetching ${symbol}:`, error);
      }
    }

    // Calculate portfolio metrics
    const analytics = calculatePortfolioAnalytics(portfolioData);
    
    res.json(analytics);
  } catch (error) {
    console.error('Portfolio analytics error:', error);
    res.status(500).json({ error: 'Failed to calculate portfolio analytics' });
  }
});

// 🏥 HEALTH CHECK
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK',
    markets: {
      indian: 'Connected (Mock BSE/NSE)',
      global: ALPHA_VANTAGE_API_KEY ? 'Connected (Alpha Vantage)' : 'API Key Missing'
    },
    cacheSize: cache.size,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

// Indian Market Helper Functions
const getIndianBasePrice = (symbol) => {
  const basePrices = {
    'RELIANCE': 2800, 'TCS': 3900, 'HDFCBANK': 1650, 'INFY': 1750,
    'HINDUNILVR': 2650, 'ITC': 450, 'SBIN': 650, 'BHARTIARTL': 950,
    'ASIANPAINT': 3200, 'MARUTI': 10500
  };
  return basePrices[symbol.replace('.NS', '').replace('.BO', '')] || 1000;
};

const getIndianVolatility = (symbol) => {
  const volatilities = {
    'RELIANCE': 80, 'TCS': 120, 'HDFCBANK': 60, 'INFY': 90,
    'HINDUNILVR': 100, 'ITC': 25, 'SBIN': 40, 'BHARTIARTL': 50,
    'ASIANPAINT': 150, 'MARUTI': 400
  };
  return volatilities[symbol.replace('.NS', '').replace('.BO', '')] || 50;
};

const isIndianMarketOpen = () => {
  const now = new Date();
  const ist = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
  const hour = ist.getHours();
  const day = ist.getDay();
  
  // Monday to Friday, 9:15 AM to 3:30 PM IST
  return day >= 1 && day <= 5 && hour >= 9 && hour < 15;
};

const isIndianSymbol = (symbol) => {
  const cleanSymbol = symbol.replace('.NS', '').replace('.BO', '');
  return INDIAN_MARKETS.BSE.includes(cleanSymbol) || 
         INDIAN_MARKETS.NSE.includes(symbol);
};

const isUSMarketOpen = () => {
  const now = new Date();
  const est = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
  const hour = est.getHours();
  const day = est.getDay();
  
  // Monday to Friday, 9:30 AM to 4:00 PM EST
  return day >= 1 && day <= 5 && hour >= 9 && hour < 16;
};

// Company Data Mappings
const INDIAN_COMPANIES = {
  'RELIANCE': { name: 'Reliance Industries Ltd', sector: 'Oil & Gas' },
  'TCS': { name: 'Tata Consultancy Services', sector: 'IT Services' },
  'HDFCBANK': { name: 'HDFC Bank Limited', sector: 'Banking' },
  'INFY': { name: 'Infosys Limited', sector: 'IT Services' },
  'HINDUNILVR': { name: 'Hindustan Unilever Ltd', sector: 'FMCG' },
  'ITC': { name: 'ITC Limited', sector: 'FMCG' },
  'SBIN': { name: 'State Bank of India', sector: 'Banking' },
  'BHARTIARTL': { name: 'Bharti Airtel Limited', sector: 'Telecom' },
  'ASIANPAINT': { name: 'Asian Paints Limited', sector: 'Paints' },
  'MARUTI': { name: 'Maruti Suzuki India Ltd', sector: 'Automotive' }
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

const getIndianCompanyName = (symbol) => {
  const clean = symbol.replace('.NS', '').replace('.BO', '');
  return INDIAN_COMPANIES[clean]?.name || clean;
};

const getIndianSector = (symbol) => {
  const clean = symbol.replace('.NS', '').replace('.BO', '');
  return INDIAN_COMPANIES[clean]?.sector || 'Unknown';
};

const getGlobalCompanyName = (symbol) => {
  return GLOBAL_COMPANIES[symbol]?.name || symbol;
};

const getGlobalSector = (symbol) => {
  return GLOBAL_COMPANIES[symbol]?.sector || 'Unknown';
};

const calculateIndianMarketCap = (symbol, price) => {
  const shares = { // Rough outstanding shares (in crores)
    'RELIANCE': 676, 'TCS': 365, 'HDFCBANK': 547, 'INFY': 425,
    'HINDUNILVR': 235, 'ITC': 1240, 'SBIN': 891, 'BHARTIARTL': 534,
    'ASIANPAINT': 96, 'MARUTI': 30
  };
  const clean = symbol.replace('.NS', '').replace('.BO', '');
  return Math.round((shares[clean] || 100) * price);
};

const calculateGlobalMarketCap = (symbol, price) => {
  const shares = { // Rough outstanding shares (in billions)
    'AAPL': 15.7, 'GOOGL': 12.9, 'MSFT': 7.4, 'AMZN': 10.7,
    'TSLA': 3.2, 'META': 2.5, 'NVDA': 2.5, 'NFLX': 0.44
  };
  return Math.round((shares[symbol] || 1) * price * 1000); // Convert to millions
};

// Analytics Functions
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
  // Simplified strength calculation
  const turnover = (volume * 100) / marketCap; // Rough turnover ratio
  if (turnover > 0.1) return 'Strong';
  if (turnover > 0.05) return 'Medium';
  return 'Weak';
};

const calculatePortfolioAnalytics = (portfolio) => {
  const indianStocks = portfolio.filter(s => s.currency === 'INR');
  const globalStocks = portfolio.filter(s => s.currency === 'USD');
  
  return {
    summary: {
      totalStocks: portfolio.length,
      indianCount: indianStocks.length,
      globalCount: globalStocks.length
    },
    performance: {
      avgChange: portfolio.reduce((sum, s) => sum + s.changePercent, 0) / portfolio.length,
      bestPerformer: portfolio.reduce((best, current) => 
        current.changePercent > best.changePercent ? current : best),
      worstPerformer: portfolio.reduce((worst, current) => 
        current.changePercent < worst.changePercent ? current : worst)
    },
    distribution: {
      indian: (indianStocks.length / portfolio.length) * 100,
      global: (globalStocks.length / portfolio.length) * 100
    }
  };
};

const getNextIndianSession = () => {
  const now = new Date();
  const ist = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
  // Simplified - just return next day 9:15 AM
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

const getGlobalExchange = (symbol) => {
  return 'NASDAQ'; // Simplified
};

const isGlobalMarketOpen = (symbol) => {
  return isUSMarketOpen(); // Simplified
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
  console.log(`🇮🇳 Indian Markets: BSE/NSE (Mock API)`);
  console.log(`🌍 Global Markets: ${ALPHA_VANTAGE_API_KEY ? '✅ Alpha Vantage Connected' : '❌ Alpha Vantage API Key Missing'}`);
  console.log(`📊 Cache System: Active`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`📈 Unified Ticker: http://localhost:${PORT}/api/stocks/ticker`);
});
