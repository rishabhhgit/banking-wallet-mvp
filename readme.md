# Banking/Wallet System MVP

A production-grade banking and wallet system built with Node.js, TypeScript, PostgreSQL, and Redis. Features atomic money transfers with serializable isolation, distributed idempotency, real-time SSE streaming, audit logging, SMTP email service, Google OAuth, and a Next.js admin dashboard.

## Tech Stack

### Backend

| Layer       | Technology                      | Version                |
| ----------- | ------------------------------- | ---------------------- |
| Language    | TypeScript                      | ^5.9.2                 |
| Runtime     | Node.js                         | 18+                    |
| Framework   | Express.js                      | ^5.1.0                 |
| ORM         | Prisma                          | ^6.14.0                |
| Database    | PostgreSQL                      | 16                     |
| Cache/Queue | Redis + BullMQ                  | 7.x                    |
| Auth        | JWT + bcrypt + Google OAuth     | ^9.0.2 / ^3.0.2        |
| Email       | Nodemailer (SMTP)               | ^6.x                   |
| Validation  | Zod                             | ^4.1.3                 |
| Logging     | Pino                            | ^9.x                   |
| Testing     | Jest + ts-jest                  | ^30.x                  |
| Security    | Helmet, CORS, Rate Limiting     | —                      |

### Frontend

| Layer      | Technology | Version    |
| ---------- | ---------- | ---------- |
| Framework  | Next.js    | ^16.2.12   |
| Language   | TypeScript | ^5.9.2     |
| Styling    | Tailwind   | ^4.x       |
| UI         | React      | ^19.x      |
| Icons      | Lucide     | ^0.525.0   |
| Fonts      | DM Sans    | Google     |

### Infrastructure

| Layer             | Technology                  |
| ----------------- | --------------------------- |
| Containerization  | Docker + Docker Compose     |
| CI/CD             | GitHub Actions              |
| Process Mgmt      | Graceful shutdown + cleanup |

## Architecture

### System Overview

```
                          ┌─────────────────────────────────────┐
                          │           Load Balancer              │
                          └─────────────────┬───────────────────┘
                                            │
                          ┌─────────────────▼───────────────────┐
                          │         Express.js Server           │
                          │  ┌───────────────────────────────┐  │
                          │  │  Middleware Pipeline           │  │
                          │  │  helmet → cors → request-id    │  │
                          │  │  → logger → json → rate-limit  │  │
                          │  └───────────────────────────────┘  │
                          │                                     │
                          │  ┌──────────┐ ┌──────────────────┐  │
                          │  │  Routes  │ │  Health Checks   │  │
                          │  └────┬─────┘ └──────────────────┘  │
                          │       │                             │
                          │  ┌────▼─────────────────────────┐   │
                          │  │       Controllers            │   │
                          │  │  Zod → Auth → Business Logic │   │
                          │  └────────────┬─────────────────┘   │
                          │               │                     │
                          │  ┌────────────▼─────────────────┐   │
                          │  │       Repositories           │   │
                          │  │  Prisma → Database Queries   │   │
                          │  └────────────┬─────────────────┘   │
                          └───────────────┼─────────────────────┘
                                          │
                     ┌────────────────────┬┴───────────────────┐
                     │                    │                     │
            ┌────────▼────────┐  ┌───────▼───────┐  ┌────────▼────────┐
            │   PostgreSQL    │  │     Redis     │  │   BullMQ Queue  │
            │   (Primary)     │  │  (Cache/Lock) │  │  (Background)   │
            └─────────────────┘  └───────────────┘  └─────────────────┘
```

### 3-Layer Architecture

All modules export standalone functions (no classes).

- **Routes** — HTTP method matching and middleware attachment
- **Controllers** — Input validation (Zod), ownership checks, business logic
- **Repositories** — Pure database queries via Prisma

### Database Schema

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                  User                                        │
├──────────────────────────────────────────────────────────────────────────────┤
│  id           (PK)  │  String                                               │
│  email        (UQ)  │  String                                               │
│  password           │  String                                               │
│  firstName          │  String                                               │
│  lastName           │  String                                               │
│  createdAt          │  DateTime                                             │
│  updatedAt          │  DateTime                                             │
└──────────────────────────────────────────────────────────────────────────────┘
        │ 1:N
        ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                                Account                                       │
