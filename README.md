# IAM Playground

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![Nx](https://img.shields.io/badge/Nx-Monorepo-143055)](https://nx.dev/)
[![ESLint](https://img.shields.io/badge/ESLint-9.x-4B32C3)](https://eslint.org/)
[![Prettier](https://img.shields.io/badge/Prettier-2.x-F7B93E)](https://prettier.io/)
[![Jest](https://img.shields.io/badge/Jest-30.x-C21325)](https://jestjs.io/)
[![Husky](https://img.shields.io/badge/Husky-9.x-42b983)](https://typicode.github.io/husky/)
[![pnpm](https://img.shields.io/badge/pnpm-Package%20Manager-F69220)](https://pnpm.io/)

Authentication, authorization, and real-time notifications. Built with Express, NestJS, React, and Next.js.

## What is this?

I'm building a complete Identity & Access Management system as a portfolio project. It's my way of showing how I work: writing clean code, thinking about architecture, testing properly, and making decisions I can explain.

The project includes JWT auth, Passport.js, Passkeys, role-based permissions, and real-time events. Multiple services working together, not just isolated examples.

---

## Why I built it this way

I'd rather have one solid project than ten small ones. A monorepo lets me put everything in one place: clone it, run it, explore it. No repo-hopping.

**Quick disclaimer:** This is a portfolio, not production code. At work I'd probably use one backend framework, add an API Gateway, deploy to real cloud infra. Here I'm mixing stacks on purpose to show range.

### Why IAM?

Every app needs auth. It's not trivial either: token refresh, multi-device sessions, permission inheritance, all that. Plus IAM naturally breaks into separate services, which gave me an excuse to use different tech for each one.

### Why Nx monorepo?

Shared JWT validation library across services, single install, consistent config. Nx also knows the dependency graph so it only rebuilds what changed.

### Why mix Express, NestJS, React, Next.js?

| Service          | Stack   | Reason                                      |
| ---------------- | ------- | ------------------------------------------- |
| Identity Service | Express | Wanted to build auth from scratch, no magic |
| Access Control   | NestJS  | Different approach: decorators, DI, GraphQL |
| Identity UI      | React   | Simple SPA, doesn't need SSR                |
| Admin UI         | Next.js | Server components, i18n, SSR                |

### Why split auth and authorization?

Different questions: "Who are you?" vs "What can you do?" Easier to reason about when they're separate services.

---

## Services

| Service                    | What it does                                | Stack               |
| -------------------------- | ------------------------------------------- | ------------------- |
| **Identity Service**       | Authentication (JWT, Passport.js, Passkeys) | Express + MongoDB   |
| **Identity UI**            | Login/register frontend                     | React               |
| **Access Control Service** | Roles & permissions                         | NestJS + PostgreSQL |
| **Access Control UI**      | Admin dashboard                             | Next.js             |
| **Notification Service**   | Real-time events, background jobs           | Socket.io + BullMQ  |

---

## Tech Stack

> **Note:** Not everything goes everywhere. Each technology is used in specific services where it makes sense. In a real project you wouldn't need all of this; a single backend framework and database would probably do. Here I'm intentionally using variety to show I can work with different tools.

| Category          | Technology                 | Service/Use                   |
| ----------------- | -------------------------- | ----------------------------- |
| **Backend**       | Express.js                 | Identity Service              |
|                   | NestJS                     | Access Control Service        |
| **Frontend**      | React                      | Identity UI                   |
|                   | Next.js                    | Access Control UI             |
| **API**           | REST                       | Identity Service              |
|                   | GraphQL                    | Access Control Service        |
| **Auth**          | JWT + Refresh Tokens       | Token-based auth              |
|                   | Passport.js                | Social login (Google, GitHub) |
|                   | Passkeys/WebAuthn          | Passwordless authentication   |
| **Databases**     | MongoDB + Mongoose         | Identity Service              |
|                   | PostgreSQL + Prisma        | Access Control Service        |
|                   | Redis                      | Sessions, Cache, Queue        |
| **Real-time**     | Socket.io                  | Notification Service          |
| **Message Queue** | BullMQ                     | Event-driven jobs             |
| **Testing**       | Jest                       | Unit + Integration            |
|                   | Playwright                 | E2E                           |
| **CI/CD**         | GitHub Actions             | Automation                    |
| **Containers**    | Docker + Compose           | Development environment       |
| **API Docs**      | Swagger/OpenAPI            | Documentation                 |
| **Tracing**       | Jaeger + OpenTelemetry     | Distributed tracing           |
| **Logging**       | Winston                    | Structured logging            |
| **i18n**          | next-intl                  | Access Control UI (ES/EN)     |
| **Monorepo**      | Nx                         | Workspace management          |
| **Shared Libs**   | @identity/token-validation | JWT validation shared lib     |
| **Language**      | TypeScript                 | Entire project                |

---

## Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              IAM-PLAYGROUND                                  │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│       USERS                                          ADMINISTRATORS          │
│         │                                                  │                 │
│         ▼                                                  ▼                 │
│  ┌─────────────────┐                          ┌─────────────────────┐        │
│  │   Identity UI   │                          │  Access Control UI  │        │
│  │     (React)     │                          │      (Next.js)      │        │
│  └────────┬────────┘                          └──────────┬──────────┘        │
│           │                                              │                   │
│           │  REST                                        │  GraphQL          │
│           ▼                                              ▼                   │
│  ┌─────────────────┐                          ┌─────────────────────┐        │
│  │Identity Service │                          │Access Control Service│       │
│  │   (Express)     │◄──────── Redis ─────────►│      (NestJS)       │        │
│  └────────┬────────┘                          └──────────┬──────────┘        │
│           │                                              │                   │
│           │             ┌────────────────────┐           │                   │
│           └────────────►│ Notification Service│◄──────────┘                  │
│                         │  (Socket.io/BullMQ) │                              │
│                         └─────────┬──────────┘                               │
│                                   │                                          │
│              ┌────────────────────┼────────────────────┐                     │
│              ▼                    ▼                    ▼                     │
│         ┌─────────┐         ┌──────────┐         ┌─────────┐                 │
│         │ MongoDB │         │PostgreSQL│         │  Redis  │                 │
│         └─────────┘         └──────────┘         └─────────┘                 │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Auth Flow

```
┌──────────┐      ┌──────────────────┐      ┌───────────────────────┐
│    UI    │      │ Identity Service │      │ Access Control Service│
└────┬─────┘      └────────┬─────────┘      └───────────┬───────────┘
     │                     │                            │
     │  1. Login           │                            │
     │────────────────────►│                            │
     │                     │                            │
     │  2. JWT token       │                            │
     │◄────────────────────│                            │
     │                     │                            │
     │  3. What can this user do?                       │
     │──────────────────────────────────────────────────►
     │                     │                            │
     │  4. { roles, permissions }                       │
     │◄──────────────────────────────────────────────────
```

### Service Communication

All services validate tokens independently using a shared Nx library:

```
┌───────────────────────────────────────────────────────────────────┐
│            @identity/token-validation (Nx shared lib)             │
│   • JWT_SECRET from env vars                                      │
│   • validateToken() middleware                                    │
│   • extractUserFromToken() utility                                │
└───────────────────────────────────────────────────────────────────┘
                               │
             ┌─────────────────┼─────────────────┐
             ▼                 ▼                 ▼
      ┌─────────────┐  ┌──────────────┐  ┌─────────────┐
      │  Identity   │  │Access Control│  │Notification │
      │  Service    │  │   Service    │  │  Service    │
      │ (generates) │  │ (validates)  │  │ (validates) │
      └─────────────┘  └──────────────┘  └─────────────┘
```

No API Gateway here. Each service handles its own validation. In production I'd add one, but for this portfolio it keeps things simpler.

---

## Getting Started

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- pnpm

### Installation

```bash
git clone https://github.com/OlgerAlpizar/iam-playground.git
cd iam-playground

pnpm install

# Start databases
docker compose up -d

# Run dev servers
pnpm dev
```

### Scripts

```bash
pnpm dev        # Start all services
pnpm build      # Build everything
pnpm test       # Run unit tests
pnpm test:e2e   # Run E2E tests
pnpm lint       # Lint all projects
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
│   └── e2e/                        # Playwright tests
├── libs/
│   └── shared/
│       └── token-validation/       # JWT validation lib
├── docker-compose.yml
├── nx.json
└── package.json
```

---

## Status

Currently working on **Phase 1: Identity Service** — building the authentication backend with Express, JWT, Passport.js, and Passkeys.

See [ROADMAP.md](./ROADMAP.md) for the full development plan.

---

## License

MIT © [Olger Alpizar](https://github.com/olger-alpizar)
