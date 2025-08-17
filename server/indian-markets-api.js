// server/indian-markets-api.js - Enhanced with Multiple FREE APIs and Better Error Handling

import axios from 'axios';

// =============================================================================
// MULTIPLE FREE API CONFIGURATIONS
// =============================================================================

// 1. Financial Modeling Prep (FREE: 250 calls/day)
const FMP_API_KEY = process.env.FMP_API_KEY || 'demo'; // Demo key for testing
const FMP_BASE = 'https://financialmodelingprep.com/api/v3';

// 2. Alpha Vantage (FREE: 500 calls/day)
const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY || 'demo';

// 3. Polygon.io (FREE: 5 calls/minute)
const POLYGON_API_KEY = process.env.POLYGON_API_KEY || 'demo';

// 4. Twelve Data (FREE: 800 calls/day)
const TWELVE_DATA_API_KEY = process.env.TWELVE_DATA_API_KEY || 'demo';

// 5. IEX Cloud (FREE: 50,000 calls/month)
const IEX_API_KEY = process.env.IEX_API_KEY || 'demo';

// =============================================================================
// ENHANCED YAHOO FINANCE WITH CORS PROXY
// =============================================================================

const YAHOO_PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://cors-anywhere.herokuapp.com/',
  'https://api.codetabs.com/v1/proxy?quest='
];

export const fetchYahooIndianStock = async (symbol) => {
  const yahooSymbol = symbol.includes('.') ? symbol : `${symbol}.NS`;
  
  for (const proxy of YAHOO_PROXIES) {
    try {
      const url = `${proxy}https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`;
      const response = await axios.get(url, {
        timeout: 8000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        }
      });

      const data = response.data.chart?.result?.[0];
      if (!data) throw new Error('No data in response');

      const meta = data.meta;
      const quote = data.indicators.quote[0];
      
      const prices = quote.close.filter(p => p !== null);
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
        high: Math.round((quote.high.filter(h => h !== null).pop() || currentPrice) * 100) / 100,
        low: Math.round((quote.low.filter(l => l !== null).pop() || currentPrice) * 100) / 100,
        volume: quote.volume.filter(v => v !== null).pop() || 0,
        previousClose: Math.round(previousClose * 100) / 100,
        marketCap: calculateIndianMarketCap(symbol, currentPrice),
        sector: getIndianSector(symbol),
        exchange: yahooSymbol.includes('.NS') ? 'NSE' : 'BSE',
        currency: 'INR',
        marketOpen: isIndianMarketOpen(),
        timestamp: new Date().toISOString(),
        source: 'Yahoo_Finance_Proxy'
      };
    } catch (error) {
      console.log(`Yahoo proxy ${proxy} failed: ${error.message}`);
      continue;
    }
  }
  throw new Error('All Yahoo Finance proxies failed');
};

// =============================================================================
// FINANCIAL MODELING PREP (Most Reliable for Indian Stocks)
// =============================================================================

export const fetchFMPIndianStock = async (symbol) => {
  try {
    const fmpSymbol = symbol.includes('.') ? symbol : `${symbol}.NS`;
    
    const response = await axios.get(`${FMP_BASE}/quote/${fmpSymbol}`, {
      params: { apikey: FMP_API_KEY },
      timeout: 10000
    });

    const data = response.data[0];
    if (!data) throw new Error(`No FMP data for ${symbol}`);

    return {
      symbol: symbol,
      name: data.name || getIndianCompanyName(symbol),
      price: Math.round(data.price * 100) / 100,
      change: Math.round(data.change * 100) / 100,
      changePercent: Math.round(data.changesPercentage * 100) / 100,
      high: Math.round(data.dayHigh * 100) / 100,
      low: Math.round(data.dayLow * 100) / 100,
      volume: data.volume || 0,
      previousClose: Math.round(data.previousClose * 100) / 100,
      marketCap: data.marketCap || calculateIndianMarketCap(symbol, data.price),
      sector: getIndianSector(symbol),
      exchange: 'NSE',
      currency: 'INR',
      marketOpen: isIndianMarketOpen(),
      timestamp: new Date().toISOString(),
      source: 'Financial_Modeling_Prep'
    };
  } catch (error) {
    console.error(`FMP error for ${symbol}:`, error.message);
    throw error;
  }
};

