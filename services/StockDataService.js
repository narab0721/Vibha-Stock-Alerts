// src/services/StockDataService.js
class StockDataService {
  constructor() {
    this.isInitialized = false;
    this.cache = new Map();
    this.subscribers = new Set();
    this.config = {
      cacheTimeout: 30000, // 30 seconds
      maxCacheSize: 1000,
      refreshInterval: 30000,
      maxRetries: 3
    };
    this.sources = {};
  }

  async initialize(config) {
    try {
      this.sources = config.sources || ['nse', 'bse', 'yahoo', 'alphavantage'];
      this.refreshInterval = config.refreshInterval || 30000;
      
      // Initialize API endpoints
      await this.initializeAPIs();
      
      // Start data refresh cycle
      this.startDataRefresh();
      
      this.isInitialized = true;
      console.log('✅ StockDataService initialized successfully');
      
      return true;
    } catch (error) {
      console.error('❌ StockDataService initialization failed:', error);
      throw error;
    }
  }

  async initializeAPIs() {
    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    
    this.apis = {
      nse: {
        baseUrl: `${API_BASE}/nse`,
        endpoints: {
          quote: '/quote',
          announcements: '/announcements',
          results: '/results',
          corporateActions: '/corporate-actions',
          gainersLosers: '/gainers-losers',
          indices: '/indices'
        },
        headers: {
          'Content-Type': 'application/json'
        }
      },
      bse: {
        baseUrl: `${API_BASE}/bse`,
        endpoints: {
          quote: '/quote',
          announcements: '/announcements',
          results: '/results',
          corporateActions: '/corporate-actions'
        },
        headers: {
          'Content-Type': 'application/json'
        }
      },
      yahoo: {
        baseUrl: `${API_BASE}/yahoo`,
        endpoints: {
          quote: '/quote',
          historical: '/historical',
          news: '/news',
          financials: '/financials'
        },
        headers: {
          'Content-Type': 'application/json'
        }
      },
      alphavantage: {
        baseUrl: `${API_BASE}/alphavantage`,
        endpoints: {
          quote: '/quote',
          news: '/news',
          earnings: '/earnings',
          overview: '/overview'
        },
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_ALPHAVANTAGE_API_KEY}`
        }
      }
    };

    // Test API connectivity
    const healthChecks = await Promise.allSettled([
      this.testAPI('nse'),
      this.testAPI('bse'),
      this.testAPI('yahoo'),
      this.testAPI('alphavantage')
    ]);

    healthChecks.forEach((result, index) => {
      const source = this.sources[index];
      if (result.status === 'fulfilled' && result.value) {
        console.log(`✅ ${source.toUpperCase()} API connected`);
      } else {
        console.warn(`⚠️ ${source.toUpperCase()} API unavailable`);
      }
    });
  }

  async testAPI(source) {
    try {
      const response = await fetch(`${this.apis[source].baseUrl}/health`, {
        headers: this.apis[source].headers,
        timeout: 5000
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  startDataRefresh() {
    // Refresh market data periodically
    setInterval(() => {
      this.refreshMarketData();
    }, this.refreshInterval);

    // Clean cache periodically
    setInterval(() => {
      this.cleanCache();
    }, 300000); // 5 minutes
  }

  async refreshMarketData() {
    try {
      // Get all watchlisted symbols
      const watchlistedSymbols = this.getWatchlistedSymbols();
      
      if (watchlistedSymbols.length > 0) {
        await this.fetchMultipleQuotes(watchlistedSymbols);
      }
      
      // Refresh indices
      await this.fetchMarketIndices();
      
    } catch (error) {
      console.error('Market data refresh failed:', error);
    }
  }

  async getStockQuote(symbol, source = 'nse') {
    const cacheKey = `quote_${symbol}_${source}`;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.config.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      const api = this.apis[source];
      const response = await fetch(`${api.baseUrl}${api.endpoints.quote}/${symbol}`, {
        headers: api.headers
      });

      if (response.ok) {
        const data = await response.json();
        const enrichedData = this.enrichStockData(data, source);
        
        // Cache the result
        this.setCacheItem(cacheKey, enrichedData);
        
        return enrichedData;
      }
      
      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      console.error(`Failed to fetch quote for ${symbol} from ${source}:`, error);
      
      // Try alternative source
      if (source === 'nse' && this.sources.includes('bse')) {
        return await this.getStockQuote(symbol, 'bse');
      }
      
      return null;
    }
  }

  async fetchMultipleQuotes(symbols) {
    const promises = symbols.map(symbol => 
      this.getStockQuote(symbol).catch(error => {
        console.warn(`Failed to fetch ${symbol}:`, error);
        return null;
      })
    );

    const results = await Promise.all(promises);
    const validResults = results.filter(result => result !== null);
    
    // Notify subscribers of updates
    validResults.forEach(data => {
      this.notifySubscribers('quote_update', data);
    });

    return validResults;
  }

  async getMarketIndices() {
    const cacheKey = 'market_indices';
    
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.config.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      const response = await fetch(`${this.apis.nse.baseUrl}${this.apis.nse.endpoints.indices}`, {
        headers: this.apis.nse.headers
      });

      if (response.ok) {
        const data = await response.json();
        this.setCacheItem(cacheKey, data);
        return data;
      }
      
      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      console.error('Failed to fetch market indices:', error);
      return this.getFallbackIndices();
    }
  }

  async fetchMarketIndices() {
    try {
      const indices = await this.getMarketIndices();
      this.notifySubscribers('indices_update', indices);
      return indices;
    } catch (error) {
      console.error('Market indices refresh failed:', error);
      return null;
    }
  }

  async getStockNews(symbol, limit = 10) {
    try {
      // Fetch from multiple news sources
      const newsPromises = [
        this.fetchFromYahoo(`news/${symbol}?limit=${limit}`),
        this.fetchFromAlphaVantage(`news?symbol=${symbol}&limit=${limit}`)
      ];

      const results = await Promise.allSettled(newsPromises);
      const allNews = results
        .filter(result => result.status === 'fulfilled')
        .flatMap(result => result.value || []);

      // Deduplicate and sort by date
      const uniqueNews = this.deduplicateNews(allNews);
      return uniqueNews.slice(0, limit);
    } catch (error) {
      console.error(`Failed to fetch news for ${symbol}:`, error);
      return [];
    }
  }

  async getFinancialResults(symbol) {
    try {
      const [nseResults, bseResults] = await Promise.allSettled([
        this.fetchFromNSE(`results/${symbol}`),
        this.fetchFromBSE(`results/${symbol}`)
      ]);

      const results = [];
      if (nseResults.status === 'fulfilled') results.push(...(nseResults.value || []));
      if (bseResults.status === 'fulfilled') results.push(...(bseResults.value || []));

      return results.sort((a, b) => new Date(b.date) - new Date(a.date));
    } catch (error) {
      console.error(`Failed to fetch financial results for ${symbol}:`, error);
      return [];
    }
  }

  async getCorporateActions(symbol) {
    try {
      const [nseActions, bseActions] = await Promise.allSettled([
        this.fetchFromNSE(`corporate-actions/${symbol}`),
        this.fetchFromBSE(`corporate-actions/${symbol}`)
      ]);

      const actions = [];
      if (nseActions.status === 'fulfilled') actions.push(...(nseActions.value || []));
      if (bseActions.status === 'fulfilled') actions.push(...(bseActions.value || []));

      return actions.sort((a, b) => new Date(b.exDate) - new Date(a.exDate));
    } catch (error) {
      console.error(`Failed to fetch corporate actions for ${symbol}:`, error);
      return [];
    }
  }

  // Helper methods for API calls
  async fetchFromNSE(endpoint) {
    const response = await fetch(`${this.apis.nse.baseUrl}/${endpoint}`, {
      headers: this.apis.nse.headers
    });
    return response.ok ? await response.json() : null;
  }

  async fetchFromBSE(endpoint) {
    const response = await fetch(`${this.apis.bse.baseUrl}/${endpoint}`, {
      headers: this.apis.bse.headers
    });
    return response.ok ? await response.json() : null;
  }

  async fetchFromYahoo(endpoint) {
    const response = await fetch(`${this.apis.yahoo.baseUrl}/${endpoint}`, {
      headers: this.apis.yahoo.headers
    });
    return response.ok ? await response.json() : null;
  }

  async fetchFromAlphaVantage(endpoint) {
    const response = await fetch(`${this.apis.alphavantage.baseUrl}/${endpoint}`, {
      headers: this.apis.alphavantage.headers
    });
    return response.ok ? await response.json() : null;
  }

  // Data enrichment methods
  enrichStockData(data, source) {
    const now = new Date();
    
    return {
      ...data,
      source: source.toUpperCase(),
      timestamp: now.toISOString(),
      isMarketOpen: this.isMarketOpen(),
      formattedPrice: this.formatPrice(data.price),
      formattedChange: this.formatChange(data.change),
      priceChangePercent: this.calculatePercentChange(data.price, data.previousClose),
      marketCap: this.formatMarketCap(data.marketCap),
      volume: this.formatVolume(data.volume)
    };
  }

  formatPrice(price) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(price);
  }

  formatChange(change) {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}`;
  }

  formatMarketCap(marketCap) {
    if (marketCap >= 100000) {
      return `₹${(marketCap / 100000).toFixed(2)}L Cr`;
    } else if (marketCap >= 1000) {
      return `₹${(marketCap / 1000).toFixed(2)}K Cr`;
    }
    return `₹${marketCap} Cr`;
  }

  formatVolume(volume) {
    if (volume >= 10000000) {
      return `${(volume / 10000000).toFixed(1)}Cr`;
    } else if (volume >= 100000) {
      return `${(volume / 100000).toFixed(1)}L`;
    } else if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}K`;
    }
    return volume.toString();
  }

  calculatePercentChange(current, previous) {
    if (!previous || previous === 0) return 0;
    return ((current - previous) / previous * 100).toFixed(2);
  }

  isMarketOpen() {
    const now = new Date();
    const istTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
    const hours = istTime.getHours();
    const minutes = istTime.getMinutes();
    const dayOfWeek = istTime.getDay();

    // Market is closed on weekends
    if (dayOfWeek === 0 || dayOfWeek === 6) return false;

    // Market hours: 9:15 AM to 3:30 PM IST
    const marketStart = 9 * 60 + 15; // 9:15 AM in minutes
    const marketEnd = 15 * 60 + 30; // 3:30 PM in minutes
    const currentTime = hours * 60 + minutes;

    return currentTime >= marketStart && currentTime <= marketEnd;
  }

  // Cache management
  setCacheItem(key, data) {
    // Clean cache if it's too large
    if (this.cache.size >= this.config.maxCacheSize) {
      this.cleanCache();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  cleanCache() {
    const now = Date.now();
    const expiredKeys = [];

    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > this.config.cacheTimeout) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.cache.delete(key));
    
    if (expiredKeys.length > 0) {
      console.log(`🧹 Cleaned ${expiredKeys.length} expired cache items`);
    }
  }

  // Subscriber management
  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  notifySubscribers(event, data) {
    this.subscribers.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('Subscriber notification failed:', error);
      }
    });
  }

  // User data methods
  async getUserWatchlist(userId) {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/users/${userId}/watchlist`);
      return response.ok ? await response.json() : [];
    } catch (error) {
      console.error('Failed to fetch user watchlist:', error);
      return [];
    }
  }

  getWatchlistedSymbols() {
    // This would typically come from user's watchlist stored in state/context
    // For now, return some default symbols
    return ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK'];
  }

  // Utility methods
  deduplicateNews(newsArray) {
    const seen = new Set();
    return newsArray.filter(news => {
      const key = `${news.title}_${news.publishedAt}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  getFallbackIndices() {
    return [
      { name: 'NIFTY 50', value: 19500, change: 125.5, changePercent: 0.65 },
      { name: 'SENSEX', value: 65500, change: 285.2, changePercent: 0.44 },
      { name: 'NIFTY BANK', value: 45500, change: -125.8, changePercent: -0.28 }
    ];
  }

  // Health check
  async healthCheck() {
    try {
      const healthChecks = await Promise.allSettled([
        this.testAPI('nse'),
        this.testAPI('bse'),
        this.testAPI('yahoo')
      ]);

      return {
        nse: healthChecks[0].status === 'fulfilled' && healthChecks[0].value,
        bse: healthChecks[1].status === 'fulfilled' && healthChecks[1].value,
        yahoo: healthChecks[2].status === 'fulfilled' && healthChecks[2].value
      };
    } catch (error) {
      return { nse: false, bse: false, yahoo: false };
    }
  }

  // Analytics and reporting
  getCacheStats() {
    return {
      size: this.cache.size,
      maxSize: this.config.maxCacheSize,
      hitRate: this.cacheHitRate || 0
    };
  }

  getAPIStats() {
    return {
      sources: this.sources,
      lastRefresh: this.lastRefresh || null,
      refreshInterval: this.refreshInterval
    };
  }

  // Cleanup method
  destroy() {
    this.cache.clear();
    this.subscribers.clear();
    this.isInitialized = false;
  }
}

export default new StockDataService();
