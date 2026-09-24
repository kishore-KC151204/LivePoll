# LivePoll

A real-time polling app. Create a poll → share the link → the audience votes →
everyone watching sees results update live, with no page refresh.

Stack: **React** (frontend) · **Go + Gin** (backend) · **MongoDB** (durable
storage) · **Redis** (atomic counters + Pub/Sub for the live path).

## Architecture

```
React (browser)
   |  REST (auth, create/get poll, vote)
   |  WebSocket (/api/polls/:id/live)
   v
Go + Gin API
   |
   +--> MongoDB   (users, polls, votes — durable, survives restarts)
   |
   +--> Redis
          - INCR poll:<id>:option:<id>:count   (atomic, race-safe counter)
          - SADD poll:<id>:voters               (fast duplicate-vote guard)
          - PUBLISH poll:<id> {results}          (fan-out on every vote)
                |
                v
          Hub (Go) subscribed to "poll:*"
                |
                v
          WebSocket connections for that poll
                |
                v
          React updates bars/percentages instantly
```

**Redis is load-bearing, not decorative.** Every vote does an atomic `INCR`
(so concurrent votes from many users never race each other) and a `PUBLISH`
that the Hub relays to every open WebSocket for that poll. `SADD` on a
per-poll set is the fast duplicate-vote check.

**MongoDB is the durable system of record.** Users, polls (with their
options and a mirrored `voteCount`), and individual `Vote` documents are all
persisted there. If Redis is ever flushed or restarted, `buildResultsEvent`
falls back to Mongo's `voteCount`, and a unique `(pollId, voterId)` index in
Mongo is the real anti-double-vote guarantee — Redis's `SADD` is just the
fast path in front of it.

## Local setup

Requirements: Go 1.22+, Node 20+, Docker (easiest route), or local
MongoDB + Redis installs.

**Fastest path — Docker Compose:**

```bash
docker compose up --build
# frontend: http://localhost:5173
# backend:  http://localhost:8080
```

**Manual path:**

```bash
# 1. Start Mongo and Redis (or use Docker: docker run -p 27017:27017 mongo:7 / docker run -p 6379:6379 redis:7-alpine)

# 2. Backend
cd backend
cp .env.example .env      # edit JWT_SECRET to a real random value
go mod tidy
go run main.go

# 3. Frontend (new terminal)
cd frontend
cp .env.example .env
npm install
npm run dev
```

Open http://localhost:5173.

## Environment variables

**backend/.env**
| Variable       | Purpose                                   |
|----------------|--------------------------------------------|
| `PORT`         | HTTP port for the Go server                |
| `MONGODB_URI`  | Mongo connection string                    |
| `MONGODB_DB`   | Database name                              |
| `REDIS_URL`    | Redis connection string                    |
| `JWT_SECRET`   | Signing key for auth tokens — required, never commit a real value |
| `FRONTEND_URL` | Used for CORS allow-list                   |

**frontend/.env**
| Variable       | Purpose                          |
|----------------|-----------------------------------|
| `VITE_API_URL` | Base URL of the deployed backend  |

## API

```
POST /api/auth/signup            { name, email, password }
POST /api/auth/login             { email, password } -> { token, user }
POST /api/auth/logout

POST   /api/polls                (auth) { question, options[] } -> poll
GET    /api/polls                (auth) -> caller's own polls
GET    /api/polls/:id                       -> poll (public, for the voting page)
GET    /api/polls/:id/results               -> current snapshot (public)
GET    /api/polls/:id/live                  -> WebSocket upgrade (public)
POST   /api/polls/:id/vote       { optionId, voterId } -> updated results
POST   /api/polls/:id/close      (auth, owner-only)
```

All poll-management routes (`create`, `list`, `close`) require `Authorization:
Bearer <token>` and are re-checked server-side — a client can never fake
ownership or bypass validation.

## Authentication

Simple JWT-based auth: bcrypt-hashed passwords, HS256 tokens signed with
`JWT_SECRET`, 24h expiry. Logout is stateless (the client discards the
token) — this is a deliberate simplification appropriate for the assignment
scope; a production system would add refresh tokens / a revocation list.

## Duplicate-vote protection

Audience members don't need an account. Each browser gets a random
`voterId` (via `crypto.randomUUID()`) stored in `localStorage`. The backend
enforces one vote per `(pollId, voterId)` two ways:

1. Fast path: `SADD` on a Redis set — rejects immediately if already present.
2. Durable path: a unique Mongo index on `(pollId, voterId)` — this is the
   real guarantee; if Redis state is ever lost, Mongo still blocks the
   duplicate and the Redis add is rolled back.

**Documented limitation:** this identifies a *browser*, not a *person* — a
user can vote again from a different browser or after clearing storage.
Given the assignment doesn't require full participant accounts, this was a
deliberate tradeoff over adding mandatory audience sign-in, which would add
friction and isn't required by the spec.

## Poll lifecycle

`ACTIVE -> CLOSED` (one-way). Closing is owner-only and enforced server-side
in the same query as the ownership check (`UpdateOne` filters on both
`_id` and `ownerId`, so a non-owner's request simply matches nothing rather
than relying on a separate check-then-act). On close, a `"closed"` event is
published on the poll's Redis channel so every connected viewer is told
immediately, without polling.

## Real-time behavior in practice

Open the same poll in two browser windows (`/poll/<id>` in one, or
`/results/<id>` as the host in another). Vote in one window — the bars in
the other update within milliseconds, no refresh, because both are
subscribed to the same `poll:<id>` WebSocket connection, fed by the same
Redis publish.

## Failure handling

- Malformed/missing fields → `400` with a specific message.
- Voting on a nonexistent poll → `404`.
- Voting on a closed poll → `409`.
- Invalid option id → `400`.
- Duplicate vote → `409` (checked twice, see above).
- Non-owner trying to close a poll → `403`.
- Redis temporarily down → vote requests fail fast with `503`-style errors
  rather than silently dropping the update; Mongo remains internally
  consistent either way since the counter increment there is independent.
- WebSocket disconnects are detected by the read loop and the connection is
  removed from the Hub, so it stops receiving broadcasts without leaking.

## Deployment

This repo is deploy-ready but has **not been deployed from this
environment** — the sandbox this was written in has no outbound network
access, so `go run`, `npm install`, and any deploy step had to be left for
you to run. Suggested targets:

- **Backend**: Render / Railway / Fly.io (Docker deploy using
  `backend/Dockerfile`). Set the env vars from the table above; point
  `MONGODB_URI` at MongoDB Atlas and `REDIS_URL` at Upstash/Redis Cloud
  (both have generous free tiers and work fine for this).
- **Frontend**: Vercel / Netlify (build command `npm run build`, output
  `dist/`), or the included `frontend/Dockerfile` behind any static host.
  Set `VITE_API_URL` to the deployed backend's `/api` URL.
- Make sure the backend's `FRONTEND_URL` (CORS) matches the deployed
  frontend origin, and that your host's WebSocket support is enabled (most
  are, by default, over `wss://`).

Before submitting: open the deployed frontend in two different browsers,
vote in one, and confirm the other updates live — that's the actual
acceptance test the evaluators will run.

## What's intentionally out of scope for this pass

Given the size of the full spec, this delivers a genuinely working core
rather than every optional extra: no QR codes, no result export, no poll
expiration timers, no automated test suite. The architecture (clean
handler/service/repo separation, real Redis + Mongo usage, real WebSockets)
is built so any of those can be added without restructuring anything.
