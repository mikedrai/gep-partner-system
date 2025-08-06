#!/bin/bash

# GEP Deployment Script - Port 4000 Configuration
# This will NOT touch ports 80 or 3000
# Frontend + API will be served on port 4000
# Backend runs internally on port 4001

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SERVER="135.181.95.74"
SERVER_USER="root"

echo -e "${GREEN}🚀 Deploying GEP on port 4000 (preserving ports 80 and 3000)${NC}"

# Step 1: Clean and prepare GEP directory only
echo -e "${YELLOW}Step 1: Preparing GEP directory...${NC}"
ssh $SERVER_USER@$SERVER << 'ENDSSH'
    # Clean only GEP directory
    cd /var/www
    rm -rf gep
    
    # Clone repository
    git clone https://github.com/mikedrai/gep-partner-system.git gep
    cd gep
    
    # Create logs directory
    mkdir -p logs
    
    echo "Repository cloned successfully"
ENDSSH

# Step 2: Copy environment files
echo -e "${YELLOW}Step 2: Setting up environment files...${NC}"

# Copy backend env (port 4001)
scp .env.production.port4000 $SERVER_USER@$SERVER:/var/www/gep/.env
ssh $SERVER_USER@$SERVER 'cp /var/www/gep/.env /var/www/gep/backend/.env'

# Copy frontend env (API on port 4000)
scp frontend/.env.production.port4000 $SERVER_USER@$SERVER:/var/www/gep/frontend/.env

# Copy PM2 config
scp ecosystem.port4000.config.js $SERVER_USER@$SERVER:/var/www/gep/ecosystem.config.js

# Step 3: Install and build
echo -e "${YELLOW}Step 3: Installing dependencies and building...${NC}"
ssh $SERVER_USER@$SERVER << 'ENDSSH'
    cd /var/www/gep
    
    # Backend dependencies
    echo "Installing backend dependencies..."
    cd backend
    npm ci --production || npm install --production
    cd ..
    
    # Frontend build
    echo "Building frontend..."
    cd frontend
    npm ci || npm install
    npm run build
    cd ..
    
    echo "Build complete!"
ENDSSH

# Step 4: Configure PM2 (only for GEP backend)
echo -e "${YELLOW}Step 4: Starting GEP backend with PM2...${NC}"
ssh $SERVER_USER@$SERVER << 'ENDSSH'
    cd /var/www/gep
    
    # Stop and delete only GEP backend if exists
    pm2 stop gep-backend || true
    pm2 delete gep-backend || true
    
    # Start GEP backend on port 4001
    pm2 start ecosystem.config.js --env production
    
    # Save PM2 configuration
    pm2 save
    
    # Show status
    echo "PM2 Status:"
    pm2 status
    
    # Show logs
    echo "Recent logs:"
    pm2 logs gep-backend --lines 10 --nostream
ENDSSH

# Step 5: Configure Nginx for port 4000
echo -e "${YELLOW}Step 5: Configuring Nginx to serve on port 4000...${NC}"

# Copy nginx config
scp nginx-port-4000.conf $SERVER_USER@$SERVER:/tmp/gep-nginx-4000.conf

ssh $SERVER_USER@$SERVER << 'ENDSSH'
    # Add GEP nginx config (won't touch default or other configs)
    cp /tmp/gep-nginx-4000.conf /etc/nginx/sites-available/gep-port-4000
    
    # Enable the site
    ln -sf /etc/nginx/sites-available/gep-port-4000 /etc/nginx/sites-enabled/gep-port-4000
    
    # Test nginx configuration
    echo "Testing nginx configuration..."
    nginx -t
    
    # Reload nginx (keeps existing services running)
    echo "Reloading nginx..."
    systemctl reload nginx
    
    echo "Nginx configured for port 4000!"
ENDSSH

# Step 6: Set permissions and verify
echo -e "${YELLOW}Step 6: Setting permissions and verifying...${NC}"
ssh $SERVER_USER@$SERVER << 'ENDSSH'
    # Set permissions for frontend build
    chown -R www-data:www-data /var/www/gep/frontend/build
    chmod -R 755 /var/www/gep
    
    # Verify services
    echo "=== Verifying Deployment ==="
    
    # Check if backend is running on 4001
    if netstat -tlnp | grep -q ":4001"; then
        echo "✅ Backend is running on port 4001"
    else
        echo "❌ Backend is NOT running on port 4001"
    fi
    
    # Check if nginx is listening on 4000
    if netstat -tlnp | grep -q ":4000"; then
        echo "✅ Nginx is listening on port 4000"
    else
        echo "❌ Nginx is NOT listening on port 4000"
    fi
    
    # Test the endpoints
    echo ""
    echo "Testing endpoints:"
    curl -s -o /dev/null -w "Backend health (port 4001): %{http_code}\n" http://localhost:4001/health || echo "Backend not responding"
    curl -s -o /dev/null -w "Frontend (port 4000): %{http_code}\n" http://localhost:4000 || echo "Frontend not responding"
    curl -s -o /dev/null -w "API proxy (port 4000/api): %{http_code}\n" http://localhost:4000/api || echo "API proxy not working"
    
    # Show what's running on each port
    echo ""
    echo "=== Port Usage ==="
    echo "Port 80 (untouched):"
    netstat -tlnp | grep ":80 " || echo "Nothing on port 80"
    echo ""
    echo "Port 3000 (untouched):"
    netstat -tlnp | grep ":3000" || echo "Nothing on port 3000"
    echo ""
    echo "Port 4000 (GEP nginx):"
    netstat -tlnp | grep ":4000" || echo "Nothing on port 4000"
    echo ""
    echo "Port 4001 (GEP backend):"
    netstat -tlnp | grep ":4001" || echo "Nothing on port 4001"
ENDSSH

# Step 7: Configure firewall for port 4000
echo -e "${YELLOW}Step 7: Opening port 4000 in firewall...${NC}"
ssh $SERVER_USER@$SERVER << 'ENDSSH'
    # Open port 4000 if using ufw
    if command -v ufw &> /dev/null; then
        ufw allow 4000/tcp
        echo "✅ Port 4000 opened in firewall"
    else
        echo "ℹ️ ufw not found, please manually configure firewall for port 4000"
    fi
ENDSSH

echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo -e "${GREEN}Your GEP application is now accessible at:${NC}"
echo -e "  ${YELLOW}http://135.181.95.74:4000${NC} - Main application"
echo -e "  ${YELLOW}http://135.181.95.74:4000/api${NC} - API endpoints"
echo ""
echo -e "${YELLOW}Your other services remain untouched:${NC}"
echo "  Port 80 - Your existing website"
echo "  Port 3000 - Your existing service"
echo ""
echo -e "${YELLOW}To monitor the application:${NC}"
echo "  ssh $SERVER_USER@$SERVER 'pm2 status'"
echo "  ssh $SERVER_USER@$SERVER 'pm2 logs gep-backend'"
echo "  ssh $SERVER_USER@$SERVER 'pm2 monit'"