├──────────────────────────────────────────────────────────────────────────────┤
│  id           (PK)  │  String                                               │
│  userId       (FK)  │  String → User.id                                     │
│  name               │  String                                               │
│  balance   (DEC)    │  Decimal(12,2)                                        │
│  currency           │  String (default: "USD")                               │
│  type               │  String (CHECKING, SAVINGS)                            │
│  createdAt          │  DateTime                                             │
│  updatedAt          │  DateTime                                             │
└──────────────────────────────────────────────────────────────────────────────┘
        │ 1:N
        ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                               Transaction                                    │
├──────────────────────────────────────────────────────────────────────────────┤
│  id               (PK)  │  String                                           │
│  amount               │  Decimal(12,2)                                      │
│  description          │  String                                             │
│  type                 │  String (TRANSFER, DEPOSIT, WITHDRAWAL)              │
│  status               │  String (PENDING, COMPLETED, FAILED)                │
│  debitAccountId  (FK)  │  String? → Account.id                              │
│  creditAccountId (FK)  │  String? → Account.id                              │
│  idempotencyKey  (UQ)  │  String? (unique, indexed)                         │
│  createdAt            │  DateTime                                           │
│  updatedAt            │  DateTime                                           │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                               AuditEvent                                     │
├──────────────────────────────────────────────────────────────────────────────┤
│  id           (PK)  │  String                                               │
│  eventType          │  String (indexed)                                     │
│  userId        (FK)  │  String? → User.id (optional)                        │
│  metadata           │  String?                                              │
│  createdAt          │  DateTime (indexed)                                   │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Relationships:**

- `User` 1:N `Account` — A user owns multiple accounts
- `Account` 1:N `Transaction` — An account has debit and credit transactions
- `User` 1:N `AuditEvent` — A user has multiple audit events (optional)

**Indexes:**

- `users`: `email` (unique)
- `accounts`: `userId`
- `transactions`: `debitAccountId`, `creditAccountId`, `status`, `createdAt`, `idempotencyKey` (unique)
- `audit_events`: `eventType`, `userId`, `createdAt`

### Money Transfer Flow

```
POST /api/v1/transactions
  │
  ├─ 1. Validate input (Zod schema)
  ├─ 2. Check idempotency key (Redis GET)
  │     └─ If exists: return cached response
  ├─ 3. Acquire distributed lock (Redis SET NX)
  │     └─ If locked: return 409 Conflict
  ├─ 4. Verify user owns debit account
  ├─ 5. Log TRANSFER_INITIATED (audit_events)
  │
  └─ 6. db.$transaction (Serializable isolation):
       ├─ Find debit account → check balance >= amount
       ├─ Find credit account → verify both exist
       ├─ debitAccount.balance -= amount
       ├─ creditAccount.balance += amount
       ├─ Insert transaction record
       └─ Return transaction with account references
  │
  ├─ 7. Broadcast via SSE (both parties)
  ├─ 8. Log TRANSFER_COMPLETED (audit_events)
  ├─ 9. Store idempotency response (Redis SETEX 1h)
  └─ 10. Release distributed lock
```

### Idempotency

Idempotency keys are backed by Redis with a 1-hour TTL. Duplicate requests return the original response without re-processing. Distributed locks prevent concurrent transfers on the same accounts.

### Audit Trail

Every significant event is logged to the `audit_events` table:

| Event Type                | Description              |
| ------------------------- | ------------------------ |
| `USER_REGISTERED`         | New user created         |
| `USER_LOGGED_IN`          | Successful login         |
| `ACCOUNT_CREATED`         | New account opened       |
| `TRANSFER_INITIATED`      | Transfer started         |
| `TRANSFER_COMPLETED`      | Transfer succeeded       |
| `TRANSFER_FAILED`         | Transfer errored         |
| `TRANSFER_INSUFFICIENT`   | Balance too low          |
| `IDEMPOTENCY_HIT`         | Duplicate request        |

## API Endpoints

