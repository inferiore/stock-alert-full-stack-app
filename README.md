# Stock Alerts App

A production-grade full-stack application that streams real-time stock prices via Finnhub WebSocket, lets users set price-threshold alerts, and delivers push notifications through Firebase Cloud Messaging when thresholds are crossed.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Tech Stack](#tech-stack)
3. [Repository Layout](#repository-layout)
4. [Backend](#backend)
   - [Entry Point](#entry-point)
   - [Modules](#modules)
   - [Auth Module](#auth-module)
   - [Alerts Module](#alerts-module)
   - [Stocks Module](#stocks-module)
   - [Finnhub Module](#finnhub-module)
   - [Gateway Module](#gateway-module)
   - [Notifications Module](#notifications-module)
   - [Debug Module](#debug-module)
   - [Event System](#event-system)
   - [REST API Reference](#rest-api-reference)
5. [Frontend](#frontend)
   - [Navigation](#navigation)
   - [State Management](#state-management)
   - [Screens](#screens)
   - [Hooks](#hooks)
   - [Services](#services)
   - [Components](#components)
6. [Infrastructure & Deployment](#infrastructure--deployment)
   - [Docker](#docker)
   - [CI/CD (GitHub Actions)](#cicd-github-actions)
7. [Environment Variables](#environment-variables)
8. [Running Locally](#running-locally)
9. [Running Tests](#running-tests)
10. [Android APK Build](#android-apk-build)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     React Native App                        │
│  ┌──────────┐  ┌───────────┐  ┌────────────────────────┐   │
│  │Auth Store│  │Stock Store│  │TanStack Query (alerts) │   │
│  │ (Zustand)│  │ (Zustand) │  │                        │   │
│  └──────────┘  └───────────┘  └────────────────────────┘   │
│       │               ▲                    │                │
│  JWT Bearer     Socket.io price       REST (axios)          │
│       │         events /stocks             │                │
└───────┼─────────────────────────────────────────────────────┘
        │                  │                 │
        ▼                  ▼                 ▼
┌─────────────────────────────────────────────────────────────┐
│                    NestJS API  :3000                        │
│                                                             │
│  AuthModule  AlertsModule  StocksModule  GatewayModule      │
│       │            │            │              │            │
│  UserRepo   AlertsRepo    Yahoo Finance  Socket.io Server   │
│       │            │                          │             │
│  JwtService   EventEmitter2  ◄────────────────┘            │
│                    │                                        │
│            FinnhubModule          NotificationsModule       │
│          (WS → Finnhub)           (Firebase Admin SDK)      │
└───────────────────────────────────────────────────────────-─┘
        │                                        │
        ▼                                        ▼
 ┌─────────────┐                      ┌──────────────────┐
 │  MySQL 8.0  │                      │  Finnhub WS API  │
 │  (TypeORM)  │                      │  wss://ws.finnhub│
 └─────────────┘                      └──────────────────┘
```

**Data flow for a price alert:**

1. Finnhub WebSocket sends a trade → `FinnhubService` emits `price.update`
2. `AlertsService` listens to `price.update`, evaluates active alerts, emits `alert.triggered`
3. `NotificationsService` listens to `alert.triggered`, sends FCM push via Firebase Admin SDK
4. `StockPriceGateway` listens to `price.update`, broadcasts to all Socket.io clients subscribed to that symbol
5. React Native app receives the Socket.io `price` event → Zustand store → re-renders only the affected `StockCard`

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Backend framework | NestJS | ^10 |
| Language | TypeScript | ^5 |
| ORM | TypeORM | ^0.3 |
| Database | MySQL | 8.0 |
| Authentication | JWT (HS256) + Passport | @nestjs/jwt ^10 |
| Real-time (server→client) | Socket.io | ^4 |
| Real-time (Finnhub feed) | `ws` WebSocket client | ^8 |
| Push Notifications | Firebase Admin SDK | ^12 |
| HTTP client (backend) | @nestjs/axios | ^3 |
| Price data (REST) | Yahoo Finance v8 | free |
| Price data (WS) | Finnhub WebSocket | free tier |
| Frontend framework | React Native (Expo Bare) | SDK 54 / RN 0.76 |
| Navigation | React Navigation v6 | native-stack + bottom-tabs |
| Client state | Zustand | ^4 |
| Server state | TanStack Query | ^5 |
| Socket client | socket.io-client | ^4 |
| HTTP client (frontend) | Axios | ^1 |
| Charts | react-native-gifted-charts | latest |
| Push (frontend) | expo-notifications | ~0.29 |
| Containerization | Docker + Compose | multi-stage |
| CI/CD | GitHub Actions | — |
| Registry | GitHub Container Registry | ghcr.io |
| Production host | GCP e2-micro | 35.252.78.112 |

---

## Repository Layout

```
designli/
├── .github/
│   └── workflows/
│       ├── ci.yml              # lint + unit tests on every push/PR
│       ├── security-scan.yml   # npm audit + Trivy
│       ├── ai-code-review.yml  # AIDLC AI-assisted PR review
│       └── deploy.yml          # build Docker image → push to ghcr.io → SSH deploy to GCP
├── docs/
│   └── adr/
│       ├── 001-authentication-strategy.md
│       ├── 002-realtime-finnhub-strategy.md
│       └── 003-fcm-push-notifications.md
├── backend/                    # NestJS API
│   ├── src/
│   │   ├── auth/
│   │   ├── alerts/
│   │   ├── stocks/
│   │   ├── finnhub/
│   │   ├── gateway/
│   │   ├── notifications/
│   │   ├── debug/
│   │   ├── common/
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── test/                   # E2E tests (Supertest)
│   ├── Dockerfile
│   └── package.json
├── frontend/                   # React Native (Expo Bare)
│   ├── src/
│   │   ├── screens/
│   │   ├── hooks/
│   │   ├── store/
│   │   ├── services/
│   │   ├── components/
│   │   └── navigation/
│   ├── android/
│   └── package.json
├── docker-compose.yml          # Local development
├── docker-compose.prod.yml     # Production (GCP)
└── README.md
```

---

## Backend

### Entry Point

**`src/main.ts`**

Bootstraps the NestJS application:
- `ValidationPipe` with `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true` — rejects unknown fields and auto-coerces types
- `enableCors()` — allows all origins (suitable for mobile clients)
- Listens on `PORT` env var, defaulting to `3000`

**`src/app.module.ts`**

Root module that imports all feature modules:
- `ConfigModule.forRoot({ isGlobal: true })` — env vars available everywhere via `ConfigService`
- `EventEmitterModule.forRoot()` — in-process pub/sub for `price.update` and `alert.triggered`
- `TypeOrmModule.forRootAsync()` — MySQL connection from env vars, `synchronize: true` (auto-creates tables)

---

### Modules

```
AuthModule         → users table, JWT auth
AlertsModule       → alerts table, threshold evaluation
StocksModule       → REST proxy to Yahoo Finance and Finnhub
FinnhubModule      → persistent WebSocket to Finnhub
GatewayModule      → Socket.io server (namespace /stocks)
NotificationsModule → Firebase Admin SDK, FCM push
DebugModule        → POST /debug/simulate-price (testing only)
```

All services follow **Dependency Inversion**: every service implements a named interface (`IAuthService`, `IAlertsService`, etc.) and is provided via an injection token. Controllers inject the interface, not the concrete class.

---

### Auth Module

**`src/auth/entities/user.entity.ts`**

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `email` | varchar | Unique |
| `passwordHash` | varchar | bcrypt, 10 rounds |
| `fcmToken` | varchar nullable | Updated by client after login |
| `createdAt` | datetime | Auto |

**`src/auth/repositories/user.repository.ts`**

Custom TypeORM repository wrapping `Repository<User>`. Methods:
- `findByEmail(email)` — used during login/register
- `findById(id)` — used by JWT strategy to validate token subject
- `updateFcmToken(id, token)` — called when client registers device

**`src/auth/auth.service.ts`** implements `IAuthService`

- `register(dto)` — checks email uniqueness, hashes password with bcrypt (10 rounds), persists user, returns JWT + user object
- `login(dto)` — looks up user by email, compares bcrypt hash, returns JWT + user object
- `validateUser(id)` — called by JWT strategy on every authenticated request

**`src/auth/strategies/jwt.strategy.ts`**

Passport JWT strategy. Extracts Bearer token from `Authorization` header, decodes payload `{ sub, email }`, calls `authService.validateUser(sub)`, and attaches the full `User` entity to `request.user`.

**`src/auth/decorators/current-user.decorator.ts`**

Parameter decorator `@CurrentUser()` that extracts `request.user` from the NestJS execution context. Used in every protected controller method.

**Endpoints (`AuthController`)**

| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| POST | `/auth/register` | — | `{ email, password }` | `{ accessToken, user }` |
| POST | `/auth/login` | — | `{ email, password }` | `{ accessToken, user }` |
| GET | `/auth/profile` | JWT | — | `{ id, email }` |

**Endpoints (`UsersController`)**

| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| PUT | `/users/fcm-token` | JWT | `{ fcmToken }` | 204 No Content |

---

### Alerts Module

**`src/alerts/entities/alert.entity.ts`**

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `userId` | varchar | Foreign key → users.id (CASCADE DELETE) |
| `symbol` | varchar | e.g. `AAPL`, always uppercase |
| `targetPrice` | decimal(18,4) | Threshold price |
| `condition` | enum `above`/`below` | Stored as `simple-enum` (varchar) for SQLite compat |
| `active` | boolean | `false` once triggered |
| `createdAt` | datetime | Auto |

**`src/alerts/repositories/alerts.repository.ts`**

- `findByUser(userId)` — returns all active alerts for a user
- `findActiveBySymbol(symbol)` — returns active alerts for a symbol with eager user relation (needed for FCM token)
- `findOneByUser(id, userId)` — ownership check before delete
- `deactivate(id)` — sets `active = false` after trigger
- `remove(id)` — hard-deletes alert

**`src/alerts/alerts.service.ts`** implements `IAlertsService`

- `create(userId, dto)` — persists alert, returns DTO
- `findAllByUser(userId)` — returns all active alerts for the authenticated user
- `remove(id, userId)` — checks ownership (throws `ForbiddenException` if userId mismatch), deletes
- `evaluatePrice(payload)` — decorated with `@OnEvent('price.update')`. Loads all active alerts for the symbol, checks each against current price, deactivates triggered alerts, emits `alert.triggered` with user's FCM token

**Price evaluation logic:**
```
triggered = (condition === 'above' && price >= targetPrice)
         || (condition === 'below' && price <= targetPrice)
```

**Endpoints (`AlertsController`)** — all require JWT

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/alerts` | `{ symbol, targetPrice, condition }` | `AlertResponseDto` 201 |
| GET | `/alerts` | — | `AlertResponseDto[]` 200 |
| DELETE | `/alerts/:id` | — | 204 No Content |

---

### Stocks Module

**`src/stocks/stocks.service.ts`** implements `IStocksService`

Three methods, all returning live data:

**`searchSymbols(query)`**
- Calls `GET https://finnhub.io/api/v1/search?q=<query>&token=<key>`
- Filters to `type === 'Common Stock'`, returns top 10 results as `{ symbol, description, type }`

**`getQuote(symbol)`**
- Calls `GET https://finnhub.io/api/v1/quote?symbol=<SYMBOL>&token=<key>`
- Maps Finnhub response fields (`c`, `d`, `dp`, `h`, `l`, `o`, `pc`) to named `QuotePoint` object
- Returns: `{ symbol, price, change, changePercent, high, low, open, prevClose }`

**`getCandles(symbol)`**
- Calls Yahoo Finance v8: `GET https://query1.finance.yahoo.com/v8/finance/chart/<SYMBOL>?interval=1d&range=1mo`
- Requires `User-Agent: Mozilla/5.0` header (Yahoo blocks requests without it)
- Returns array of `CandlePoint`: `{ timestamp, open, high, low, close, volume }` for the last 30 trading days
- Filters out candles where `close === 0` (market holidays / missing data)

**Endpoints (`StocksController`)** — all require JWT

| Method | Path | Query/Param | Response |
|---|---|---|---|
| GET | `/stocks/search` | `?q=<query>` | `{ symbol, description, type }[]` |
| GET | `/stocks/:symbol/quote` | `:symbol` | `QuotePoint` |
| GET | `/stocks/:symbol/candles` | `:symbol` | `CandlePoint[]` |

---

### Finnhub Module

**`src/finnhub/finnhub.service.ts`** implements `IFinnhubService`, `OnApplicationBootstrap`, `OnApplicationShutdown`

Manages a single persistent WebSocket connection to `wss://ws.finnhub.io?token=<key>`.

**Lifecycle:**
- `onApplicationBootstrap()` — opens the WebSocket connection
- `onApplicationShutdown()` — cleanly closes the connection; sets `destroyed = true` to prevent reconnect

**Reconnection:** exponential backoff starting at 1 s, capped at 30 s. On reconnect, re-subscribes all symbols in `subscribedSymbols` set.

**Incoming messages:** Finnhub sends `{ type: 'trade', data: [{ s, p, t }] }` for each trade. Each trade is emitted as a `price.update` event via `EventEmitter2`.

**`subscribe(symbol)`** — adds to `subscribedSymbols` set; sends `{ type: 'subscribe', symbol }` if WS is open
**`unsubscribe(symbol)`** — removes from set; sends `{ type: 'unsubscribe', symbol }` if WS is open

---

### Gateway Module

**`src/gateway/stock-price.gateway.ts`**

Socket.io server on namespace `/stocks` with CORS open to all origins.

**Authentication:** `WsJwtGuard` validates the JWT passed in the Socket.io handshake `auth.token` field on every `@SubscribeMessage` handler.

**Events:**

| Direction | Event | Payload |
|---|---|---|
| Client → Server | `subscribe-symbol` | `string` (symbol) |
| Client → Server | `unsubscribe-symbol` | `string` (symbol) |
| Server → Client | `price` | `{ symbol, price, timestamp }` |

**`subscribe-symbol` handler:**
1. Joins the Socket.io room named after the symbol (e.g. room `AAPL`)
2. Calls `finnhubService.subscribe(symbol)` so Finnhub starts sending trades

**`@OnEvent('price.update')` handler:**
Broadcasts `price` event to all clients in the symbol's room.

---

### Notifications Module

**`src/notifications/notifications.service.ts`** implements `INotificationsService`, `OnModuleInit`

**`onModuleInit()`** — Parses `FIREBASE_SERVICE_ACCOUNT` env var (JSON string of a Firebase service account). Initializes `firebase-admin` if the project ID is present. Gracefully disables push if the env var is absent or malformed (no crash).

**`sendPushNotification(fcmToken, title, body)`** — sends via `admin.messaging().send()` with:
- `android: { priority: 'high' }` — wakes the device
- `apns: { payload: { aps: { sound: 'default', badge: 1 } } }` — for iOS

Stale/invalid FCM tokens are caught and logged without throwing.

**`@OnEvent('alert.triggered')` handler** — builds notification text:
- Above: `"AAPL hit $195.40 — above your $190 target"`
- Below: `"AAPL hit $185.00 — below your $190 target"`

Skips silently if `fcmToken` is null.

---

### Debug Module

**`src/debug/debug.controller.ts`**

Single endpoint for testing the full alert pipeline without waiting for a real Finnhub trade:

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/debug/simulate-price` | `{ symbol, price }` | `{ ok: true, payload }` |

Emits a `price.update` event directly into `EventEmitter2`, which triggers `AlertsService.evaluatePrice` → potential `alert.triggered` → FCM push.

---

### Event System

**`src/common/events.constants.ts`**

Two events flow through `EventEmitter2` in-process:

```
price.update  →  payload: { symbol, price, timestamp }
                 Consumed by: AlertsService, StockPriceGateway

alert.triggered → payload: { alertId, userId, fcmToken, symbol,
                              targetPrice, condition, currentPrice }
                 Consumed by: NotificationsService
```

This decouples `FinnhubService` from `AlertsService` and `NotificationsService` from `AlertsService` — each module only knows about the event, not the publisher or subscriber.

---

### REST API Reference

Base URL: `http://35.252.78.112:3000` (production) or `http://localhost:3000` (local)

All endpoints marked **JWT** require `Authorization: Bearer <token>`.

```
POST   /auth/register          Body: { email, password }
POST   /auth/login             Body: { email, password }
GET    /auth/profile           [JWT]

PUT    /users/fcm-token        [JWT]  Body: { fcmToken }

GET    /stocks/search          [JWT]  Query: ?q=<string>
GET    /stocks/:symbol/quote   [JWT]
GET    /stocks/:symbol/candles [JWT]

POST   /alerts                 [JWT]  Body: { symbol, targetPrice, condition }
GET    /alerts                 [JWT]
DELETE /alerts/:id             [JWT]

POST   /debug/simulate-price   Body: { symbol, price }
```

---

## Frontend

### Navigation

**`src/navigation/RootNavigator.tsx`**

Two navigator trees driven by JWT presence in the Zustand auth store:

```
RootNavigator
├── AuthNavigator (no token)
│   ├── LoginScreen
│   └── RegisterScreen
└── AppNavigator (token present)
    ├── TabNavigator
    │   ├── StocksScreen   (tab: 📈)
    │   └── AlertsScreen   (tab: 🔔)
    └── StockDetailScreen  (pushed from StocksScreen)
```

`RootNavigator` calls `usePushNotifications()` on mount — this is the single place where FCM registration runs, ensuring it happens once after login.

A splash/loading view (ActivityIndicator) is shown while Zustand rehydrates from AsyncStorage (`isHydrated` flag).

---

### State Management

**`src/store/authStore.ts`** — Zustand + `persist` middleware

| State field | Type | Purpose |
|---|---|---|
| `token` | `string \| null` | JWT, drives navigator |
| `user` | `{ id, email } \| null` | Displayed in UI |
| `isHydrated` | `boolean` | Prevents flash of wrong navigator on cold start |

Persisted to `AsyncStorage` under key `auth-storage`. On rehydration, `setHydrated()` is called so `RootNavigator` stops showing the splash.

**`src/store/stockStore.ts`** — Zustand (no persistence)

```ts
prices: Record<string, number>   // { 'AAPL': 195.40, 'MSFT': 400.00, ... }
updatePrice(symbol, price)        // called by useStockSocket
```

`StockCard` reads only `prices[symbol]` via an isolated selector — only the card whose symbol changed re-renders, preventing a full list re-render on every trade.

---

### Screens

**`LoginScreen`** (`src/screens/auth/LoginScreen.tsx`)

Form with email + password fields. On submit calls `POST /auth/login`, on success calls `authStore.setAuth()` which triggers navigation to `AppNavigator`. On any error shows: _"Invalid credentials. Please try again."_

**`RegisterScreen`** (`src/screens/auth/RegisterScreen.tsx`)

Same form layout. Client-side validates `password.length >= 8`. Calls `POST /auth/register`, on success auto-logs in (same `setAuth` call). On error shows: _"Email may already be in use."_

**`StocksScreen`** (`src/screens/app/StocksScreen.tsx`)

- Hard-coded watchlist: `['AAPL', 'GOOGL', 'TSLA', 'MSFT', 'AMZN', 'NVDA']`
- Calls `useStockSocket(WATCHLIST)` to open the Socket.io connection and subscribe to all symbols
- On mount, fetches current quote for each symbol via `GET /stocks/:symbol/quote` so cards show a price immediately rather than waiting for the next trade
- Renders a `FlatList` of `StockCard` components
- Sign Out button clears the Zustand store (JWT removed → navigator switches to AuthStack)

**`AlertsScreen`** (`src/screens/app/AlertsScreen.tsx`)

- **Create form:** `SymbolSearchInput` (autocomplete search), price input, Above/Below toggle, Create button
- **Alert list:** `FlatList` backed by TanStack Query `useAlerts()`. Each row shows symbol, condition arrow, target price, and a delete (✕) button
- Creating an alert calls `useMutation → POST /alerts`, then auto-invalidates the `['alerts']` query
- Deleting calls `useMutation → DELETE /alerts/:id`, then invalidates

**`StockDetailScreen`** (`src/screens/app/StockDetailScreen.tsx`)

Receives `symbol` as a route param. Shows:
- **Live price card** — reads from Zustand `stockStore.prices[symbol]` (updated in real time by Socket.io)
- **30-day line chart** — fetches via `GET /stocks/:symbol/candles` using TanStack Query (5-minute stale time). Rendered with `react-native-gifted-charts` as an area chart of daily closing prices
- **Stats row** — 30d High, 30d Low, number of candle points

---

### Hooks

**`useStockSocket(symbols)` — `src/hooks/useStockSocket.ts`**

Manages the Socket.io connection lifecycle:
1. Reads JWT from auth store
2. Opens `socket.io-client` to `{WS_URL}/stocks` with `auth: { token }` and `transports: ['websocket']`
3. On `connect`: emits `subscribe-symbol` for each symbol in the list
4. On `price` event: calls `stockStore.updatePrice(symbol, price)`
5. On unmount: disconnects socket

Only reconnects when the JWT changes (not when the symbol list changes).

**`useAlerts()` / `useCreateAlert()` / `useDeleteAlert()` — `src/hooks/useAlerts.ts`**

TanStack Query wrappers:
- `useAlerts()` — `GET /alerts`, query key `['alerts']`
- `useCreateAlert()` — mutation `POST /alerts`, invalidates `['alerts']` on success
- `useDeleteAlert()` — mutation `DELETE /alerts/:id`, invalidates `['alerts']` on success

**`usePushNotifications()` — `src/hooks/usePushNotifications.ts`**

Runs once after login (invoked from `RootNavigator`):
1. Returns early on simulator/emulator (`Device.isDevice` check)
2. Creates Android notification channel `"Stock Alerts"` with `HIGH` importance
3. Requests notification permission; returns early if denied
4. Calls `Notifications.getDevicePushTokenAsync()` to get the raw FCM (Android) / APNs (iOS) token
5. Syncs the token via `PUT /users/fcm-token`
6. Registers a foreground notification listener — notifications show as banners while the app is open (via `setNotificationHandler`)

---

### Services

**`src/services/api.ts`**

Single Axios instance (`apiClient`) with `baseURL = EXPO_PUBLIC_API_URL`.

A request interceptor automatically attaches `Authorization: Bearer <token>` from the Zustand store to every outgoing request — no need to pass the token manually anywhere.

Exports named API objects:

| Object | Methods |
|---|---|
| `authApi` | `register(email, password)`, `login(email, password)` |
| `stocksApi` | `searchSymbols(q)`, `getQuote(symbol)`, `getCandles(symbol)` |
| `usersApi` | `updateFcmToken(token)` |
| `alertsApi` | `getAll()`, `create(data)`, `remove(id)` |

---

### Components

**`StockCard`** (`src/components/StockCard.tsx`)

Wrapped in `React.memo`. Reads price from Zustand via `useStockStore(s => s.prices[symbol])` — isolated selector ensures only this card re-renders when its symbol's price changes. Tapping navigates to `StockDetailScreen`.

**`SymbolSearchInput`** (`src/components/SymbolSearchInput.tsx`)

Autocomplete text input for stock symbol search:
- Debounces keystrokes, calls `GET /stocks/search?q=<query>`
- Shows a dropdown of up to 10 `{ symbol, description }` results
- On selection: updates parent via `onSelect(symbol)` callback, clears dropdown

---

## Infrastructure & Deployment

### Docker

**`backend/Dockerfile`** — multi-stage build

```
Stage 1 (builder): node:20-alpine
  - npm ci (installs all deps including devDeps)
  - npm run build → dist/

Stage 2 (production): node:20-alpine
  - npm ci --omit=dev --omit=optional (production deps only)
  - Copies dist/ from builder
  - CMD ["node", "dist/main"]
```

**`docker-compose.yml`** — local development

- `db`: MySQL 8.0 with healthcheck
- `api`: built locally from `./backend`, mounts source volume for hot-reload, `NODE_ENV=development`

**`docker-compose.prod.yml`** — production (GCP)

- `db`: MySQL 8.0, `mem_limit: 512m`, no port exposure (internal network only)
- `api`: pulls pre-built image from `ghcr.io/inferiore/stock-alerts-api:latest`, `mem_limit: 512m`, exposes port 3000

---

### CI/CD (GitHub Actions)

**`.github/workflows/ci.yml`** — triggers on every push and PR to `main`

| Job | Steps |
|---|---|
| `lint-backend` | `npm ci` → `npm run lint` (ESLint) |
| `test-backend` | `npm ci` → `npm run test -- --coverage` → upload coverage artifact |
| `lint-frontend` | `npm ci` → `npm run lint` |

**`.github/workflows/security-scan.yml`** — triggers on push to `main` and weekly schedule

- `npm audit --audit-level=high` for backend and frontend
- Trivy container scan of the Docker image

**`.github/workflows/ai-code-review.yml`** — triggers on pull requests

- Uses AIDLC (awslabs/aidlc-workflows) to post an AI-generated code review comment on the PR

**`.github/workflows/deploy.yml`** — triggers on push to `main`

Two sequential jobs:

1. **`build-and-push`**
   - Logs into `ghcr.io` with `GITHUB_TOKEN`
   - Builds the backend Docker image (production stage)
   - Pushes as `ghcr.io/inferiore/stock-alerts-api:latest`

2. **`deploy`** (needs `build-and-push`)
   - SSH into `35.252.78.112` using `GCP_SSH_KEY` secret
   - `git pull` latest code (for `docker-compose.prod.yml` and `.env`)
   - `docker compose -f docker-compose.prod.yml pull` → pulls new image
   - `docker compose -f docker-compose.prod.yml up -d` → rolling restart

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Example |
|---|---|---|
| `DB_HOST` | MySQL host | `localhost` / `db` |
| `DB_PORT` | MySQL port | `3306` |
| `DB_USERNAME` | MySQL user | `root` |
| `DB_PASSWORD` | MySQL password | `root` |
| `DB_NAME` | Database name | `stockalerts` |
| `JWT_SECRET` | HS256 signing secret | `your_secret_here` |
| `FINNHUB_API_KEY` | Finnhub API key | `d1xxxxx` |
| `FIREBASE_SERVICE_ACCOUNT` | Firebase service account JSON (stringified) | `{"type":"service_account",...}` |
| `PORT` | API listen port (optional) | `3000` |

### Frontend (`frontend/.env`)

| Variable | Description | Example |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | Backend REST base URL | `http://35.252.78.112:3000` |
| `EXPO_PUBLIC_WS_URL` | Backend WebSocket base URL | `ws://35.252.78.112:3000` |

> **Important:** `EXPO_PUBLIC_*` variables are baked into the JavaScript bundle at build time. Changing the `.env` requires a new APK build to take effect.

---

## Running Locally

### Prerequisites

- Docker & Docker Compose
- Node.js 20
- A Finnhub API key (free at finnhub.io)

### Steps

```bash
# 1. Clone the repo
git clone https://github.com/inferiore/stock-alert-full-stack-app.git
cd stock-alert-full-stack-app

# 2. Create backend env file
cp backend/.env.example backend/.env
# Edit backend/.env — set FINNHUB_API_KEY and JWT_SECRET at minimum

# 3. Set frontend env
echo "EXPO_PUBLIC_API_URL=http://localhost:3000" > frontend/.env
echo "EXPO_PUBLIC_WS_URL=ws://localhost:3000" >> frontend/.env

# 4. Start database and API
docker compose up -d

# 5. Start frontend (Expo)
cd frontend
npm install
npx expo start
```

The API will be available at `http://localhost:3000`. TypeORM `synchronize: true` creates all tables on first start.

---

## Running Tests

### Backend unit tests

```bash
cd backend
npm run test                  # run all unit tests
npm run test -- --coverage    # with coverage report
npm run test:e2e              # E2E tests (requires no running DB — uses in-memory SQLite)
```

Key test files:
- `src/auth/auth.service.spec.ts` — register, login, wrong password
- `src/alerts/alerts.service.spec.ts` — price evaluation logic (triggers above/below, does not trigger)
- `test/auth.e2e-spec.ts` — full HTTP flow: register → login → profile → 401
- `test/alerts.e2e-spec.ts` — full HTTP flow: create → list → delete → 401

### Frontend tests

```bash
cd frontend
npm run test                  # Jest + React Native Testing Library
```

Key test files:
- `src/screens/auth/__tests__/LoginScreen.test.tsx`
- `src/screens/app/__tests__/AlertsScreen.test.tsx`

---

## Android APK Build

### Prerequisites

- Android Studio (for JDK) or a standalone JDK 17+
- Android SDK (installed via Android Studio)

### Debug build

```bash
cd frontend/android
JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" \
  ./gradlew assembleDebug
# Output: app/build/outputs/apk/debug/app-debug.apk
```

### Release build

```bash
cd frontend/android
JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" \
  ./gradlew assembleRelease -x lintRelease
# Output: app/build/outputs/apk/release/app-release.apk
```

### Install directly to connected device

```bash
adb install -r app/build/outputs/apk/release/app-release.apk
```

> **Note:** The release APK requires `android:usesCleartextTraffic="true"` in `AndroidManifest.xml` to reach the API over plain HTTP. This is already set in the manifest.
