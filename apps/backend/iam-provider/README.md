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
- Email verification (mocked for now)

## Stack

Express.js, MongoDB, Mongoose, JWT, Passport.js, Passkeys/WebAuthn, Redis

## Prerequisites

- Node.js 20+
- pnpm
- MongoDB (local or Docker)
- Redis (for sessions)

## Setup

```bash
# From monorepo root
pnpm install

# Copy env file
cp apps/backend/iam-provider/.env.example apps/backend/iam-provider/.env

# Start MongoDB and Redis
docker compose up -d

# Run the service
pnpm iam-provider:serve
```

## Environment Variables

Create `.env` in `apps/backend/iam-provider/`:

```env
# Server
NODE_ENV=development
PORT=3010

# CORS
CORS_ORIGIN=*
WHITE_LIST_URLS=http://localhost:3000,http://localhost:3001

# MongoDB
MONGO_CONN_STRING=mongodb://localhost:27017/identity

# Redis (sessions)
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# OAuth (Passport.js)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
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
POST   /api/v1/auth/register     # Register new user
POST   /api/v1/auth/login        # Login with email/password
POST   /api/v1/auth/logout       # Logout (invalidate refresh token)
POST   /api/v1/auth/refresh      # Refresh access token
POST   /api/v1/auth/forgot       # Request password reset
POST   /api/v1/auth/reset        # Reset password with token
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

### Health

```
GET    /health                   # Health check
```

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
