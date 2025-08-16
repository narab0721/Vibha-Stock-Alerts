import React, { useState } from 'react';
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
  TrendingDown
} from 'lucide-react';

const StockTicker = () => {
  const tickerStocks = [
    { symbol: 'RELIANCE', price: '₹2,847.65', change: '+12.45', isPositive: true },
    { symbol: 'TCS', price: '₹3,945.20', change: '-8.75', isPositive: false },
    { symbol: 'INFY', price: '₹1,756.30', change: '+23.10', isPositive: true },
    { symbol: 'HDFCBANK', price: '₹1,689.90', change: '+8.41', isPositive: true },
    { symbol: 'ICICIBANK', price: '₹1,045.30', change: '-12.71', isPositive: false },
    { symbol: 'BHARTIARTL', price: '₹895.75', change: '+29.42', isPositive: true },
    { symbol: 'ITC', price: '₹456.80', change: '+5.20', isPositive: true },
    { symbol: 'WIPRO', price: '₹432.15', change: '-2.85', isPositive: false }
  ];

  return (
    <div className="bg-white border-b border-gray-200 overflow-hidden">
      <div className="flex">
        <div className="flex space-x-8 whitespace-nowrap py-3 px-4 animate-marquee">
          {[...tickerStocks, ...tickerStocks].map((stock, index) => (
            <div key={index} className="flex items-center space-x-2 text-sm">
              <span className="font-semibold text-gray-900">{stock.symbol}</span>
              <span className="text-gray-600">{stock.price}</span>
              <span className={`flex items-center font-medium ${
                stock.isPositive ? 'text-green-600' : 'text-red-600'
              }`}>
                {stock.isPositive ? (
                  <TrendingUp className="w-3 h-3 mr-1" />
                ) : (
                  <TrendingDown className="w-3 h-3 mr-1" />
                )}
                {stock.change}
              </span>
            </div>
          ))}
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
            <span className="text-xl font-bold text-gray-900">Vibha StockAlerts</span>
          </div>
          
          <div className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-gray-600 hover:text-blue-600 transition-all duration-200 font-medium">
              Features
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

      {/* Stock Ticker */}
      <StockTicker />

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b shadow-lg">
          <div className="p-6 space-y-4">
            <a href="#features" className="block text-gray-700 hover:text-blue-600 transition-colors py-2">Features</a>
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
          <div className="inline-flex items-center bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-6 border border-blue-200">
            <Zap className="w-4 h-4 mr-2" />
            India's #1 Stock Alert Platform
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Never Miss A
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              {' '}Market Move
            </span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
            Get instant WhatsApp alerts for corporate announcements, financial results, and market events 
            that matter to your portfolio. Stay ahead with real-time intelligence.
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

          {/* Stats Section */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: '25K+', label: 'Active Users', icon: Users },
              { value: '1M+', label: 'Alerts Sent', icon: Bell },
              { value: '99.9%', label: 'Uptime', icon: Zap },
              { value: '30 Days', label: 'Free Trial', icon: Award }
            ].map((stat, index) => (
              <div key={index} className="group">
                <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-sm hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                  <stat.icon className="w-8 h-8 text-blue-600 mx-auto mb-3 group-hover:scale-110 transition-transform" />
                  <div className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</div>
                  <div className="text-gray-600 font-medium">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Powerful Features for Smart Investors
            </h2>
            <p className="text-xl text-gray-600">Everything you need to stay informed and make better investment decisions</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Zap,
                title: 'Lightning Fast Alerts',
                description: 'Get notifications within 30 seconds of official announcements from BSE, NSE, and company filings.',
              },
              {
                icon: Smartphone,
                title: 'WhatsApp Integration',
                description: 'Receive alerts directly on WhatsApp with rich formatting and quick action buttons.',
              },
              {
                icon: Shield,
                title: 'Verified Data Sources',
                description: 'Direct feeds from official exchanges and regulatory bodies ensure 100% accuracy.',
              },
              {
                icon: Target,
                title: 'Smart Filtering',
                description: 'AI-powered filters to send only relevant alerts based on your portfolio and preferences.',
              },
              {
                icon: BarChart3,
                title: 'Market Analytics',
                description: 'Advanced charts, technical indicators, and market sentiment analysis tools.',
              },
              {
                icon: Globe,
                title: '24/7 Monitoring',
                description: 'Round-the-clock monitoring of global markets and after-hours developments.',
              }
            ].map((feature, index) => (
              <div key={index} className="group bg-white p-8 rounded-2xl shadow-sm border-2 border-gray-100 hover:border-blue-200 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div id="pricing" className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Choose Your Plan
            </h2>
            <p className="text-xl text-gray-600">Start free, upgrade when you need more</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white border-2 border-gray-200 p-8 rounded-2xl hover:border-blue-200 transition-all duration-300 transform hover:scale-105">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Free Trial</h3>
                <div className="text-5xl font-bold text-gray-900 mb-2">₹0</div>
                <div className="text-gray-500">30 days free</div>
              </div>
              
              <ul className="space-y-4 mb-8">
                {[
                  'Up to 5 companies',
                  'Basic alerts (Results, Dividends)',
                  'WhatsApp notifications',
                  'Email support'
                ].map((feature, index) => (
                  <li key={index} className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-gray-600
