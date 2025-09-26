# Wildfire-Protection

Monorepo with FastAPI backend and Next.js + Tailwind frontend.

## Getting started

Backend:
```bash
cd backend
poetry install
poetry run uvicorn app.main:app --reload --port 8000
```

Frontend:
```bash
cd frontend
npm install
npm run dev
```

Docker Compose:
```bash
docker compose up --build
```

Structure:
- `backend` FastAPI app
- `frontend` Next.js app
- `docker-compose.yml` Compose for dev
- `.gitignore` Root ignore
- `vercel.json` Route frontend deploy
