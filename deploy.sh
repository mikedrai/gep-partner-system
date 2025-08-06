#!/bin/bash

# GEP Deployment Script for Cloud Server
# Usage: ./deploy.sh [server-ip or hostname]

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SERVER_USER="root"  # Change this to your server user
APP_DIR="/var/www/gep"
REPO_URL="https://github.com/mikedrai/gep-partner-system.git"
NGINX_SITES="/etc/nginx/sites-available"
NGINX_ENABLED="/etc/nginx/sites-enabled"

# Check if server IP/hostname is provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: Please provide server IP or hostname${NC}"
    echo "Usage: ./deploy.sh [server-ip or hostname]"
    exit 1
fi

SERVER="$1"

echo -e "${GREEN}🚀 Starting GEP deployment to $SERVER${NC}"

# Step 1: Connect to server and setup
echo -e "${YELLOW}Step 1: Setting up server environment...${NC}"
ssh $SERVER_USER@$SERVER << 'ENDSSH'
    # Update system
    apt-get update
    
    # Install required packages
    apt-get install -y nginx git nodejs npm python3 python3-pip certbot python3-certbot-nginx
    
    # Install PM2 globally
    npm install -g pm2
    
    # Create application directory
    mkdir -p /var/www/gep
    
    # Create logs directory
    mkdir -p /var/www/gep/logs
ENDSSH

# Step 2: Deploy code
echo -e "${YELLOW}Step 2: Deploying code...${NC}"
ssh $SERVER_USER@$SERVER << ENDSSH
    cd /var/www
    
    # Clone or pull latest code
    if [ -d "gep/.git" ]; then
        echo "Repository exists, pulling latest changes..."
        cd gep
        git pull origin main
    else
        echo "Cloning repository..."
        git clone $REPO_URL gep
        cd gep
    fi
ENDSSH

# Step 3: Copy environment files
echo -e "${YELLOW}Step 3: Copying environment configuration...${NC}"
scp .env $SERVER_USER@$SERVER:$APP_DIR/.env
scp backend/.env.example $SERVER_USER@$SERVER:$APP_DIR/backend/.env
scp frontend/.env.example $SERVER_USER@$SERVER:$APP_DIR/frontend/.env

# Step 4: Install dependencies and build
echo -e "${YELLOW}Step 4: Installing dependencies and building...${NC}"
ssh $SERVER_USER@$SERVER << 'ENDSSH'
    cd /var/www/gep
    
    # Backend setup
    echo "Setting up backend..."
    cd backend
    npm ci --production
    cd ..
    
    # Frontend setup and build
    echo "Building frontend..."
    cd frontend
    npm ci
    npm run build
    cd ..
ENDSSH

# Step 5: Setup Nginx
echo -e "${YELLOW}Step 5: Configuring Nginx...${NC}"
scp nginx.conf $SERVER_USER@$SERVER:/tmp/gep-nginx.conf
ssh $SERVER_USER@$SERVER << 'ENDSSH'
    # Copy nginx config
    cp /tmp/gep-nginx.conf /etc/nginx/sites-available/gep
    
    # Enable site
    ln -sf /etc/nginx/sites-available/gep /etc/nginx/sites-enabled/gep
    
    # Test nginx config
    nginx -t
    
    # Reload nginx
    systemctl reload nginx
ENDSSH

# Step 6: Setup PM2
echo -e "${YELLOW}Step 6: Starting application with PM2...${NC}"
scp ecosystem.config.js $SERVER_USER@$SERVER:$APP_DIR/ecosystem.config.js
ssh $SERVER_USER@$SERVER << 'ENDSSH'
    cd /var/www/gep
    
    # Stop existing PM2 processes if any
    pm2 stop all || true
    pm2 delete all || true
    
    # Start application
    pm2 start ecosystem.config.js --env production
    
    # Save PM2 configuration
    pm2 save
    
    # Setup PM2 to start on boot
    pm2 startup systemd -u root --hp /root
    pm2 save
ENDSSH

# Step 7: Final setup
echo -e "${YELLOW}Step 7: Final configuration...${NC}"
ssh $SERVER_USER@$SERVER << 'ENDSSH'
    # Set correct permissions
    chown -R www-data:www-data /var/www/gep/frontend/build
    chmod -R 755 /var/www/gep
    
    # Create log rotation config
    cat > /etc/logrotate.d/gep << EOF
/var/www/gep/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
EOF
ENDSSH

echo -e "${GREEN}✅ Deployment complete!${NC}"
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Update the nginx.conf with your actual domain"
echo "2. Update .env files with production values"
echo "3. Setup SSL: ssh $SERVER_USER@$SERVER 'certbot --nginx -d your-domain.com'"
echo "4. Check application status: ssh $SERVER_USER@$SERVER 'pm2 status'"
echo "5. View logs: ssh $SERVER_USER@$SERVER 'pm2 logs gep-backend'"