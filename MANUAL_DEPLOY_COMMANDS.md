# Manual Deployment Commands for GEP System

Run these commands step by step on your server (135.181.95.74):

## 1. SSH into your server
```bash
ssh root@135.181.95.74
```

## 2. Clean up and prepare
```bash
# Remove old deployment
cd /var/www
rm -rf gep

# Clone fresh repository
git clone https://github.com/mikedrai/gep-partner-system.git gep
cd gep

# Check structure
ls -la
```

## 3. Create environment files

Create `/var/www/gep/.env` with this content:
```bash
cat > /var/www/gep/.env << 'EOF'
# Supabase Configuration
SUPABASE_URL=https://jlbtczaqlbikswexcqnv.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsYnRjemFxbGJpa3N3ZXhjcW52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyMTg2NDgsImV4cCI6MjA2ODc5NDY0OH0.9f0HvhjNaJu1oftxSt7UiDeF6L9y1Dyi4_K95U649hU
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsYnRjemFxbGJpa3N3ZXhjcW52Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzIxODY0OCwiZXhwIjoyMDY4Nzk0NjQ4fQ.awjd3-E8JYi61_Vdd0N2S3NWHy-V_JiOS8hFq43fNUI

# Server Configuration
NODE_ENV=production
PORT=4000
HOST=0.0.0.0

# JWT Configuration
JWT_SECRET=99eb5296b787dd085cb044dbb7c169901b8551624d8a9aca05a68d4f08a1cc39
JWT_EXPIRES_IN=7d

# CORS Configuration
CORS_ORIGIN=http://135.181.95.74

# Email Configuration (SMTP)
SMTP_HOST=mail.horecabooking.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=mailer@deeprunner.ai
SMTP_PASS=Jam@Tic2
SMTP_FROM_EMAIL=mailer@deeprunner.ai
SMTP_FROM_NAME=GEP Assignment System

# Logging
LOG_LEVEL=info
EOF
```

Copy to backend:
```bash
cp /var/www/gep/.env /var/www/gep/backend/.env
```

Create frontend env:
```bash
cat > /var/www/gep/frontend/.env << 'EOF'
REACT_APP_SUPABASE_URL=https://jlbtczaqlbikswexcqnv.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsYnRjemFxbGJpa3N3ZXhjcW52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyMTg2NDgsImV4cCI6MjA2ODc5NDY0OH0.9f0HvhjNaJu1oftxSt7UiDeF6L9y1Dyi4_K95U649hU
REACT_APP_API_URL=http://135.181.95.74/api
REACT_APP_ENV=production
EOF
```

## 4. Install dependencies and build
```bash
cd /var/www/gep

# Backend
cd backend
npm install --production
cd ..

# Frontend
cd frontend
npm install
npm run build
cd ..
```

## 5. Start with PM2
```bash
cd /var/www/gep

# Stop any existing PM2 processes
pm2 stop all
pm2 delete all

# Start the backend
pm2 start ecosystem.config.js --env production

# Save PM2 config
pm2 save
pm2 startup systemd -u root --hp /root
pm2 save

# Check status
pm2 status
pm2 logs gep-backend --lines 20
```

## 6. Configure Nginx

Create nginx config:
```bash
cat > /etc/nginx/sites-available/gep << 'EOF'
server {
    listen 80;
    server_name 135.181.95.74;

    # Frontend
    location / {
        root /var/www/gep/frontend/build;
        try_files $uri $uri/ /index.html;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # WebSocket support
    location /ws {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    gzip on;
    gzip_vary on;
    gzip_min_length 10240;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml application/json;
    client_max_body_size 10M;
}
EOF
```

Enable the site:
```bash
# Remove default site
rm -f /etc/nginx/sites-enabled/default

# Enable GEP site
ln -sf /etc/nginx/sites-available/gep /etc/nginx/sites-enabled/gep

# Test nginx config
nginx -t

# Reload nginx
systemctl reload nginx
```

## 7. Set permissions
```bash
# Set proper permissions
chown -R www-data:www-data /var/www/gep/frontend/build
chmod -R 755 /var/www/gep

# Create logs directory
mkdir -p /var/www/gep/logs
```

## 8. Test the deployment
```bash
# Check PM2 status
pm2 status

# Check backend logs
pm2 logs gep-backend --lines 50

# Test endpoints
curl -I http://localhost:4000/health
curl -I http://localhost:80

# Check nginx status
systemctl status nginx
```

## 9. Firewall setup (if needed)
```bash
ufw allow 22
ufw allow 80
ufw allow 443
ufw --force enable
```

## Access your application

Your application should now be accessible at:
- **Frontend**: http://135.181.95.74
- **API**: http://135.181.95.74/api

## Troubleshooting

If backend is not starting:
```bash
cd /var/www/gep/backend
node src/server.js
# Check for any error messages
```

If nginx returns 502:
```bash
# Check if backend is running on port 4000
netstat -tlnp | grep 4000
pm2 logs gep-backend
```

Check all logs:
```bash
# PM2 logs
pm2 logs

# Nginx logs
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/access.log
```