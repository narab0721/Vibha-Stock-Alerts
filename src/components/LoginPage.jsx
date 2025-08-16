import React, { useState } from 'react';
import { TrendingUp, ArrowRight } from 'lucide-react';

const LoginPage = ({ setCurrentPage, setUser }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [name, setName] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  const handleSendOTP = (e) => {
    e.preventDefault();
    setOtpSent(true);
  };

  const handleVerifyOTP = (e) => {
    e.preventDefault();
    setUser({ 
      name: name || 'User', 
      phone: phoneNumber,
      trialDaysLeft: 30,
      joinDate: new Date().toLocaleDateString()
    });
    setCurrentPage('dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-6">
      <div className="bg-white shadow-2xl p-8 rounded-3xl w-full max-w-md border border-gray-100">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <TrendingUp className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            {otpSent ? 'Verify OTP' : isLogin ? 'Welcome Back' : 'Get Started'}
          </h2>
          <p className="text-gray-600">
            {otpSent ? `Enter OTP sent to ${phoneNumber}` : isLogin ? 'Sign in to your account' : 'Start your free 30-day trial'}
          </p>
        </div>

        {!otpSent ? (
          <form onSubmit={handleSendOTP} className="space-y-6">
            {!isLogin && (
              <div>
                <label className="block text-gray-700 text-sm font-semibold mb-2">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-gray-50 text-gray-900 border-0 rounded-xl px-4 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                  placeholder="Enter your name"
                  required={!isLogin}
                />
              </div>
            )}

            <div>
              <label className="block text-gray-700 text-sm font-semibold mb-2">Phone Number</label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full bg-gray-50 text-gray-900 border-0 rounded-xl px-4 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                placeholder="+91 9876543210"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl font-semibold hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              Send OTP
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP} className="space-y-6">
            <div>
              <label className="block text-gray-700 text-sm font-semibold mb-2">Enter OTP</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full bg-gray-50 text-gray-900 border-0 rounded-xl px-4 py-4 text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                placeholder="------"
                maxLength={6}
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl font-semibold hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              Verify & Continue
            </button>

            <button
              type="button"
              onClick={() => setOtpSent(false)}
              className="w-full text-gray-500 hover:text-gray-700 transition-colors"
            >
              ← Change Phone Number
            </button>
          </form>
        )}

        {!otpSent && (
          <div className="text-center mt-6">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-blue-600 hover:text-blue-700 transition-colors font-medium"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-gray-100">
          <button
            onClick={() => setCurrentPage('landing')}
            className="text-gray-500 hover:text-gray-700 transition-colors flex items-center space-x-2 mx-auto"
          >
            <ArrowRight className="w-4 h-4 transform rotate-180" />
            <span>Back to home</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
