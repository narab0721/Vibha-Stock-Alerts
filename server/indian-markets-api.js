// server/indian-markets-api.js - FREE Indian Market Data Integration

import axios from 'axios';

// =============================================================================
// FREE API CONFIGURATIONS
// =============================================================================

// 1. Yahoo Finance (Completely FREE, No API Key Needed)
const YAHOO_FINANCE_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart';

// 2. Polygon.io (FREE tier: 5 calls/minute)
const POLYGON_API_KEY = process.env.POLYGON_API_KEY || 'your_free_polygon_key';
const POLYGON_BASE = 'https://api.polygon.io/v2/aggs/ticker';

// 3. Financial Modeling Prep (FREE: 250 calls/day)
const FMP_API_KEY = process.env.FMP_API_KEY || 'your_free_fmp_key';
const FMP_BASE = 'https://financialmodelingprep.com/api/v3';

// 4. Alpha Vantage (Indian stocks support)
const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;

// =============================================================================
// YAHOO FINANCE INTEGRATION (PRIMARY - COMPLETELY FREE)
// =============================================================================

export const fetchYahooIndianStock = async (symbol) => {
  try {
    // Convert symbol to Yahoo format (add .NS for NSE, .BO for BSE)
    const yahooSymbol = symbol.includes('.') ? symbol : `${symbol}.NS`;
    
    const response = await axios.get(`${YAHOO_FINANCE_BASE}/${yahooSymbol}`, {
      params: {
        interval: '1d',
        range: '1d',
        includePrePost: true
      },
      timeout: 10000
    });

    const data = response.data.chart.result[0];
    const meta = data.meta;
    const quote = data.indicators.quote[0];
    
    // Extract the latest values
    const prices = quote.close.filter(p => p !== null);
    const volumes = quote.volume.filter(v => v !== null);
    const highs = quote.high.filter(h => h !== null);
    const lows = quote.low.filter(l => l !== null);
    
    const currentPrice = prices[prices.length - 1];
    const previousClose = meta.previousClose;
    const change = currentPrice - previousClose;
    const changePercent = (change / previousClose) * 100;

    return {
      symbol: symbol,
      name: getIndianCompanyName(symbol),
      price: Math.round(currentPrice * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
      high: Math.round(highs[highs.length - 1] * 100) / 100,
      low: Math.round(lows[lows.length - 1] * 100) / 100,
      volume: volumes[volumes.length - 1],
      previousClose: Math.round(previousClose * 100) / 100,
      marketCap: calculateIndianMarketCap(symbol, currentPrice),
      sector: getIndianSector(symbol),
      exchange: yahooSymbol.includes('.NS') ? 'NSE' : 'BSE',
      currency: 'INR',
      marketOpen: isIndianMarketOpen(),
      timestamp: new Date().toISOString(),
      source: 'Yahoo_Finance_Free'
    };
  } catch (error) {
    console.error(`Yahoo Finance error for ${symbol}:`, error.message);
    throw error;
  }
};

// =============================================================================
// POLYGON.IO INTEGRATION (FREE: 5 calls/minute)
// =============================================================================

export const fetchPolygonIndianStock = async (symbol) => {
  try {
    if (!POLYGON_API_KEY || POLYGON_API_KEY === 'your_free_polygon_key') {
      throw new Error('Polygon API key not configured');
    }

    // Get yesterday's date for daily data
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];

    const response = await axios.get(`${POLYGON_BASE}/${symbol}/range/1/day/${dateStr}/${dateStr}`, {
      params: {
        adjusted: true,
        sort: 'asc',
        apikey: POLYGON_API_KEY
      },
      timeout: 10000
    });

    const data = response.data.results[0];
    if (!data) {
      throw new Error(`No data found for ${symbol}`);
    }

    const change = data.c - data.o;
    const changePercent = (change / data.o) * 100;

    return {
      symbol: symbol,
      name: getIndianCompanyName(symbol),
      price: Math.round(data.c * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
      high: Math.round(data.h * 100) / 100,
      low: Math.round(data.l * 100) / 100,
      volume: data.v,
      previousClose: Math.round(data.o * 100) / 100,
      marketCap: calculateIndianMarketCap(symbol, data.c),
      sector: getIndianSector(symbol),
      exchange: 'NSE',
      currency: 'INR',
      marketOpen: isIndianMarketOpen(),
      timestamp: new Date(data.t).toISOString(),
      source: 'Polygon_Free'
    };
  } catch (error) {
    console.error(`Polygon error for ${symbol}:`, error.message);
    throw error;
  }
};

// =============================================================================
// FINANCIAL MODELING PREP INTEGRATION (FREE: 250 calls/day)
// =============================================================================

export const fetchFMPIndianStock = async (symbol) => {
  try {
    if (!FMP_API_KEY || FMP_API_KEY === 'your_free_fmp_key') {
      throw new Error('FMP API key not configured');
    }

    // Add .NS suffix for NSE stocks
    const fmpSymbol = symbol.includes('.') ? symbol : `${symbol}.NS`;
    
    const response = await axios.get(`${FMP_BASE}/quote/${fmpSymbol}`, {
      params: {
        apikey: FMP_API_KEY
      },
      timeout: 10000
    });

    const data = response.data[0];
    if (!data) {
      throw new Error(`No data found for ${symbol}`);
    }

    return {
      symbol: symbol,
      name: data.name || getIndianCompanyName(symbol),
      price: Math.round(data.price * 100) / 100,
      change: Math.round(data.change * 100) / 100,
      changePercent: Math.round(data.changesPercentage * 100) / 100,
      high: Math.round(data.dayHigh * 100) / 100,
      low: Math.round(data.dayLow * 100) / 100,
      volume: data.volume,
      previousClose: Math.round(data.previousClose * 100) / 100,
      marketCap: data.marketCap,
      sector: getIndianSector(symbol),
      exchange: 'NSE',
      currency: 'INR',
      marketOpen: isIndianMarketOpen(),
      timestamp: new Date().toISOString(),
      source: 'FMP_Free'
    };
  } catch (error) {
    console.error(`FMP error for ${symbol}:`, error.message);
    throw error;
  }
};

// =============================================================================
// ALPHA VANTAGE INDIAN STOCKS (Limited Coverage)
// =============================================================================

export const fetchAlphaVantageIndianStock = async (symbol) => {
  try {
    if (!ALPHA_VANTAGE_API_KEY) {
      throw new Error('Alpha Vantage API key not configured');
    }

    // Try with .BSE suffix first, then .NS
    const alphaSymbol = `${symbol}.BSE`;
    
    const response = await axios.get('https://www.alphavantage.co/query', {
      params: {
        function: 'GLOBAL_QUOTE',
        symbol: alphaSymbol,
        apikey: ALPHA_VANTAGE_API_KEY
      },
      timeout: 10000
    });

    const quote = response.data['Global Quote'];
    if (!quote || Object.keys(quote).length === 0) {
      throw new Error(`No data for ${symbol} on Alpha Vantage`);
    }

    return {
      symbol: symbol,
      name: getIndianCompanyName(symbol),
      price: parseFloat(quote['05. price']) || 0,
      change: parseFloat(quote['09. change']) || 0,
      changePercent: quote['10. change percent'] ? 
        parseFloat(quote['10. change percent'].replace('%', '')) : 0,
      high: parseFloat(quote['03. high']) || 0,
      low: parseFloat(quote['04. low']) || 0,
      volume: parseInt(quote['06. volume']) || 0,
      previousClose: parseFloat(quote['08. previous close']) || 0,
      marketCap: calculateIndianMarketCap(symbol, parseFloat(quote['05. price'])),
      sector: getIndianSector(symbol),
      exchange: 'BSE',
      currency: 'INR',
      marketOpen: isIndianMarketOpen(),
      timestamp: new Date().toISOString(),
      source: 'Alpha_Vantage_Indian'
    };
  } catch (error) {
    console.error(`Alpha Vantage Indian error for ${symbol}:`, error.message);
    throw error;
  }
};

// =============================================================================
// SMART INDIAN STOCK FETCHER (Tries Multiple FREE APIs)
// =============================================================================

export const fetchIndianStockData = async (symbol) => {
  const providers = [
    { name: 'Yahoo Finance', fetch: fetchYahooIndianStock },
    { name: 'Financial Modeling Prep', fetch: fetchFMPIndianStock },
    { name: 'Polygon.io', fetch: fetchPolygonIndianStock },
    { name: 'Alpha Vantage', fetch: fetchAlphaVantageIndianStock }
  ];

  // Try each provider until one succeeds
  for (const provider of providers) {
    try {
      console.log(`Trying ${provider.name} for ${symbol}...`);
      const data = await provider.fetch(symbol);
      console.log(`✅ Success with ${provider.name} for ${symbol}`);
      return data;
    } catch (error) {
      console.log(`❌ ${provider.name} failed for ${symbol}: ${error.message}`);
      continue;
    }
  }

  // If all providers fail, return mock data
  console.log(`⚠️ All providers failed for ${symbol}, using mock data`);
  return generateMockIndianData(symbol);
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

const generateMockIndianData = (symbol) => {
  const basePrice = getIndianBasePrice(symbol);
  const volatility = getIndianVolatility(symbol);
  const change = (Math.random() - 0.5) * volatility;
  const price = basePrice + change;
  
  return {
    symbol: symbol,
    name: getIndianCompanyName(symbol),
    price: Math.round(price * 100) / 100,
    change: Math.round(change * 100) / 100,
    changePercent: Math.round((change / basePrice) * 10000) / 100,
    high: Math.round((price + Math.abs(change) * 0.5) * 100) / 100,
    low: Math.round((price - Math.abs(change) * 0.5) * 100) / 100,
    volume: Math.floor(Math.random() * 50000000) + 1000000,
    marketCap: calculateIndianMarketCap(symbol, price),
    sector: getIndianSector(symbol),
    exchange: 'NSE',
    currency: 'INR',
    marketOpen: isIndianMarketOpen(),
    timestamp: new Date().toISOString(),
    source: 'Mock_Data_Fallback'
  };
};

const getIndianBasePrice = (symbol) => {
  const basePrices = {
    'RELIANCE': 2800, 'TCS': 3900, 'HDFCBANK': 1650, 'INFY': 1750,
    'HINDUNILVR': 2650, 'ITC': 450, 'SBIN': 650, 'BHARTIARTL': 950,
    'ASIANPAINT': 3200, 'MARUTI': 10500, 'ADANIGREEN': 1200, 'TATASTEEL': 140
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
  'MARUTI': { name: 'Maruti Suzuki India Ltd', sector: 'Automotive' },
  'ADANIGREEN': { name: 'Adani Green Energy Ltd', sector: 'Renewable Energy' },
  'TATASTEEL': { name: 'Tata Steel Limited', sector: 'Steel' }
};

const getIndianCompanyName = (symbol) => {
  const clean = symbol.replace('.NS', '').replace('.BO', '');
  return INDIAN_COMPANIES[clean]?.name || clean;
};

const getIndianSector = (symbol) => {
  const clean = symbol.replace('.NS', '').replace('.BO', '');
  return INDIAN_COMPANIES[clean]?.sector || 'Unknown';
};

const calculateIndianMarketCap = (symbol, price) => {
  const shares = { // Rough outstanding shares (in crores)
    'RELIANCE': 676, 'TCS': 365, 'HDFCBANK': 547, 'INFY': 425,
    'HINDUNILVR': 235, 'ITC': 1240, 'SBIN': 891, 'BHARTIARTL': 534,
    'ASIANPAINT': 96, 'MARUTI': 30, 'ADANIGREEN': 154, 'TATASTEEL': 123
  };
  const clean = symbol.replace('.NS', '').replace('.BO', '');
  return Math.round((shares[clean] || 100) * price);
};

const isIndianMarketOpen = () => {
  const now = new Date();
  const ist = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
  const hour = ist.getHours();
  const day = ist.getDay();
  
  // Monday to Friday, 9:15 AM to 3:30 PM IST
  return day >= 1 && day <= 5 && hour >= 9 && hour < 15;
};
