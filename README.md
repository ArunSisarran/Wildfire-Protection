# Wildfire-Protection

Monorepo with FastAPI backend and Next.js + Tailwind frontend.

## 🚀 Quick Start (Recommended)

### Option 1: Automated Setup
```bash
# Start both frontend and backend with one command
./dev-start.sh
```

### Option 2: Manual Setup
```bash
# Terminal 1: Start backend with Docker
docker-compose up

# Terminal 2: Start frontend locally
cd frontend
npm install
npm run dev
```

## 📋 Development Workflow

### Backend (FastAPI)
- **Location**: `backend/`
- **Port**: http://localhost:8000
- **Method**: Docker Compose (recommended) or Poetry
- **API Docs**: http://localhost:8000/docs

### Frontend (Next.js)
- **Location**: `frontend/`
- **Port**: http://localhost:3000
- **Method**: Local npm development server
- **Hot Reload**: Enabled with Turbopack

## 🛠️ Available Scripts

### Frontend Scripts
```bash
cd frontend

# Development
npm run dev          # Start dev server with Turbopack
npm run dev:full     # Start with helpful messages

# Production
npm run build        # Build for production
npm run start        # Start production server

# Utilities
npm run lint         # Run ESLint
npm run clean        # Clean and reinstall dependencies
```

### Backend Scripts
```bash
# Using Docker (recommended)
docker-compose up

# Using Poetry (alternative)
cd backend
poetry install
poetry run uvicorn app.main:app --reload --port 8000
```

## 🌐 Environment Configuration

### Frontend Environment
- **Local**: Uses `.env.local` (automatically loads)
- **Production**: Configured via Vercel environment variables
- **API URL**: `NEXT_PUBLIC_API_URL=http://localhost:8000` (local)

### Backend Environment
- **Local**: Uses Docker environment variables
- **Production**: Configured via Render environment variables

## 📁 Project Structure
```
├── backend/           # FastAPI application
├── frontend/          # Next.js application
├── docker-compose.yml # Backend containerization
├── dev-start.sh       # Development startup script
├── vercel.json        # Frontend deployment config
└── README.md          # This file
```

## 🚀 Deployment

### Frontend (Vercel)
- Automatically deploys from `main` branch
- Builds from `frontend/` directory
- Uses `vercel.json` configuration

### Backend (Render)
- Deploys from `backend/` directory
- Uses `render.yaml` configuration

## 🔧 Troubleshooting

### Frontend Issues
```bash
# Clean install
cd frontend
npm run clean

# Check dependencies
npm install
```

### Backend Issues
```bash
# Rebuild containers
docker-compose down
docker-compose up --build

# Check logs
docker-compose logs backend
```

### Port Conflicts
- Frontend: Change port in `frontend/package.json` dev script
- Backend: Change port in `docker-compose.yml`
