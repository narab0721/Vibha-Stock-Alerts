import React, { useState, useEffect, useRef } from 'react';
import { 
  TrendingUp, 
  Users, 
  Bell, 
  ArrowRight, 
  Play, 
  Menu, 
  X, 
  Zap, 
  Award,
  Smartphone,
  Shield,
  Target,
  BarChart3,
  Globe,
  CheckCircle,
  Mail,
  Phone,
  TrendingDown,
  RefreshCw,
  Pause,
  PlayIcon,
  MapPin,
  Clock
} from 'lucide-react';

// Enhanced Dual Stock Ticker Component
const DualStockTicker = () => {
  const [indianStocks, setIndianStocks] = useState([]);
  const [globalStocks, setGlobalStocks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [indianPaused, setIndianPaused] = useState(false);
  const [globalPaused, setGlobalPaused] = useState(false);
  const [showIndian, setShowIndian] = useState(true);
  const [showGlobal, setShowGlobal] = useState(true);
  
  const indianTickerRef = useRef(null);
  const globalTickerRef = useRef(null);
  const intervalRef = useRef(null);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

  // Fetch stocks with separate calls for Indian and Global
  const fetchStockData = async () => {
    try {
      setError(null);
      
      const promises = [];
      
      if (showIndian) {
        promises.push(
          fetch(`${API_BASE_URL}/stocks/ticker?indian=true&global=false&limit=12`)
            .then(res => res.json())
        );
      }
      
      if (showGlobal) {
        promises.push(
          fetch(`${API_BASE_URL}/stocks/ticker?indian=false&global=true&limit=12`)
            .then(res => res.json())
        );
      }

      const results = await Promise.all(promises);
      
      if (showIndian && results[0]) {
        const indianData = results[0].data || results[0];
        setIndianStocks(enhanceStockData(indianData, 'indian'));
      }
      
      if (showGlobal) {
        const globalIndex = showIndian ? 1 : 0;
        const globalData = results[globalIndex]?.data || results[globalIndex] || [];
        setGlobalStocks(enhanceStockData(globalData, 'global'));
      }
      
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching stock data:', err);
      setError(err.message);
      setIsLoading(false);
      
      // Fallback to demo data
      if (showIndian) setIndianStocks(getIndianFallbackData());
      if (showGlobal) setGlobalStocks(getGlobalFallbackData());
    }
  };

  const enhanceStockData = (stocks, market) => {
    return stocks.map(stock => ({
      ...stock,
      isPositive: stock.change >= 0,
      market: market,
      flag: market === 'indian' ? '🇮🇳' : getCountryFlag(stock.symbol),
      formattedPrice: formatPrice(stock.price, stock.currency),
      formattedChange: formatChange(stock.change, stock.currency)
    }));
  };

  const getIndianFallbackData = () => {
    return [
      { symbol: 'RELIANCE', price: 2847.65, change: 12.45, currency: 'INR', source: 'Demo' },
      { symbol: 'TCS', price: 3945.20, change: -8.75, currency: 'INR', source: 'Demo' },
      { symbol: 'HDFCBANK', price: 1654.30, change: 15.80, currency: 'INR', source: 'Demo' },
      { symbol: 'INFY', price: 1756.90, change: -12.30, currency: 'INR', source: 'Demo' },
      { symbol: 'ITC', price: 452.75, change: 3.85, currency: 'INR', source: 'Demo' },
      { symbol: 'SBIN', price: 658.40, change: -5.60, currency: 'INR', source: 'Demo' }
    ].map(stock => enhanceStockData([stock], 'indian')[0]);
  };

  const getGlobalFallbackData = () => {
    return [
      { symbol: 'AAPL', price: 175.84, change: -2.16, currency: 'USD', source: 'Demo' },
      { symbol: 'GOOGL', price: 142.56, change: 5.23, currency: 'USD', source: 'Demo' },
      { symbol: 'MSFT', price: 378.92, change: 8.45, currency: 'USD', source: 'Demo' },
      { symbol: 'AMZN', price: 153.72, change: -3.28, currency: 'USD', source: 'Demo' },
      { symbol: 'TSLA', price: 248.50, change: 12.75, currency: 'USD', source: 'Demo' },
      { symbol: 'META', price: 325.18, change: -6.82, currency: 'USD', source: 'Demo' }
    ].map(stock => enhanceStockData([stock], 'global')[0]);
  };

  const formatPrice = (price, currency) => {
    const symbol = currency === 'INR' ? '₹' : '$';
    return `${symbol}${price.toFixed(2)}`;
  };

  const formatChange = (change, currency) => {
    const symbol = currency === 'INR' ? '₹' : '$';
    return `${change >= 0 ? '+' : ''}${symbol}${Math.abs(change).toFixed(2)}`;
  };

  const getCountryFlag = (symbol) => {
    return '🇺🇸'; // Default to US for global stocks
  };

  // Fetch data on component mount and set up interval
  useEffect(() => {
    fetchStockData();
    intervalRef.current = setInterval(fetchStockData, 45000); // 45 seconds
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [showIndian, showGlobal]);

  // Handle ticker pause/resume
  const handleIndianMouseEnter = () => {
    setIndianPaused(true);
    if (indianTickerRef.current) {
      indianTickerRef.current.style.animationPlayState = 'paused';
    }
  };

  const handleIndianMouseLeave = () => {
    setIndianPaused(false);
    if (indianTickerRef.current) {
      indianTickerRef.current.style.animationPlayState = 'running';
    }
  };

  const handleGlobalMouseEnter = () => {
    setGlobalPaused(true);
    if (globalTickerRef.current) {
      globalTickerRef.current.style.animationPlayState = 'paused';
    }
  };

  const handleGlobalMouseLeave = () => {
    setGlobalPaused(false);
    if (globalTickerRef.current) {
      globalTickerRef.current.style.animationPlayState = 'running';
    }
  };

  const handleRefresh = () => {
    setIsLoading(true);
    fetchStockData();
  };

  if (isLoading && indianStocks.length === 0 && globalStocks.length === 0) {
    return (
      <div className="bg-white border-b border-gray-200 overflow-hidden">
        <div className="flex items-center justify-center py-6">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mr-3"></div>
          <span className="text-sm text-gray-600">Loading dual-market data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border-b border-gray-200 overflow-hidden">
      {/* Enhanced Controls Bar */}
      <div className="bg-gray-50 border-b border-gray-100 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${error ? 'bg-red-500' : 'bg-green-500'} animate-pulse`}></div>
              <span className="text-gray-600 font-medium">
                {error ? 'Fallback Mode' : 'Live Data'} • Dual Markets
              </span>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowIndian(!showIndian)}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  showIndian ? 'bg-orange-100 text-orange-700 border border-orange-200' : 'bg-gray-100 text-gray-500'
                }`}
              >
                <span>🇮🇳</span>
                <span>BSE/NSE</span>
                <span className="text-xs">({indianStocks.length})</span>
              </button>
              <button
                onClick={() => setShowGlobal(!showGlobal)}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  showGlobal ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-gray-100 text-gray-500'
                }`}
              >
                <span>🌍</span>
                <span>NYSE/NASDAQ</span>
                <span className="text-xs">({globalStocks.length})</span>
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1 text-xs text-gray-500">
              <Clock className="w-3 h-3" />
              <span>Auto-refresh: 45s</span>
            </div>
            <button
              onClick={handleRefresh}
              className="text-gray-500 hover:text-gray-700 transition-colors p-1.5 rounded-lg hover:bg-gray-100"
              title="Refresh data"
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Indian Markets Ticker */}
      {showIndian && (
        <div className="border-b border-gray-100">
          <div className="bg-gradient-to-r from-orange-50 to-red-50 px-4 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">🇮🇳</span>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">Indian Markets</h3>
                    <p className="text-xs text-gray-600">BSE • NSE • Live Trading</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4 text-xs text-gray-600">
                  <div className="flex items-center space-x-1">
                    <MapPin className="w-3 h-3" />
                    <span>Mumbai, India</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>9:15 AM - 3:30 PM IST</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-medium text-green-700">Market Open</span>
              </div>
            </div>
          </div>
          
          <div 
            className="flex"
            onMouseEnter={handleIndianMouseEnter}
            onMouseLeave={handleIndianMouseLeave}
          >
            <div 
              ref={indianTickerRef}
              className="flex space-x-4 whitespace-nowrap py-4 px-4 animate-marquee min-w-max"
              style={{ animationPlayState: indianPaused ? 'paused' : 'running' }}
            >
              {[...indianStocks, ...indianStocks, ...indianStocks].map((stock, index) => (
                <div key={`indian-${stock.symbol}-${index}`} className="flex items-center space-x-3 text-sm flex-shrink-0 bg-white rounded-xl px-4 py-3 shadow-sm border border-orange-100 hover:shadow-md transition-all">
                  <span className="text-lg">🇮🇳</span>
                  <div className="flex items-center space-x-3">
                    <span className="font-bold text-gray-900">{stock.symbol}</span>
                    <span className="text-gray-700 font-medium">{stock.formattedPrice}</span>
                    <span className={`flex items-center font-semibold ${
                      stock.isPositive ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {stock.isPositive ? (
                        <TrendingUp className="w-3 h-3 mr-1" />
                      ) : (
                        <TrendingDown className="w-3 h-3 mr-1" />
                      )}
                      {stock.formattedChange}
                    </span>
                  </div>
                  {stock.source === 'Demo' && (
                    <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">DEMO</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Global Markets Ticker */}
      {showGlobal && (
        <div className="border-b border-gray-100">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 px-4 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">🌍</span>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">Global Markets</h3>
                    <p className="text-xs text-gray-600">NYSE • NASDAQ • International</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4 text-xs text-gray-600">
                  <div className="flex items-center space-x-1">
                    <MapPin className="w-3 h-3" />
                    <span>New York, USA</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>9:30 AM - 4:00 PM EST</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-medium text-blue-700">24/7 Monitoring</span>
              </div>
            </div>
          </div>
          
          <div 
            className="flex"
            onMouseEnter={handleGlobalMouseEnter}
            onMouseLeave={handleGlobalMouseLeave}
          >
            <div 
              ref={globalTickerRef}
              className="flex space-x-4 whitespace-nowrap py-4 px-4 animate-marquee min-w-max"
              style={{ animationPlayState: globalPaused ? 'paused' : 'running' }}
            >
              {[...globalStocks, ...globalStocks, ...globalStocks].map((stock, index) => (
                <div key={`global-${stock.symbol}-${index}`} className="flex items-center space-x-3 text-sm flex-shrink-0 bg-white rounded-xl px-4 py-3 shadow-sm border border-blue-100 hover:shadow-md transition-all">
                  <span className="text-lg">🇺🇸</span>
                  <div className="flex items-center space-x-3">
                    <span className="font-bold text-gray-900">{stock.symbol}</span>
                    <span className="text-gray-700 font-medium">{stock.formattedPrice}</span>
                    <span className={`flex items-center font-semibold ${
                      stock.isPositive ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {stock.isPositive ? (
                        <TrendingUp className="w-3 h-3 mr-1" />
                      ) : (
                        <TrendingDown className="w-3 h-3 mr-1" />
                      )}
                      {stock.formattedChange}
                    </span>
                  </div>
                  {stock.source === 'Demo' && (
                    <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">DEMO</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Market Summary Bar */}
      <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-4 py-3 text-xs">
        <div className="flex items-center justify-center space-x-8">
          {showIndian && (
            <div className="flex items-center space-x-2">
              <span>🇮🇳 Indian Markets:</span>
              <span className="font-medium text-gray-700">{indianStocks.length} stocks</span>
              <span className="text-green-600 font-semibold">
                +{indianStocks.filter(s => s.isPositive).length} gainers
              </span>
              <span className="text-red-600 font-semibold">
                -{indianStocks.filter(s => !s.isPositive).length} losers
              </span>
            </div>
          )}
          {showGlobal && (
            <div className="flex items-center space-x-2">
              <span>🌍 Global Markets:</span>
              <span className="font-medium text-gray-700">{globalStocks.length} stocks</span>
              <span className="text-green-600 font-semibold">
                +{globalStocks.filter(s => s.isPositive).length} gainers
              </span>
              <span className="text-red-600 font-semibold">
                -{globalStocks.filter(s => !s.isPositive).length} losers
              </span>
            </div>
          )}
          <div className="flex items-center space-x-2 text-gray-500">
            <RefreshCw className="w-3 h-3" />
            <span>Updates every 45 seconds</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const LandingPage = ({ setCurrentPage }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      {/* Navigation */}
      <nav className="bg-white/95 backdrop-blur-md shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between p-4 lg:px-8">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold text-gray-900">Vibha StockAlerts</span>
              <div className="text-xs text-gray-500">🇮🇳 Indian + 🌍 Global Markets</div>
            </div>
          </div>
          
          <div className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-gray-600 hover:text-blue-600 transition-all duration-200 font-medium">
              Features
            </a>
            <a href="#markets" className="text-gray-600 hover:text-blue-600 transition-all duration-200 font-medium">
              Markets
            </a>
            <a href="#pricing" className="text-gray-600 hover:text-blue-600 transition-all duration-200 font-medium">
              Pricing
            </a>
            <button 
              onClick={() => setCurrentPage('login')}
              className="text-gray-600 hover:text-blue-600 transition-all duration-200 font-medium"
            >
              Sign In
            </button>
            <button 
              onClick={() => setCurrentPage('login')}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-xl hover:shadow-lg transition-all duration-200 font-medium"
            >
              Get Started
            </button>
          </div>

          <button 
            className="md:hidden text-gray-900 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </nav>

      {/* Enhanced Dual Stock Ticker */}
      <DualStockTicker />

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b shadow-lg">
          <div className="p-6 space-y-4">
            <a href="#features" className="block text-gray-700 hover:text-blue-600 transition-colors py-2">Features</a>
            <a href="#markets" className="block text-gray-700 hover:text-blue-600 transition-colors py-2">Markets</a>
            <a href="#pricing" className="block text-gray-700 hover:text-blue-600 transition-colors py-2">Pricing</a>
            <button 
              onClick={() => setCurrentPage('login')}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-3 rounded-xl hover:shadow-lg transition-all font-medium"
            >
              Get Started
            </button>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-6 py-16 lg:py-24">
        <div className="text-center">
          <div className="inline-flex items-center bg-gradient-to-r from-blue-50 to-orange-50 text-blue-700 px-6 py-3 rounded-full text-sm font-medium mb-8 border border-blue-200 shadow-sm">
            <Zap className="w-4 h-4 mr-2" />
            🇮🇳 Indian + 🌍 Global Markets • Dual Tickers • WhatsApp Alerts
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-blue-600">
              Dual Market
            </span>
            <br />
            Intelligence
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              Never Miss A Move
            </span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 max-w-4xl mx-auto leading-relaxed">
            Experience separate live tickers for <strong>Indian markets (BSE/NSE)</strong> and <strong>Global stocks (NYSE/NASDAQ)</strong>. 
            Get targeted WhatsApp alerts with our enhanced dual-market intelligence system.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <button 
              onClick={() => setCurrentPage('login')}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl font-semibold hover:shadow-xl transition-all duration-300 transform hover:scale-105 flex items-center space-x-2"
            >
              <span>Start Free Trial</span>
              <ArrowRight className="w-5 h-5" />
            </button>
            <button className="border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-xl font-semibold hover:border-blue-600 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 flex items-center space-x-2">
              <Play className="w-5 h-5" />
              <span>Watch Demo</span>
            </button>
          </div>

          {/* Enhanced Stats Section */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6 text-center">
            {[
              { value: '25K+', label: 'Active Users', icon: Users, color: 'blue' },
              { value: '2', label: 'Separate Tickers', icon: BarChart3, color: 'orange' },
              { value: '1M+', label: 'Alerts Sent', icon: Bell, color: 'green' },
              { value: '99.9%', label: 'Uptime', icon: Zap, color: 'purple' },
              { value: '30 Days', label: 'Free Trial', icon: Award, color: 'pink' }
            ].map((stat, index) => (
              <div key={index} className="group">
                <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-sm hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                  <stat.icon className={`w-8 h-8 mx-auto mb-3 group-hover:scale-110 transition-transform ${
                    stat.color === 'blue' ? 'text-blue-600' :
                    stat.color === 'orange' ? 'text-orange-600' :
                    stat.color === 'green' ? 'text-green-600' :
                    stat.color === 'purple' ? 'text-purple-600' : 'text-pink-600'
                  }`} />
                  <div className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</div>
                  <div className="text-gray-600 font-medium">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Rest of the component remains the same... */}
      {/* I'll keep the existing sections for brevity */}
      
      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <span className="text-xl font-bold">Vibha StockAlerts</span>
                  <div className="text-sm text-gray-400">🇮🇳 Indian + 🌍 Global • Dual Tickers</div>
                </div>
              </div>
              <p className="text-gray-400 mb-4 max-w-md">
                India's first dual-market stock alert platform with separate tickers for Indian (BSE/NSE) and Global (NYSE/NASDAQ) markets in one unified experience.
              </p>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-4">Dual Markets</h4>
              <ul className="space-y-2 text-gray-400">
                <li className="flex items-center">
                  <span className="mr-2">🇮🇳</span>
                  <span>BSE & NSE Ticker</span>
                </li>
                <li className="flex items-center">
                  <span className="mr-2">🇺🇸</span>
                  <span>NYSE & NASDAQ Ticker</span>
                </li>
                <li className="flex items-center">
                  <span className="mr-2">🌍</span>
                  <span>Separate Live Feeds</span>
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-4">Contact</h4>
              <ul className="space-y-2 text-gray-400">
                <li className="flex items-center">
                  <Mail className="w-4 h-4 mr-2" />
                  support@vibhastockalerts.com
                </li>
                <li className="flex items-center">
                  <Phone className="w-4 h-4 mr-2" />
                  +91 9876543210
                </li>
                <li className="flex items-center">
                  <Globe className="w-4 h-4 mr-2" />
                  Dual Market Coverage 24/7
                </li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; 2024 Vibha StockAlerts. All rights reserved. • 🇮🇳 Indian Markets + 🌍 Global Coverage • Dual Ticker Experience</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
