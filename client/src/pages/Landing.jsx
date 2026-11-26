import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Users,
  Zap,
  MessageSquare,
  PhoneCall,
  Play,
  ArrowRight,
  FolderTree,
  Sparkles,
  Clock,
  Feather,
  Globe2,
  GitBranch,
  TerminalSquare,
  PenTool,
  ShieldCheck,
  History,
  LayoutDashboard,
} from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../services/api.js";
import { useAuthStore } from "../store/authStore.js";
import ThemeToggle from "../components/common/ThemeToggle.jsx";
import BrandMark from "../components/common/BrandMark.jsx";

const FEATURES = [
  {
    icon: Users,
    title: "Yjs CRDTs & Follow Mode",
    desc: "Conflict-free collaborative editing with live peer cursors, Follow Mode spotlighting, and strict read-only viewer enforcement.",
  },
  {
    icon: Zap,
    title: "Multi-File Run & Web Preview",
    desc: "Execute 15+ languages with multi-file imports and stdin, or preview HTML, CSS, and JS live in an isolated sandbox iframe.",
  },
  {
    icon: Clock,
    title: "Interview Suite & Scorecard",
    desc: "Host-controlled countdown/stopwatch timer, batch test-case runner, and a private host-only candidate scorecard.",
  },
  {
    icon: PenTool,
    title: "Whiteboard & Line Comments",
    desc: "Switch between code and a real-time system-design canvas with PNG export, plus line-anchored code review threads.",
  },
  {
    icon: FolderTree,
    title: "Tree Explorer & Checkpoints",
    desc: "Collapsible folder tree, drag-and-drop uploads, starter templates, named version checkpoints with live restore, and ZIP export.",
  },
  {
    icon: PhoneCall,
    title: "WebRTC Voice & Chat",
    desc: "Peer-to-peer mesh audio with STUN/TURN support, mute controls, and paginated Marginalia chat inside every room.",
  },
];

const USE_CASES = [
  "Pair Programming",
  "Technical Interviews",
  "System Design Rounds",
  "Classroom Teaching",
  "Hackathons",
  "Async Code Reviews",
];

const WORKFLOW = [
  {
    step: "01",
    icon: GitBranch,
    title: "Pick a template",
    desc: "Start from blank, algorithms, web preview, or multi-file Node—or launch an instant guest playground.",
  },
  {
    step: "02",
    icon: Users,
    title: "Invite with control",
    desc: "Share a secret private invite link or invite teammates directly with Editor or Viewer permissions.",
  },
  {
    step: "03",
    icon: TerminalSquare,
    title: "Code, sketch & review",
    desc: "Run batch tests, sketch architecture on the board, leave line comments, and grade privately.",
  },
];

