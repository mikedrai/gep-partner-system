# GEP Partner System - Cloud Server Deployment Guide

## Prerequisites

Before deployment, ensure you have:
- ✅ A cloud server (Ubuntu 20.04+ recommended)
- ✅ Root or sudo access to the server
- ✅ Domain name pointed to your server IP (optional but recommended)
- ✅ Supabase credentials (already configured)
- ✅ SMTP credentials for email sending

## 📋 Step-by-Step Deployment

### Step 1: Prepare Your Local Environment

1. **Update production configuration files:**
   ```bash
   # Edit .env.production with your server details
   nano .env.production
   
   # Update the following:
   # - JWT_SECRET (generate a secure random string)
   # - CORS_ORIGIN (your domain)
   # - SMTP credentials
   ```

2. **Update frontend production config:**
   ```bash
   # Edit frontend/.env.production
   nano frontend/.env.production
   
   # Update REACT_APP_API_URL with your domain
   ```

3. **Update nginx.conf:**
   ```bash
   # Edit nginx.conf
   nano nginx.conf
   
   # Replace 'your-domain.com' with your actual domain
   ```

### Step 2: Initial Server Setup (One-time)

SSH into your server and run these commands:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install required packages
sudo apt install -y nginx git python3 python3-pip certbot python3-certbot-nginx

# Install PM2 globally
sudo npm install -g pm2

# Create app directory
sudo mkdir -p /var/www/gep
sudo chown -R $USER:$USER /var/www/gep
```

### Step 3: Deploy Using Script (Automated)

From your local machine, run:

```bash
# Make deploy script executable
chmod +x deploy.sh

# Run deployment (replace with your server IP)
./deploy.sh YOUR_SERVER_IP
```

### Step 4: Manual Deployment (Alternative)

If you prefer manual deployment:

1. **On your local machine:**
   ```bash
   # Push latest changes to GitHub
   git add .
   git commit -m "Add deployment configuration"
   git push origin main
   ```

2. **On your server:**
   ```bash
   # Clone repository
   cd /var/www
   git clone https://github.com/mikedrai/gep-partner-system.git gep
   cd gep
   
   # Copy production environment file
   cp .env.production .env
   
   # Install backend dependencies
   cd backend
   npm ci --production
   cd ..
   
   # Build frontend
   cd frontend
   cp .env.production .env
   npm ci
   npm run build
   cd ..
   
   # Start with PM2
   pm2 start ecosystem.config.js --env production
   pm2 save
   pm2 startup
   ```

3. **Configure Nginx:**
   ```bash
   # Copy nginx config
   sudo cp nginx.conf /etc/nginx/sites-available/gep
   
   # Enable site
   sudo ln -s /etc/nginx/sites-available/gep /etc/nginx/sites-enabled/
   
   # Test configuration
   sudo nginx -t
   
   # Reload nginx
   sudo systemctl reload nginx
   ```

### Step 5: Setup SSL Certificate (Recommended)

```bash
# Install certbot if not already installed
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

### Step 6: Configure Firewall

```bash
# Allow SSH, HTTP, and HTTPS
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

## 🔍 Monitoring & Maintenance

### Check Application Status
```bash
pm2 status
pm2 logs gep-backend
```

### View Logs
```bash
# PM2 logs
pm2 logs

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Application logs
tail -f /var/www/gep/logs/backend-out.log
tail -f /var/www/gep/logs/backend-err.log
```

### Restart Application
```bash
pm2 restart gep-backend
# or
pm2 restart all
```

### Update Application
```bash
cd /var/www/gep
git pull origin main
cd backend && npm ci --production && cd ..
cd frontend && npm ci && npm run build && cd ..
pm2 restart all
```

## 🔧 Troubleshooting

### Port Already in Use
```bash
# Find process using port 3001
sudo lsof -i :3001
# Kill the process if needed
sudo kill -9 [PID]
```

### PM2 Not Starting on Boot
```bash
pm2 startup systemd
# Copy and run the command it outputs
pm2 save
```

### Nginx 502 Bad Gateway
- Check if backend is running: `pm2 status`
- Check backend logs: `pm2 logs gep-backend`
- Verify port in ecosystem.config.js matches nginx proxy_pass

### Database Connection Issues
- Verify Supabase credentials in .env
- Check if Supabase project is active
- Test connection from server: `curl YOUR_SUPABASE_URL`

## 📊 Performance Optimization

### Enable Gzip Compression
Already configured in nginx.conf

### Setup CDN (Optional)
Consider using Cloudflare for:
- DDoS protection
- CDN for static assets
- SSL certificate
- Analytics

### Database Indexes
Ensure Supabase tables have proper indexes for:
- partner_availability (partner_id, date)
- customer_requests (status, created_at)
- assignments (request_id, partner_id)

## 🔐 Security Checklist

- [ ] Change default JWT_SECRET in production
- [ ] Enable firewall (ufw)
- [ ] Setup SSL certificate
- [ ] Disable root SSH login
- [ ] Setup fail2ban for brute force protection
- [ ] Regular security updates: `sudo apt update && sudo apt upgrade`
- [ ] Backup database regularly
- [ ] Monitor logs for suspicious activity

## 📞 Support

If you encounter issues:
1. Check logs (PM2, Nginx, Application)
2. Verify environment variables
3. Ensure all services are running
4. Check server resources (disk, memory, CPU)

## 🚀 Quick Commands Reference

```bash
# Application management
pm2 status                  # Check status
pm2 restart gep-backend     # Restart backend
pm2 logs                    # View logs
pm2 monit                   # Monitor resources

# Nginx management
sudo systemctl status nginx  # Check status
sudo systemctl restart nginx # Restart nginx
sudo nginx -t               # Test configuration

# Update application
cd /var/www/gep && git pull && pm2 restart all

# View logs
tail -f /var/www/gep/logs/backend-out.log
```

## 📈 Next Steps

After successful deployment:
1. Configure your domain DNS to point to server IP
2. Setup SSL certificate with Let's Encrypt
3. Configure email service (SMTP or SendGrid)
4. Setup monitoring (optional): New Relic, DataDog, or PM2 Plus
5. Configure backups for database and files
6. Setup CI/CD pipeline (optional) with GitHub Actions

---

**Deployment Complete! 🎉**

Your GEP Partner System should now be accessible at:
- HTTP: http://your-domain.com
- HTTPS: https://your-domain.com (after SSL setup)