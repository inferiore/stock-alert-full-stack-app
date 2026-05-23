# ADR 003 — FCM Push Notifications

**Date:** 2026-05-23  
**Status:** Accepted  
**Deciders:** Engineering Team

---

## Context

When a user's price alert is triggered, the system must notify them even if the app is in the background or closed. Two delivery mechanisms were considered:

| Mechanism | Background delivery | Infrastructure | Complexity |
|---|---|---|---|
| **WebSocket-only** | ✗ (socket must be open) | None extra | Low |
| **FCM (Firebase Cloud Messaging)** | ✓ (OS-level delivery) | Firebase project | Medium |
| **APNs direct** | ✓ (iOS only) | Apple Dev account + certs | High |
| **Expo Push Notifications** | ✓ (wraps FCM + APNs) | Expo account (optional) | Low–Medium |

WebSocket alone is insufficient because alerts are meant to fire even when the user is not actively using the app.

---

## Decision

**Use Firebase Admin SDK on the backend to send FCM messages directly, and `expo-notifications` on the frontend to obtain the device token and handle foreground messages.**

### Architecture

```
Alert triggered (AlertsService.evaluatePrice)
        │  emits ALERT_TRIGGERED_EVENT (EventEmitter2)
        ▼
NotificationsService  @OnEvent(ALERT_TRIGGERED_EVENT)
        │  reads fcmToken from payload
        │  calls firebase-admin messaging().send(...)
        ▼
FCM / APNs  ──►  Device OS  ──►  expo-notifications
```

### Key decisions

- **Separation of concerns**: `NotificationsService` listens to `ALERT_TRIGGERED_EVENT` via EventEmitter2. `AlertsService` does not depend on `NotificationsService` — this preserves single responsibility and avoids a circular dependency chain.
- **Graceful degradation**: if `FIREBASE_SERVICE_ACCOUNT` env var is absent or empty, `NotificationsService` logs a warning and becomes a no-op. This keeps local development working without a Firebase project.
- **Token storage**: FCM token is stored on the `User` entity (`fcmToken` column, already present). Frontend sends it via `PUT /users/fcm-token` after each login (tokens can rotate).
- **`expo-notifications`**: uses Expo's push token on the frontend which transparently maps to FCM (Android) and APNs (iOS). The backend receives the raw FCM/APNs token via `getDevicePushTokenAsync()` for direct FCM delivery without routing through Expo's servers.

---

## Consequences

**Positive:**
- Background + killed-app delivery guaranteed by the OS.
- `NotificationsService` is a single, replaceable component — swapping FCM for another provider only changes this one service.
- No-op mode in development keeps the rest of the stack fully testable without Firebase credentials.

**Negative / Mitigations:**
- Requires a Firebase project and a service-account JSON → documented in `README.md` and `.env.example`.
- FCM tokens expire or rotate → mitigated by re-sending the token on every login.
- APNs requires a physical device for iOS testing → acceptable for a technical assessment (Android emulator works with FCM).
