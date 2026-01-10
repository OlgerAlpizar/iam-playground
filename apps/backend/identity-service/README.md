# JWT Express Authentication API

A robust Node.js/Express backend application with JWT authentication, built with TypeScript and Nx monorepo structure.

## 🚀 Features

- **Express.js** - Fast, unopinionated web framework
- **TypeScript** - Type-safe development
- **MongoDB** - Database with Mongoose ODM
- **Winston** - Structured logging with file output
- **JWT Authentication** - Secure token-based authentication
- **CORS** - Configurable cross-origin resource sharing
- **Rate Limiting** - Protection against abuse
- **Error Handling** - Centralized error management
- **Environment Validation** - Automatic validation of required variables
- **Health Checks** - `/health` endpoint for monitoring

## 📋 Prerequisites

- Node.js 18+ (LTS recommended)
- pnpm (or npm/yarn)
- MongoDB (local or Atlas)

## 🛠️ Installation

1. Clone the repository
2. Install dependencies:

```bash
pnpm install
```

3. Copy `.env.example` to `.env`:

```bash
cp apps/backend/identity-service/.env.example apps/backend/identity-service/.env
```

4. Update `.env` with your configuration

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in `apps/backend/identity-service/`:

```env
# Server Configuration
NODE_ENV=development
PORT=3010
HOST=localhost

# CORS Configuration
CORS_ORIGIN=*
WHITE_LIST_URLS=http://localhost:3000,http://localhost:3001

# MongoDB Configuration
# Option 1: MongoDB Atlas (Cloud)
MONGO_USER=your_username
MONGO_PASS=your_password
MONGO_URI=cluster.mongodb.net

# Option 2: Direct Connection String
MONGO_CONN_STRING=mongodb://localhost:27017/mydatabase
```

### Required Variables

- **Development**: None (uses defaults)
- **Production**: MongoDB connection (either `MONGO_CONN_STRING` or `MONGO_USER`/`MONGO_PASS`/`MONGO_URI`)

## 🏃 Running the Application

### Development

```bash
# Using pnpm
pnpm identity-service:serve

# Or using Nx directly
nx serve identity-service
```

### Production

```bash
# Build first
pnpm identity-service:build

# Then run
node dist/apps/backend/identity-service/main.js
```

## 📝 Available Scripts

### Project-specific scripts

- `pnpm identity-service:serve` - Start development server
- `pnpm identity-service:build` - Build for production
- `pnpm identity-service:test` - Run tests
- `pnpm identity-service:lint` - Lint code
- `pnpm identity-service:lint:fix` - Fix linting issues
- `pnpm identity-service:format` - Format code with Prettier
- `pnpm identity-service:info` - Show project information

### Affected scripts (run on changed projects)

- `pnpm build:affected` - Build affected projects
- `pnpm test:affected` - Test affected projects
- `pnpm lint:affected` - Lint affected projects

## 🏗️ Project Structure

```
apps/backend/identity-service/
├── src/
│   ├── main.ts                    # Application entry point
│   ├── configurations/            # Configuration modules
│   │   ├── index.ts            # Centralized exports
│   │   ├── configurations.ts     # Environment variables
│   │   ├── logger-middleware.ts  # Winston logger
│   │   ├── error-handler-middleware.ts  # Error handling
│   │   ├── cors-middleware.ts   # CORS configuration
│   │   ├── mongoose-connection.ts  # MongoDB connection
│   │   ├── rate-limit-middleware.ts  # Rate limiting
│   │   └── validate-env.ts      # Environment validation
│   └── users/                     # User module (to be implemented)
│       └── routes/
├── logs/                          # Log files (gitignored)
│   ├── error.log                 # Error logs only
│   └── all.log                   # All logs
├── .env                          # Environment variables (gitignored)
├── .env.example                  # Environment template
└── README.md                     # This file
```

## 🔒 Security Features

- **Helmet** - Security headers
- **CORS** - Configurable origin validation
- **Rate Limiting** - API protection
  - General API: 100 requests/15min (production)
  - Auth endpoints: 5 requests/15min
- **Environment Validation** - Prevents misconfiguration
- **Error Handling** - No stack traces in production

## 📊 Logging

Logs are written to:

- **Console** - Colored output (development)
- **logs/error.log** - Error level only
- **logs/all.log** - All log levels

Log levels:

- `error` - Errors only
- `warn` - Warnings
- `info` - General information
- `http` - HTTP requests
- `debug` - Debug information (development only)

## 🧪 Testing

```bash
# Run all tests
pnpm identity-service:test

# Run tests in watch mode
nx test identity-service --watch

# Run with coverage
nx test identity-service --coverage
```

## 🏥 Health Check

The application exposes a health check endpoint:

```bash
GET /health

Response:
{
  "status": "ok",
  "environment": "development"
}
```

## 🛡️ Error Handling

The application uses a centralized error handler:

```typescript
import { HttpError } from './configurations';

// Throw custom HTTP errors
throw new HttpError('User not found', 'The requested user does not exist', 404);
```

## 📦 Dependencies

### Production

- `express` - Web framework
- `mongoose` - MongoDB ODM
- `winston` - Logging
- `helmet` - Security headers
- `cors` - CORS middleware
- `morgan` - HTTP request logger
- `express-rate-limit` - Rate limiting
- `dotenv` - Environment variables

### Development

- `typescript` - Type checking
- `jest` - Testing framework
- `eslint` - Linting
- `prettier` - Code formatting

## 🚀 Deployment

### Environment Setup

1. Set `NODE_ENV=production`
2. Configure MongoDB connection
3. Set appropriate CORS origins
4. Configure rate limiting if needed

### Docker (Example)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
COPY . .
RUN pnpm identity-service:build
EXPOSE 3010
CMD ["node", "dist/apps/backend/identity-service/main.js"]
```

## 📚 API Documentation

API documentation will be added as endpoints are implemented.

## 🤝 Contributing

1. Follow the ESLint and Prettier rules
2. Write tests for new features
3. Update documentation as needed

## 📄 License

See LICENSE file for details.