| Method | Endpoint                        | Auth | Description                  |
| ------ | ------------------------------- | ---- | ---------------------------- |
| GET    | `/health`                       | No   | Health check                 |
| GET    | `/health/ready`                 | No   | Kubernetes readiness probe   |
| POST   | `/api/v1/users/register`        | No   | Register new user            |
| POST   | `/api/v1/users/login`           | No   | Login                        |
| POST   | `/api/v1/users/refresh`         | No   | Refresh access token         |
| POST   | `/api/v1/users/logout`          | Yes  | Logout (blacklists tokens)   |
| POST   | `/api/v1/users/forgot-password` | No   | Request password reset       |
| POST   | `/api/v1/users/reset-password`  | No   | Reset password with token    |
| GET    | `/api/v1/users/google`          | No   | Initiate Google OAuth        |
| GET    | `/api/v1/users/google/callback` | No   | Google OAuth callback        |
| POST   | `/api/v1/accounts`              | Yes  | Create account               |
| GET    | `/api/v1/accounts`              | Yes  | List all accounts            |
| POST   | `/api/v1/transactions`          | Yes  | Transfer money (idempotent)  |
| GET    | `/api/v1/transactions/:id`      | Yes  | Transaction history          |
| GET    | `/api/v1/stream/transactions`   | Yes  | SSE live transaction feed    |
| GET    | `/api/v1/audit/recent`          | No   | Recent audit events          |
| GET    | `/api/v1/audit/counts`          | No   | Event counts by type         |

## Project Structure

```
banking_app_backend-main/
├── prisma/
│   ├── migrations/             # Database migrations
│   ├── schema.prisma           # Database schema
│   └── seed.ts                 # Demo data seeder
├── src/
│   ├── server.ts               # Express app, middleware, health checks
│   ├── config/
│   │   └── google-auth.ts      # Google OAuth configuration
│   ├── lib/
│   │   ├── db.ts               # Prisma client singleton
│   │   ├── redis.ts            # Redis client with retry strategy
│   │   ├── logger.ts           # Pino structured logger
│   │   ├── metrics.ts          # Prometheus-compatible metrics
│   │   ├── sentry.ts           # Sentry error tracking
│   │   ├── cache.ts            # Redis caching service
│   │   ├── circuit-breaker.ts  # Circuit breaker pattern
│   │   └── shutdown.ts         # Graceful shutdown handler
│   ├── types/
│   │   └── index.ts            # Zod schemas + TypeScript types
│   ├── middleware/
│   │   ├── auth.ts             # JWT authentication + blacklist check
│   │   ├── rateLimit.ts        # Rate limiters (auth, API, transfer)
│   │   ├── userRateLimit.ts    # Per-user distributed rate limiting
│   │   ├── csp.ts              # Content Security Policy headers
│   │   └── sanitize.ts         # XSS/SQL injection protection
│   ├── utils/
│   │   └── auth.ts             # Password hashing & JWT helpers
│   ├── repositories/           # Database queries (Prisma)
│   ├── controllers/            # Request handlers
│   ├── services/
│   │   ├── streaming.service.ts    # SSE client management
│   │   ├── idempotency.service.ts  # Idempotency + distributed locks
│   │   ├── audit.service.ts        # Event audit logging
│   │   ├── queue.service.ts        # BullMQ job queues
│   │   ├── token.service.ts        # Token blacklist + reset tokens
│   │   └── email.service.ts        # SMTP email service (Nodemailer)
│   ├── routes/                 # Route definitions
│   └── __tests__/              # Jest test suites (38 tests)
├── frontend/                   # Next.js admin dashboard
├── e2e/                        # Playwright E2E tests
├── loadtests/                  # k6 load tests
├── .github/
│   └── workflows/
│       └── ci.yml              # GitHub Actions CI pipeline
├── docker-compose.yml          # PostgreSQL + Redis + API + Frontend
├── Dockerfile                  # Multi-stage production build
├── playwright.config.ts        # Playwright configuration
├── jest.config.ts              # Jest configuration
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## Local Setup

### Quick Start (Docker)

```bash
git clone https://github.com/rishabhhgit/banking-wallet-mvp.git
cd banking-wallet-mvp

# Start all services
docker-compose up -d

# Seed database
docker-compose exec api npm run db:seed

# View logs
docker-compose logs -f api
```

### Manual Setup

```bash
# Install dependencies
npm install

# Start PostgreSQL and Redis (or use Docker)
docker-compose up -d postgres redis

# Configure environment
cp .env.example .env
# Edit .env with your values

# Setup database
npx prisma migrate deploy
npm run db:seed

