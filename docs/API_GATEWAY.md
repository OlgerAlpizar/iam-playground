# API Gateway Initiative

> **Status**: Planned (not yet implemented)  
> **Priority**: Future enhancement for microservices communication

## Overview

This document outlines the architecture for implementing an API Gateway to handle routing, authentication, and inter-service communication across the IAM Playground microservices ecosystem.

## Architecture

```
                        ┌─────────────────────┐
       External ──────► │     API Gateway     │
       Requests         │  (routing + auth)   │
                        └──────────┬──────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              ▼                    ▼                    ▼
   ┌────────────────────┐ ┌────────────────────┐ ┌────────────────────┐
   │  Identity Service  │ │  User Management   │ │   Other Services   │
   │  (Express + Mongo) │ │  (NestJS + Postgres)│ │        ...         │
   └────────────────────┘ └────────────────────┘ └────────────────────┘
```

## Design Principles

### Database Per Service

Each microservice owns and manages its own database:

- **Identity Service**: MongoDB (authentication, credentials, tokens)
- **User Management**: PostgreSQL (profiles, roles, preferences)

### Loose Coupling

Services communicate via HTTP/gRPC APIs, never by sharing databases directly.

### Single Entry Point

The API Gateway serves as the single entry point for all external requests.

## Service Communication Patterns

### External Request Flow

1. Client sends request to API Gateway
2. Gateway validates JWT with Identity Service
3. Gateway routes request to appropriate service
4. Service processes and responds through Gateway

### Internal Service Communication

```
┌────────────────────┐         HTTP/gRPC          ┌────────────────────┐
│  User Management   │ ─────────────────────────► │  Identity Service  │
│      Service       │   GET /internal/users/:id  │      Service       │
└────────────────────┘                            └────────────────────┘
```

## Identity Service Internal Endpoints

Endpoints to be exposed for internal service-to-service communication:

| Endpoint                       | Method | Description               |
| ------------------------------ | ------ | ------------------------- |
| `/internal/users/:id`          | GET    | Get basic user info by ID |
| `/internal/users/email/:email` | GET    | Get user by email         |
| `/internal/users/verify-token` | POST   | Verify and decode JWT     |
| `/internal/users/:id/exists`   | GET    | Check if user exists      |

### Security Considerations

- Internal endpoints should be protected by service-to-service authentication
- Options: API keys, mTLS, or internal JWT
- Internal endpoints should not be exposed externally

## API Gateway Responsibilities

1. **Routing**: Direct requests to appropriate microservices
2. **Authentication**: Validate JWTs for protected routes
3. **Rate Limiting**: Protect services from abuse
4. **Load Balancing**: Distribute traffic across service instances
5. **Request/Response Transformation**: Normalize data formats
6. **Logging & Monitoring**: Centralized request logging

## Technology Options

| Option              | Pros                            | Cons                       |
| ------------------- | ------------------------------- | -------------------------- |
| **Express/Fastify** | Simple, familiar, lightweight   | Manual implementation      |
| **NestJS**          | Consistent with user-management | More setup                 |
| **Kong**            | Enterprise features, plugins    | Complex, might be overkill |
| **Nginx**           | High performance, proven        | Configuration complexity   |

### Recommended for Portfolio

**Express or Fastify** - Demonstrates understanding of the pattern without overcomplicating the setup.

## Implementation Checklist

- [ ] Create `apps/backend/api-gateway/` project
- [ ] Implement routing to identity-service
- [ ] Implement routing to user-management (when created)
- [ ] Add JWT validation middleware
- [ ] Add rate limiting
- [ ] Add request logging
- [ ] Implement service-to-service authentication
- [ ] Add internal endpoints to identity-service
- [ ] Document API routes

## Example Gateway Routes

```typescript
// External routes (through gateway)
POST   /api/v1/auth/login          → identity-service
POST   /api/v1/auth/register       → identity-service
POST   /api/v1/auth/refresh        → identity-service
GET    /api/v1/users/:id/profile   → user-management
PUT    /api/v1/users/:id/roles     → user-management

// Internal routes (service-to-service only)
GET    /internal/users/:id         → identity-service (not exposed via gateway)
```

## References

- [API Gateway Pattern - Microsoft](https://docs.microsoft.com/en-us/azure/architecture/microservices/design/gateway)
- [Building Microservices - Sam Newman](https://samnewman.io/books/building_microservices/)
- [NestJS Microservices](https://docs.nestjs.com/microservices/basics)
