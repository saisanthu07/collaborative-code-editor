import {
  Users,
  Zap,
  Clock,
  PenTool,
  FolderTree,
  PhoneCall,
  Terminal,
  ShieldCheck,
  FileCode,
  Layout,
  GitBranch,
  TerminalSquare,
  Layers,
  Lock,
  Activity,
  MessageSquare,
} from "lucide-react";

export const NAV_LINKS = [
  { label: "Walkthrough", href: "#walkthrough" },
  { label: "Capabilities", href: "#capabilities" },
  { label: "Languages", href: "#languages" },
  { label: "Architecture", href: "#architecture" },
  { label: "Security", href: "#security" },
];

export const HERO_METRICS = [
  { value: "15+", label: "Sandboxed languages", tone: "text-gray-100" },
  { value: "Yjs CRDT", label: "Binary + Redis sync", tone: "text-accent2" },
  { value: "4 Roles", label: "RBAC & private invites", tone: "text-accent" },
  { value: "1-Click", label: "Instant playgrounds", tone: "text-gray-100" },
];

export const ROOM_TEMPLATES_SHOWCASE = [
  {
    key: "blank",
    title: "Blank Single File",
    tag: "Starter",
    desc: "Clean vellum canvas with one language-ready entry file.",
    icon: FileCode,
  },
  {
    key: "algorithms",
    title: "Algorithms Starter",
    tag: "Interview",
    desc: "Structured problem prompt paired with synced batch test cases.",
    icon: Terminal,
  },
  {
    key: "web-preview",
    title: "Web Preview",
    tag: "Frontend",
    desc: "HTML, CSS & JS workspace rendered in an isolated sandbox iframe.",
    icon: Layout,
  },
  {
    key: "multi-file-node",
    title: "Multi-File Node.js",
    tag: "Backend",
    desc: "Modular folder tree with relative imports executed via Piston.",
    icon: FolderTree,
  },
];

export const USE_CASES = [
  "Technical Interviews",
  "Pair Programming",
  "System Design Rounds",
  "Classroom Instruction",
  "Hackathons",
  "Remote Code Reviews",
  "Solo Compily Practice",
];

export const WALKTHROUGH_CHAPTERS = [
  {
    id: "crdt",
    step: "01",
    eyebrow: "Real-Time CRDT Engine",
    title: "Conflict-free Monaco editing with Follow Mode",
    desc: "Every keystroke merges cleanly through Yjs binary CRDTs over a dedicated /yjs relay backed by MongoDB snapshots and optional Redis Pub/Sub. Track teammates with colored awareness cursors, spotlight anyone's active file tab with Follow Mode, or jump across the workspace with Cmd+K.",
    bullets: [
      "Colored peer cursors & live awareness labels",
      "One-click Follow Mode to track any collaborator",
      "Server-enforced readOnly mode for Viewers & Guests",
    ],
    badge: "Yjs + y-monaco",
  },
  {
    id: "files-exec",
    step: "02",
    eyebrow: "Multi-File Workspace & Checkpoints",
    title: "Nested explorer, 15+ language runs & live restore",
    desc: "Organize projects in a collapsible folder tree with drag-and-drop uploads and one-click ZIP export. Bundle all room files for relative-import execution on Piston or Judge0 CE, preview HTML/CSS/JS inside a sandboxed iframe, and snapshot named DocRevision checkpoints.",
    bullets: [
      "Multi-file Piston bundle + Judge0 CE + custom stdin",
      "Sandboxed <iframe sandbox=\"allow-scripts\"> live web preview",
      "Named DocRevision checkpoints with live room-wide restore",
    ],
    badge: "15+ Languages",
  },
  {
    id: "board-comments",
    step: "03",
    eyebrow: "System Design & Code Review",
    title: "Shared whiteboard canvas & line-anchored threads",
    desc: "Toggle seamlessly between Code and Board views to sketch distributed architectures in real time with multi-color pens, adjustable stroke widths, eraser, and PNG export. Post line-anchored CodeComment threads that jump directly to Monaco lines and resolve cleanly.",
    bullets: [
      "Real-time synchronized whiteboard strokes & PNG export",
      "Line-bound code comments with click-to-jump navigation",
      "Resolve, reopen, and moderate threads per file",
    ],
    badge: "Code ↔ Board",
  },
  {
    id: "interview-suite",
    step: "04",
    eyebrow: "Technical Interview Studio",
    title: "Authoritative timer, batch tests & private scorecard",
    desc: "Run structured interviews with a server-persisted countdown (30m / 45m / 60m) or stopwatch timer so late joiners stay synchronized. Validate solutions against up to 15 shared test cases in one batch run, then record grades privately in a host-only scorecard.",
    bullets: [
      "Server-synced countdown & stopwatch interview timer",
      "Collaborative batch test-case runner (up to 15 cases)",
      "Database-isolated host scorecard (select: false) + .md export",
    ],
    badge: "Host Only",
  },
  {
    id: "voice-compily",
    step: "05",
    eyebrow: "Voice, Marginalia & Compily IDE",
    title: "WebRTC mesh audio, paginated chat & solo Compily",
    desc: "Talk without leaving the room using peer-to-peer WebRTC mesh audio backed by STUN/TURN configuration and glare tie-breaking, alongside cursor-paginated Marginalia chat. Between sessions, switch to Compily — your personal multi-language compiler with saved snippets and run history.",
    bullets: [
      "P2P WebRTC voice with STUN/TURN & mute broadcast",
      "Cursor-paginated Marginalia chat with host mute control",
      "Compily personal IDE with snippet library & run history",
    ],
    badge: "WebRTC + Compily",
  },
];

