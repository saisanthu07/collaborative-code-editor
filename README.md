# CodeTogether — Real-Time Collaborative Code Editor

A full-stack MERN application for real-time collaborative coding: multiple
users edit the same file simultaneously (CRDT-synced via Yjs + Monaco), see
each other's cursors, chat, and execute code in an isolated sandbox (Judge0).

> **Status: Phase 1 foundation.** Auth, rooms, real-time collaborative
> editing, presence, chat, and code execution are implemented end-to-end.
> Some of the larger spec items (multi-file Yjs sub-documents beyond the
> single active file, Redis-backed cross-server presence, refresh-token
> rotation, full test suite) are stubbed or left as the next phase — see
> "Known gaps" below.

## 1. Features implemented

- JWT auth with **refresh-token rotation**: short-lived (15m) access tokens,
  30-day rotating refresh tokens with reuse detection (a replayed/stolen
  refresh token revokes the user's entire session chain), stored as SHA-256
  hashes (never plaintext) with a Mongo TTL index for auto-expiry
- Password hashing (bcrypt), Zod validation (incl. path-traversal-safe file
  name validation), rate limiting, Helmet, CORS
- Room creation, join-by-link, guest access, starring, recent rooms
- Real-time collaborative editor: Monaco + Yjs CRDT sync over a dedicated
  y-websocket relay (isolated from Socket.IO)
- Live cursors & presence via Yjs Awareness, participant list
- **Redis-backed presence + Socket.IO Redis adapter**: when `REDIS_URL` is
  set, presence state and cross-node event broadcasting both go through
  Redis, so the app scales horizontally behind a load balancer. Falls back
  to in-memory automatically when `REDIS_URL` is unset (single instance)
- Real-time chat (Socket.IO), persisted to MongoDB
- Code execution via Judge0, with an output console (stdout/stderr/compile
  output/time/memory), isolated from the app server
- **Multi-file support**: full REST CRUD for room files (create, rename,
  save, delete) plus matching Socket.IO events, both persisting into
  `room.files` in MongoDB — the file tree survives reloads/rejoins
- **Host-enforced permissions**: role changes and member removal are
  REST endpoints restricted to the room host via `requireRoomHost`
  middleware; the equivalent Socket.IO event now re-checks host ownership
  against the database before applying a change, instead of trusting the
  emitting client
- **Room sharing with QR code** (in addition to the copy-link button)
- Admin dashboard: stats, user suspension, room locking
- Dark, IDE-styled responsive UI (Tailwind), landing page
- `render.yaml` Blueprint for one-click deploy on Render (backend as a
  Web Service, frontend as a Static Site)
- **Automated backend tests** (Node's built-in test runner, 29 passing
  tests): validators (including the path-traversal file-name test that
  caught and fixed a real bug during development), JWT sign/verify,
  language config, and DB-independent Express route behavior

## 2. Architecture

```
client/  → React + Vite, Tailwind, Monaco, Yjs, Socket.IO client
server/  → Express + MongoDB (Mongoose), Socket.IO, y-websocket relay
```

Two separate real-time channels, intentionally not mixed:

- **Socket.IO** (`/socket.io`): chat, presence, room membership/permission
  events, execution start/complete broadcasts.
- **y-websocket** (`/yjs`): pure CRDT document sync for the editor. Each
  room+file gets its own Yjs document, so concurrent edits merge instead of
  overwriting each other, and rooms never leak into one another.

## 3. Folder structure

```
collaborative-code-editor/
├── client/            React frontend
│   └── src/
│       ├── components/{editor,chat,room,dashboard,auth,common}
│       ├── pages/      Landing, Login, Register, Dashboard, Room, Profile, Admin
│       ├── services/    api.js (axios), socket.js (Socket.IO client)
│       ├── store/       authStore.js (zustand)
│       └── constants/
├── server/            Express backend
│   └── src/
│       ├── config/      db.js
│       ├── controllers/ auth, room, admin
│       ├── middleware/  auth, admin, room access, validation, rate limit, errors
│       ├── models/      User, Room, Message, Execution, ActivityLog
│       ├── routes/      auth, rooms, admin
│       ├── services/    authService, roomService, executionService (Judge0)
│       ├── sockets/      index.js (Socket.IO handlers), yjsServer.js (y-websocket)
│       ├── validators/   zod schemas
│       └── constants/    languages.js (single source of truth for Judge0 IDs)
├── render.yaml         Render Blueprint (both services)
└── .gitignore
```

## 4. Environment setup

Copy the example env files and fill them in:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Key backend variables (`server/.env`):

| Variable | Purpose |
|---|---|
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Long random string for signing tokens |
| `CLIENT_URL` | Frontend origin, for CORS |
| `JUDGE0_API_URL` / `JUDGE0_API_KEY` / `JUDGE0_API_HOST` | Judge0 execution API. Works with the free RapidAPI Judge0 CE instance, or point at a self-hosted Judge0 with no key set. |
| `REDIS_URL` | Optional — only needed once you scale Socket.IO across multiple server instances |

## 5. MongoDB setup

Local: run `mongod` and point `MONGO_URI` at
`mongodb://localhost:27017/collab-editor`.

Hosted (needed for Render): create a free MongoDB Atlas cluster, add
`0.0.0.0/0` to the IP access list (Render's egress IPs aren't static on the
free plan) or Render's specific outbound IPs if you're on a paid plan, and
use the provided connection string as `MONGO_URI`.

## 6. Judge0 setup

Easiest path, and the one that works cleanly on Render without running
your own sandbox infrastructure: sign up for the free
[Judge0 CE on RapidAPI](https://rapidapi.com/judge0-official/api/judge0-ce),
grab your API key, and set:

```
JUDGE0_API_URL=https://judge0-ce.p.rapidapi.com
JUDGE0_API_KEY=<your key>
JUDGE0_API_HOST=judge0-ce.p.rapidapi.com
```

If you'd rather self-host Judge0, deploy it to its own service (it ships
its own container setup in the Judge0 repo — that's Judge0's deployment,
separate from this app) and point `JUDGE0_API_URL` at it with
`JUDGE0_API_KEY` left blank.

## 7. Redis setup (for horizontal scaling)

Optional for a single instance, recommended once you run more than one
backend instance. On Render, add a **Redis** instance (Render's managed
Key Value/Redis offering, or an external provider like Upstash/Redis
Cloud) and set `REDIS_URL` to its connection string. The server will
automatically:

- Attach the `@socket.io/redis-adapter` so chat/presence/room events reach
  clients connected to any instance
- Store room presence in a Redis hash (`presence:<roomId>`) instead of an
  in-memory Map, so the participant list is consistent across instances

Leave `REDIS_URL` blank for local development or a single Render
instance — everything still works, just single-instance.

## 8. Local development

```bash
# Terminal 1
cd server
npm install
npm run dev

# Terminal 2
cd client
npm install
npm run dev
```

Frontend: http://localhost:5173
Backend: http://localhost:5000

## 9. Deploying to Render

This repo includes a `render.yaml` Blueprint that defines both services,
so the fastest path is:

1. Push this repo to GitHub/GitLab.
2. In the Render dashboard, click **New +** → **Blueprint**, and point it
   at the repo. Render reads `render.yaml` and provisions:
   - `collab-editor-server` — a Node **Web Service** (root dir `server`,
     `npm install` → `npm start`)
   - `collab-editor-client` — a **Static Site** (root dir `client`,
     `npm install && npm run build` → serves `dist/`, with an SPA rewrite
     rule so client-side routing works on refresh)
3. Render will prompt you for the env vars marked `sync: false` in
   `render.yaml` (`MONGO_URI`, `CLIENT_URL`, `JUDGE0_API_KEY`, `REDIS_URL`,
   and the three `VITE_*` frontend vars) — fill those in with real values.
   `JWT_SECRET` is auto-generated by Render.
4. Once both services are live, go back and set:
   - Backend's `CLIENT_URL` → your static site's Render URL
     (`https://collab-editor-client.onrender.com`)
   - Frontend's `VITE_API_URL` → `https://collab-editor-server.onrender.com/api`
   - Frontend's `VITE_SOCKET_URL` → `https://collab-editor-server.onrender.com`
   - Frontend's `VITE_YJS_URL` → `wss://collab-editor-server.onrender.com/yjs`
     (Render terminates TLS for you, so this must be `wss://`, not `ws://`)
   Then trigger a redeploy of the static site so the new `VITE_*` values
   get baked into the build (Vite env vars are compile-time, not runtime).

If you'd rather set both services up manually instead of via the
Blueprint: create a **Web Service** for `server/` (build `npm install`,
start `npm start`) and a **Static Site** for `client/` (build
`npm install && npm run build`, publish directory `dist`, with a rewrite
rule `/* → /index.html` for SPA routing) and set the same env vars as
above.

**One thing worth knowing about Render's free tier:** free Web Services
spin down after inactivity and take ~30-60s to wake on the next request —
including the first WebSocket connection to `/yjs` or Socket.IO. Fine for
demos, worth upgrading to a paid instance before treating this as
production for real users.

## 10. API documentation (summary)

```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me
PATCH  /api/auth/me
PATCH  /api/auth/me/password

POST   /api/rooms
GET    /api/rooms
GET    /api/rooms/:roomId
PATCH  /api/rooms/:roomId          (host only)
DELETE /api/rooms/:roomId          (host only)
POST   /api/rooms/:roomId/join
POST   /api/rooms/:roomId/star
GET    /api/rooms/:roomId/messages
POST   /api/rooms/:roomId/execute

GET    /api/rooms/:roomId/files
POST   /api/rooms/:roomId/files
PUT    /api/rooms/:roomId/files/:fileName
PATCH  /api/rooms/:roomId/files/:fileName
DELETE /api/rooms/:roomId/files/:fileName

PATCH  /api/rooms/:roomId/members/permission   (host only)
DELETE /api/rooms/:roomId/members/:username    (host only)

POST   /api/auth/refresh

GET    /api/admin/stats
GET    /api/admin/users
PATCH  /api/admin/users/:userId/suspend
DELETE /api/admin/users/:userId
GET    /api/admin/rooms
PATCH  /api/admin/rooms/:roomId/lock
DELETE /api/admin/rooms/:roomId
GET    /api/admin/activity-logs
```

All routes are protected by Helmet, CORS (locked to `CLIENT_URL`), and rate
limiting (stricter on `/auth` and `/execute`).

## 11. WebSocket events (Socket.IO, namespace `/`)

```
join-room, leave-room
cursor-update, presence-update, presence-idle
chat-message
permission-change
file-created, file-deleted, file-renamed
execution-started, execution-completed
disconnect
```

## 12. y-websocket

Connect a `y-websocket` `WebsocketProvider` to `ws://<host>/yjs`, using
`"<roomId>:<fileName>"` as the document name. This is handled automatically
by `CollabEditor.jsx` on the frontend.

## 13. Deployment instructions

See **section 9 (Deploying to Render)** above for the full walkthrough,
including the `render.yaml` Blueprint. Summary:

- **Frontend** → Render Static Site (root `client/`, build
  `npm install && npm run build`, publish `dist/`), with `VITE_API_URL`,
  `VITE_SOCKET_URL`, `VITE_YJS_URL` pointed at the backend's Render URL
  (`wss://` for `VITE_YJS_URL` — Render terminates TLS for you).
- **Backend** → Render Web Service (root `server/`, build `npm install`,
  start `npm start`). Render supports WebSocket upgrades on the same port
  by default, so Socket.IO and the `/yjs` relay both work without extra
  config.
- **MongoDB** → MongoDB Atlas (Render doesn't host MongoDB itself).
- **Redis** → Render's managed Redis/Key Value, or Upstash/Redis Cloud,
  once you scale horizontally (see section 7).
- Render sets `NODE_ENV=production` for you; cookies automatically switch
  to `secure: true, sameSite: "none"` based on that.

## 14. Security considerations

- Passwords hashed with bcrypt (12 rounds), never logged (see
  `utils/logger.js` redaction list)
- JWT access tokens are short-lived (15 min); refresh tokens are rotated
  on every use, stored only as SHA-256 hashes, and reuse of an already-
  rotated token revokes all of that user's sessions (theft mitigation)
- All backend routes validate input with Zod before touching the database,
  including a path-traversal-safe file-name check (rejects `..` segments
  and absolute paths, verified by an automated test)
- Rate limiting on auth and execution endpoints
- Room access enforced server-side (`roomAccessMiddleware`) — the frontend
  UI hiding a button is never the only protection. Host-only actions
  (permission changes, member removal) are enforced both over REST
  (`requireRoomHost`) and over the Socket.IO `permission-change` event,
  which re-checks room ownership in the database rather than trusting the
  emitting client
- User-submitted code is never executed on the application server — it's
  sent to Judge0's isolated sandbox with CPU/memory/time limits
- Helmet + strict CORS origin + 1MB JSON body limit

## 15. Testing

```bash
cd server
npm test
```

Runs 29 tests via Node's built-in test runner (`node --test`) covering
validators (auth, room, file-name path-traversal), JWT sign/verify,
language/Judge0 config, and DB-independent Express routes (health check,
404 handling, validation-before-DB, auth-required responses).

These are unit/lightweight-integration tests that don't require a running
MongoDB. Testing the full request lifecycle (register → login → create
room → execute code) end-to-end needs a real or in-memory MongoDB instance
and is a good next addition — e.g. `mongodb-memory-server`, which wasn't
added here since it needs to download a `mongod` binary at install time.

## 16. Known gaps / next phase

This is a solid, tested foundation — not a byte-for-byte implementation of
every line in the original 48-section spec. Explicitly NOT yet done:

- Full end-to-end test suite against a real/in-memory database
- Fine-grained per-file permission checks (EDITOR/VIEWER is enforced at
  room-join time for guests; an authenticated VIEWER is not yet blocked
  server-side from calling the file-save endpoints — add a role check in
  `roomController.saveFile` if you need this before going live)
- QR code covers room sharing; no QR/deep-link handling for guest identity
  persistence across devices
- CI pipeline (GitHub Actions running `npm test` + `npm run build` on PRs)

## 17. Screenshots

_Add screenshots here once you've run the app locally._
