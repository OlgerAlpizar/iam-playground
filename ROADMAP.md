# Development Roadmap

This is my development plan for IAM Playground. I'm tackling it in phases, each one building on the previous.

---

## Full Tech Stack

| Category           | Technology                 | Service/Use                   | Phase |
| ------------------ | -------------------------- | ----------------------------- | ----- |
| **Backend**        | Express.js                 | Identity Service              | 1     |
|                    | NestJS                     | Access Control Service        | 4     |
| **Frontend**       | React                      | Identity UI                   | 2     |
|                    | Next.js                    | Access Control UI             | 5     |
|                    | TailwindCSS                | Both UIs                      | 2, 5  |
| **API**            | REST                       | Identity Service              | 1     |
|                    | GraphQL                    | Access Control Service        | 4     |
| **Auth**           | JWT + Refresh Tokens       | Token-based auth              | 1     |
|                    | Passport.js                | Social login (Google, GitHub) | 1     |
|                    | Passkeys/WebAuthn          | Passwordless authentication   | 1     |
| **Databases**      | MongoDB + Mongoose         | Identity Service              | 1     |
|                    | PostgreSQL + Prisma        | Access Control Service        | 4     |
|                    | Redis                      | Sessions, Cache, Queue        | 1, 6  |
| **Real-time**      | Socket.io                  | Notification Service          | 6     |
| **Message Queue**  | BullMQ                     | Event-driven jobs             | 6     |
| **Testing**        | Jest                       | Unit + Integration            | 1-7   |
|                    | Playwright                 | E2E                           | 7     |
| **CI/CD**          | GitHub Actions             | Automation                    | 3     |
| **Containers**     | Docker + Compose           | Development environment       | 3     |
| **API Docs**       | Swagger/OpenAPI            | Documentation                 | 3     |
| **Tracing**        | Jaeger + OpenTelemetry     | Distributed tracing           | 7     |
| **Logging**        | Winston                    | Structured logging            | 7     |
| **i18n**           | next-intl                  | Access Control UI (ES/EN)     | 5     |
| **State**          | Zustand                    | Identity UI                   | 2     |
|                    | React Query                | Identity UI                   | 2     |
| **GraphQL Client** | Apollo Client              | Access Control UI             | 5     |
| **Monorepo**       | Nx                         | Workspace management          | 1     |
| **Shared Libs**    | @identity/token-validation | JWT validation shared lib     | 3     |
| **Language**       | TypeScript                 | Entire project                | 1-7   |

---

## Phase 1: Identity Service [In Progress]

Building the authentication backend from scratch with Express. No frameworks doing magic behind the scenes.

**Stack:** Express.js, MongoDB, Mongoose, JWT, Passport.js, Passkeys/WebAuthn, Redis

**Scope:**

- User registration, login, logout endpoints
- JWT access tokens + refresh token rotation
- Social login via Passport.js (Google, GitHub)
- Passkeys/WebAuthn for passwordless authentication
- Password reset flow with token expiration
- Email verification (mocked for now, real integration later)

---

## Phase 2: Identity UI [Pending]

The frontend where users register, login, and manage their account.

**Stack:** React, TailwindCSS, React Query, Zustand

**Scope:**

- Login and registration forms with validation
- Social login buttons (Google, GitHub)
- Passkeys registration and login UI
- User profile page
- Password reset flow

---

## Phase 3: Infrastructure [Pending]

Setting up the DevOps side: containers, CI/CD, and shared libraries that multiple services will use.

**Stack:** Docker, Docker Compose, GitHub Actions, Swagger/OpenAPI

**Scope:**

- Dockerfile for each service
- docker-compose.yml for local development (MongoDB, PostgreSQL, Redis)
- GitHub Actions pipeline: lint, test, build on every PR
- Swagger/OpenAPI documentation for Identity Service
- `@identity/token-validation` shared library for JWT validation across services

---

## Phase 4: Access Control Service [Pending]

The authorization backend. This service answers "what can this user do?" based on roles and permissions.

**Stack:** NestJS, GraphQL, PostgreSQL, Prisma

**Scope:**

- CRUD for roles and permissions
- Policy management: mapping roles to permissions
- Permission queries: "Can user X perform action Y on resource Z?"
- Token validation using the shared library from Phase 3
- GraphQL API instead of REST (different approach than Identity Service)

---

## Phase 5: Access Control UI [Pending]

Admin dashboard for managing users, roles, and permissions. Built with Next.js for SSR and server components.

**Stack:** Next.js, Apollo Client, TailwindCSS, next-intl

**Scope:**

- Dashboard with overview metrics
- User management interface
- Role and permission CRUD
- Activity logs
- Server-side rendering for performance
- Internationalization: Spanish and English

---

## Phase 6: Notification Service [Pending]

Real-time notifications and background job processing. Handles events from other services.

**Stack:** Socket.io, BullMQ, Redis

**Scope:**

- WebSocket connections for real-time updates
- Push notifications when relevant events happen
- Background job processing with BullMQ (emails, cleanup tasks)
- Event bus for inter-service communication
- Retry logic for failed jobs with exponential backoff

---

## Phase 7: Observability & E2E Testing [Pending]

Final phase: making sure everything is traceable, debuggable, and tested end-to-end.

**Stack:** Jaeger, OpenTelemetry, Winston, Playwright

**Scope:**

- Distributed tracing with Jaeger (runs locally via Docker)
- OpenTelemetry SDK integrated in all services
- Structured logging with Winston (JSON format, log levels)
- Health check endpoints for each service
- E2E tests with Playwright covering critical flows across both UIs