export const CAPABILITIES = [
  {
    icon: Users,
    tag: "CRDT Sync",
    title: "Yjs Collaboration & Follow Mode",
    desc: "Dedicated /yjs WebSocket relay with binary YjsDoc persistence, colored awareness cursors, presence de-duplication across tabs, and Cmd+K Command Palette.",
  },
  {
    icon: Zap,
    tag: "Sandboxed Runtime",
    title: "Multi-File Execution & Web Preview",
    desc: "Run 15+ languages with custom stdin via Piston multi-file bundles and Judge0 CE, or preview HTML, CSS, and JS in an isolated sandbox iframe.",
  },
  {
    icon: Clock,
    tag: "Interview Studio",
    title: "Timer, Batch Tests & Host Scorecard",
    desc: "Authoritative 30/45/60m timer, shared batch test-case suite, and a private host-only scorecard protected by select: false with Markdown export.",
  },
  {
    icon: PenTool,
    tag: "Visual & Review",
    title: "System-Design Board & Line Comments",
    desc: "Switch between Code and Board to sketch architectures live with PNG export, and anchor review threads directly to file line numbers.",
  },
  {
    icon: FolderTree,
    tag: "Project Files",
    title: "Folder Tree, Checkpoints & ZIP",
    desc: "Nested paths, drag-and-drop file uploads, 4 room starter templates, named version checkpoints with live restore, and client-side ZIP export.",
  },
  {
    icon: Terminal,
    tag: "Solo Workspace",
    title: "Compily Personal Compiler",
    desc: "Dedicated /compily studio for solo practice with 15+ language templates, split right/bottom output, batch test cases, saved snippets, and run history.",
  },
  {
    icon: PhoneCall,
    tag: "Comms",
    title: "WebRTC Mesh Voice & Marginalia Chat",
    desc: "Low-latency peer-to-peer RTCPeerConnection audio with STUN/TURN ICE config alongside paginated room chat and host mute enforcement.",
  },
  {
    icon: Activity,
    tag: "Governance",
    title: "Admin Console & Live Telemetry",
    desc: "Dedicated /admin/* console for platform KPIs, live socket/Yjs/heap metrics, instant user suspension/banning, room locks, and audit logs.",
  },
];

