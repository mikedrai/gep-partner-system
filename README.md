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
- Node.js 18+ and npm
- Supabase account and project
- SendGrid account (for email notifications)
- Docker (optional, for containerized deployment)

### Production Deployment

#### Option 1: Traditional Deployment (VPS/Cloud VM)

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/gep-system.git
cd gep-system
```

2. **Setup Backend**
```bash
cd backend
npm install --production
npm run build  # if build script exists
NODE_ENV=production npm start
```

3. **Setup Frontend**
```bash
cd frontend
npm install
npm run build
# Serve the build folder with nginx or similar
```

#### Option 2: Docker Deployment

```bash
docker-compose up -d
```

#### Option 3: Platform-as-a-Service (Recommended)

**Backend (Render/Railway/Heroku):**
- Connect GitHub repository
- Set environment variables
- Deploy backend folder

**Frontend (Vercel/Netlify):**
- Connect GitHub repository
- Set build command: `npm run build`
- Set publish directory: `build`
- Add environment variables

### Database Setup

1. Create a Supabase project
2. Run migrations:
```bash
cd supabase
supabase db push
```

### Monitoring & Maintenance

- Check logs: `backend/logs/`
- Monitor API health: `GET /health`
- Database backups: Configure in Supabase dashboard