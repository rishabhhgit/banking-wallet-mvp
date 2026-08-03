# Banking/Wallet System MVP

A production-grade banking and wallet system built with Node.js, TypeScript, PostgreSQL, and Redis. Features atomic money transfers with serializable isolation, distributed idempotency, real-time SSE streaming, audit logging, and a Next.js admin dashboard.

## Tech Stack

### Backend

| Layer | Technology | Version |
|-------|-----------|---------|
| Language | TypeScript | ^5.9.2 |
| Runtime | Node.js | 18+ |
| Framework | Express.js | ^5.1.0 |
| ORM | Prisma | ^6.14.0 |
| Database | PostgreSQL | 16 |
| Cache / Queue | Redis + BullMQ | 7.x |
| Auth | JWT + bcrypt | ^9.0.2 / ^3.0.2 |
| Validation | Zod | ^4.1.3 |
| Logging | Pino | ^9.x |
| Testing | Jest + ts-jest | ^30.x |
| Security | Helmet, CORS, Rate Limiting | — |

### Frontend

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js | ^16.2.12 |
| Language | TypeScript | ^5.9.2 |
| Styling | Tailwind CSS | ^4.x |
| UI Components | React | ^19.x |
| Icons | Lucide React | ^0.525.0 |
| Fonts | DM Sans, JetBrains Mono | Google Fonts |

### Infrastructure

| Layer | Technology |
|-------|-----------|
| Containerization | Docker + Docker Compose |
| CI/CD | GitHub Actions |
| Process Management | Graceful shutdown with cleanup |

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

- **Routes** -- HTTP method matching and middleware attachment
- **Controllers** -- Input validation (Zod), ownership checks, business logic
- **Repositories** -- Pure database queries via Prisma

### Database Schema

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────────┐
│      User       │       │     Account     │       │    Transaction      │
├─────────────────┤       ├─────────────────┤       ├─────────────────────┤
│ id       (PK)  │──1:N──│ id       (PK)  │──1:N──│ id           (PK)   │
│ email    (UQ)  │       │ userId   (FK)  │       │ amount              │
│ password       │       │ name            │       │ description         │
│ firstName      │       │ balance (Dec)   │       │ type                │
│ lastName       │       │ currency        │       │ status              │
│ createdAt      │       │ type            │       │ debitAccountId (FK) │
│ updatedAt      │       │ createdAt       │       │ creditAccountId(FK) │
└─────────────────┘       │ updatedAt       │       │ createdAt           │
                          └─────────────────┘       │ updatedAt           │
                                                    └─────────────────────┘
                                                            │
                          ┌─────────────────┐               │
                          │   AuditEvent    │               │
                          ├─────────────────┤               │
                          │ id       (PK)  │               │
                          │ eventType      │               │
                          │ userId    (FK) │               │
                          │ metadata       │               │
                          │ createdAt      │               │
                          └─────────────────┘               │
```

### Money Transfer Flow

```
POST /api/transactions
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

| Event Type | Description |
|------------|-------------|
| `USER_REGISTERED` | New user created |
| `USER_LOGGED_IN` | Successful login |
| `ACCOUNT_CREATED` | New account opened |
| `TRANSFER_INITIATED` | Transfer started |
| `TRANSFER_COMPLETED` | Transfer succeeded |
| `TRANSFER_FAILED` | Transfer errored |
| `TRANSFER_INSUFFICIENT_FUNDS` | Balance too low |
| `IDEMPOTENCY_HIT` | Duplicate request detected |

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | No | Health check with dependency status |
| GET | `/health/ready` | No | Kubernetes readiness probe |
| POST | `/api/users/register` | No | Register new user |
| POST | `/api/users/login` | No | Login |
| POST | `/api/users/refresh` | No | Refresh access token |
| POST | `/api/accounts` | Yes | Create checking/savings account |
| GET | `/api/accounts` | Yes | List all accounts |
| POST | `/api/transactions` | Yes | Transfer money (idempotent) |
| GET | `/api/transactions/account/:id` | Yes | Paginated transaction history |
| GET | `/api/stream/transactions` | Yes | SSE live transaction feed |
| GET | `/api/audit/recent` | No | Recent audit events |
| GET | `/api/audit/counts` | No | Event counts by type |

