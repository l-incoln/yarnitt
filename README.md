```markdown
# Yarnitt — Marketplace (starter)

This repository is a starter monorepo for Yarnitt — a handmade crochet marketplace.

Structure
- frontend/: Next.js frontend (React + optional Tailwind)
- backend/: Express + TypeScript backend
- docker-compose.yml: Postgres + Redis dev services
- backend/migrations/: DB schema + seed for local dev

Quick start (dev)
1. Copy `.env.example` -> `.env` and edit values.
2. Start services:
   docker-compose up -d
3. Apply migrations (example using psql CLI):
   psql -h localhost -U yarnitt -d yarnitt_dev -f backend/migrations/001_create_products.sql
   psql -h localhost -U yarnitt -d yarnitt_dev -f backend/migrations/002_seed_products.sql
4. Install dependencies and run dev servers:
   - Backend:
     cd backend
     npm install
     npm run dev
   - Frontend:
     cd frontend
     npm install
     npm run dev
5. Open frontend: http://localhost:3000
   Open backend ping: http://localhost:4000/api/ping

Notes
- Do NOT commit secrets. Use .env and .env.local for local secrets.
- This is a minimal starter. Continue adding routes, models, auth, uploads, workers, and tests.
```