// =============================================================================
// ALPHA VANTAGE GLOBAL QUOTE
// =============================================================================

export const fetchAlphaVantageStock = async (symbol) => {
  try {
    const response = await axios.get('https://www.alphavantage.co/query', {
      params: {
        function: 'GLOBAL_QUOTE',
        symbol: symbol.includes('.') ? symbol : `${symbol}.NS`,
        apikey: ALPHA_VANTAGE_API_KEY
      },
      timeout: 10000
    });

    const quote = response.data['Global Quote'];
    if (!quote || Object.keys(quote).length === 0) {
      throw new Error(`No Alpha Vantage data for ${symbol}`);
    }

    const price = parseFloat(quote['05. price']) || 0;
    const change = parseFloat(quote['09. change']) || 0;
    const changePercent = quote['10. change percent'] ? 
      parseFloat(quote['10. change percent'].replace('%', '')) : 0;

    return {
      symbol: symbol,
      name: getIndianCompanyName(symbol),
      price: Math.round(price * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
      high: Math.round((parseFloat(quote['03. high']) || price) * 100) / 100,
      low: Math.round((parseFloat(quote['04. low']) || price) * 100) / 100,
      volume: parseInt(quote['06. volume']) || 0,
      previousClose: Math.round((parseFloat(quote['08. previous close']) || price) * 100) / 100,
      marketCap: calculateIndianMarketCap(symbol, price),
      sector: getIndianSector(symbol),
      exchange: 'NSE',
      currency: 'INR',
      marketOpen: isIndianMarketOpen(),
      timestamp: new Date().toISOString(),
      source: 'Alpha_Vantage'
    };
  } catch (error) {
    console.error(`Alpha Vantage error for ${symbol}:`, error.message);
    throw error;
  }
};

// =============================================================================
// TWELVE DATA API (Great for Indian Markets)
// =============================================================================

export const fetchTwelveDataStock = async (symbol) => {
  try {
    const response = await axios.get('https://api.twelvedata.com/quote', {
      params: {
        symbol: symbol.includes('.') ? symbol : `${symbol}.NS`,
        apikey: TWELVE_DATA_API_KEY
      },
      timeout: 10000
    });

    const data = response.data;
    if (data.status === 'error') throw new Error(data.message);

    const price = parseFloat(data.close) || 0;
    const previousClose = parseFloat(data.previous_close) || price;
    const change = price - previousClose;
    const changePercent = (change / previousClose) * 100;

    return {
      symbol: symbol,
      name: data.name || getIndianCompanyName(symbol),
      price: Math.round(price * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
      high: Math.round((parseFloat(data.high) || price) * 100) / 100,
      low: Math.round((parseFloat(data.low) || price) * 100) / 100,
      volume: parseInt(data.volume) || 0,
      previousClose: Math.round(previousClose * 100) / 100,
      marketCap: calculateIndianMarketCap(symbol, price),
      sector: getIndianSector(symbol),
      exchange: data.exchange || 'NSE',
      currency: 'INR',
      marketOpen: isIndianMarketOpen(),
      timestamp: new Date().toISOString(),
      source: 'Twelve_Data'
    };
  } catch (error) {
    console.error(`Twelve Data error for ${symbol}:`, error.message);
    throw error;
  }
};

// =============================================================================
// SMART MULTI-PROVIDER FETCHER WITH PRIORITY FALLBACK
// =============================================================================

export const fetchIndianStockData = async (symbol) => {
  const providers = [
    { 
      name: 'Financial Modeling Prep', 
      fetch: fetchFMPIndianStock,
      priority: 1,
      enabled: FMP_API_KEY && FMP_API_KEY !== 'demo'
    },
    { 
      name: 'Twelve Data', 
      fetch: fetchTwelveDataStock,
      priority: 2,
      enabled: TWELVE_DATA_API_KEY && TWELVE_DATA_API_KEY !== 'demo'
    },
    { 
      name: 'Alpha Vantage', 
      fetch: fetchAlphaVantageStock,
      priority: 3,
      enabled: ALPHA_VANTAGE_API_KEY && ALPHA_VANTAGE_API_KEY !== 'demo'
    },
    { 
      name: 'Yahoo Finance (Proxy)', 
      fetch: fetchYahooIndianStock,
      priority: 4,
      enabled: true // Always enabled as fallback
    }
  ];

  // Sort by priority and filter enabled providers
  const enabledProviders = providers
    .filter(p => p.enabled)
    .sort((a, b) => a.priority - b.priority);

  console.log(`Fetching ${symbol} using ${enabledProviders.length} providers...`);

  // Try each provider in order
  for (const provider of enabledProviders) {
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

  // If all providers fail, return realistic mock data
  console.log(`⚠️ All providers failed for ${symbol}, using enhanced mock data`);
  return generateEnhancedMockData(symbol);
};

// =============================================================================
// ENHANCED MOCK DATA GENERATOR
// =============================================================================

const generateEnhancedMockData = (symbol) => {
  const basePrice = getIndianBasePrice(symbol);
  const volatility = getIndianVolatility(symbol);
  
  // Generate realistic intraday movement
  const timeBasedVariation = Math.sin(Date.now() / 10000) * 0.5;
  const randomVariation = (Math.random() - 0.5) * 2;
  const totalVariation = (timeBasedVariation + randomVariation) * volatility;
  
  const price = Math.max(basePrice + totalVariation, basePrice * 0.8); // Ensure price doesn't go too low
  const change = totalVariation;
  const changePercent = (change / basePrice) * 100;
  
  return {
    symbol: symbol,
    name: getIndianCompanyName(symbol),
    price: Math.round(price * 100) / 100,
    change: Math.round(change * 100) / 100,
    changePercent: Math.round(changePercent * 100) / 100,
    high: Math.round((price + Math.abs(change) * 0.3) * 100) / 100,
    low: Math.round((price - Math.abs(change) * 0.3) * 100) / 100,
    volume: Math.floor(Math.random() * 20000000) + 5000000, // 5M-25M volume
    previousClose: Math.round(basePrice * 100) / 100,
    marketCap: calculateIndianMarketCap(symbol, price),
    sector: getIndianSector(symbol),
    exchange: 'NSE',
    currency: 'INR',
    marketOpen: isIndianMarketOpen(),
    timestamp: new Date().toISOString(),
    source: 'Enhanced_Mock_Data',
    mock: true
  };
};

// =============================================================================
// HELPER FUNCTIONS & DATA
// =============================================================================

const INDIAN_COMPANIES = {
  'RELIANCE': { name: 'Reliance Industries Ltd', sector: 'Oil & Gas', basePrice: 2800, volatility: 80 },
  'TCS': { name: 'Tata Consultancy Services', sector: 'IT Services', basePrice: 3900, volatility: 120 },
  'HDFCBANK': { name: 'HDFC Bank Limited', sector: 'Banking', basePrice: 1650, volatility: 60 },
  'INFY': { name: 'Infosys Limited', sector: 'IT Services', basePrice: 1750, volatility: 90 },
  'HINDUNILVR': { name: 'Hindustan Unilever Ltd', sector: 'FMCG', basePrice: 2650, volatility: 100 },
  'ITC': { name: 'ITC Limited', sector: 'FMCG', basePrice: 450, volatility: 25 },
  'SBIN': { name: 'State Bank of India', sector: 'Banking', basePrice: 650, volatility: 40 },
  'BHARTIARTL': { name: 'Bharti Airtel Limited', sector: 'Telecom', basePrice: 950, volatility: 50 },
  'ASIANPAINT': { name: 'Asian Paints Limited', sector: 'Paints', basePrice: 3200, volatility: 150 },
  'MARUTI': { name: 'Maruti Suzuki India Ltd', sector: 'Automotive', basePrice: 10500, volatility: 400 },
  'ADANIGREEN': { name: 'Adani Green Energy Ltd', sector: 'Renewable Energy', basePrice: 1200, volatility: 200 },
  'TATASTEEL': { name: 'Tata Steel Limited', sector: 'Steel', basePrice: 140, volatility: 30 },
  'WIPRO': { name: 'Wipro Limited', sector: 'IT Services', basePrice: 450, volatility: 35 },
  'LT': { name: 'Larsen & Toubro Limited', sector: 'Engineering', basePrice: 3400, volatility: 120 },
  'HCLTECH': { name: 'HCL Technologies Limited', sector: 'IT Services', basePrice: 1200, volatility: 80 }
};

const getIndianCompanyName = (symbol) => {
  const clean = symbol.replace('.NS', '').replace('.BO', '');
  return INDIAN_COMPANIES[clean]?.name || clean;
};

const getIndianSector = (symbol) => {
  const clean = symbol.replace('.NS', '').replace('.BO', '');
  return INDIAN_COMPANIES[clean]?.sector || 'Unknown';
};

const getIndianBasePrice = (symbol) => {
  const clean = symbol.replace('.NS', '').replace('.BO', '');
  return INDIAN_COMPANIES[clean]?.basePrice || 1000;
};

const getIndianVolatility = (symbol) => {
  const clean = symbol.replace('.NS', '').replace('.BO', '');
  return INDIAN_COMPANIES[clean]?.volatility || 50;
};

const calculateIndianMarketCap = (symbol, price) => {
  const shares = { // Outstanding shares in crores
    'RELIANCE': 676, 'TCS': 365, 'HDFCBANK': 547, 'INFY': 425,
    'HINDUNILVR': 235, 'ITC': 1240, 'SBIN': 891, 'BHARTIARTL': 534,
    'ASIANPAINT': 96, 'MARUTI': 30, 'ADANIGREEN': 154, 'TATASTEEL': 123,
    'WIPRO': 527, 'LT': 140, 'HCLTECH': 271
  };
  const clean = symbol.replace('.NS', '').replace('.BO', '');
  return Math.round((shares[clean] || 100) * price);
};

const isIndianMarketOpen = () => {
  const now = new Date();
  const ist = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
  const hour = ist.getHours();
  const minute = ist.getMinutes();
  const day = ist.getDay();
  
  // Monday to Friday, 9:15 AM to 3:30 PM IST
  const isWeekday = day >= 1 && day <= 5;
  const isMarketHours = (hour > 9 || (hour === 9 && minute >= 15)) && hour < 15 || (hour === 15 && minute <= 30);
  
  return isWeekday && isMarketHours;
};

// =============================================================================
// API HEALTH CHECK FUNCTION
// =============================================================================

export const checkAPIHealth = async () => {
  const apis = [
    { name: 'Financial Modeling Prep', key: FMP_API_KEY, url: `${FMP_BASE}/quote/AAPL?apikey=${FMP_API_KEY}` },
    { name: 'Alpha Vantage', key: ALPHA_VANTAGE_API_KEY, url: `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=AAPL&apikey=${ALPHA_VANTAGE_API_KEY}` },
    { name: 'Twelve Data', key: TWELVE_DATA_API_KEY, url: `https://api.twelvedata.com/quote?symbol=AAPL&apikey=${TWELVE_DATA_API_KEY}` }
  ];

  const results = {};
  
  for (const api of apis) {
    try {
      if (!api.key || api.key === 'demo') {
        results[api.name] = 'API Key Not Configured';
        continue;
      }
      
      const response = await axios.get(api.url, { timeout: 5000 });
      results[api.name] = response.status === 200 ? 'Working' : 'Error';
    } catch (error) {
      results[api.name] = `Error: ${error.message}`;
    }
  }
  
  return results;
};