export const ARCHITECTURE_LAYERS = [
  {
    layer: "01 · Client Studio",
    title: "React 18 + Vite 5 + Paper Themes",
    icon: Layers,
    items: [
      "Monaco Editor + y-monaco binding",
      "Editorial Parchment & Midnight Kraft themes",
      "Native WebRTC mesh audio engine",
      "Socket.IO client & Zustand auth/theme stores",
    ],
  },
  {
    layer: "02 · Realtime Gateway",
    title: "Node.js + Express + Socket.IO + /yjs",
    icon: GitBranch,
    items: [
      "Dedicated /yjs WebSocket CRDT relay",
      "Socket.IO presence, chat, board & timer events",
      "Zod request & socket payload validation",
      "Timing-safe private invite & RBAC middleware",
    ],
  },
  {
    layer: "03 · Persistence & Scale",
    title: "MongoDB + Optional Redis Cluster",
    icon: ShieldCheck,
    items: [
      "MongoDB models: Rooms, YjsDocs, Revisions, Comments",
      "Optional Redis Socket.IO adapter & Yjs Pub/Sub",
      "Distributed presence & sliding rate limiting",
      "SHA-256 rotating refresh tokens & session store",
    ],
  },
  {
    layer: "04 · Execution Sandboxes",
    title: "Piston Multi-File + Judge0 CE",
    icon: TerminalSquare,
    items: [
      "Piston API supporting multi-file relative imports",
      "Judge0 CE isolated compilation & execution",
      "Batch test-case runner (up to 15 cases/run)",
      "Sandboxed HTML/CSS/JS iframe preview",
    ],
  },
];

export const RBAC_ROLES = [
  {
    role: "HOST",
    tone: "bg-accent/15 text-accent border-accent/30",
    summary: "Full room authority",
    perms: "Manage settings, lock room, mute chat, rotate private invite secret, promote/kick/unban, control timer, access private scorecard.",
  },
  {
    role: "EDITOR",
    tone: "bg-accent2/15 text-accent2 border-accent2/30",
    summary: "Active contributor",
    perms: "Co-edit files via Yjs CRDT, create/rename/delete files, save/restore checkpoints, run code & batch tests, sketch on whiteboard, comment.",
  },
  {
    role: "VIEWER",
    tone: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
    summary: "Read-only observer",
    perms: "Follow participants across files, inspect code & live outputs, read comments & Marginalia chat, with live readOnly Monaco enforcement.",
  },
  {
    role: "GUEST",
    tone: "bg-surface2 text-gray-200 border-border",
    summary: "Frictionless joiner",
    perms: "Join instant playgrounds or shared rooms via signed guest tokens without registration; editing obeys host allowGuestEdit policy.",
  },
];

export const SECURITY_PILLARS = [
  {
    icon: Lock,
    title: "Strict Private Room Isolation",
    desc: "PRIVATE rooms reject non-members across REST, Socket.IO, and Yjs WebSockets unless invited directly or holding a valid ?invite= secret.",
  },
  {
    icon: ShieldCheck,
    title: "Rotating Tokens & Session Control",
    desc: "SHA-256 refresh token rotation with theft/reuse revocation, active device session list, per-device revoke, and password-confirmed self-deletion.",
  },
  {
    icon: MessageSquare,
    title: "Database-Isolated Scorecards",
    desc: "Candidate evaluations live behind select: false on Room.scorecard and are returned strictly to the authenticated room owner.",
  },
];

export const WORKFLOW = [
  {
    step: "01",
    icon: GitBranch,
    title: "Pick a template or launch instant",
    desc: "Start from Blank, Algorithms, Web Preview, or Multi-File Node.js — or spin up a 1-click guest playground with zero sign-up.",
  },
  {
    step: "02",
    icon: Users,
    title: "Invite with granular control",
    desc: "Share a QR code or secret private invite link, assign Editor or Viewer roles, and rotate invite secrets whenever needed.",
  },
  {
    step: "03",
    icon: TerminalSquare,
    title: "Code, sketch, talk & evaluate",
    desc: "Collaborate in Monaco, sketch on the shared board, run batch tests over WebRTC voice, and export private Markdown scorecards.",
  },
];
