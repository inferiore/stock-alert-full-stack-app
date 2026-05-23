# Stock Alerts App

A production-grade full-stack application that streams real-time stock prices via Finnhub WebSocket, lets users set price-threshold alerts, and delivers push notifications through Firebase Cloud Messaging when thresholds are crossed.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        React Native (Expo)                      │
│                                                                 │
│  AuthStack          AppStack (Bottom Tabs)                      │
│  ├─ LoginScreen     ├─ StocksScreen   ← Socket.io (prices)     │
│  └─ RegisterScreen  ├─ AlertsScreen   ← TanStack Query (CRUD)  │
│                     └─ StockDetailScreen ← REST (candles)       │
│                                                                 │
│  Zustand: authStore (JWT persist) │ stockStore (live prices)   │
└──────────────────┬──────────────────────────────────────────────┘
                   │  HTTP (Axios)  /  Socket.io  /  FCM
┌──────────────────▼──────────────────────────────────────────────┐
│                        NestJS API (port 3000)                   │
│                                                                 │
│  AuthModule      ─── POST /auth/register, /login, /profile     │
│  AlertsModule    ─── POST/GET/DELETE /alerts                    │
│  StocksModule    ─── GET /stocks/:symbol/candles                │
│  GatewayModule   ─── WS /stocks  (subscribe-symbol → price)    │
│  FinnhubModule   ─── wss://ws.finnhub.io (single conn + fanout)│
│  Notifications   ─── Firebase Admin SDK (FCM push)             │
│                                                                 │
│  EventEmitter2 fan-out:                                         │
│    FinnhubService ──price.update──► AlertsService              │
│                              └────► StockPriceGateway           │
│    AlertsService ──alert.triggered─► NotificationsService      │
└──────────────────┬──────────────────────────────────────────────┘
                   │  TypeORM
┌──────────────────▼──────────────────┐
│         MySQL 8 (Docker)            │
│  users  │  alerts                   │
└─────────────────────────────────────┘
```

**Domain modules:**

| Module | Responsibility |
|---|---|
| `AuthModule` | JWT HS256 registration/login, bcrypt hashing, FCM token endpoint |
| `AlertsModule` | Alert CRUD, threshold evaluation via EventEmitter2 |
| `FinnhubModule` | Single persistent WebSocket to Finnhub, exponential-backoff reconnect |
| `GatewayModule` | Socket.io `/stocks` namespace, JWT handshake auth, per-symbol rooms |
| `StocksModule` | Proxies Finnhub REST for 30-day OHLC candle data |
| `NotificationsModule` | Firebase Admin SDK, listens for `alert.triggered` events |

---

## Tech Stack

### Backend

| Technology | Version | Role |
|---|---|---|
| Node.js | 20 (LTS) | Runtime |
| NestJS | ^11 | Framework |
| TypeORM | ^0.3 | ORM |
| MySQL | 8.0 | Database |
| `@nestjs/jwt` | ^11 | JWT signing / validation |
| `passport-jwt` | ^4 | Passport JWT strategy |
| bcrypt | ^6 | Password hashing |
| Socket.io | ^4 | WebSocket gateway |
| ws | ^8 | Finnhub WebSocket client |
| EventEmitter2 | ^3 | Internal event bus |
| firebase-admin | ^13 | FCM push notifications |
| class-validator | ^0.15 | DTO validation |
| TypeScript | ^5.7 | Language |

### Frontend

| Technology | Version | Role |
|---|---|---|
| Expo | ~56 | React Native toolchain |
| React Native | 0.85 | Mobile framework |
| React Navigation | ^7 | Navigation (stack + bottom tabs) |
| Zustand | ^5 | Client state (auth + live prices) |
| TanStack Query | ^5 | Server state (alerts CRUD) |
| Socket.io-client | ^4 | Real-time price subscription |
| Axios | ^1 | HTTP client |
| react-native-gifted-charts | ^1.4 | 30-day price line chart |
| expo-notifications | ~56 | FCM push token + foreground display |
| AsyncStorage | 2.2 | JWT token persistence |
| TypeScript | ~6 | Language |

---

## AIDLC Governance

Every feature follows the **AI Development Life Cycle** pattern enforced via three GitHub Actions workflows and Architecture Decision Records written before complex features are implemented.

### GitHub Actions Workflows

| Workflow | Trigger | What it does |
|---|---|---|
| [`ci.yml`](.github/workflows/ci.yml) | push + PR on `main` | Runs `npm run lint` and `npm run test` for both backend and frontend |
| [`security-scan.yml`](.github/workflows/security-scan.yml) | push to `main`, weekly cron | `npm audit --audit-level=high` on both workspaces + Trivy container scan |
| [`ai-code-review.yml`](.github/workflows/ai-code-review.yml) | pull_request | Invokes `awslabs/aidlc-workflows` reusable workflow; posts AI-generated review as a PR comment |

### Architecture Decision Records

ADRs live in [`docs/adr/`](docs/adr/) and must be written before any complex architectural change is implemented.

| # | Title | Status |
|---|---|---|
| [ADR-001](docs/adr/001-authentication-strategy.md) | Authentication Strategy (JWT HS256 + Custom Repository) | Accepted |
| [ADR-002](docs/adr/002-realtime-finnhub-strategy.md) | Real-time Finnhub Strategy (single WS + EventEmitter2 fan-out) | Accepted |
| [ADR-003](docs/adr/003-fcm-push-notifications.md) | FCM Push Notifications (Firebase Admin + expo-notifications) | Accepted |

---

## Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Docker & Docker Compose | 24+ | Runs MySQL 8 + the API container |
| Node.js | 20 LTS | Required for local development |
| Expo CLI | `npm i -g expo-cli` | For running the React Native app |
| Finnhub account | — | Free tier at finnhub.io — grab your API key |
| Firebase project | — | For FCM push notifications; download the service account JSON |

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `DB_HOST` | ✅ | MySQL host (use `db` inside Docker, `localhost` for local dev) |
| `DB_PORT` | ✅ | MySQL port (default `3306`) |
| `DB_USERNAME` | ✅ | MySQL username |
| `DB_PASSWORD` | ✅ | MySQL password |
| `DB_NAME` | ✅ | Database name (e.g. `stockalerts`) |
| `JWT_SECRET` | ✅ | Secret for signing JWT tokens (min 32 chars recommended) |
| `FINNHUB_API_KEY` | ✅ | Finnhub WebSocket + REST API key |
| `FIREBASE_SERVICE_ACCOUNT` | ⚠️ optional | Stringified Firebase service account JSON; FCM is a no-op if absent |

```env
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=root
DB_NAME=stockalerts
JWT_SECRET=change_me_use_a_long_random_string
FINNHUB_API_KEY=your_finnhub_api_key
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"..."}
```

### Frontend (`frontend/.env` or `app.config.js`)

| Variable | Required | Description |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | ✅ | Backend base URL (e.g. `http://localhost:3000`) |
| `EXPO_PUBLIC_WS_URL` | ✅ | WebSocket URL (e.g. `ws://localhost:3000`) |

