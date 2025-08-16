import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';

function App() {
  const [currentPage, setCurrentPage] = useState('landing');
  const [user, setUser] = useState(null);
  const [watchlist, setWatchlist] = useState([]);
  const [alerts, setAlerts] = useState([]);

  // Sample data
  const sampleWatchlist = [
    { id: 1, symbol: 'RELIANCE', name: 'Reliance Industries Ltd', price: 2456.80, change: '+1.2%', changeValue: 29.28, volume: '12.5M', marketCap: '16.8L Cr', alerts: 3, sector: 'Oil & Gas', logo: '🏭' },
    { id: 2, symbol: 'TCS', name: 'Tata Consultancy Services', price: 3678.50, change: '-0.8%', changeValue: -29.64, volume: '8.2M', marketCap: '13.4L Cr', alerts: 1, sector: 'IT Services', logo: '💻' },
    { id: 3, symbol: 'INFY', name: 'Infosys Limited', price: 1543.25, change: '+2.1%', changeValue: 31.78, volume: '15.6M', marketCap: '6.5L Cr', alerts: 5, sector: 'IT Services', logo: '🔧' },
    { id: 4, symbol: 'HDFCBANK', name: 'HDFC Bank Limited', price: 1689.90, change: '+0.5%', changeValue: 8.41, volume: '18.9M', marketCap: '9.1L Cr', alerts: 2, sector: 'Banking', logo: '🏦' },
    { id: 5, symbol: 'ICICIBANK', name: 'ICICI Bank Limited', price: 1045.30, change: '-1.2%', changeValue: -12.71, volume: '22.1M', marketCap: '7.3L Cr', alerts: 1, sector: 'Banking', logo: '🏛️' },
    { id: 6, symbol: 'BHARTIARTL', name: 'Bharti Airtel Limited', price: 895.75, change: '+3.4%', changeValue: 29.42, volume: '9.8M', marketCap: '5.2L Cr', alerts: 4, sector: 'Telecom', logo: '📱' }
  ];

  const sampleAlerts = [
    { id: 1, company: 'Reliance Industries', type: 'Quarterly Results', time: '2 mins ago', importance: 'high', description: 'Q3 FY25 results declared with 15% YoY growth', read: false },
    { id: 2, company: 'TCS', type: 'Dividend Declaration', time: '15 mins ago', importance: 'medium', description: 'Interim dividend of ₹10 per share declared', read: false },
    { id: 3, company: 'Infosys', type: 'Board Meeting', time: '1 hour ago', importance: 'low', description: 'Board meeting scheduled for buyback approval', read: true },
    { id: 4, company: 'HDFC Bank', type: 'Rights Issue', time: '2 hours ago', importance: 'high', description: 'Rights issue of ₹50,000 crores announced', read: false },
    { id: 5, company: 'Bharti Airtel', type: 'Acquisition', time: '3 hours ago', importance: 'high', description: 'Acquired spectrum in 5G auction for ₹43,084 crores', read: true },
    { id: 6, company: 'ICICI Bank', type: 'Credit Rating', time: '4 hours ago', importance: 'medium', description: 'Credit rating upgraded to AA+ by CRISIL', read: false }
  ];

  useEffect(() => {
    if (user) {
      setTimeout(() => {
        setWatchlist(sampleWatchlist);
        setAlerts(sampleAlerts);
      }, 1000);
    }
  }, [user]);

  return (
    <div className="App">
      {currentPage === 'landing' && (
        <LandingPage setCurrentPage={setCurrentPage} />
      )}
      {currentPage === 'login' && (
        <LoginPage setCurrentPage={setCurrentPage} setUser={setUser} />
      )}
      {currentPage === 'dashboard' && (
        <Dashboard 
          user={user} 
          setCurrentPage={setCurrentPage}
          watchlist={watchlist}
          alerts={alerts}
        />
      )}
    </div>
  );
}

export default App;