export default function Landing() {
  const navigate = useNavigate();
  const { user, token } = useAuthStore();
  const [creatingInstant, setCreatingInstant] = useState(false);
  const [demoRunning, setDemoRunning] = useState(false);
  const [demoOutput, setDemoOutput] = useState("");

  async function handleLaunchInstant() {
    setCreatingInstant(true);
    try {
      const { data } = await api.post("/rooms/instant", { language: "javascript" });
      if (data.guestToken) {
        sessionStorage.setItem(
          `collab_guest_${data.room.roomId}`,
          JSON.stringify({
            guestToken: data.guestToken,
            username: data.username,
          })
        );
      }
      toast.success("Instant Playground Ready!", { icon: "📜" });
      navigate(`/room/${data.room.roomId}`);
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not launch playground");
    } finally {
      setCreatingInstant(false);
    }
  }

  function handleRunDemo() {
    setDemoRunning(true);
    setDemoOutput("");
    setTimeout(() => {
      setDemoRunning(false);
      setDemoOutput("✨ Output: CodeTogether: Yjs CRDT + Monaco + Whiteboard + WebRTC [28ms]");
    }, 600);
  }

  return (
    <div className="min-h-dvh flex flex-col bg-bg text-gray-100 selection:bg-accent/25 overflow-x-clip">
      {/* Top Navigation */}
      <header className="border-b border-border bg-surface/90 backdrop-blur-md sticky top-0 z-40 shadow-paper-sm w-full">
        <div className="flex items-center justify-between px-4 sm:px-6 lg:px-10 py-3.5 w-full max-w-[1600px] mx-auto">
          <div className="flex items-center gap-2.5 font-bold text-lg text-gray-100">
            <BrandMark size={32} className="text-accent" />
            <span className="font-serif tracking-tight text-lg">CodeTogether</span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 text-sm">
            <ThemeToggle compact />
            <button
              onClick={handleLaunchInstant}
              disabled={creatingInstant}
              className="hidden sm:inline-flex items-center gap-1.5 text-xs bg-accent2/15 text-accent2 border border-accent2/30 hover:bg-accent2/25 px-3 py-1.5 rounded-lg font-medium transition-colors shadow-paper-sm"
            >
              <Sparkles size={13} />
              <span>Instant Playground</span>
            </button>
            {user && token ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-1.5 bg-accent px-4 py-1.5 rounded-lg text-white font-medium hover:opacity-90 transition-all shadow-paper-sm text-xs sm:text-sm active:scale-95"
              >
                <LayoutDashboard size={14} />
                <span>Dashboard</span>
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-gray-300 hover:text-gray-100 px-3 py-1.5 transition-colors font-medium text-xs sm:text-sm"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  className="bg-accent px-4 py-1.5 rounded-lg text-white font-medium hover:opacity-90 transition-all shadow-paper-sm text-xs sm:text-sm active:scale-95"
                >
                  Sign Up Free
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero + Live Interactive Preview (Fits 100% Viewport Above the Fold) */}
      <section className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 py-8 sm:py-12 lg:py-0 lg:min-h-[calc(100dvh-65px)] flex items-center">
        <div className="w-full grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Hero Copy & CTAs */}
          <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-border bg-surface text-accent text-xs font-medium shadow-paper-sm">
              <Feather size={13} className="text-accent" />
              <span>Collaborative IDE, Technical Interviews &amp; System Design Studio</span>
            </div>

            <h1 className="text-4xl sm:text-5xl xl:text-6xl font-extrabold font-serif leading-[1.08] tracking-tight text-gray-100">
              Your team’s best work, <br className="hidden sm:inline" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent via-[#B8741A] to-accent2">
                built side by side.
              </span>
            </h1>

            <p className="text-gray-400 max-w-2xl mx-auto lg:mx-0 text-base sm:text-lg leading-relaxed font-sans">
              CodeTogether brings conflict-free multi-file coding, sandboxed execution, live web previews,
              system-design whiteboarding, voice calls, and private interview scorecards into one calm workspace.
            </p>

            {/* Action CTAs */}
            <div className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-3 pt-1">
              <button
                onClick={handleLaunchInstant}
                disabled={creatingInstant}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-accent hover:opacity-90 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-paper hover:shadow-paper-md focus:ring-2 focus:ring-accent active:scale-95"
              >
                {creatingInstant ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Launching...</span>
                  </>
                ) : (
                  <>
                    <span>Try Instant Playground</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              <Link
                to={user && token ? "/dashboard" : "/register"}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-border bg-surface hover:bg-surface2 px-6 py-3 rounded-xl font-medium text-gray-200 transition-colors shadow-paper-sm"
              >
                {user && token ? "Open Your Dashboard" : "Create Permanent Room"}
              </Link>
            </div>

            {/* Feature Counters */}
            <div className="grid grid-cols-3 max-w-lg mx-auto lg:mx-0 text-center divide-x divide-border bg-surface border border-border rounded-xl p-3 shadow-paper-sm">
              <div>
                <div className="text-2xl font-bold font-serif text-gray-100">15+</div>
                <div className="text-xs text-gray-400 mt-0.5">Languages ready</div>
              </div>
              <div>
                <div className="text-2xl font-bold font-serif text-accent2">CRDT</div>
                <div className="text-xs text-gray-400 mt-0.5">Binary + Redis sync</div>
              </div>
              <div>
                <div className="text-2xl font-bold font-serif text-accent">4 roles</div>
                <div className="text-xs text-gray-400 mt-0.5">RBAC &amp; private invites</div>
              </div>
            </div>
          </div>

          {/* Right Interactive Hero Preview Component */}
          <div className="lg:col-span-6 w-full">
            <div className="rounded-2xl border border-border bg-surface shadow-paper-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-surface2 border-b border-border text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                  <span className="text-gray-400 ml-2 font-mono text-[11px]">room: interview-studio</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-gray-300 bg-surface border border-border px-2 py-0.5 rounded-full font-mono">
                    <History size={10} className="text-accent" /> Checkpoints
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] text-accent2 bg-accent2/10 border border-accent2/30 px-2 py-0.5 rounded-full font-medium">
                    ● 2 Active Scribes
                  </span>
                  <button
                    onClick={handleRunDemo}
                    disabled={demoRunning}
                    className="flex items-center gap-1.5 bg-accent hover:opacity-90 text-white px-3 py-1 rounded-md text-xs font-semibold transition-opacity shadow-paper-sm"
                  >
                    <Play size={11} fill="currentColor" />
                    <span>{demoRunning ? "Running..." : "Run"}</span>
                  </button>
                </div>
              </div>

              <div className="p-5 sm:p-6 font-mono text-xs sm:text-sm text-gray-100 space-y-1.5 bg-paper-editor paper-ruled leading-7">
                <div className="text-gray-400 italic">// Collaborative multi-file &amp; interview studio</div>
                <div>
                  <span className="text-accent font-semibold">function</span>{" "}
                  <span className="text-accent font-medium">collaborate</span>() &#123;
                </div>
                <div className="pl-4">
                  <span className="text-accent font-semibold">const</span>{" "}
                  <span className="text-amber-700 dark:text-amber-400">stack</span> = [
                  <span className="text-accent2">&quot;Yjs CRDT&quot;</span>,{" "}
                  <span className="text-accent2">&quot;Monaco&quot;</span>,{" "}
                  <span className="text-accent2">&quot;Whiteboard&quot;</span>,{" "}
                  <span className="text-accent2">&quot;WebRTC&quot;</span>];
                </div>
                <div className="pl-4 flex items-center flex-wrap">
                  <span>return `CodeTogether: $&#123;stack.join(&quot; + &quot;)&#125;`;</span>
                  <span className="inline-block w-2 h-4 bg-accent animate-pulse ml-1" />
                  <span className="text-[10px] bg-accent text-white px-1.5 py-0.5 rounded font-sans ml-1.5 shadow-sm">
                    Alice typing...
                  </span>
                </div>
                <div>&#125;</div>
                <div className="pt-2 text-accent">console.log(collaborate());</div>
              </div>

              <div className="px-5 py-3.5 bg-paper-console border-t border-border text-xs font-mono text-gray-200 min-h-[48px] flex items-center">
                {demoRunning ? (
                  <span className="text-amber-700 dark:text-amber-400 animate-pulse flex items-center gap-1.5 font-medium">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping inline-block" />
                    Executing in isolated sandbox...
                  </span>
                ) : demoOutput ? (
                  <span className="text-emerald-700 dark:text-emerald-400 font-semibold">{demoOutput}</span>
                ) : (
                  <span className="text-gray-500 italic">Click &quot;Run&quot; above to execute this code live</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section className="max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-10 py-12 sm:py-14 border-t border-border">
        <div className="grid lg:grid-cols-[1fr_2fr] gap-10 items-start">
          <div>
            <div className="inline-flex items-center gap-2 text-accent text-xs font-semibold uppercase tracking-widest">
              <Globe2 size={14} />
              Made for momentum
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold font-serif text-gray-100 mt-3">
              From blank page to breakthrough.
            </h2>
            <p className="text-sm text-gray-400 leading-relaxed mt-3">
              No setup maze. No context switching. Just a focused room where everyone can code, sketch, and test together.
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {WORKFLOW.map(({ step, icon: Icon, title, desc }) => (
              <div key={step} className="bg-surface border border-border rounded-2xl p-5 shadow-paper-sm">
                <div className="flex items-center justify-between text-accent mb-5">
                  <Icon size={20} />
                  <span className="font-mono text-[10px] text-gray-500">{step}</span>
                </div>
                <h3 className="font-semibold text-gray-100 text-sm">{title}</h3>
                <p className="text-xs text-gray-400 leading-relaxed mt-2">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-10 py-12">
        <div className="text-center mb-10 space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold font-serif text-gray-100">
            Engineered for Peak Developer Flow
          </h2>
          <p className="text-sm text-gray-400">
            Everything you need for pair programming, system design rounds, and technical interviews.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="bg-surface border border-border rounded-2xl p-6 hover:border-accent/50 shadow-paper hover:shadow-paper-md transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/25 text-accent flex items-center justify-center mb-3.5 shadow-paper-sm">
                <Icon size={19} />
              </div>
              <div className="font-semibold text-gray-100 mb-1.5 text-base">{title}</div>
              <div className="text-xs text-gray-400 leading-relaxed font-sans">{desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Security & Governance Callout */}
      <section className="max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-10 py-8">
        <div className="bg-surface border border-border rounded-2xl p-6 sm:p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-paper">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 flex items-center justify-center shrink-0">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-100 font-serif text-base">
                Hardened RBAC, Private Invites & Host-Only Scorecards
              </h3>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                Rotating refresh tokens, secret invite URLs for private rooms, host moderation controls, and strict database isolation for private candidate evaluations.
              </p>
            </div>
          </div>
          <Link
            to={user && token ? "/dashboard" : "/register"}
            className="shrink-0 bg-surface2 hover:bg-border border border-border px-4 py-2 rounded-xl text-xs font-semibold text-gray-100 transition-colors"
          >
            {user && token ? "Go to Workspace" : "Get Started"}
          </Link>
        </div>
      </section>

      {/* Use Cases */}
      <section className="max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-10 py-10 text-center border-t border-border">
        <h3 className="text-xs uppercase tracking-wider text-gray-400 mb-5 font-semibold font-mono">
          Perfect For Every Scenario
        </h3>
        <div className="flex flex-wrap justify-center gap-2.5">
          {USE_CASES.map((u) => (
            <span
              key={u}
              className="border border-border bg-surface rounded-full px-4 py-1.5 text-xs text-gray-300 shadow-paper-sm font-medium"
            >
              {u}
            </span>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-border py-8 px-6 text-center text-xs text-gray-500 bg-surface/50">
        <div className="flex items-center justify-center gap-2 mb-2 text-gray-400 font-serif">
          <BrandMark size={22} className="text-accent" />
          <span>CodeTogether</span>
          <span>•</span>
          <span>Editorial Parchment & Midnight Kraft</span>
        </div>
        <p>© 2026 CodeTogether. A shared space for building better software.</p>
      </footer>
    </div>
  );
}
