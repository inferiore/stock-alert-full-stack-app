# ADR 002 — Real-Time Finnhub Strategy

**Date:** 2026-05-22  
**Status:** Accepted  
**Deciders:** Engineering Team

---

## Context

The application needs live stock prices to:
1. Emit them to connected clients via a WebSocket Gateway (PASO 4).
2. Compare them against stored user alerts and fire push notifications (PASO 6).

Finnhub offers two data paths:

| Path | Latency | Rate limit (free tier) |
|---|---|---|
| **REST** `GET /quote` | ~500 ms per call | 60 req/min |
| **WebSocket** `wss://ws.finnhub.io` | ~100 ms push | 1 connection, unlimited trade events for subscribed symbols |

Polling REST for N symbols every second would exhaust the free-tier limit at N > 1. The WebSocket is the only viable approach for real-time multi-symbol data.

### Options evaluated for managing the Finnhub WS connection

| Option | Pros | Cons |
|---|---|---|
| **A — One persistent connection, managed by a NestJS service** | Single TCP connection, low overhead, clean lifecycle | Single point of failure (mitigated by reconnect) |
| **B — One connection per WebSocket client** | Simpler fan-out | Multiplies Finnhub connections, hits rate limits immediately |
| **C — External message broker (Redis Pub/Sub)** | Horizontally scalable | Over-engineered for a single-node technical test |

---

## Decision

**Option A: single persistent `ws` connection owned by `FinnhubService`, fan-out via `EventEmitter2`.**

Architecture:

```
Finnhub WSS ──► FinnhubService (Node ws client)
                      │  emits 'price.update' via EventEmitter2
                      ▼
             AlertsService (evaluates thresholds)
                      │  emits 'alert.triggered' via EventEmitter2
                      ▼
          NotificationsService (FCM push — PASO 6)

             StockPriceGateway (listens to 'price.update')
                      │  emits 'price' to Socket.io rooms
                      ▼
              React Native clients
```

### Key implementation details

- **`FinnhubService`** implements `OnApplicationBootstrap` / `OnApplicationShutdown` for clean lifecycle management.
- **Reconnect strategy**: exponential backoff (1 s → 2 s → 4 s … max 30 s) on `close` / `error` events. Resubscribes to all previously subscribed symbols after reconnect.
- **Symbol registry**: `FinnhubService` maintains a `Set<string>` of subscribed symbols; `subscribe(symbol)` is idempotent.
- **`EventEmitter2`** (from `@nestjs/event-emitter`) decouples the producer (`FinnhubService`) from consumers (`AlertsService`, `StockPriceGateway`) without circular dependencies.

---

## Consequences

**Positive:**
- Zero extra infrastructure. Works on the free Finnhub tier.
- `EventEmitter2` makes it trivial to add new consumers (e.g., logging, analytics) without modifying `FinnhubService`.
- Reconnect logic ensures price data resumes automatically after a network hiccup.

**Negative / Mitigations:**
- Single connection — if the process restarts, all subscriptions are lost until reconnect. Mitigated by the symbol registry + re-subscribe on reconnect.
- `EventEmitter2` is in-process only — a multi-instance deployment would need Redis Pub/Sub. Acceptable for this assessment scope.
