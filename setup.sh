#!/bin/bash

# =============================================================================
# 🚀 Vibha StockAlerts - Quick Setup Script
# =============================================================================

echo "🚀 Setting up Vibha StockAlerts Enhanced System..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js 18+ first.${NC}"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js version 18+ required. Current version: $(node -v)${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js $(node -v) detected${NC}"

# Install dependencies
echo ""
echo -e "${BLUE}📦 Installing dependencies...${NC}"

# Install root dependencies
if [ -f "package.json" ]; then
    npm install
    echo -e "${GREEN}✅ Frontend dependencies installed${NC}"
else
    echo -e "${RED}❌ package.json not found in root directory${NC}"
fi

# Install server dependencies
if [ -d "server" ]; then
    cd server
    if [ -f "package.json" ]; then
        npm install
        echo -e "${GREEN}✅ Server dependencies installed${NC}"
    else
        echo -e "${RED}❌ server/package.json not found${NC}"
    fi
    cd ..
else
    echo -e "${RED}❌ server directory not found${NC}"
fi

# Create .env file from template
echo ""
echo -e "${BLUE}⚙️ Setting up environment configuration...${NC}"

if [ ! -f "server/.env" ]; then
    if [ -f "server/.env.example" ]; then
        cp server/.env.example server/.env
        echo -e "${GREEN}✅ Created server/.env from template${NC}"
    else
        # Create basic .env file
        cat > server/.env << EOL
# Basic configuration for Vibha StockAlerts
PORT=3001

# API Keys (add your free keys here)
FMP_API_KEY=demo
TWELVE_DATA_API_KEY=demo  
ALPHA_VANTAGE_API_KEY=demo
POLYGON_API_KEY=demo

# System settings
CACHE_DURATION=60000
ENABLE_INDIAN_MARKETS=true
ENABLE_GLOBAL_MARKETS=true
ENABLE_MOCK_FALLBACK=true
EOL
        echo -e "${GREEN}✅ Created basic server/.env file${NC}"
    fi
else
    echo -e "${YELLOW}⚠️ server/.env already exists${NC}"
fi

if [ ! -f ".env" ]; then
    cat > .env << EOL
VITE_API_URL=http://localhost:3001/api
EOL
    echo -e "${GREEN}✅ Created frontend .env file${NC}"
else
    echo -e "${YELLOW}⚠️ Frontend .env already exists${NC}"
fi

# Test server startup
echo ""
echo -e "${BLUE}🧪 Testing server startup...${NC}"

cd server
timeout 10s npm start &
SERVER_PID=$!
sleep 5

if kill -0 $SERVER_PID 2>/dev/null; then
    echo -e "${GREEN}✅ Server started successfully${NC}"
    kill $SERVER_PID
else
    echo -e "${RED}❌ Server failed to start${NC}"
fi
cd ..

# Display setup summary
echo ""
echo -e "${GREEN}🎉 Setup completed!${NC}"
echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo ""
echo -e "${YELLOW}1. Start the full application:${NC}"
echo "   npm run dev:full"
echo ""
echo -e "${YELLOW}2. Or start components separately:${NC}"
echo "   Terminal 1: npm run server"
echo "   Terminal 2: npm run dev"
echo ""
echo -e "${YELLOW}3. Test the API:${NC}"
echo "   curl http://localhost:3001/api/health"
echo "   curl http://localhost:3001/api/stocks/ticker"
echo ""
echo -e "${YELLOW}4. Open in browser:${NC}"
echo "   http://localhost:5173"
echo ""
echo -e "${BLUE}🔧 Optional: Add FREE API keys for better data${NC}"
echo ""
echo -e "${YELLOW}Free API Providers (recommended):${NC}"
echo "📊 Financial Modeling Prep: https://financialmodelingprep.com/developer/docs"
echo "📈 Twelve Data: https://twelvedata.com/pricing"  
echo "📉 Alpha Vantage: https://www.alphavantage.co/support/#api-key"
echo ""
echo -e "${YELLOW}Add your free API keys to: server/.env${NC}"
echo ""
echo -e "${GREEN}✨ Your app works immediately with demo data!${NC}"
echo -e "${GREEN}   Add API keys for live market data.${NC}"
echo ""
echo -e "${BLUE}📚 For detailed setup guide: http://localhost:3001/api/setup${NC}"
echo ""
echo -e "${GREEN}🚀 Happy Trading!${NC}"
