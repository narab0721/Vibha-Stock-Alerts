// src/services/WhatsAppService.js
class WhatsAppService {
  constructor() {
    this.isInitialized = false;
    this.config = {
      apiUrl: import.meta.env.VITE_WHATSAPP_API_URL || 'http://localhost:3001/api/whatsapp',
      rateLimitPerMinute: 30,
      maxRetries: 3,
      retryDelay: 2000
    };
    this.messageQueue = [];
    this.sentMessages = new Set();
    this.rateLimitTracker = new Map();
  }

  async initialize(config) {
    try {
      this.phoneNumber = config.phoneNumber;
      this.language = config.language || 'english';
      this.timezone = config.timezone || 'Asia/Kolkata';
      
      // Test WhatsApp API connection
      await this.testConnection();
      
      // Initialize message templates
      this.initializeTemplates();
      
      this.isInitialized = true;
      console.log('✅ WhatsAppService initialized successfully');
      
      return true;
    } catch (error) {
      console.error('❌ WhatsAppService initialization failed:', error);
      throw error;
    }
  }

  async testConnection() {
    try {
      const response = await fetch(`${this.config.apiUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`WhatsApp API health check failed: ${response.status}`);
      }

      console.log('✅ WhatsApp API connection successful');
      return true;
    } catch (error) {
      console.error('❌ WhatsApp API connection failed:', error);
      throw error;
    }
  }

  initializeTemplates() {
    this.templates = {
      english: {
        financial_results: {
          subject: "📊 {company} Financial Results",
          body: `*{company} ({symbol})* - {exchange}

📈 *Q{quarter} FY{year} Results*
• Revenue: ₹{revenue} Cr ({revenueGrowth})
• Net Profit: ₹{profit} Cr ({profitGrowth})
• EPS: ₹{eps}

💡 *Key Highlights:*
{highlights}

⏰ {time}
📱 Vibha StockAlerts`
        },
        acquisition: {
          subject: "🤝 {company} Acquisition News",
          body: `*{company} ({symbol})* - {exchange}

🤝 *Acquisition Alert*
{description}

💰 *Deal Value:* ₹{value} Cr
📅 *Expected Completion:* {timeline}

⏰ {time}
📱 Vibha StockAlerts`
        },
        board_meeting: {
          subject: "👥 {company} Board Meeting",
          body: `*{company} ({symbol})* - {exchange}

👥 *Board Meeting Outcome*
{description}

📋 *Key Decisions:*
{decisions}

⏰ {time}
📱 Vibha StockAlerts`
        },
        credit_rating: {
          subject: "⭐ {company} Credit Rating",
          body: `*{company} ({symbol})* - {exchange}

⭐ *Credit Rating Update*
• New Rating: {rating}
• Outlook: {outlook}
• Agency: {agency}

📊 *Impact:* {impact}

⏰ {time}
📱 Vibha StockAlerts`
        },
        price_change: {
          subject: "📊 {company} Price Alert",
          body: `*{company} ({symbol})* - {exchange}

📊 *Price Movement Alert*
• Current Price: ₹{price}
• Change: {change} ({changePercent})
• Volume: {volume}

🎯 *Trigger:* {trigger}

⏰ {time}
📱 Vibha StockAlerts`
        },
        default: {
          subject: "📢 {company} Update",
          body: `*{company} ({symbol})* - {exchange}

📢 *Company Update*
{description}

⏰ {time}
📱 Vibha StockAlerts`
        }
      },
      hindi: {
        financial_results: {
          subject: "📊 {company} वित्तीय परिणाम",
          body: `*{company} ({symbol})* - {exchange}

📈 *तिमाही {quarter} वित्त वर्ष {year} परिणाम*
• आय: ₹{revenue} करोड़ ({revenueGrowth})
• शुद्ध लाभ: ₹{profit} करोड़ ({profitGrowth})
• ईपीएस: ₹{eps}

💡 *मुख्य बिंदु:*
{highlights}

⏰ {time}
📱 विभा स्टॉक अलर्ट`
        },
        default: {
          subject: "📢 {company} अपडेट",
          body: `*{company} ({symbol})* - {exchange}

📢 *कंपनी अपडेट*
{description}

⏰ {time}
📱 विभा स्टॉक अलर्ट`
        }
      }
    };
  }

  async sendAlert(alert, phoneNumber = null) {
    if (!this.isInitialized) {
      console.warn('WhatsAppService not initialized');
      return false;
    }

    const targetPhone = phoneNumber || this.phoneNumber;
    
    // Check rate limits
    if (!this.checkRateLimit(targetPhone)) {
      console.warn(`Rate limit exceeded for ${targetPhone}`);
      return false;
    }

    // Check for duplicate messages
    const messageId = `${alert.symbol}_${alert.type}_${alert.time}`;
    if (this.sentMessages.has(messageId)) {
      console.warn(`Duplicate message prevented: ${messageId}`);
      return false;
    }

    try {
      const message = this.formatMessage(alert);
      const success = await this.sendMessage(targetPhone, message);
      
      if (success) {
        this.sentMessages.add(messageId);
        this.updateRateLimit(targetPhone);
        console.log(`✅ WhatsApp alert sent to ${targetPhone}: ${alert.company}`);
      }
      
      return success;
    } catch (error) {
      console.error('Failed to send WhatsApp alert:', error);
      return false;
    }
  }

  formatMessage(alert) {
    const template = this.getTemplate(alert.type);
    const currentTime = new Date().toLocaleString('en-IN', {
      timeZone: this.timezone,
      dateStyle: 'short',
      timeStyle: 'short'
    });

    let message = template.body
      .replace(/{company}/g, alert.company || 'Unknown Company')
      .replace(/{symbol}/g, alert.symbol || 'N/A')
      .replace(/{exchange}/g, alert.exchange || 'NSE')
      .replace(/{description}/g, alert.description || 'No description available')
      .replace(/{time}/g, currentTime);

    // Handle specific data based on alert type
    if (alert.data) {
      Object.keys(alert.data).forEach(key => {
        const placeholder = `{${key}}`;
        message = message.replace(new RegExp(placeholder, 'g'), alert.data[key] || 'N/A');
      });
    }

    // Clean up any remaining placeholders
    message = message.replace(/\{[^}]+\}/g, 'N/A');

    return message;
  }

  getTemplate(alertType) {
    const languageTemplates = this.templates[this.language] || this.templates.english;
    return languageTemplates[alertType] || languageTemplates.default;
  }

  async sendMessage(phoneNumber, message, retries = 0) {
    try {
      const response = await fetch(`${this.config.apiUrl}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_WHATSAPP_TOKEN}`
        },
        body: JSON.stringify({
          to: phoneNumber,
          message: message,
          type: 'text'
        })
      });

      if (response.ok) {
        const result = await response.json();
        return result.success || true;
      } else if (response.status === 429 && retries < this.config.maxRetries) {
        // Rate limited, retry after delay
        await this.delay(this.config.retryDelay * (retries + 1));
        return this.sendMessage(phoneNumber, message, retries + 1);
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      if (retries < this.config.maxRetries) {
        console.warn(`WhatsApp send failed, retrying... (${retries + 1}/${this.config.maxRetries})`);
        await this.delay(this.config.retryDelay * (retries + 1));
        return this.sendMessage(phoneNumber, message, retries + 1);
      }
      
      console.error('WhatsApp message send failed:', error);
      return false;
    }
  }

  checkRateLimit(phoneNumber) {
    const now = Date.now();
    const windowStart = now - (60 * 1000); // 1 minute window
    
    if (!this.rateLimitTracker.has(phoneNumber)) {
      this.rateLimitTracker.set(phoneNumber, []);
    }

    const timestamps = this.rateLimitTracker.get(phoneNumber);
    const recentMessages = timestamps.filter(ts => ts > windowStart);
    
    this.rateLimitTracker.set(phoneNumber, recentMessages);
    
    return recentMessages.length < this.config.rateLimitPerMinute;
  }

  updateRateLimit(phoneNumber) {
    if (!this.rateLimitTracker.has(phoneNumber)) {
      this.rateLimitTracker.set(phoneNumber, []);
    }
    
    this.rateLimitTracker.get(phoneNumber).push(Date.now());
  }

  async sendBulkAlerts(alerts, phoneNumbers) {
    const results = [];
    
    for (const phoneNumber of phoneNumbers) {
      for (const alert of alerts) {
        const result = await this.sendAlert(alert, phoneNumber);
        results.push({ phoneNumber, alert: alert.id, success: result });
        
        // Add delay between messages to respect rate limits
        await this.delay(200);
      }
    }
    
    return results;
  }

  async sendTestMessage(phoneNumber = null) {
    const targetPhone = phoneNumber || this.phoneNumber;
    
    const testAlert = {
      company: 'Test Company',
      symbol: 'TEST',
      exchange: 'NSE',
      type: 'default',
      description: 'This is a test message from Vibha StockAlerts. Your WhatsApp integration is working correctly!',
      time: new Date().toISOString()
    };

    return await this.sendAlert(testAlert, targetPhone);
  }

  async healthCheck() {
    try {
      await this.testConnection();
      return true;
    } catch (error) {
      console.error('WhatsApp health check failed:', error);
      return false;
    }
  }

  // Utility methods
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  formatPhoneNumber(phoneNumber) {
    // Clean and format phone number for WhatsApp API
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // Add country code if missing (assuming Indian numbers)
    if (cleaned.length === 10) {
      cleaned = '91' + cleaned;
    }
    
    return cleaned;
  }

  // Configuration methods
  setLanguage(language) {
    this.language = language;
  }

  setTimezone(timezone) {
    this.timezone = timezone;
  }

  // Analytics methods
  getMessageStats() {
    return {
      totalSent: this.sentMessages.size,
      rateLimitStatus: Object.fromEntries(this.rateLimitTracker.entries())
    };
  }

  // Cleanup method
  destroy() {
    this.messageQueue = [];
    this.sentMessages.clear();
    this.rateLimitTracker.clear();
    this.isInitialized = false;
  }
}

export default new WhatsAppService();
