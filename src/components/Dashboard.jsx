import React, { useState } from 'react';
import { 
  TrendingUp, 
  Users, 
  Settings, 
  Plus, 
  Search, 
  Filter,
  Star,
  Bell,
  BarChart3,
  Menu,
  Home,
  TrendingDown,
  DollarSign,
  LogOut
} from 'lucide-react';

const Dashboard = ({ user, setCurrentPage, watchlist, alerts }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showAddStock, setShowAddStock] = useState(false);

  // Enhanced Sidebar Component
  const EnhancedSidebar = () => (
    <div className={`${sidebarCollapsed ? 'w-16' : 'w-64'} bg-gradient-to-b from-gray-900 to-gray-800 h-screen fixed left-0 top-0 overflow-y-auto transition-all duration-300 shadow-xl z-40`}>
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          {!sidebarCollapsed && (
            <div>
              <h2 className="text-white font-bold text-lg">Vibha StockAlerts</h2>
              <p className="text-gray-400 text-sm">Welcome back, {user?.name}</p>
            </div>
          )}
        </div>
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute -right-3 top-8 bg-white rounded-full p-1.5 shadow-lg hover:shadow-xl transition-all duration-200"
        >
          <Menu className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      <nav className="p-4 space-y-2">
        {[
          { id: 'overview', label: 'Overview', icon: Home },
          { id: 'watchlist', label: 'Watchlist', icon: Star },
          { id: 'alerts', label: 'Alerts', icon: Bell },
          { id: 'analytics', label: 'Analytics', icon: BarChart3 },
          { id: 'settings', label: 'Settings', icon: Settings }
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
              activeTab === item.id
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-gray-300 hover:text-white hover:bg-gray-700'
            }`}
          >
            <item.icon className="w-5 h-5" />
            {!sidebarCollapsed && <span className="font-medium">{item.label}</span>}
          </button>
        ))}
      </nav>

      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-700">
        <button
          onClick={() => setCurrentPage('landing')}
          className="w-full flex items-center space-x-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-gray-700 rounded-xl transition-all duration-200"
        >
          <LogOut className="w-5 h-5" />
          {!sidebarCollapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );

  // Overview Component
  const Overview = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Portfolio Overview</h1>
          <p className="text-gray-600 mt-1">Track your investments and stay updated</p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center space-x-4">
          <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-sm font-medium">
            Trial: {user?.trialDaysLeft} days left
          </div>
          <button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-xl hover:shadow-lg transition-all duration-200">
            Upgrade to Pro
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { title: 'Portfolio Value', value: '₹12,45,678', change: '+2.5%', icon: DollarSign, color: 'green' },
          { title: 'Total Stocks', value: watchlist?.length?.toString() || '0', change: '+3 this week', icon: Star, color: 'blue' },
          { title: 'Active Alerts', value: alerts?.filter(a => !a.read)?.length?.toString() || '0', change: '12 today', icon: Bell, color: 'orange' },
          { title: 'Day\'s Change', value: '+₹18,456', change: '+1.8%', icon: TrendingUp, color: 'green' }
        ].map((stat, index) => (
          <div key={index} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                <p className={`text-sm font-medium mt-1 ${stat.color === 'green' ? 'text-green-600' : stat.color === 'blue' ? 'text-blue-600' : 'text-orange-600'}`}>
                  {stat.change}
                </p>
              </div>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                stat.color === 'green' ? 'bg-green-100' : stat.color === 'blue' ? 'bg-blue-100' : 'bg-orange-100'
              }`}>
                <stat.icon className={`w-6 h-6 ${
                  stat.color === 'green' ? 'text-green-600' : stat.color === 'blue' ? 'text-blue-600' : 'text-orange-600'
                }`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Alerts */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Recent Alerts</h2>
            <button 
              onClick={() => setActiveTab('alerts')}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              View All
            </button>
          </div>
        </div>
        <div className="p-6">
          {alerts?.slice(0, 5)?.map((alert) => (
            <div key={alert.id} className="flex items-start space-x-4 py-4 border-b border-gray-50 last:border-b-0">
              <div className={`w-2 h-2 rounded-full mt-2 ${
                alert.importance === 'high' ? 'bg-red-500' : 
                alert.importance === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
              }`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <h4 className="font-semibold text-gray-900">{alert.company}</h4>
                  <span className="text-sm text-gray-500">• {alert.time}</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{alert.description}</p>
                <span className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full mt-2">
                  {alert.type}
                </span>
              </div>
            </div>
          )) || (
            <div className="text-center py-8 text-gray-500">
              No alerts available
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Watchlist Component
  const Watchlist = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Watchlist</h1>
          <p className="text-gray-600 mt-1">Monitor your favorite stocks</p>
        </div>
        <button 
          onClick={() => setShowAddStock(true)}
          className="mt-4 sm:mt-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-xl hover:shadow-lg transition-all duration-200 flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Add Stock</span>
        </button>
      </div>

      {/* Search and Filter */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search stocks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button className="bg-gray-100 text-gray-700 px-4 py-3 rounded-xl hover:bg-gray-200 transition-colors flex items-center space-x-2">
            <Filter className="w-5 h-5" />
            <span>Filter</span>
          </button>
        </div>
      </div>

      {/* Stocks Grid */}
      <div className="grid gap-6">
        {watchlist?.map((stock) => (
          <div key={stock.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="text-3xl">{stock.logo}</div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{stock.symbol}</h3>
                  <p className="text-gray-600">{stock.name}</p>
                  <p className="text-sm text-gray-500">{stock.sector}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">₹{stock.price}</p>
                <div className={`flex items-center justify-end space-x-1 ${
                  stock.change.startsWith('+') ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stock.change.startsWith('+') ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  <span className="font-medium">{stock.change}</span>
                </div>
              </div>
            </div>
            
            <div className="mt-6 grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-gray-500 text-sm">Volume</p>
                <p className="font-semibold text-gray-900">{stock.volume}</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Market Cap</p>
                <p className="font-semibold text-gray-900">{stock.marketCap}</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Active Alerts</p>
                <p className="font-semibold text-gray-900">{stock.alerts}</p>
              </div>
            </div>
            
            <div className="mt-4 flex space-x-2">
              <button className="flex-1 bg-blue-50 text-blue-600 py-2 px-4 rounded-xl hover:bg-blue-100 transition-colors">
                View Details
              </button>
              <button className="flex-1 bg-gray-50 text-gray-700 py-2 px-4 rounded-xl hover:bg-gray-100 transition-colors">
                Set Alert
              </button>
            </div>
          </div>
        )) || (
          <div className="text-center py-12">
            <Star className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Stocks in Watchlist</h3>
            <p className="text-gray-600">Add your first stock to get started</p>
          </div>
        )}
      </div>
    </div>
  );

  // Alerts Component  
  const Alerts = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Alerts</h1>
          <p className="text-gray-600 mt-1">Stay updated with market movements</p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-4">
          <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-xl hover:bg-gray-200 transition-colors">
            Mark All Read
          </button>
          <button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-xl hover:shadow-lg transition-all duration-200">
            Settings
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="p-6">
          {alerts?.map((alert) => (
            <div key={alert.id} className={`flex items-start space-x-4 p-4 rounded-xl mb-4 transition-all duration-200 ${
              alert.read ? 'bg-gray-50' : 'bg-blue-50 border-l-4 border-blue-500'
            }`}>
              <div className={`w-3 h-3 rounded-full mt-2 ${
                alert.importance === 'high' ? 'bg-red-500' : 
                alert.importance === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
              }`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-semibold text-gray-900">{alert.company}</h4>
                    <span className="text-sm text-gray-500">• {alert.time}</span>
                  </div>
                  {!alert.read && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  )}
                </div>
                <p className="text-gray-700 mt-1">{alert.description}</p>
                <div className="flex items-center space-x-4 mt-3">
                  <span className={`inline-block text-xs px-3 py-1 rounded-full font-medium ${
                    alert.importance === 'high' ? 'bg-red-100 text-red-700' :
                    alert.importance === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                  }`}>
                    {alert.type}
                  </span>
                  <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                    View Details
                  </button>
                </div>
              </div>
            </div>
          )) || (
            <div className="text-center py-8 text-gray-500">
              No alerts available
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Render content based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <Overview />;
      case 'watchlist':
        return <Watchlist />;
      case 'alerts':
        return <Alerts />;
      case 'analytics':
        return (
          <div className="text-center py-12">
            <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Analytics Coming Soon</h3>
            <p className="text-gray-600">Advanced portfolio analytics and insights</p>
          </div>
        );
      case 'settings':
        return (
          <div className="text-center py-12">
            <Settings className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Settings Coming Soon</h3>
            <p className="text-gray-600">Customize your alert preferences</p>
          </div>
        );
      default:
        return <Overview />;
    }
  };

  return (
    <div className="flex bg-gray-50 min-h-screen">
      <EnhancedSidebar />
      
      <div className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
        <div className="p-6">
          {renderContent()}
        </div>
      </div>

      {/* Add Stock Modal Placeholder */}
      {showAddStock && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-2xl max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Add Stock to Watchlist</h3>
            <p className="text-gray-600 mb-6">This feature is coming soon!</p>
            <button
              onClick={() => setShowAddStock(false)}
              className="w-full bg-blue-600 text-white py-2 rounded-xl hover:bg-blue-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
