# GEP Partner Assignment System

A comprehensive solution for optimal assignment of consultants/partners to customer health inspection requests.

## Architecture Overview

- **Frontend**: React.js with TypeScript
- **Backend**: Node.js/Express API with optimization engine
- **Database**: Supabase (managed PostgreSQL)
- **Optimization**: Linear Programming with OR-Tools
- **Email**: SendGrid integration
- **Real-time**: Supabase real-time subscriptions

## Project Structure

```
├── frontend/          # React admin portal
├── backend/           # Node.js API server
├── supabase/          # Database schema and functions
├── docs/              # Documentation
└── docker-compose.yml # Development environment
```

## Quick Start

1. **Setup Supabase Project**
   ```bash
   cd supabase
   supabase start
   ```

2. **Setup Backend**
   ```bash
   cd backend
   npm install
   npm run dev
   ```

3. **Setup Frontend**
   ```bash
   cd frontend
   npm install
   npm start
   ```

## Key Features

- ✅ Customer request management
- ✅ Multi-factor partner optimization (location, cost, availability, specialty)
- ✅ Automated email notifications
- ✅ 24-hour response tracking with fallback
- ✅ Real-time dashboard with analytics
- ✅ Partner availability management
- ✅ SEPE.net export functionality

## Environment Variables

Copy the `.env.example` files and update with your configuration:

### Backend
```bash
cd backend
cp .env.example .env
# Edit .env with your actual values
```

### Frontend
```bash
cd frontend
cp .env.example .env
# Edit .env with your actual values
```

## Deployment

### Prerequisites
- Ubuntu Server 20.04+ or similar
- Node.js 18+ and npm
- Nginx
- PM2 for process management
- Supabase account (database)

### Quick Deployment

1. **Clone and setup:**
```bash
git clone https://github.com/mikedrai/gep-partner-system.git
cd gep-partner-system
```

2. **Configure environment:**
```bash
# Copy and edit the production environment files
cp .env.production.port4000 .env
cp frontend/.env.production.port4000 frontend/.env
# Edit with your credentials
```

3. **Run deployment script:**
```bash
./deploy-port-4000.sh YOUR_SERVER_IP
```

### Manual Deployment

See `DEPLOYMENT_PORT_4000.md` for detailed manual deployment instructions.

### Service Architecture

- **Port 4000**: Nginx serves frontend and proxies API
- **Port 4001**: Node.js backend API (internal)
- **Database**: Supabase (cloud hosted)

### Access Points

- Frontend: `http://your-server:4000`
- API: `http://your-server:4000/api`

### Monitoring

- Check status: `pm2 status`
- View logs: `pm2 logs gep-backend`
- Monitor resources: `pm2 monit`