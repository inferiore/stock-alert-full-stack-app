# ADR 001 — Authentication Strategy

**Date:** 2026-05-22  
**Status:** Accepted  
**Deciders:** Engineering Team

---

## Context

The application needs a stateless authentication mechanism that:

- Works across both REST endpoints and the WebSocket Gateway.
- Scales horizontally without shared session storage.
- Integrates cleanly with NestJS Guards and Passport.
- Stores minimal user data server-side (no session table).

Two approaches were considered:

| Approach | Pros | Cons |
|---|---|---|
| **Session-based (express-session + Redis)** | Easy revocation, no token size limits | Requires Redis, stateful, harder to scale |
| **JWT (HS256) + Passport** | Stateless, works over WS handshake, no extra infra | Token cannot be revoked mid-life without a denylist |

---

## Decision

**Use JWT (HS256) signed with a secret from `JWT_SECRET` env var, validated via Passport `passport-jwt` strategy.**

- Access tokens expire in **1 hour**. Refresh tokens are out of scope for this assessment.
- Password hashing uses `bcrypt` with cost factor **10**.
- All protected REST routes use a `JwtAuthGuard` (`@UseGuards(JwtAuthGuard)`).
- The WebSocket Gateway authenticates by reading `socket.handshake.auth.token`.
- **Repository Pattern**: A `UserRepository` class wraps `Repository<User>` from TypeORM, keeping data-access logic out of `AuthService` and making it mockable in unit tests.
- **Dependency Inversion**: `AuthService` implements `IAuthService`; the module registers it as `{ provide: AUTH_SERVICE_TOKEN, useClass: AuthService }`, so the controller depends on the token, not the concrete class.

---

## Consequences

**Positive:**
- Zero infrastructure beyond MySQL — no Redis needed.
- WebSocket authentication is straightforward (JWT in handshake).
- `UserRepository` is easy to mock in unit tests (no `DataSource` required).

**Negative / Mitigations:**
- Tokens cannot be invalidated before expiry → acceptable for a technical test; a production app would add a Redis denylist or short TTL + refresh token rotation.
- `JWT_SECRET` must be kept out of source control → enforced by `.gitignore` on `.env`.
