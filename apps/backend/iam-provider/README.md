# IAM Provider

[![Node](https://img.shields.io/badge/Node-20+-green)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-black)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-8.x-green)](https://www.mongodb.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)

The authentication backend for IAM Playground. Handles user registration, login, and token management.

## What this service does

- User registration and login
- JWT access tokens + refresh token rotation
- Social login via Passport.js (Google, GitHub)
- Passkeys/WebAuthn for passwordless authentication
- Password reset with token expiration
- Email verification with token expiration

## Stack

Express.js, MongoDB, Mongoose, JWT, Passport.js, Nodemailer

## Prerequisites

- Node.js 20+
- pnpm
- Docker & Docker Compose

## Setup

```bash
# From monorepo root
pnpm install

# Start MongoDB and Mailhog
docker-compose up -d

# Create .env file (see Environment Variables below)

# Run the service
pnpm iam-provider:serve
```

## Docker Services

The `docker-compose.yml` in the monorepo root provides:

| Service          | Port    | Description                          |
| ---------------- | ------- | ------------------------------------ |
| **MongoDB**      | `27017` | Database                             |
| **Mailhog SMTP** | `1025`  | Captures outgoing emails             |
| **Mailhog UI**   | `8025`  | View emails at http://localhost:8025 |

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Stop and remove volumes (reset data)
docker-compose down -v
```

## Environment Variables

Create `.env` in `apps/backend/iam-provider/`:

```env
# Server
NODE_ENV=development
PORT=3010

# CORS
WHITE_LIST_URLS=http://localhost:3000,http://localhost:4200

# MongoDB (matches docker-compose.yml)
MONGO_CONN_STRING=mongodb://admin:admin123@localhost:27017/iam_provider?authSource=admin

# Redis (optional - falls back to in-memory store if not configured)
# REDIS_URL=redis://localhost:6379

# JWT (min 32 characters)
JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters-long

# Email - Mailhog (matches docker-compose.yml)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_FROM=noreply@iam-provider.local

# OAuth (optional - uncomment to enable)
# GOOGLE_CLIENT_ID=your-google-client-id
# GOOGLE_CLIENT_SECRET=your-google-client-secret
# GOOGLE_CALLBACK_URL=http://localhost:3010/api/v1/oauth/google/callback

# GITHUB_CLIENT_ID=your-github-client-id
# GITHUB_CLIENT_SECRET=your-github-client-secret
# GITHUB_CALLBACK_URL=http://localhost:3010/api/v1/oauth/github/callback

# Session (optional)
# MAX_ACTIVE_SESSIONS=1                  # Max concurrent sessions per user (default: 1)

# WebAuthn/Passkeys (optional)
# WEBAUTHN_RELYING_PARTY_NAME=IAM Provider  # Relying Party name shown to users
# WEBAUTHN_RELYING_PARTY_ID=localhost       # Relying Party ID (domain)
# WEBAUTHN_ORIGIN=http://localhost:3000  # Expected origin for WebAuthn
# WEBAUTHN_CHALLENGE_TTL_SECONDS=300     # Challenge expiration (default: 5 min)
```

## Scripts

```bash
pnpm iam-provider:serve      # Dev server
pnpm iam-provider:build      # Build for production
pnpm iam-provider:test       # Run tests
pnpm iam-provider:lint       # Lint
pnpm iam-provider:lint:fix   # Fix lint issues
```

## Project Structure

```
apps/backend/iam-provider/
├── src/
│   ├── main.ts
│   ├── app.ts
│   ├── config/
│   │   ├── app.config.ts
│   │   └── mongoose.config.ts
│   └── auth/
│       ├── controllers/
│       │   ├── auth.controller.ts       # login, register, refresh, logout
│       │   └── profile.controller.ts    # /me endpoints
│       ├── services/
│       │   ├── auth.service.ts
│       │   ├── token.service.ts
│       │   └── passkey.service.ts
│       ├── routes/
│       │   └── auth.routes.ts
│       ├── strategies/
│       │   ├── local.strategy.ts
│       │   ├── google.strategy.ts
│       │   ├── github.strategy.ts
│       │   └── passkey.strategy.ts
│       ├── validators/                  # Zod schemas (input)
│       │   ├── login.validator.ts
│       │   ├── register.validator.ts
│       │   └── index.ts
│       ├── dto/                         # Response transformation (output)
│       │   ├── auth.responses.ts
│       │   ├── user.responses.ts
│       │   └── index.ts
│       ├── entities/                    # Pure TypeScript interfaces
│       │   └── user.entity.ts
│       ├── models/                      # Mongoose schemas
│       │   └── user.model.ts
│       └── mappers/                     # Entity <-> Document conversion
│           └── user.mapper.ts
├── .env
└── README.md
```

## API Endpoints

### Auth

```
POST   /api/v1/auth/register            # Register new user
POST   /api/v1/auth/login               # Login with email/password
POST   /api/v1/auth/logout              # Logout (invalidate refresh token)
POST   /api/v1/auth/refresh             # Refresh access token
GET    /api/v1/auth/verify-email        # Verify email with token
POST   /api/v1/auth/resend-verification # Resend verification email
POST   /api/v1/auth/reactivate          # Reactivate a deactivated account
```

### Profile (/me)

```
GET    /api/v1/auth/me           # Get current user profile
PATCH  /api/v1/auth/me           # Update my profile
DELETE /api/v1/auth/me           # Delete my account
```

### OAuth (Passport.js)

```
GET    /api/v1/auth/google            # Google OAuth redirect
GET    /api/v1/auth/google/callback
GET    /api/v1/auth/github            # GitHub OAuth redirect
GET    /api/v1/auth/github/callback
```

### Passkeys (WebAuthn)

```
POST   /api/v1/auth/passkeys/register/options   # Get registration options
POST   /api/v1/auth/passkeys/register/verify    # Verify registration
POST   /api/v1/auth/passkeys/login/options      # Get login options
POST   /api/v1/auth/passkeys/login/verify       # Verify login
```

### Admin - User Management (requires JWT + isAdmin)

```
GET    /api/v1/users              # Search/list users (with filters & pagination)
POST   /api/v1/users              # Create user
GET    /api/v1/users/:id          # Get user by ID
PATCH  /api/v1/users/:id          # Update user
DELETE /api/v1/users/:id          # Delete user
POST   /api/v1/users/:id/verify-email   # Manually verify email
POST   /api/v1/users/:id/deactivate     # Deactivate account
POST   /api/v1/users/:id/reactivate     # Reactivate account
```

### Health

```
GET    /health                   # Health check (includes DB and Redis status)
```

**Response:**

```json
{
  "status": "ok",
  "environment": "development",
  "timestamp": "2026-01-19T12:00:00.000Z",
  "uptime": 123.456,
  "services": {
    "database": "healthy",
    "redis": "unavailable"
  }
}
```

> Services report their individual status independently. Redis is optional (falls back to in-memory).

## Middlewares

Uses shared middlewares from `@backend/express`:

- Rate limiting (100 req/15min general, 5 req/15min for auth)
- Request validation with Zod
- CORS with whitelist
- Helmet for security headers
- Morgan for HTTP logging
- Error handling with consistent format

## Testing

```bash
# Unit tests
pnpm iam-provider:test

# Watch mode
nx test iam-provider --watch

# Coverage
nx test iam-provider --coverage
```

## Related

- [Main README](../../../README.md)
- [ROADMAP](../../../ROADMAP.md) - Phase 1
