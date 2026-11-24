import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Users,
  Zap,
  MessageSquare,
  Shield,
  PhoneCall,
  CheckCircle2,
  Play,
  ArrowRight,
  FolderTree,
  Sparkles,
  Clock,
  Download,
  Feather,
  Globe2,
  GitBranch,
  TerminalSquare,
} from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../services/api.js";
import ThemeToggle from "../components/common/ThemeToggle.jsx";
import BrandMark from "../components/common/BrandMark.jsx";

const FEATURES = [
  {
    icon: Users,
    title: "Conflict-Free Collaboration",
    desc: "Real-time collaborative editing powered by Yjs CRDTs. Track peer cursors and simultaneous edits with sub-10ms sync.",
  },
  {
    icon: Zap,
    title: "Multi-Language Execution",
    desc: "Execute JavaScript, Python, C++, Go, Java, and 10+ languages instantly with standard input (stdin) support.",
  },
  {
    icon: PhoneCall,
    title: "In-Room WebRTC Voice Call",
    desc: "Talk with peers directly inside the room without needing external Zoom or Discord links.",
  },
  {
    icon: FolderTree,
    title: "Multi-File Project Tabs",
    desc: "Create and edit multiple files with automatic language detection, file tree explorer, and instant ZIP export.",
  },
  {
    icon: Clock,
    title: "Interview Mode & Timer",
    desc: "Built-in synchronized interview timer with LeetCode-style multi-case automated test runner.",
  },
  {
    icon: MessageSquare,
    title: "Integrated Marginalia Chat",
    desc: "Discuss algorithms, paste snippets, and collaborate with your team without switching tabs.",
  },
];

const USE_CASES = [
  "Pair Programming",
  "Technical Interviews",
  "Classroom Teaching",
  "Hackathons",
  "Competitive Programming",
  "Code Reviews",
];

const WORKFLOW = [
  {
    step: "01",
    icon: GitBranch,
    title: "Start a room",
    desc: "Create a private workspace in one click or jump into an instant playground with no account.",
  },
  {
    step: "02",
    icon: Users,
    title: "Invite your crew",
    desc: "Share one link and watch teammates appear with live cursors, presence, and permissions.",
  },
  {
    step: "03",
    icon: TerminalSquare,
    title: "Ship together",
    desc: "Run, discuss, and export your project without leaving the room or losing your flow.",
  },
];

