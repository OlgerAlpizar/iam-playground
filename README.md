# IAM Playground

> Full-stack Identity & Access Management showcase: JWT, Passport.js, Passkeys, GraphQL, and real-time notifications — built with Express, NestJS, React, and Next.js.

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Development Phases](#development-phases)
- [License](#license)

---

## Overview

**Identity Playground** is a professional portfolio project demonstrating expertise in modern web development through a complete IAM & Access Management (IAM) system.

### Goals

- ✅ Clean, professional code
- ✅ Comprehensive testing (unit, integration, E2E)
- ✅ Well-thought architecture
- ✅ Technical decision documentation
- ✅ CI/CD automation
- ✅ Multi-stack versatility with purpose
- ✅ Production-ready mindset

### Services

| Service                    | Description                           | Stack               |
| -------------------------- | ------------------------------------- | ------------------- |
| **Identity Service**       | Authentication (JWT, OAuth, Passkeys) | Express + MongoDB   |
| **Identity UI**            | User-facing login/register            | React               |
| **Access Control Service** | Roles & permissions management        | NestJS + PostgreSQL |
| **Access Control UI**      | Admin dashboard                       | Next.js             |
| **Notification Service**   | Real-time events & background jobs    | Socket.io + BullMQ  |

---

## Tech Stack

| Category          | Technology                 | Service/Use                   | Phase |
| ----------------- | -------------------------- | ----------------------------- | ----- |
| **Backend**       | Express.js                 | Identity Service              | 1     |
|                   | NestJS                     | Access Control Service        | 4     |
| **Frontend**      | React                      | Identity UI                   | 2     |
|                   | Next.js                    | Access Control UI             | 5     |
| **API**           | REST                       | Identity Service              | 1     |
|                   | GraphQL                    | Access Control Service        | 4     |
| **Auth**          | JWT + Refresh Tokens       | Token-based auth              | 1     |
|                   | Passport.js                | Social login (Google, GitHub) | 1     |
|                   | Passkeys/WebAuthn          | Passwordless authentication   | 1     |
| **Databases**     | MongoDB + Mongoose         | Identity Service              | 1     |
|                   | PostgreSQL + Prisma        | Access Control Service        | 4     |
|                   | Redis                      | Sessions, Cache, Queue        | 1, 6  |
| **Real-time**     | Socket.io                  | Notification Service          | 6     |
| **Message Queue** | BullMQ                     | Event-driven jobs             | 6     |
| **Testing**       | Jest                       | Unit + Integration            | 1-7   |
|                   | Playwright                 | E2E                           | 7     |
| **CI/CD**         | GitHub Actions             | Automation                    | 3     |
| **Containers**    | Docker + Compose           | Development environment       | 3     |
| **API Docs**      | Swagger/OpenAPI            | Documentation                 | 3     |
| **Tracing**       | Jaeger + OpenTelemetry     | Distributed tracing           | 7     |
| **Logging**       | Winston                    | Structured logging            | 7     |
| **i18n**          | next-intl                  | Access Control UI (ES/EN)     | 5     |
| **Monorepo**      | Nx                         | Workspace management          | 1     |
| **Shared Libs**   | @identity/token-validation | JWT validation shared lib     | 3     |
| **Language**      | TypeScript                 | Entire project                | 1-7   |

---

## Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                              IAM-PLAYGROUND                                  │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│         USERS                                          ADMINISTRATORS             │
│           │                                                  │                    │
│           ▼                                                  ▼                    │
│    ┌─────────────────┐                          ┌─────────────────────┐          │
│    │   Identity UI   │                          │  Access Control UI  │          │
│    │     (React)     │                          │      (Next.js)      │          │
│    └────────┬────────┘                          └──────────┬──────────┘          │
│             │                                              │                      │
│             │  REST                                        │  GraphQL             │
│             ▼                                              ▼                      │
│    ┌─────────────────┐                          ┌─────────────────────┐          │
│    │Identity Service │                          │Access Control Service│          │
│    │   (Express)     │◄──────── Redis ─────────►│      (NestJS)       │          │
│    │   (Mongoose)    │       (sessions)         │      (Prisma)       │          │
│    └────────┬────────┘                          └──────────┬──────────┘          │
│             │                                              │                      │
│             │             ┌────────────────────┐           │                      │
│             │             │ Notification Service│           │                      │
│             └────────────►│    (Socket.io)     │◄──────────┘                      │
│                           │     (BullMQ)       │                                  │
│                           └─────────┬──────────┘                                  │
│                                     │                                             │
│                ┌────────────────────┼────────────────────┐                       │
│                ▼                    ▼                    ▼                       │
│           ┌─────────┐         ┌──────────┐         ┌─────────┐                   │
│           │ MongoDB │         │PostgreSQL│         │  Redis  │                   │
│           └─────────┘         └──────────┘         └─────────┘                   │
│                                                                                   │
│  ═══════════════════════════════════════════════════════════════════════════════ │
│                               INFRASTRUCTURE                                      │
│  ═══════════════════════════════════════════════════════════════════════════════ │
│                                                                                   │
│    ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│    │  Docker  │  │  GitHub  │  │  Swagger │  │  Jaeger  │  │  Winston │         │
│    │  Compose │  │  Actions │  │ API Docs │  │  Tracing │  │  Logging │         │
│    └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘         │
│                                                                                   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### Service Communication

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                           INTERNAL COMMUNICATION FLOW                             │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│   ┌───────────────────────────────────────────────────────────────────────────┐  │
│   │                @identity/token-validation (Nx shared lib)                 │  │
│   │   • JWT_SECRET from env vars                                              │  │
│   │   • validateToken() middleware                                            │  │
│   │   • extractUserFromToken() utility                                        │  │
│   │   • Token types (access, refresh)                                         │  │
│   └───────────────────────────────────────────────────────────────────────────┘  │
│                                  │                                                │
│                ┌─────────────────┼─────────────────┐                             │
│                ▼                 ▼                 ▼                             │
│        ┌──────────────┐  ┌────────────────┐  ┌──────────────┐                   │
│        │   Identity   │  │ Access Control │  │ Notification │                   │
│        │   Service    │  │    Service     │  │   Service    │                   │
│        │  (generates) │  │   (validates   │  │  (validates) │                   │
│        │              │  │  + permissions)│  │              │                   │
│        └──────────────┘  └────────────────┘  └──────────────┘                   │
│                                                                                   │
├──────────────────────────────────────────────────────────────────────────────────┤
│  STRATEGY:                                                                        │
│  • Shared lib: each service validates tokens independently                       │
│  • Identity Service: generates tokens (access + refresh)                         │
│  • Access Control Service: validates tokens + resolves permissions               │
│  • No API Gateway: simplicity for portfolio (production would use one)           │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### Authentication vs Authorization

| Service                    | Responsibility                  |
| -------------------------- | ------------------------------- |
| **Identity Service**       | Authentication: WHO are you?    |
| **Access Control Service** | Authorization: WHAT can you do? |

```
┌──────────┐      ┌──────────────────┐      ┌───────────────────────┐
│    UI    │      │ Identity Service │      │ Access Control Service│
│          │      │    (Express)     │      │       (NestJS)        │
└────┬─────┘      └────────┬─────────┘      └───────────┬───────────┘
     │                     │                            │
     │  1. Login (JWT, Passport.js, or Passkeys)        │
     │────────────────────►│                            │
     │                     │                            │
     │  2. Token (identity: userId, email)              │
     │◄────────────────────│                            │
     │                     │                            │
     │  3. What permissions does userId have?           │
     │──────────────────────────────────────────────────►
     │                     │                            │
     │  4. { roles, permissions }                       │
     │◄──────────────────────────────────────────────────
     │                     │                            │
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- pnpm (recommended)

### Installation

```bash
# Clone the repository
git https://github.com/OlgerAlpizar/iam-playground.git
cd iam-playground

# Install dependencies
pnpm install

# Start infrastructure (databases)
docker compose up -d

# Run development servers
pnpm dev
```

### Available Scripts

```bash
pnpm dev          # Start all services in development mode
pnpm build        # Build all services
pnpm test         # Run unit tests
pnpm test:e2e     # Run E2E tests
pnpm lint         # Lint all projects
```

---

## Project Structure

```
iam-playground/
├── apps/
│   ├── backend/
│   │   ├── identity-service/       # Express + MongoDB
│   │   ├── access-control-service/ # NestJS + PostgreSQL
│   │   └── notification-service/   # Socket.io + BullMQ
│   ├── frontend/
│   │   ├── identity-ui/            # React
│   │   └── access-control-ui/      # Next.js
│   └── e2e/                        # Playwright E2E tests
├── libs/
│   └── identity/
│       └── token-validation/       # Shared JWT validation lib
├── docker-compose.yml
├── nx.json
└── package.json
```

---

## Development Phases

### Phase 1: Identity Service

- [x] In Progress
- [ ] Completed

**Goal:** Functional authentication backend

**Stack:** `Express.js` `REST` `MongoDB` `Mongoose` `JWT` `Passport.js` `Passkeys/WebAuthn` `Redis` `TypeScript`

**Features:**

- Register / Login / Logout
- JWT with Refresh Tokens
- Passport.js (Google, GitHub)
- Passkeys / WebAuthn (passwordless)
- Password Reset
- Email verification (mock)

---

### Phase 2: Identity UI

- [ ] In Progress
- [ ] Completed

**Goal:** User-facing frontend

**Stack:** `React` `TypeScript` `TailwindCSS` `React Query` `Zustand`

**Features:**

- Login / Register forms
- Social login buttons (Google, GitHub)
- Passkeys registration + login UI
- Profile page
- Password reset flow

---

### Phase 3: Infrastructure

- [ ] In Progress
- [ ] Completed

**Goal:** Production-ready setup + shared libs

**Stack:** `Docker` `Docker Compose` `GitHub Actions` `Swagger/OpenAPI` `@identity/token-validation`

**Features:**

- Dockerfile for each service
- docker-compose.yml (dev environment)
- GitHub Actions (lint, test, build)
- Swagger docs for Identity Service
- Shared lib for JWT validation across services

---

### Phase 4: Access Control Service

- [ ] In Progress
- [ ] Completed

**Goal:** Roles & permissions backend

**Stack:** `NestJS` `GraphQL` `PostgreSQL` `Prisma` `TypeScript`

**Features:**

- CRUD Roles
- CRUD Permissions
- Policies (role → permissions)
- Query: "Can user X do Y on resource Z?"
- Integration with Identity Service

---

### Phase 5: Access Control UI

- [ ] In Progress
- [ ] Completed

**Goal:** Admin dashboard

**Stack:** `Next.js` `GraphQL client` `TailwindCSS` `next-intl` `TypeScript`

**Features:**

- Dashboard overview
- User management
- Role/permission management
- Activity logs
- SSR for better performance
- Internationalization (ES/EN)
- Language switcher

---

### Phase 6: Notification Service

- [ ] In Progress
- [ ] Completed

**Goal:** Event-driven + Real-time

**Stack:** `Socket.io` `BullMQ` `Redis` `TypeScript`

**Features:**

- WebSocket connections
- Real-time notifications
- Background jobs (BullMQ)
- Event bus between services
- Retry logic for failed jobs

---

### Phase 7: Observability + E2E

- [ ] In Progress
- [ ] Completed

**Goal:** Tracing and end-to-end testing (all runs locally with Docker)

**Stack:** `Jaeger` `OpenTelemetry` `Winston` `Playwright`

**Features:**

- Jaeger UI for trace visualization (Docker)
- OpenTelemetry SDK in all services
- Structured logging with Winston
- Health check endpoints
- **E2E Global:** Single Playwright project testing both UIs

---

## License

MIT © [Olger Alpizar]