```env
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_WS_URL=ws://localhost:3000
```

---

## Running Locally

### 1. Clone and install dependencies

```bash
git clone <repo>
cd designli

# Backend
cd backend && npm install && cd ..

# Frontend
cd frontend && npm install && cd ..
```

### 2. Start the database

```bash
docker-compose up -d db
# Wait for the health check to pass (mysqladmin ping), then:
```

### 3. Start the API

```bash
cd backend
cp .env.example .env   # fill in your values
npm run start:dev
# API is available at http://localhost:3000
```

### 4. Start the mobile app

```bash
cd frontend
npm start              # opens Expo DevTools
# Press 'i' for iOS simulator, 'a' for Android emulator, or scan the QR code
```

### Running everything in Docker

```bash
docker-compose up --build
# API: http://localhost:3000
# DB:  localhost:3306
```

---

## Running Tests

### Backend

```bash
cd backend

# Unit tests (AuthService, AlertsService)
npm run test

# Unit tests with coverage report
npm run test:cov

# E2E tests (Supertest + SQLite in-memory — no Docker required)
npm run test:e2e
```

**Test inventory:**

| Suite | Tests | Type |
|---|---|---|
| `auth.service.spec.ts` | 6 | Unit |
| `alerts.service.spec.ts` | 6 | Unit — evaluatePrice threshold logic |
| `notifications.service.spec.ts` | 2 | Unit |
| `auth.e2e-spec.ts` | 9 | E2E — register, login, profile |
| `alerts.e2e-spec.ts` | 9 | E2E — CRUD + auth guards |
| `app.e2e-spec.ts` | 3 | E2E — smoke (ValidationPipe, JwtAuthGuard) |

### Frontend

```bash
cd frontend

# Run all RNTL tests
npm run test

# Lint (zero warnings policy)
npm run lint
```

**Test inventory:**

| Suite | Tests | Type |
|---|---|---|
| `LoginScreen.test.tsx` | 4 | RNTL — form behaviour, auth flow |
| `AlertsScreen.test.tsx` | 6 | RNTL — list render, CRUD mutations, loading state |

---

## Architectural Constraints

| Constraint | Enforcement |
|---|---|
| Dependency Inversion | Every service implements an `I*Service` interface; modules bind via `useClass` injection token |
| Repository Pattern | Custom TypeORM repositories injected via `@InjectRepository` — no raw `EntityManager` in services |
| DTOs + Validation | All controller inputs are DTO classes decorated with `class-validator`; `ValidationPipe` is global |
| No Redux | Zustand (client state) + TanStack Query (server state) only — no Redux, no Context for global state |
| Commit discipline | One commit per step; all lint + test checks must be green before commit |
| AIDLC | ADR written before every complex feature; GitHub Actions enforces CI on every PR |
