```markdown
# Yarnitt

Starter monorepo for Yarnitt — a handmade crochet marketplace.

This repository will contain:
- frontend/ — Next.js frontend
- backend/ — Express + TypeScript backend
- docker-compose.yml for Postgres and Redis
- migrations/ for DB schema and seeds

Quick start (local)
1. Copy `.env.example` -> `.env` and edit values.
2. Start services: `docker-compose up -d`
3. Run migrations: `psql -d yarnitt_dev -f backend/migrations/001_create_products.sql`
4. Start backend: `cd backend && npm install && npm run dev`
5. Start frontend: `cd frontend && npm install && npm run dev`

Do not commit secrets (.env).
```
