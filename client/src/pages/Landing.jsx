import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Code2,
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
} from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../services/api.js";

const FEATURES = [
  {
    icon: Users,
    title: "Conflict-Free Collaboration",
    desc: "Real-time collaborative editing with Yjs CRDTs. See teammate cursors and edits with sub-10ms latency.",
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
    title: "Integrated Room Chat",
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

const STACK = [
  "React 18",
  "Vite",
  "Monaco Editor",
  "Yjs CRDT",
  "WebRTC Voice",
  "Socket.IO",
  "Node.js",
  "Express",
  "MongoDB",
  "Piston Sandbox",
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
      toast.success("Instant Playground Ready!", { icon: "🚀" });
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
      setDemoOutput("✨ Output: Hello, Collaborative World! [30ms]");
    }, 700);
  }

  return (
    <div className="min-h-screen bg-[#070a0e] text-gray-100 selection:bg-accent/40">
      {/* Top Navigation */}
      <header className="border-b border-border/50 bg-surface/40 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center justify-between px-6 py-3.5 max-w-6xl mx-auto">
          <div className="flex items-center gap-2.5 font-bold text-lg text-white">
            <div className="w-8 h-8 rounded-lg bg-accent/20 border border-accent/40 flex items-center justify-center text-accent">
              <Code2 size={20} />
            </div>
            <span>CodeTogether</span>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <button
              onClick={handleLaunchInstant}
              disabled={creatingInstant}
              className="hidden sm:inline-flex items-center gap-1.5 text-xs bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 px-3 py-1.5 rounded-md font-medium transition-colors"
            >
              <Sparkles size={13} />
              <span>Instant Playground</span>
            </button>
            <Link to="/login" className="text-gray-300 hover:text-white px-3 py-1.5 transition-colors">
              Log In
            </Link>
            <Link
              to="/register"
              className="bg-accent px-4 py-1.5 rounded-md text-white font-medium hover:bg-blue-600 transition-colors shadow-sm"
            >
              Sign Up Free
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="text-center pt-16 pb-12 px-6 max-w-4xl mx-auto space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-accent/30 bg-accent/10 text-accent text-xs font-medium">
          <Sparkles size={13} />
          <span>Next-Generation Collaborative Coding Platform</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold leading-tight tracking-tight text-white">
          Code Together. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-400">
            Build at the Speed of Thought.
          </span>
        </h1>

        <p className="text-gray-400 max-w-2xl mx-auto text-base sm:text-lg leading-relaxed">
          High-performance collaborative coding with real-time CRDT sync, sandboxed multi-language execution,
          integrated WebRTC voice calling, and multi-case interview testing.
        </p>

        {/* Action CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
          <button
            onClick={handleLaunchInstant}
            disabled={creatingInstant}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-accent hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold transition-all shadow-lg shadow-accent/25 focus:ring-2 focus:ring-accent"
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
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-border bg-surface/60 hover:bg-surface2 px-6 py-3 rounded-lg font-medium text-gray-200 transition-colors"
          >
            Create Permanent Room
          </Link>
        </div>

        {/* Feature Counters */}
        <div className="grid grid-cols-3 max-w-lg mx-auto pt-6 text-center divide-x divide-border/60">
          <div>
            <div className="text-2xl font-bold text-white">15+</div>
            <div className="text-xs text-gray-400">Languages</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-400">&lt; 10ms</div>
            <div className="text-xs text-gray-400">CRDT Latency</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-400">100% Free</div>
            <div className="text-xs text-gray-400">No Credit Card</div>
          </div>
        </div>
      </section>

      {/* Interactive Hero Preview Component */}
      <section className="max-w-4xl mx-auto px-6 pb-16">
        <div className="rounded-xl border border-border/80 bg-[#0c1017] shadow-2xl overflow-hidden">
          {/* Mock Window Top Bar */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-surface border-b border-border text-xs">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
              <span className="text-gray-400 ml-2 font-mono text-[11px]">room: interactive-playground</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                ● 2 Active Users
              </span>
              <button
                onClick={handleRunDemo}
                disabled={demoRunning}
                className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded text-xs font-semibold transition-colors"
              >
                <Play size={11} fill="currentColor" />
                <span>{demoRunning ? "Running..." : "Run"}</span>
              </button>
            </div>
          </div>

          {/* Code Body */}
          <div className="p-4 font-mono text-xs text-gray-200 space-y-1 bg-[#090d13]">
            <div className="text-gray-500">// Real-time collaborative code editor</div>
            <div>
              <span className="text-purple-400">function</span> <span className="text-blue-400">collaborate</span>() &#123;
            </div>
            <div className="pl-4">
              <span className="text-purple-400">const</span> <span className="text-yellow-300">stack</span> = [<span className="text-emerald-300">"Yjs"</span>, <span className="text-emerald-300">"Monaco"</span>, <span className="text-emerald-300">"WebRTC Voice"</span>];
            </div>
            <div className="pl-4 flex items-center">
              <span>return `CodeTogether: $&#123;stack.join(" + ")&#125;`;</span>
              <span className="inline-block w-2 h-4 bg-accent animate-pulse ml-1" />
              <span className="text-[10px] bg-accent text-white px-1.5 py-0.2 rounded font-sans ml-1">
                Alice typing...
              </span>
            </div>
            <div>&#125;</div>
            <div className="pt-2 text-blue-400">console.log(collaborate());</div>
          </div>

          {/* Output Preview */}
          <div className="px-4 py-2.5 bg-[#05080c] border-t border-border/60 text-xs font-mono text-gray-300 min-h-[38px] flex items-center">
            {demoRunning ? (
              <span className="text-amber-400 animate-pulse">Running in sandbox...</span>
            ) : demoOutput ? (
              <span className="text-emerald-400 font-semibold">{demoOutput}</span>
            ) : (
              <span className="text-gray-500 italic">Click "Run" above to execute this code live</span>
            )}
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="max-w-5xl mx-auto px-6 py-12">
        <div className="text-center mb-10 space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">Engineered for Peak Developer Productivity</h2>
          <p className="text-sm text-gray-400">Everything you need for seamless pair programming and mock technical interviews.</p>
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-surface/80 border border-border rounded-xl p-5 hover:border-accent/40 transition-colors">
              <div className="w-9 h-9 rounded-lg bg-accent/15 border border-accent/25 text-accent flex items-center justify-center mb-3">
                <Icon size={18} />
              </div>
              <div className="font-semibold text-gray-100 mb-1.5">{title}</div>
              <div className="text-xs text-gray-400 leading-relaxed">{desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Use Cases */}
      <section className="max-w-5xl mx-auto px-6 py-10 text-center border-t border-border/40">
        <h3 className="text-xs uppercase tracking-wider text-gray-400 mb-5 font-semibold">Perfect For Every Scenario</h3>
        <div className="flex flex-wrap justify-center gap-2.5">
          {USE_CASES.map((u) => (
            <span key={u} className="border border-border/80 bg-surface/50 rounded-full px-4 py-1.5 text-xs text-gray-300">
              {u}
            </span>
          ))}
        </div>
      </section>

      {/* Technology Badges */}
      <section className="max-w-5xl mx-auto px-6 py-10 pb-20 text-center border-t border-border/40">
        <h3 className="text-xs uppercase tracking-wider text-gray-400 mb-5 font-semibold">Built with Modern Tech</h3>
        <div className="flex flex-wrap justify-center gap-2 text-xs text-gray-400">
          {STACK.map((s) => (
            <span key={s} className="bg-surface border border-border rounded-md px-3 py-1 font-mono">
              {s}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