## Project Structure

```
banking_app_backend-main/
├── prisma/
│   ├── schema.prisma           # Database schema (User, Account, Transaction, AuditEvent)
│   └── seed.ts                 # Database seeder with demo data
├── src/
│   ├── server.ts               # Express app, middleware, health checks, graceful shutdown
│   ├── lib/
│   │   ├── db.ts               # Prisma client singleton
│   │   ├── redis.ts            # Redis client with retry strategy
│   │   ├── logger.ts           # Pino structured logger
│   │   └── shutdown.ts         # Graceful shutdown handler
│   ├── types/index.ts          # Zod schemas + TypeScript types
│   ├── middleware/
│   │   ├── auth.ts             # JWT authentication middleware
│   │   └── rateLimit.ts        # Rate limiters (auth, API, transfer)
│   ├── utils/auth.ts           # Password hashing & JWT helpers
│   ├── repositories/           # Database queries (Prisma)
│   ├── controllers/            # Request handlers
│   ├── services/
│   │   ├── streaming.service.ts    # SSE client management
│   │   ├── idempotency.service.ts  # Redis-backed idempotency + distributed locks
│   │   ├── audit.service.ts        # Event audit logging
│   │   └── queue.service.ts        # BullMQ job queues
│   ├── routes/                 # Route definitions
│   └── __tests__/              # Jest test suites (38 tests)
├── frontend/                   # Next.js admin dashboard
├── .github/workflows/ci.yml    # GitHub Actions CI pipeline
├── docker-compose.yml          # PostgreSQL + Redis + API + Frontend
├── Dockerfile                  # Multi-stage production build
├── jest.config.ts              # Jest configuration
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## Local Setup

### Quick Start (Docker)

```bash
git clone <repo-url>
cd banking_app_backend-main

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
npx prisma generate
npx prisma db push
npm run db:seed

# Start development server
npm run dev
```

### Environment Variables

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/banking_dev"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your-super-secret-jwt-key-minimum-32-characters"
JWT_EXPIRES_IN="15m"
PORT=8000
NODE_ENV="development"
ALLOWED_ORIGINS="http://localhost:3000"
LOG_LEVEL="debug"
```

### Run Tests

```bash
# All tests
npm test

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
3. Run test suite against PostgreSQL + Redis
4. Build production bundle
5. Build Docker image (main branch only)

### Health Checks

```bash
# Basic health
curl http://localhost:8000/health

# Readiness probe (Kubernetes)
curl http://localhost:8000/health/ready
```

Response includes status of PostgreSQL, Redis, job queues, and SSE client count.

### Graceful Shutdown

Server handles SIGTERM/SIGINT:
1. Stops accepting new connections
2. Waits for in-flight requests to complete
3. Shuts down BullMQ workers
4. Closes Redis connection
5. Exits cleanly (30s timeout before force kill)

## Key Design Decisions

1. **Functional architecture** -- No classes, all modules export standalone functions
2. **Serializable isolation** -- Prevents double-spending race conditions on concurrent transfers
3. **Distributed idempotency** -- Redis-backed with TTL, prevents duplicate transaction processing
4. **Distributed locks** -- Redis SET NX prevents concurrent transfers on the same accounts
5. **Structured logging** -- Pino with request IDs for traceability across distributed calls
6. **Audit trail** -- Every state change logged to database for compliance and debugging
7. **Health checks** -- Dependency-aware (Postgres, Redis, queues) for orchestrator integration
8. **Graceful shutdown** -- Clean cleanup of connections and workers on process termination
9. **Password excluded from responses** -- Repository layer uses Prisma `select` to omit password
10. **Request ID tracking** -- UUID propagated through logs and responses for debugging

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

MIT -- see [LICENSE](LICENSE)

## Author

rishabh jain
