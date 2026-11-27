# CodeTogether — Real-Time Collaborative Code Editor & Technical Interview Studio

<div align="center">

![CodeTogether Banner](https://img.shields.io/badge/CodeTogether-Paper%20Theme-c2542d?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-3c6e47?style=for-the-badge)
![Node](https://img.shields.io/badge/Node.js-%3E%3D18-221c16?style=for-the-badge&logo=node.js)
![React](https://img.shields.io/badge/React-18-221c16?style=for-the-badge&logo=react)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=for-the-badge&logo=vite)
![Tests](https://img.shields.io/badge/Tests-98%20Passing-3c6e47?style=for-the-badge)

<p align="center">
  <strong>A production-hardened collaborative IDE, system-design studio, and technical interview platform.</strong><br>
  Built with <strong>React 18</strong>, <strong>Monaco Editor</strong>, <strong>Yjs CRDTs</strong>, <strong>WebRTC Voice</strong>, <strong>Socket.IO</strong>, <strong>Express</strong>, <strong>MongoDB</strong>, <strong>Redis</strong>, and <strong>Judge0/Piston sandboxes</strong>.
</p>

[Key Features](#-key-features) •
[System Architecture](#-system-architecture) •
[Quick Start](#-quick-start) •
[Environment Variables](#-environment-variables) •
[API Documentation](#-api-documentation) •
[WebSocket Contracts](#-websocket--webrtc-contracts) •
[Paper Design System](#-paper-design-system) •
[Testing](#-testing) •
[Deployment](#-deployment-guide)

---

</div>

## 🌟 Executive Summary

**CodeTogether** is a full-stack collaborative coding and technical interview studio engineered for pair programming, live interviews, system-design rounds, classroom instruction, and remote code reviews. Multiple participants co-author multi-file projects with binary CRDT synchronization, follow teammates across files, sketch architecture on a shared whiteboard, leave line-anchored review comments, talk over peer-to-peer WebRTC voice calls, run batch test suites, preview HTML/CSS/JS live, and evaluate candidates via private host-only scorecards.

The UI uses an artisanal **Editorial Paper Design System** featuring **Editorial Parchment** (Light Paper) and **Midnight Kraft** (Dark Paper) themes with matching custom Monaco syntax themes.

---

## 🚀 Key Features

### ⚡ Conflict-Free Real-Time Collaboration & Follow Mode
- **Yjs Binary CRDT Sync & Persistence**: Dedicated `y-websocket` relay (`/yjs`) backed by binary `YjsDoc` snapshots and `Room.files` text sync in MongoDB, plus optional Redis Pub/Sub synchronization across multiple server instances.
- **Monaco Editor & Read-Only Enforcement**: VS Code editing experience with live colored peer cursors (Yjs Awareness), cursor-line tracking, document formatting, and live `readOnly` enforcement for `VIEWER` / disallowed `GUEST` roles.
- **Follow Mode (Spotlight)**: Click **Follow** on any participant in the sidebar to follow their active file tab changes in real time.
- **Live Presence & De-Duplication**: Tracks active connections per user (`presence:<roomId>` in Redis or memory) and collapses multiple tabs into unified presence badges.

### 🗂️ Nested Explorer, Templates, Checkpoints & Live Web Preview
- **Collapsible Folder Tree & Drag-and-Drop Uploads**: Supports nested paths (e.g. `utils/helpers.js`), multi-file browser uploads, and drag-and-drop onto the explorer.
- **Starter Templates**: Create rooms from `Blank`, `Algorithms Interview Starter`, `Web Preview (HTML / CSS / JS)`, or `Multi-File Node.js Project`.
- **Version History & Live Restore**: Save named file checkpoints (`DocRevision`), inspect snapshots, and restore any revision live into every connected participant's Yjs editor.
- **Sandboxed Live Web Preview**: Render room HTML, CSS, and JS files safely inside an isolated `<iframe sandbox="allow-scripts">` directly in the console panel.
- **One-Click ZIP Export**: Client-side ZIP export bundling the entire project.

### 🎨 Collaborative Whiteboard & Inline Code Comments
- **System-Design Whiteboard**: Toggle between `Code` and `Board` views to sketch diagrams in real time (`whiteboard-stroke` / `whiteboard-clear` persisted on the room) with multi-color pens, stroke widths, eraser, and PNG export.
- **Line-Anchored Review Comments**: Post comments bound to specific files and line numbers (`CodeComment`), click to jump to lines in Monaco, resolve/reopen threads, and delete comments.

### ⏱️ Technical Interview Suite & Private Host Scorecard
- **Authoritative Interview Timer**: Host-only controls for countdown presets (30m / 45m / 60m) and stopwatch mode, persisted server-side (`timerState`) so late joiners stay synchronized.
- **Collaborative Test Case Runner**: Synced test cases (`PUT /api/rooms/:roomId/test-cases`) executed in one request via `POST /api/rooms/:roomId/execute-batch`.
- **Private Host-Only Scorecard**: Interviewers can grade Problem Solving, Code Quality, Communication (1–5), hiring recommendation, and private notes—protected at the database layer (`select: false` on `Room.scorecard`) and restricted strictly to the authenticated room owner with `.md` export.

### ⚙️ Multi-File Execution & 15+ Languages
- **15+ Languages**: JavaScript, TypeScript, Python, C, C++, Java, Go, Rust, PHP, Ruby, Kotlin, Swift, C#, Dart, and SQL.
- **Multi-File Execution Bundle**: Passes all room files alongside the active entrypoint to Piston (supporting relative imports across files) with Judge0 CE support and an opt-in local dev `worker_threads` JS fallback (`ALLOW_UNSAFE_LOCAL_EXEC=true`, disabled in production).

### 🎙️ WebRTC Voice & Marginalia Chat
- **Peer-to-Peer Mesh Audio**: Native WebRTC `RTCPeerConnection` with backend-served STUN/TURN ICE configuration (`/api/rooms/ice-servers`), glare tie-breaking, mute/unmute state broadcast, and clean audio element teardown.
- **Paginated Marginalia Chat**: Cursor-paginated history (`Load older messages`), system join/leave notices, and host chat-mute enforcement.

### 🔐 Security, Auth Lifecycle & Governance
- **Strict Private Rooms & Invite Secrets**: `PRIVATE` rooms reject non-members across REST, Socket.IO, and Yjs WebSockets unless invited directly by username/email or joining with a timing-safe `inviteCode` (`?invite=...`). Hosts can rotate invite secrets anytime.
- **Full Auth Lifecycle**: Registration, login, rotating SHA-256 refresh tokens with theft/reuse revocation, active session viewer & per-device revocation (`/api/auth/sessions`), `logout-all`, password reset flow (`/forgot-password`, `/reset-password`), and password-confirmed account self-deletion (`DELETE /api/auth/me`).
- **Host Room Controls**: Toggle room lock, mute chat, allow guest editing, change default join role, promote/demote/kick/unban participants, and invite users directly.

### 🛡️ Multi-Page Archival Administration Console (`/admin/*`)
Dedicated routed tabs for platform administrators (`role === "ADMIN"`):
- **Overview (`/admin`)**: Platform KPIs + live runtime telemetry (`/api/metrics` socket count, active Yjs docs/connections, heap usage).
- **Users (`/admin/users`)**: Search/filter by status (`ACTIVE`, `SUSPENDED`, `BANNED`), suspend/unsuspend, ban/unban (revoking sessions & disconnecting sockets immediately), and delete accounts.
- **Rooms (`/admin/rooms`)**: Filter by visibility/lock state, jump to rooms, lock/unlock, or delete rooms.
- **Activity Logs (`/admin/logs`)**: Searchable audit log feed with individual log deletion and bulk clear controls.

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    subgraph Client["Frontend Client (React 18 + Vite 5)"]
        UI["UI Layer & Paper Themes"]
        Monaco["Monaco Editor"]
        YjsDoc["Yjs Document + y-monaco"]
        WebRTC["WebRTC Audio Engine"]
        SocketClient["Socket.IO Client"]
    end

    subgraph Realtime["Real-Time Gateway (Node.js Server)"]
        YjsRelay["y-websocket Relay (/yjs) + Policy Cache"]
        SocketEngine["Socket.IO Server (/socket.io)"]
        ExpressApp["Express REST API (/api)"]
    end

    subgraph Data["Persistence & Scalability Layer"]
        MongoDB[("MongoDB (Mongoose)\nUsers, Rooms, YjsDocs, Revisions, Comments, Logs")]
        RedisCluster[("Redis (Optional)\nSocket.IO Adapter, Yjs Pub/Sub, Presence & Rate Limits")]
    end

    subgraph Sandbox["Isolated Execution Sandbox"]
        Judge0["Judge0 CE API"]
        Piston["Piston API (Multi-File)"]
    end

    Monaco <--> YjsDoc
    YjsDoc <-->|WebSocket Binary CRDT| YjsRelay
    SocketClient <-->|WebSocket Events| SocketEngine
    WebRTC <-->|P2P Mesh Audio| WebRTC
    SocketClient -.->|Voice Signaling| SocketEngine
    UI -->|HTTPS / JSON| ExpressApp

    YjsRelay <-->|Yjs Pub/Sub Bridge| RedisCluster
    SocketEngine <-->|Adapter & Presence| RedisCluster
    ExpressApp <-->|Mongoose ODM| MongoDB
    YjsRelay <-->|Binary Snapshots| MongoDB
    ExpressApp -->|REST Execution| Judge0
    ExpressApp <-->|Multi-File Execution| Piston
```

---

## 📁 Repository Structure

```
collaborative-code-editor/
├── .github/workflows/ci.yml         # GitHub Actions CI (server tests + client build)
├── .prettierrc                      # Shared formatting rules
├── client/                          # React 18 + Vite 5 Frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── chat/                # ChatPanel (pagination + mute state)
│   │   │   ├── common/              # Navbar, ThemeToggle, ErrorBoundary, Guards
│   │   │   ├── editor/              # CollabEditor, FileTabs, FileExplorer (tree + upload), OutputConsole (preview)
│   │   │   └── room/                # VoiceRoom, InterviewTimer, WhiteboardPanel, CommentsPanel,
│   │   │                            # RevisionsModal, ScorecardModal, HostSettingsModal, ParticipantsPanel
│   │   ├── config/                  # Monaco paper themes
│   │   ├── constants/               # Language definitions & badges
│   │   ├── hooks/                   # useRoomSocket
│   │   ├── pages/
│   │   │   ├── admin/               # AdminLayout, AdminOverview, AdminUsers, AdminRooms, AdminLogs
│   │   │   └── ...                  # Landing, Login, Register, ForgotPassword, ResetPassword, Dashboard, Room, Profile
│   │   ├── services/                # api.js (Axios + token refresh), socket.js
│   │   ├── store/                   # authStore.js, themeStore.js (Zustand)
│   │   └── utils/                   # clipboard.js, color.js, zip.js
│   └── vite.config.js               # Vite build + manualChunks splitting
│
├── server/                          # Express + Node.js Backend
│   ├── scripts/                     # Database migration scripts
│   ├── src/
│   │   ├── config/                  # db.js, env.js (Zod + CORS origins), redis.js
│   │   ├── constants/               # Supported languages & Judge0/Piston mapping
│   │   ├── controllers/             # authController, roomController, adminController
│   │   ├── middleware/              # auth, admin, roomAccess, rateLimiter (Redis/Memory), validateRequest
│   │   ├── models/                  # User, Room, YjsDoc, DocRevision, CodeComment, Message, Execution, RefreshToken, ActivityLog
│   │   ├── routes/                  # authRoutes, roomRoutes, adminRoutes
│   │   ├── services/                # authService, roomService, executionService, refreshTokenService
│   │   ├── sockets/                 # index.js (Socket.IO), yjsServer.js (y-websocket + Redis bridge)
│   │   ├── utils/                   # jwt.js, guestToken.js, logger.js (requestId), metrics.js, nanoid.js
│   │   └── validators/              # Zod validation schemas
│   └── tests/                       # 98 automated tests across 27 suites (node --test)
│
├── scripts/dev.js                   # Concurrent client + server dev runner
├── render.yaml                      # Render Blueprint (Server + Static Client)
└── package.json                     # Root scripts (dev, test, build)
```

---

## ⚡ Quick Start

### 1. Prerequisites
- **Node.js** `>= 18` & **npm** `>= 9`
- **MongoDB** (`mongodb://localhost:27017/collab-editor` or MongoDB Atlas)
- **(Optional) Redis** (`REDIS_URL`) for multi-instance Socket.IO, Yjs Pub/Sub, presence, and distributed rate limiting

### 2. Install & Configure
```bash
npm install --prefix server
npm install --prefix client

cp server/.env.example server/.env
cp client/.env.example client/.env
```
Set a strong `JWT_SECRET` (at least 32 characters) and `MONGO_URI` in `server/.env`.

### 3. Run Locally
```bash
node scripts/dev.js
# or: npm run dev
```
- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:5000/api](http://localhost:5000/api)
- **WebSocket Gateway**: `http://localhost:5000` (`/socket.io` and `/yjs`)

*(macOS note: if AirPlay Receiver occupies port `5000`, disable **AirPlay Receiver** in System Settings → General → AirDrop & Handoff, or change `PORT` in `server/.env` and `client/.env` to `5001`.)*

### 4. Promote an Admin Account
Sign up via `/register`, then promote your user in MongoDB:
```bash
mongosh "mongodb://localhost:27017/collab-editor" --eval 'db.users.updateOne({ email: "you@example.com" }, { $set: { role: "ADMIN" } })'
```

---

## ⚙️ Environment Variables

### Backend (`server/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `5000` | HTTP/WebSocket server port |
| `NODE_ENV` | No | `development` | `development`, `production`, or `test` |
| `MONGO_URI` | **Yes** | `mongodb://localhost:27017/collab-editor` | MongoDB connection URI |
| `JWT_SECRET` | **Yes** | — | Signing secret (minimum 32 chars, non-placeholder) |
| `JWT_EXPIRES_IN` | No | `15m` | Access token TTL |
| `REFRESH_TOKEN_DAYS` | No | `30` | Refresh token TTL in days |
| `GUEST_TOKEN_TTL_HOURS` | No | `24` | Guest token & instant playground TTL in hours |
| `MAX_GUESTS_PER_ROOM` | No | `50` | Maximum concurrent guests per room |
| `CLIENT_URL` | **Yes** | `http://localhost:5173` | Comma-separated allowed CORS origins |
| `JUDGE0_API_URL` | No | `https://ce.judge0.com` | Judge0 execution endpoint |
| `JUDGE0_API_KEY` | No | `""` | Optional RapidAPI Judge0 key |
| `JUDGE0_API_HOST` | No | `ce.judge0.com` | Judge0 host header |
| `PISTON_API_URL` | No | `https://emkc.org/api/v2/piston` | Piston execution endpoint (multi-file capable) |
| `ALLOW_UNSAFE_LOCAL_EXEC` | No | `false` | Enables offline JS `worker_threads` fallback in non-production only |
| `REDIS_URL` | No | `""` | Enables Redis Socket.IO adapter, Yjs Pub/Sub, presence & rate limiting |
| `TURN_URLS` | No | `""` | Comma-separated WebRTC TURN URLs |
| `TURN_USERNAME` | No | `""` | TURN username |
| `TURN_CREDENTIAL` | No | `""` | TURN credential |
| `METRICS_TOKEN` | No | `""` | Optional bearer token for `/api/metrics` |

### Frontend (`client/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_API_URL` | **Yes** | `http://localhost:5000/api` | Backend REST API base URL |
| `VITE_SOCKET_URL` | **Yes** | `http://localhost:5000` | Socket.IO server URL |
| `VITE_YJS_URL` | **Yes** | `ws://localhost:5000/yjs` | Yjs WebSocket URL (`wss://` in prod) |

---

## 📖 API Documentation

All REST routes are prefixed with `/api`.

### 🩺 Health & Telemetry
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/health` | Public | DB, Redis, shutdown state, and uptime (`503` when degraded) |
| `GET` | `/metrics` | `METRICS_TOKEN` or Admin | Memory, HTTP counters/latency, active sockets, and Yjs metrics |

### 🔐 Authentication (`/api/auth`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/register` | Public (Rate Limited) | Creates a `USER` account and issues access + refresh cookie |
| `POST` | `/login` | Public (Rate Limited) | Authenticates active (non-suspended/non-banned) user |
| `POST` | `/refresh` | Public | Rotates refresh cookie and returns a new access token |
| `POST` | `/logout` | Public | Revokes current refresh token and clears cookie |
| `POST` | `/logout-all` | Authenticated | Revokes all refresh token sessions for the user |
| `POST` | `/forgot-password` | Public (Rate Limited) | Generates a 15-minute single-use password reset token |
| `POST` | `/reset-password` | Public (Rate Limited) | Resets password and revokes existing refresh tokens |
| `GET` | `/me` | Authenticated | Returns current user profile |
| `PATCH` | `/me` | Authenticated | Updates full name and custom Developer Stamp avatar |
| `DELETE` | `/me` | Authenticated | Password-confirmed account & owned-room deletion |
| `PATCH` | `/me/password` | Authenticated | Changes password and revokes existing sessions |
| `GET` | `/sessions` | Authenticated | Lists active refresh sessions |
| `DELETE` | `/sessions/:sessionId` | Authenticated | Revokes a specific session |

### 🏠 Rooms, Files, Revisions, Comments & Interviews (`/api/rooms`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/ice-servers` | Public | Returns STUN + configured TURN ICE servers |
| `POST` | `/instant` | Public / Optional Auth | Creates an expiring 1-click playground |
| `POST` | `/` | Authenticated | Creates a room (supports `template`: `blank`, `algorithms`, `web-preview`, `multi-file-node`) |
| `GET` | `/` | Authenticated | Lists owned, shared, and starred rooms |
| `GET` | `/:roomId` | Member / Guest | Returns room details (strips `inviteCode` & `scorecard` for non-owners) |
| `PATCH` | `/:roomId` | Room Host | Updates visibility, lock, chat mute, guest edit, default role |
| `POST` | `/:roomId/invite/rotate` | Room Host | Rotates the private room invite secret |
| `DELETE` | `/:roomId` | Room Host | Ends room and deletes Yjs docs, messages, revisions, comments |
| `POST` | `/:roomId/join` | Member / Guest | Joins room (requires valid `inviteCode` for non-members on `PRIVATE` rooms) |
| `POST` | `/:roomId/leave` | Member / Guest | Leaves room |
| `POST` | `/:roomId/star` | Authenticated | Toggles room bookmark star |
| `GET` | `/:roomId/messages` | Member / Guest | Cursor-paginated chat history (`?limit=50&before=<id>`) |
| `POST` | `/:roomId/execute` | Host / Editor | Runs code (with multi-file bundle + stdin) |
| `POST` | `/:roomId/execute-batch` | Host / Editor | Runs up to 15 test cases in one call |
| `PUT` | `/:roomId/test-cases` | Host / Editor | Updates and broadcasts shared room test cases |
| `GET/POST/PUT/PATCH/DELETE` | `/:roomId/files...` | Host / Editor | Lists, creates, saves, renames, and deletes room files |
| `GET/POST` | `/:roomId/files/:fileName/revisions` | Member / Editor | Lists or creates named version checkpoints |
| `POST` | `/:roomId/files/:fileName/revisions/:revisionId/restore` | Host / Editor | Restores a checkpoint live into Yjs & MongoDB |
| `GET/POST` | `/:roomId/comments` | Member / Editor | Lists or posts line-anchored code comments |
| `PATCH` | `/:roomId/comments/:commentId/resolve` | Host / Editor | Toggles comment resolved state |
| `DELETE` | `/:roomId/comments/:commentId` | Author / Host | Deletes a comment |
| `GET/PUT` | `/:roomId/scorecard` | **Room Host Only** | Reads or updates private candidate scorecard |
| `POST` | `/:roomId/members/invite` | Room Host | Directly invites a registered user by username or email |
| `PATCH` | `/:roomId/members/permission` | Room Host | Changes a member's role (`EDITOR`, `VIEWER`, `GUEST`) |
| `DELETE` | `/:roomId/members/:username` | Room Host | Kicks and bans a user from the room |
| `POST` | `/:roomId/unban/:username` | Room Host | Removes a username from the room ban list |

### 🛡️ Administration Console (`/api/admin`)
*Requires authenticated user with `ADMIN` role.*
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/stats` | Platform counts (users, active users/rooms, executions, messages) |
| `GET` | `/users` | User registry list |
| `PATCH` | `/users/:userId/suspend` / `unsuspend` | Suspends or restores user (revokes sessions & disconnects sockets) |
| `PATCH` | `/users/:userId/ban` / `unban` | Bans or unbans user (revokes sessions & disconnects sockets) |
| `DELETE` | `/users/:userId` | Deletes user and cascades owned rooms/sessions |
| `GET` | `/rooms` | Lists rooms (excludes file contents, invite codes, and scorecards) |
| `PATCH` | `/rooms/:roomId/lock` / `unlock` | Locks or unlocks a room globally |
| `DELETE` | `/rooms/:roomId` | Deletes room and disconnects participants |
| `GET` | `/activity-logs` | Lists audit activity logs |
| `DELETE` | `/activity-logs/:logId` | Deletes a single audit log entry |
| `DELETE` | `/activity-logs` | Clears audit logs (optionally filtered by `?type=`) |

---

## 📡 WebSocket & WebRTC Contracts

### 1. Socket.IO Events (`/socket.io`)
- **Client → Server:** `join-room`, `leave-room`, `heartbeat`, `presence-idle`, `chat-message`, `permission-change`, `file-created`, `file-deleted`, `file-renamed`, `file-language-change`, `execution-started`, `timer-sync` (`mode`, `durationSeconds`, `remainingSeconds`, `isRunning`), `active-file-sync`, `whiteboard-stroke`, `whiteboard-clear`, `voice-join`, `voice-signal`, `voice-mute`, `voice-leave`.
- **Server → Client:** `presence-update`, `chat-message`, `timer-synced`, `execution-started`, `execution-completed`, `permission-change`, `file-created`, `file-deleted`, `file-renamed`, `file-language-changed`, `room-locked`, `room-settings-updated`, `test-cases-updated`, `comment-added`, `comment-updated`, `comment-deleted`, `revision-restored`, `participant-file-changed`, `whiteboard-stroke`, `whiteboard-cleared`, `room-ended`, `user-joined-voice`, `voice-signal`, `user-voice-mute`, `user-left-voice`, `error-event`.

### 2. Yjs CRDT Relay (`/yjs`)
Connect via `WebsocketProvider(VITE_YJS_URL, `${roomId}:${fileName}`, ydoc, { params: { token } })` and bind `ydoc.getText("monaco")` via `y-monaco`.

---

## 🧪 Testing & CI

```bash
# Run all server unit & route tests (98 tests across 27 suites)
npm test --prefix server

# Build client production bundle (with manualChunks splitting)
npm run build --prefix client
```

GitHub Actions CI ([.github/workflows/ci.yml](file:///Users/charansai/Documents/collaborative-code-editor/.github/workflows/ci.yml)) automatically runs `npm test` in `server/` and `npm run build` in `client/` on pushes and pull requests.

---

## 🚀 Deployment Guide (`render.yaml`)

1. Push this repository to GitHub/GitLab and import via **New + → Blueprint** in Render (`render.yaml`).
2. Populate the `sync: false` environment variables (`MONGO_URI`, `CLIENT_URL`, `VITE_API_URL`, `VITE_SOCKET_URL`, `VITE_YJS_URL`, and optional `REDIS_URL` / `TURN_*` / `JUDGE0_API_KEY`).
3. For optimal cross-origin cookie behavior (`SameSite=Lax`), front both services under one domain/reverse proxy routing `/api`, `/socket.io`, and `/yjs` to the backend.

---

## 📄 License

Licensed under the [MIT License](LICENSE).
