# Authentication Registration Tests

This directory contains integration tests for the authentication registration flow.

## Running Tests

### Option 1: Using mongodb-memory-server (Automatic)
Tests will automatically use an in-memory MongoDB server if network access is available:

```bash
npm test
```

### Option 2: Using Docker Compose
If you have docker-compose set up:

```bash
# Start MongoDB in docker
docker-compose up -d mongodb

# Run tests
npm test
```

### Option 3: Using Local MongoDB
If you have MongoDB installed locally:

```bash
# Ensure MongoDB is running
sudo systemctl start mongod  # On Linux
# or
brew services start mongodb-community  # On macOS

# Run tests
npm test
```

## Test Coverage

The auth.register.test.ts file includes tests for:

- ✓ Successful registration with valid data
- ✓ Registration without optional name field
- ✓ Duplicate email rejection (409)
- ✓ Case-insensitive email validation
- ✓ Missing email validation (400)
- ✓ Missing password validation (400)
- ✓ Invalid email format validation (400)
- ✓ Short password validation (400)
- ✓ Password hashing verification

## Notes

- Tests will gracefully skip if MongoDB is not available
- For CI/CD environments, ensure MongoDB is accessible or mongodb-memory-server can download binaries
- Each test run clears the test database to ensure isolation
