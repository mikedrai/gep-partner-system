#!/bin/bash

# Fixed deployment script for Ubuntu 24.04
# Usage: ./fix-deployment.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SERVER="135.181.95.74"
SERVER_USER="root"

echo -e "${GREEN}🔧 Fixing GEP deployment on $SERVER${NC}"

# Step 1: Fix npm/nodejs conflict and clean up
echo -e "${YELLOW}Step 1: Fixing server environment...${NC}"
ssh $SERVER_USER@$SERVER << 'ENDSSH'
    # nodejs from nodesource includes npm, don't install npm separately
    echo "Checking Node.js and npm..."
    node --version
    npm --version
    
    # Clean up old deployment if exists
    echo "Cleaning up old deployment..."
    cd /var/www
    rm -rf gep
    
    # Clone fresh repository
    echo "Cloning repository..."
    git clone https://github.com/mikedrai/gep-partner-system.git gep
    cd gep
    
    # Verify structure
    ls -la
ENDSSH

# Step 2: Copy environment files
echo -e "${YELLOW}Step 2: Copying environment files...${NC}"

# Copy main .env file
scp .env.production $SERVER_USER@$SERVER:/var/www/gep/.env

# Create backend and frontend directories if needed and copy env files
ssh $SERVER_USER@$SERVER << 'ENDSSH'
    cd /var/www/gep
    
    # Ensure directories exist
    mkdir -p backend
    mkdir -p frontend
    
    # Create backend .env from main .env
    cp .env backend/.env
    
    echo "Directory structure:"
    ls -la
    ls -la backend/
    ls -la frontend/
ENDSSH

# Copy frontend production env
scp frontend/.env.production $SERVER_USER@$SERVER:/var/www/gep/frontend/.env

# Step 3: Install dependencies and build
echo -e "${YELLOW}Step 3: Installing dependencies and building...${NC}"
ssh $SERVER_USER@$SERVER << 'ENDSSH'
    cd /var/www/gep
    
    # Backend setup
    echo "Installing backend dependencies..."
    cd backend
    npm ci --production || npm install --production
    cd ..
    
    # Frontend setup and build
    echo "Building frontend..."
    cd frontend
    npm ci || npm install
    npm run build
    cd ..
    
    echo "Build complete!"
ENDSSH

# Step 4: Setup PM2
echo -e "${YELLOW}Step 4: Starting application with PM2...${NC}"
scp ecosystem.config.js $SERVER_USER@$SERVER:/var/www/gep/ecosystem.config.js

ssh $SERVER_USER@$SERVER << 'ENDSSH'
    cd /var/www/gep
    
    # Stop existing PM2 processes
    pm2 stop all || true
    pm2 delete all || true
    
    # Start application
    pm2 start ecosystem.config.js --env production
    
    # Save PM2 configuration
    pm2 save
    
    # Setup PM2 startup
    pm2 startup systemd -u root --hp /root
    pm2 save
    
    # Check status
    pm2 status
ENDSSH

# Step 5: Configure Nginx
echo -e "${YELLOW}Step 5: Configuring Nginx...${NC}"
scp nginx.conf $SERVER_USER@$SERVER:/tmp/gep-nginx.conf

ssh $SERVER_USER@$SERVER << 'ENDSSH'
    # Remove default nginx site if exists
    rm -f /etc/nginx/sites-enabled/default
    
    # Copy nginx config
    cp /tmp/gep-nginx.conf /etc/nginx/sites-available/gep
    
    # Enable site
    ln -sf /etc/nginx/sites-available/gep /etc/nginx/sites-enabled/gep
    
    # Test nginx config
    nginx -t
    
    # Reload nginx
    systemctl reload nginx
    
    echo "Nginx configured!"
ENDSSH

# Step 6: Set permissions and final checks
echo -e "${YELLOW}Step 6: Final setup...${NC}"
ssh $SERVER_USER@$SERVER << 'ENDSSH'
    # Set permissions
    chown -R www-data:www-data /var/www/gep/frontend/build || true
    chmod -R 755 /var/www/gep
    
    # Create logs directory
    mkdir -p /var/www/gep/logs
    
    # Check all services
    echo "=== Service Status ==="
    pm2 status
    systemctl status nginx --no-pager
    
    echo "=== Testing endpoints ==="
    curl -I http://localhost:3001/health || echo "Backend health check not available"
    curl -I http://localhost:80 || echo "Frontend not responding"
ENDSSH

echo -e "${GREEN}✅ Deployment fixed!${NC}"
echo -e "${YELLOW}Your application should now be accessible at:${NC}"
echo "  http://$SERVER"
echo "  API: http://$SERVER/api"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Test the application in browser"
echo "2. Check logs: ssh $SERVER_USER@$SERVER 'pm2 logs'"
echo "3. Monitor: ssh $SERVER_USER@$SERVER 'pm2 monit'"