// server/server.js
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
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Alpha Vantage API configuration
const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
const ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query';

// Cache for API responses (simple in-memory cache)
const cache = new Map();
const CACHE_DURATION = 60000; // 1 minute cache

// Default stock symbols for the ticker (Indian stocks mapped to US equivalents for demo)
const DEFAULT_SYMBOLS = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX'];

// Helper function to check cache
const getCachedData = (key) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
};

// Helper function to set cache
const setCachedData = (key, data) => {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
};

// Get multiple stock quotes for ticker
app.get('/api/stocks/ticker', async (req, res) => {
  try {
    const symbols = req.query.symbols ? req.query.symbols.split(',') : DEFAULT_SYMBOLS;
    const cacheKey = `ticker-${symbols.join(',')}`;
    
    // Check cache first
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    const stockPromises = symbols.slice(0, 8).map(async (symbol) => {
      try {
        const response = await axios.get(ALPHA_VANTAGE_BASE_URL, {
          params: {
            function: 'GLOBAL_QUOTE',
            symbol: symbol.toUpperCase(),
            apikey: ALPHA_VANTAGE_API_KEY
          },
          timeout: 10000
        });

        const quote = response.data['Global Quote'];
        if (!quote || Object.keys(quote).length === 0) {
          throw new Error(`No data for ${symbol}`);
        }

        return {
          symbol: symbol.toUpperCase(),
          price: parseFloat(quote['05. price']) || 0,
          change: parseFloat(quote['09. change']) || 0,
          changePercent: quote['10. change percent'] ? 
            parseFloat(quote['10. change percent'].replace('%', '')) : 0,
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        console.error(`Error fetching ${symbol}:`, error.message);
        // Return mock data if API fails (similar to your existing ticker data)
        const mockPrice = Math.random() * 200 + 100;
        const mockChange = (Math.random() - 0.5) * 10;
        return {
          symbol: symbol.toUpperCase(),
          price: mockPrice,
          change: mockChange,
          changePercent: (mockChange / mockPrice) * 100,
          timestamp: new Date().toISOString(),
          mock: true
        };
      }
    });

    const stockData = await Promise.all(stockPromises);
    
    // Cache the results
    setCachedData(cacheKey, stockData);
    
    res.json(stockData);
  } catch (error) {
    console.error('Error fetching ticker data:', error);
    res.status(500).json({ error: 'Failed to fetch stock data' });
  }
});

// Get single stock quote
app.get('/api/stocks/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const cacheKey = `stock-${symbol}`;
    
    // Check cache first
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    const response = await axios.get(ALPHA_VANTAGE_BASE_URL, {
      params: {
        function: 'GLOBAL_QUOTE',
        symbol: symbol.toUpperCase(),
        apikey: ALPHA_VANTAGE_API_KEY
      },
      timeout: 10000
    });

    const quote = response.data['Global Quote'];
    if (!quote || Object.keys(quote).length === 0) {
      return res.status(404).json({ error: 'Stock not found' });
    }

    const stockData = {
      symbol: symbol.toUpperCase(),
      name: symbol.toUpperCase(),
      price: parseFloat(quote['05. price']) || 0,
      change: parseFloat(quote['09. change']) || 0,
      changePercent: quote['10. change percent'] ? 
        parseFloat(quote['10. change percent'].replace('%', '')) : 0,
      high: parseFloat(quote['03. high']) || 0,
      low: parseFloat(quote['04. low']) || 0,
      volume: parseInt(quote['06. volume']) || 0,
      previousClose: parseFloat(quote['08. previous close']) || 0,
      timestamp: new Date().toISOString()
    };

    // Cache the results
    setCachedData(cacheKey, stockData);
    
    res.json(stockData);
  } catch (error) {
    console.error('Error fetching stock data:', error);
    res.status(500).json({ error: 'Failed to fetch stock data' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    cacheSize: cache.size,
    apiKeyConfigured: !!ALPHA_VANTAGE_API_KEY
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 Stock API server running on port ${PORT}`);
  console.log(`📊 Alpha Vantage API Key: ${ALPHA_VANTAGE_API_KEY ? '✅ Configured' : '❌ Missing'}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
});