# Start development server
npm run dev
```

### Environment Variables

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/banking_dev"

# Redis
REDIS_URL="redis://localhost:6379"

# Auth
JWT_SECRET="your-super-secret-jwt-key-minimum-32-characters"
JWT_EXPIRES_IN="15m"
REFRESH_TOKEN_EXPIRES_IN="7d"

# Server
PORT=8000
NODE_ENV="development"
API_URL="http://localhost:8000"
FRONTEND_URL="http://localhost:3000"

# CORS
ALLOWED_ORIGINS="http://localhost:3000"

# Logging
LOG_LEVEL="debug"

# Sentry (Error Tracking)
SENTRY_DSN=""
SENTRY_ENVIRONMENT="development"

# SMTP Email (Nodemailer)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="your-email@gmail.com"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

> **Note:** In development mode (`NODE_ENV !== 'production'`), CORS allows all origins for local development. In production, only `ALLOWED_ORIGINS` are permitted.

> **Note:** If SMTP credentials are not configured, emails are logged to console instead of being sent.

### Run Tests

```bash
# Unit tests
npm test

# Unit tests only (no integration)
npm test -- --testPathIgnorePatterns=integration

# Integration tests (requires Docker)
npm run test:integration

# E2E tests (requires running servers)
npm run test:e2e

# E2E tests with UI
npm run test:e2e:ui

# Watch mode
npm run test:watch
```

## Infrastructure

### Docker Compose

```bash
# Start everything
docker-compose up -d

# Start only database services
docker-compose up -d postgres redis

# Rebuild after changes
docker-compose up -d --build

# Stop and clean up
docker-compose down -v
```

### CI/CD (GitHub Actions)

The pipeline runs on every push/PR:

1. Install dependencies
2. Generate Prisma client
3. Run migrations against PostgreSQL
4. Run unit tests
5. Run integration tests
6. Build production bundle
7. Build Docker image (main branch only)

### Health Checks

```bash
# Basic health
curl http://localhost:8000/health

# Readiness probe (Kubernetes)
curl http://localhost:8000/health/ready
```

Response includes status of PostgreSQL, Redis, job queues, circuit breakers, and SSE client count.

### Graceful Shutdown

Server handles SIGTERM/SIGINT:

1. Stops accepting new connections
2. Waits for in-flight requests to complete
3. Shuts down BullMQ workers
4. Closes Redis connection
5. Exits cleanly (30s timeout before force kill)

## Key Design Decisions

1. **Functional architecture** — No classes, all modules export standalone functions
2. **Serializable isolation** — Prevents double-spending race conditions on concurrent transfers
3. **Distributed idempotency** — Redis-backed with TTL, prevents duplicate transaction processing
4. **Distributed locks** — Redis SET NX prevents concurrent transfers on the same accounts
5. **Structured logging** — Pino with request IDs for traceability across distributed calls
6. **Audit trail** — Every state change logged to database for compliance and debugging
7. **Health checks** — Dependency-aware (Postgres, Redis, queues) for orchestrator integration
8. **Graceful shutdown** — Clean cleanup of connections and workers on process termination
9. **Password excluded from responses** — Repository layer uses Prisma `select` to omit password
10. **Request ID tracking** — UUID propagated through logs and responses for debugging
11. **Token blacklisting** — Logged-out tokens are revoked via Redis blacklist
12. **Password reset flow** — Secure token-based reset with 1-hour expiry, sent via SMTP
13. **Google OAuth** — Social login via Passport.js, creates user on first login
14. **CORS flexibility** — Allows all origins in dev, restricted in production
15. **SMTP email service** — Nodemailer with graceful fallback (logs when unconfigured)

## Deployment

### Frontend (Vercel)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy to Vercel
cd frontend
vercel

# Set environment variables in Vercel dashboard:
# NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app
```

### Backend (Railway)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Initialize project
railway init

# Set environment variables
railway variables set DATABASE_URL="your-postgres-url"
railway variables set REDIS_URL="your-redis-url"
railway variables set JWT_SECRET="your-minimum-32-char-secret"
railway variables set NODE_ENV="production"
railway variables set API_URL="https://your-backend-url.railway.app"
railway variables set FRONTEND_URL="https://your-frontend-url.vercel.app"

# SMTP (for password reset emails)
railway variables set SMTP_HOST="smtp.gmail.com"
railway variables set SMTP_PORT=587
railway variables set SMTP_USER="your-email@gmail.com"
railway variables set SMTP_PASS="your-app-password"

# Google OAuth (optional)
railway variables set GOOGLE_CLIENT_ID="your-google-client-id"
railway variables set GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Deploy
railway up
```

### Docker Deployment

```bash
# Build and start all services
docker-compose up -d --build

# Seed database
docker-compose exec api npm run db:seed

# View logs
docker-compose logs -f
```

## License

MIT — see [LICENSE](LICENSE)

## Author

rishabh jain
