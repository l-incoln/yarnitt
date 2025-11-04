# Backend Testing

This directory contains tests for the backend API.

## Setup

### Option 1: Using In-Memory MongoDB (Recommended for local development)

The tests will automatically use `mongodb-memory-server` to create an in-memory MongoDB instance. This requires network access to download MongoDB binaries on first run.

```bash
npm test
```

### Option 2: Using a Real MongoDB Instance

If you have MongoDB running locally or via Docker, you can specify the connection string:

```bash
MONGO_URI="mongodb://admin_user:AdminPass123!@127.0.0.1:27017/yarnitt_test?authSource=admin" npm test
```

### Option 3: Using Docker Compose

If you're using the project's docker-compose setup, start the MongoDB service first:

```bash
# In the project root
docker-compose up -d db

# Then run tests
cd backend
MONGO_URI="mongodb://yarnitt:yarnittpass@localhost:5432/yarnitt_test" npm test
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

## Test Coverage

The test suite includes:

- **auth.register.test.ts**: Tests for user registration including:
  - Successful registration with tokens
  - Duplicate email handling (409 conflict)
  - Invalid input validation (400 bad request)
  - Email normalization
  - Password hashing verification