export default function Landing() {
  const navigate = useNavigate();
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
      setDemoOutput("✨ Output: Hello, Collaborative World! [32ms]");
    }, 700);
  }

  return (
    <div className="min-h-screen bg-bg text-gray-100 selection:bg-accent/25">
      {/* Top Navigation */}
      <header className="border-b border-border bg-surface/90 backdrop-blur-md sticky top-0 z-40 shadow-paper-sm">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 max-w-6xl mx-auto">
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
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="text-center pt-16 pb-12 px-6 max-w-4xl mx-auto space-y-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-border bg-surface text-accent text-xs font-medium shadow-paper-sm">
          <Feather size={13} className="text-accent" />
          <span>One room for every brilliant idea</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold font-serif leading-tight tracking-tight text-gray-100">
          Your team’s best work, <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent via-[#B8741A] to-accent2">
            built side by side.
          </span>
        </h1>

        <p className="text-gray-400 max-w-2xl mx-auto text-base sm:text-lg leading-relaxed font-sans">
          CodeTogether is the calm, capable workspace for pair programming, interviews, teaching, and hackathons.
          Edit the same code, talk through the hard parts, and see ideas become working software in real time.
        </p>

        {/* Action CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
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
            to="/register"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-border bg-surface hover:bg-surface2 px-6 py-3 rounded-xl font-medium text-gray-200 transition-colors shadow-paper-sm"
          >
            Create Permanent Room
          </Link>
        </div>

        {/* Feature Counters */}
        <div className="grid grid-cols-3 max-w-lg mx-auto pt-6 text-center divide-x divide-border bg-surface border border-border rounded-xl p-3 shadow-paper-sm">
          <div>
            <div className="text-2xl font-bold font-serif text-gray-100">1 link</div>
            <div className="text-xs text-gray-400 mt-0.5">To start collaborating</div>
          </div>
          <div>
            <div className="text-2xl font-bold font-serif text-accent2">Real-time</div>
            <div className="text-xs text-gray-400 mt-0.5">Shared editing</div>
          </div>
          <div>
            <div className="text-2xl font-bold font-serif text-accent">10+</div>
            <div className="text-xs text-gray-400 mt-0.5">Languages ready</div>
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section className="max-w-5xl mx-auto px-6 py-14 border-t border-border">
        <div className="grid md:grid-cols-[1fr_2fr] gap-10 items-start">
          <div>
            <div className="inline-flex items-center gap-2 text-accent text-xs font-semibold uppercase tracking-widest">
              <Globe2 size={14} />
              Made for momentum
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold font-serif text-gray-100 mt-3">
              From blank page to breakthrough.
            </h2>
            <p className="text-sm text-gray-400 leading-relaxed mt-3">
              No setup maze. No context switching. Just a focused room where everyone can contribute.
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            {WORKFLOW.map(({ step, icon: Icon, title, desc }) => (
              <div key={step} className="bg-surface border border-border rounded-2xl p-4 shadow-paper-sm">
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

      {/* Interactive Hero Preview Component */}
      <section className="max-w-4xl mx-auto px-6 pb-16">
        <div className="rounded-2xl border border-border bg-surface shadow-paper-lg overflow-hidden">
          {/* Mock Window Top Bar */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-surface2 border-b border-border text-xs">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
              <span className="text-gray-400 ml-2 font-mono text-[11px]">room: interactive-playground</span>
            </div>

            <div className="flex items-center gap-2">
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

          {/* Code Body */}
          <div className="p-5 font-mono text-xs text-gray-100 space-y-1 bg-paper-editor">
            <div className="text-gray-400 italic">// Collaborative parchment code editor</div>
            <div>
              <span className="text-accent font-semibold">function</span> <span className="text-accent font-medium">collaborate</span>() &#123;
            </div>
            <div className="pl-4">
              <span className="text-accent font-semibold">const</span> <span className="text-amber-700 dark:text-amber-400">stack</span> = [<span className="text-accent2">"Yjs CRDT"</span>, <span className="text-accent2">"Monaco"</span>, <span className="text-accent2">"WebRTC Voice"</span>];
            </div>
            <div className="pl-4 flex items-center">
              <span>return `CodeTogether: $&#123;stack.join(" + ")&#125;`;</span>
              <span className="inline-block w-2 h-4 bg-accent animate-pulse ml-1" />
              <span className="text-[10px] bg-accent text-white px-1.5 py-0.5 rounded font-sans ml-1.5 shadow-sm">
                Alice typing...
              </span>
            </div>
            <div>&#125;</div>
            <div className="pt-2 text-accent">console.log(collaborate());</div>
          </div>

          {/* Output Preview */}
          <div className="px-5 py-3 bg-paper-console border-t border-border text-xs font-mono text-gray-200 min-h-[44px] flex items-center">
            {demoRunning ? (
              <span className="text-amber-700 dark:text-amber-400 animate-pulse flex items-center gap-1.5 font-medium">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping inline-block" />
                Compiling in sandbox...
              </span>
            ) : demoOutput ? (
              <span className="text-emerald-700 dark:text-emerald-400 font-semibold">{demoOutput}</span>
            ) : (
              <span className="text-gray-500 italic">Click "Run" above to execute this code live</span>
            )}
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="max-w-5xl mx-auto px-6 py-12">
        <div className="text-center mb-10 space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold font-serif text-gray-100">
            Engineered for Peak Developer Flow
          </h2>
          <p className="text-sm text-gray-400">
            Everything you need for seamless pair programming and mock technical interviews.
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

      {/* Use Cases */}
      <section className="max-w-5xl mx-auto px-6 py-10 text-center border-t border-border">
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
      <footer className="border-t border-border py-8 px-6 text-center text-xs text-gray-500 bg-surface/50">
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
