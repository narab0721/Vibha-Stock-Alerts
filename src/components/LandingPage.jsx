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
  PlayIcon
} from 'lucide-react';

// Enhanced StockTicker with Dual Markets
const StockTicker = () => {
  const [stocks, setStocks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [showIndian, setShowIndian] = useState(true);
  const [showGlobal, setShowGlobal] = useState(true);
  const tickerRef = useRef(null);
  const intervalRef = useRef(null);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

  // Fetch live dual-market data
  const fetchStockData = async () => {
    try {
      setError(null);
      const params = new URLSearchParams({
        indian: showIndian.toString(),
        global: showGlobal.toString(),
        limit: '15'
      });

      const response = await fetch(`${API_BASE_URL}/stocks/ticker?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Transform and enhance the data
      const enhancedData = data.map(stock => ({
        ...stock,
        isPositive: stock.change >= 0,
        market: stock.currency === 'INR' ? 'indian' : 'global',
        flag: stock.currency === 'INR' ? '🇮🇳' : getCountryFlag(stock.symbol),
        formattedPrice: formatPrice(stock.price, stock.currency),
        formattedChange: formatChange(stock.change, stock.currency)
      }));
      
      setStocks(enhancedData);
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching stock data:', err);
      setError(err.message);
      setIsLoading(false);
      
      // Fallback to demo data
      setStocks(getFallbackData());
    }
  };

  const getFallbackData = () => {
    return [
      { symbol: 'RELIANCE', price: 2847.65, change: 12.45, isPositive: true, currency: 'INR', market: 'indian', flag: '🇮🇳', source: 'Demo' },
      { symbol: 'AAPL', price: 175.84, change: -2.16, isPositive: false, currency: 'USD', market: 'global', flag: '🇺🇸', source: 'Demo' },
      { symbol: 'TCS', price: 3945.20, change: -8.75, isPositive: false, currency: 'INR', market: 'indian', flag: '🇮🇳', source: 'Demo' },
      { symbol: 'GOOGL', price: 142.56, change: 5.23, isPositive: true, currency: 'USD', market: 'global', flag: '🇺🇸', source: 'Demo' },
    ].map(stock => ({
      ...stock,
      formattedPrice: formatPrice(stock.price, stock.currency),
      formattedChange: formatChange(stock.change, stock.currency)
    }));
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
    // Simple mapping for demo purposes
    return '🇺🇸'; // Default to US for global stocks
  };

  // Initial data fetch and setup interval
  useEffect(() => {
    fetchStockData();
    
    // Set up interval to refresh data every 30 seconds
    intervalRef.current = setInterval(fetchStockData, 30000);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [showIndian, showGlobal]);

  // Handle ticker pause/resume on hover
  const handleMouseEnter = () => {
    setIsPaused(true);
    if (tickerRef.current) {
      tickerRef.current.style.animationPlayState = 'paused';
    }
  };

  const handleMouseLeave = () => {
    setIsPaused(false);
    if (tickerRef.current) {
      tickerRef.current.style.animationPlayState = 'running';
    }
  };

  // Manual refresh handler
  const handleRefresh = () => {
    setIsLoading(true);
    fetchStockData();
  };

  // Toggle market visibility
  const toggleIndianMarkets = () => {
    setShowIndian(!showIndian);
  };

  const toggleGlobalMarkets = () => {
    setShowGlobal(!showGlobal);
  };

  if (isLoading && stocks.length === 0) {
    return (
      <div className="bg-white border-b border-gray-200 overflow-hidden relative">
        <div className="flex items-center justify-center py-4 px-4">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500 mr-3"></div>
          <span className="text-sm text-gray-600">Loading dual-market data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border-b border-gray-200 overflow-hidden relative">
      {/* Enhanced Controls Bar */}
      <div className="bg-gray-50 border-b border-gray-100 px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-xs">
              <div className={`w-2 h-2 rounded-full ${error ? 'bg-red-500' : 'bg-green-500'} animate-pulse`}></div>
              <span className="text-gray-600">
                {error ? 'API Error' : 'Live Data'} • {stocks.length} stocks
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={toggleIndianMarkets}
                className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium transition-all ${
                  showIndian ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'
                }`}
              >
                <span>🇮🇳</span>
                <span>Indian</span>
              </button>
              <button
                onClick={toggleGlobalMarkets}
                className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium transition-all ${
                  showGlobal ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                }`}
              >
                <span>🌍</span>
                <span>Global</span>
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="text-gray-500 hover:text-gray-700 transition-colors p-1 rounded"
              title={isPaused ? 'Resume ticker' : 'Pause ticker'}
            >
              {isPaused ? <PlayIcon className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
            </button>
            <button
              onClick={handleRefresh}
              className="text-gray-500 hover:text-gray-700 transition-colors p-1 rounded"
              title="Refresh data"
              disabled={isLoading}
            >
              <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Ticker Display */}
      <div 
        className="flex"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div 
          ref={tickerRef}
          className="flex space-x-6 whitespace-nowrap py-3 px-4 animate-marquee min-w-max"
          style={{
            animationPlayState: isPaused ? 'paused' : 'running'
          }}
        >
          {[...stocks, ...stocks, ...stocks].map((stock, index) => (
            <div key={`${stock.symbol}-${index}`} className="flex items-center space-x-2 text-sm flex-shrink-0 bg-white rounded-lg px-3 py-2 shadow-sm border">
              {/* Market Flag */}
              <span className="text-lg">{stock.flag}</span>
              
              {/* Stock Info */}
              <div className="flex items-center space-x-2">
                <span className="font-bold text-gray-900">{stock.symbol}</span>
                <span className="text-gray-600 font-medium">{stock.formattedPrice}</span>
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

              {/* Source indicator */}
              {(stock.source === 'Demo' || stock.mock) && (
                <span className="text-xs bg-orange-100 text-orange-600 px-1 rounded">DEMO</span>
              )}
              {stock.source?.includes('BSE') && (
                <span className="text-xs bg-green-100 text-green-600 px-1 rounded">BSE</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Market Status Bar */}
      <div className="bg-gradient-to-r from-blue-50 to-orange-50 px-4 py-2 text-xs">
        <div className="flex items-center justify-center space-x-6">
          <div className="flex items-center space-x-2">
            <span>🇮🇳 NSE/BSE</span>
            <span className="font-medium text-gray-700">9:15 AM - 3:30 PM IST</span>
            <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse"></div>
          </div>
          <div className="flex items-center space-x-2">
            <span>🇺🇸 NYSE/NASDAQ</span>
            <span className="font-medium text-gray-700">9:30 AM - 4:00 PM EST</span>
            <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse"></div>
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

      {/* Enhanced Stock Ticker with Dual Markets */}
      <StockTicker />

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
            🇮🇳 Indian + 🌍 Global Markets • Live Data • WhatsApp Alerts
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Trade Both
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-blue-600">
              {' '}Markets
            </span>
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              Never Miss A Move
            </span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 max-w-4xl mx-auto leading-relaxed">
            Get instant WhatsApp alerts for <strong>Indian markets (BSE/NSE)</strong> and <strong>Global stocks</strong>. 
            From Reliance earnings to Apple launches - stay ahead with real-time intelligence across all your investments.
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
              { value: '2+', label: 'Markets Covered', icon: Globe, color: 'orange' },
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

      {/* Markets Coverage Section */}
      <div id="markets" className="py-20 bg-gradient-to-r from-orange-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Complete Market Coverage
            </h2>
            <p className="text-xl text-gray-600">From Mumbai to Manhattan - we've got you covered</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Indian Markets */}
            <div className="bg-white rounded-3xl p-8 shadow-lg border-2 border-orange-200 hover:shadow-xl transition-all duration-300">
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-gradient-to-r from-orange-500 to-red-500 rounded-3xl flex items-center justify-center mx-auto mb-4 text-4xl shadow-lg">
                  🇮🇳
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Indian Markets</h3>
                <p className="text-gray-600">BSE, NSE & Regional Exchanges</p>
              </div>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-center justify-between py-3 px-4 bg-orange-50 rounded-xl">
                  <span className="font-semibold text-gray-900">BSE (Bombay Stock Exchange)</span>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                </div>
                <div className="flex items-center justify-between py-3 px-4 bg-orange-50 rounded-xl">
                  <span className="font-semibold text-gray-900">NSE (National Stock Exchange)</span>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                </div>
                <div className="flex items-center justify-between py-3 px-4 bg-orange-50 rounded-xl">
                  <span className="font-semibold text-gray-900">MCX (Multi Commodity Exchange)</span>
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-center text-sm">
                <div>
                  <div className="font-bold text-2xl text-orange-600">5,000+</div>
                  <div className="text-gray-600">Listed Companies</div>
                </div>
                <div>
                  <div className="font-bold text-2xl text-orange-600">9:15-3:30</div>
                  <div className="text-gray-600">Trading Hours</div>
                </div>
              </div>
            </div>

            {/* Global Markets */}
            <div className="bg-white rounded-3xl p-8 shadow-lg border-2 border-blue-200 hover:shadow-xl transition-all duration-300">
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-3xl flex items-center justify-center mx-auto mb-4 text-4xl shadow-lg">
                  🌍
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Global Markets</h3>
                <p className="text-gray-600">NYSE, NASDAQ & Major Exchanges</p>
              </div>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-center justify-between py-3 px-4 bg-blue-50 rounded-xl">
                  <span className="font-semibold text-gray-900">🇺🇸 NYSE & NASDAQ</span>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                </div>
                <div className="flex items-center justify-between py-3 px-4 bg-blue-50 rounded-xl">
                  <span className="font-semibold text-gray-900">🇬🇧 London Stock Exchange</span>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                </div>
                <div className="flex items-center justify-between py-3 px-4 bg-blue-50 rounded-xl">
                  <span className="font-semibold text-gray-900">🇯🇵 Tokyo Stock Exchange</span>
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-center text-sm">
                <div>
                  <div className="font-bold text-2xl text-blue-600">8,000+</div>
                  <div className="text-gray-600">Global Stocks</div>
                </div>
                <div>
                  <div className="font-bold text-2xl text-blue-600">24/7</div>
                  <div className="text-gray-600">Monitoring</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Features Section */}
      <div id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Dual-Market Intelligence
            </h2>
            <p className="text-xl text-gray-600">Everything you need for Indian and Global investing</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Zap,
                title: 'Lightning Fast Alerts',
                description: 'Get notifications within 30 seconds of official announcements from BSE, NSE, NYSE, and NASDAQ.',
                color: 'yellow'
              },
              {
                icon: Globe,
                title: 'Dual-Market Coverage',
                description: 'Track Indian blue-chips like Reliance, TCS alongside global giants like Apple, Google in one platform.',
                color: 'blue'
              },
              {
                icon: Smartphone,
                title: 'WhatsApp Integration',
                description: 'Receive alerts in Hindi/English with rich formatting, charts, and quick action buttons.',
                color: 'green'
              },
              {
                icon: Shield,
                title: 'Verified Data Sources',
                description: 'Direct feeds from BSE/NSE APIs and Alpha Vantage ensure 100% accuracy across all markets.',
                color: 'red'
              },
              {
                icon: Target,
                title: 'Smart AI Filtering',
                description: 'AI learns your portfolio mix (Indian vs Global) and sends only relevant, high-impact alerts.',
                color: 'purple'
              },
              {
                icon: BarChart3,
                title: 'Cross-Market Analytics',
                description: 'Compare Indian stocks with global peers, currency impacts, and correlation analysis.',
                color: 'orange'
              }
            ].map((feature, index) => (
              <div key={index} className="group bg-white p-8 rounded-2xl shadow-sm border-2 border-gray-100 hover:border-blue-200 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 ${
                  feature.color === 'yellow' ? 'bg-gradient-to-r from-yellow-400 to-orange-500' :
                  feature.color === 'blue' ? 'bg-gradient-to-r from-blue-500 to-purple-600' :
                  feature.color === 'green' ? 'bg-gradient-to-r from-green-500 to-teal-600' :
                  feature.color === 'red' ? 'bg-gradient-to-r from-red-500 to-pink-600' :
                  feature.color === 'purple' ? 'bg-gradient-to-r from-purple-500 to-indigo-600' :
                  'bg-gradient-to-r from-orange-500 to-red-600'
                }`}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Enhanced Pricing Section */}
      <div id="pricing" className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Simple Pricing for Both Markets
            </h2>
            <p className="text-xl text-gray-600">One plan covers Indian + Global markets</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white border-2 border-gray-200 p-8 rounded-3xl hover:border-blue-200 transition-all duration-300 transform hover:scale-105">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Free Trial</h3>
                <div className="text-5xl font-bold text-gray-900 mb-2">₹0</div>
                <div className="text-gray-500">30 days free</div>
              </div>
              
              <ul className="space-y-4 mb-8">
                {[
                  'Up to 10 companies (Indian + Global)', 
                  'Basic alerts (Results, Dividends)', 
                  'WhatsApp notifications', 
                  'Email support'
                ].map((feature, index) => (
                  <li key={index} className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-gray-600">{feature}</span>
                  </li>
                ))}
              </ul>
              
              <button 
                onClick={() => setCurrentPage('login')}
                className="w-full bg-gray-100 text-gray-900 py-4 rounded-xl hover:bg-gray-200 transition-all duration-200 font-semibold"
              >
                Start Free Trial
              </button>
            </div>

            <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-8 rounded-3xl relative shadow-2xl transform hover:scale-105 transition-all duration-300">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-yellow-400 text-yellow-900 px-6 py-2 rounded-full text-sm font-bold shadow-lg">
                  ⭐ Dual Market Pro
                </span>
              </div>
              
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-white mb-2">Pro Plan</h3>
                <div className="text-5xl font-bold text-white mb-2">₹499</div>
                <div className="text-blue-100">per month</div>
              </div>
              
              <ul className="space-y-4 mb-8">
                {[
                  'Unlimited companies (🇮🇳 + 🌍)', 
                  'All alert types (150+ categories)', 
                  'Advanced filtering & AI insights', 
                  'Priority WhatsApp delivery',
                  'Cross-market correlation alerts', 
                  'Currency impact notifications',
                  'Portfolio analytics (INR + USD)', 
                  'Priority support'
                ].map((feature, index) => (
                  <li key={index} className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-white mr-3 flex-shrink-0" />
                    <span className="text-blue-100">{feature}</span>
                  </li>
                ))}
              </ul>
              
              <button 
                onClick={() => setCurrentPage('login')}
                className="w-full bg-white text-blue-600 py-4 rounded-xl hover:bg-blue-50 transition-all duration-200 font-bold shadow-lg"
              >
                Get Started Now
              </button>
            </div>
          </div>
        </div>
      </div>

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
                  <div className="text-sm text-gray-400">🇮🇳 Indian + 🌍 Global Markets</div>
                </div>
              </div>
              <p className="text-gray-400 mb-4 max-w-md">
                India's first dual-market stock alert platform. Get instant notifications for Indian markets (BSE/NSE) and Global stocks (NYSE/NASDAQ) in one unified platform.
              </p>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-4">Markets</h4>
              <ul className="space-y-2 text-gray-400">
                <li className="flex items-center">
                  <span className="mr-2">🇮🇳</span>
                  <span>BSE & NSE</span>
                </li>
                <li className="flex items-center">
                  <span className="mr-2">🇺🇸</span>
                  <span>NYSE & NASDAQ</span>
                </li>
                <li className="flex items-center">
                  <span className="mr-2">🌍</span>
                  <span>Global Exchanges</span>
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
                  24/7 Global Monitoring
                </li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; 2024 Vibha StockAlerts. All rights reserved. • 🇮🇳 Indian Markets + 🌍 Global Coverage</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
