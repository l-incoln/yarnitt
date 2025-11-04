# Authentication API Documentation

## Register New User

Endpoint to register a new user account.

### Endpoint

```
POST /api/auth/register
```

### Request Body

```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "name": "John Doe" // optional
}
```

### Success Response (201 Created)

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "name": "John Doe",
    "createdAt": "2025-11-04T08:00:00.000Z"
  }
}
```

### Error Responses

#### 400 Bad Request
Missing or invalid input:

```json
{
  "error": "Email and password are required"
}
```

```json
{
  "error": "Invalid email format"
}
```

```json
{
  "error": "Password must be at least 8 characters long"
}
```

#### 409 Conflict
Email already registered:

```json
{
  "error": "Email already registered"
}
```

#### 500 Internal Server Error
Server error:

```json
{
  "error": "Internal server error"
}
```

## Token Usage

### Access Token
- **Expiry**: 15 minutes (configurable via `ACCESS_TOKEN_EXPIRY` env variable)
- **Use**: Include in Authorization header for protected endpoints
- **Format**: `Authorization: Bearer <accessToken>`

### Refresh Token
- **Expiry**: 7 days (configurable via `REFRESH_TOKEN_EXPIRY` env variable)
- **Use**: To obtain new access tokens when expired
- **Storage**: Store securely (httpOnly cookie recommended for web apps)

## Configuration

Set the following environment variables in your `.env` file:

```bash
# JWT Secret (REQUIRED - change in production!)
JWT_SECRET=your-secret-key-change-in-production

# Token expiry times
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d

# MongoDB connection
MONGO_URI=mongodb://localhost:27017/yarnitt
```

## Security Notes

1. **Always use HTTPS in production** to protect tokens in transit
2. **Change JWT_SECRET** to a strong random value in production
3. **Store refresh tokens securely** (httpOnly cookies for web, secure storage for mobile)
4. **Passwords are hashed** using bcrypt with 10 salt rounds
5. **Email addresses are case-insensitive** and stored in lowercase
