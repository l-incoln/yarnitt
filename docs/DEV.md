# Local development with Docker

Prerequisites: Docker and docker-compose installed.

Start services:

```bash
docker-compose up --build
```

Run integration tests (in a new terminal):

```bash
# run tests against the DB running in docker-compose
export DATABASE_URL="postgres://yarnitt:yarnittpass@localhost:5433/yarnitt_test"
cd backend
npm ci
npx jest --runInBand
```
