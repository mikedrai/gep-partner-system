# GEP Deployment Guide - Port 4000 Configuration

This deployment guide ensures your GEP application runs on **port 4000** without interfering with:
- **Port 80**: Your existing website
- **Port 3000**: Your other services

## Architecture Overview

```
Port 80    → Your existing website (untouched)
Port 3000  → Your existing service (untouched)
Port 4000  → Nginx (serves GEP frontend + proxies API)
Port 4001  → Node.js backend (internal only)
```

## Quick Deployment

### Option 1: Automated Script
```bash
./deploy-port-4000.sh
```

### Option 2: Manual Deployment

SSH into your server and run these commands:

```bash
ssh root@135.181.95.74
```

#### 1. Clean and Clone
```bash
cd /var/www
rm -rf gep
git clone https://github.com/mikedrai/gep-partner-system.git gep
cd gep
mkdir -p logs
```

#### 2. Create Environment Files

Backend `.env` (port 4001):
```bash
cat > /var/www/gep/.env << 'EOF'
SUPABASE_URL=https://jlbtczaqlbikswexcqnv.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsYnRjemFxbGJpa3N3ZXhjcW52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyMTg2NDgsImV4cCI6MjA2ODc5NDY0OH0.9f0HvhjNaJu1oftxSt7UiDeF6L9y1Dyi4_K95U649hU
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsYnRjemFxbGJpa3N3ZXhjcW52Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzIxODY0OCwiZXhwIjoyMDY4Nzk0NjQ4fQ.awjd3-E8JYi61_Vdd0N2S3NWHy-V_JiOS8hFq43fNUI
NODE_ENV=production
PORT=4001
HOST=0.0.0.0
JWT_SECRET=99eb5296b787dd085cb044dbb7c169901b8551624d8a9aca05a68d4f08a1cc39
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://135.181.95.74:4000
SMTP_HOST=mail.horecabooking.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=mailer@deeprunner.ai
SMTP_PASS=Jam@Tic2
SMTP_FROM_EMAIL=mailer@deeprunner.ai
SMTP_FROM_NAME=GEP Assignment System
LOG_LEVEL=info
FRONTEND_URL=http://135.181.95.74:4000
EOF

cp /var/www/gep/.env /var/www/gep/backend/.env
```

Frontend `.env`:
```bash
cat > /var/www/gep/frontend/.env << 'EOF'
REACT_APP_SUPABASE_URL=https://jlbtczaqlbikswexcqnv.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsYnRjemFxbGJpa3N3ZXhjcW52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyMTg2NDgsImV4cCI6MjA2ODc5NDY0OH0.9f0HvhjNaJu1oftxSt7UiDeF6L9y1Dyi4_K95U649hU
REACT_APP_API_URL=http://135.181.95.74:4000/api
REACT_APP_ENV=production
EOF
```

#### 3. Install and Build
```bash
cd /var/www/gep
cd backend && npm install --production && cd ..
cd frontend && npm install && npm run build && cd ..
```

#### 4. Create PM2 Config
```bash
cat > /var/www/gep/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'gep-backend',
    script: './backend/src/server.js',
    cwd: './',
    env_production: {
      NODE_ENV: 'production',
      PORT: 4001
    },
    instances: 1,
    exec_mode: 'fork',
    max_memory_restart: '1G',
    error_file: './logs/backend-err.log',
    out_file: './logs/backend-out.log'
  }]
};
EOF
```

#### 5. Start Backend with PM2
```bash
cd /var/www/gep
pm2 stop gep-backend || true
pm2 delete gep-backend || true
pm2 start ecosystem.config.js --env production
pm2 save
```

#### 6. Configure Nginx for Port 4000
```bash
cat > /etc/nginx/sites-available/gep-port-4000 << 'EOF'
server {
    listen 4000;
    server_name 135.181.95.74;

    location / {
        root /var/www/gep/frontend/build;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:4001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /ws {
        proxy_pass http://localhost:4001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    client_max_body_size 10M;
}
EOF

ln -sf /etc/nginx/sites-available/gep-port-4000 /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

#### 7. Set Permissions
```bash
chown -R www-data:www-data /var/www/gep/frontend/build
chmod -R 755 /var/www/gep
```

#### 8. Open Firewall Port
```bash
ufw allow 4000/tcp
```

## Verification

### Check Services
```bash
# Check PM2
pm2 status

# Check ports
netstat -tlnp | grep -E ":(80|3000|4000|4001)"

# Test endpoints
curl http://localhost:4001/health  # Backend
curl http://localhost:4000         # Frontend via nginx
curl http://localhost:4000/api     # API proxy
```

### View Logs
```bash
# PM2 logs
pm2 logs gep-backend

# Nginx logs
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/access.log
```

## Access Your Application

✅ **GEP Application**: http://135.181.95.74:4000  
✅ **API Endpoints**: http://135.181.95.74:4000/api

## Troubleshooting

### Backend not starting
```bash
cd /var/www/gep/backend
node src/server.js
# Check error messages
```

### Port conflicts
```bash
# Check what's using ports
lsof -i :4000
lsof -i :4001
```

### Nginx issues
```bash
# Check configuration
nginx -t
# Check error log
tail -f /var/log/nginx/error.log
```

## Important Notes

1. **Port 80**: Your main website remains untouched
2. **Port 3000**: Your existing service remains untouched
3. **Port 4000**: GEP application (nginx)
4. **Port 4001**: GEP backend (internal only)

The application is completely isolated and won't interfere with your existing services.