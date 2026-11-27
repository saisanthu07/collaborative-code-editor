import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  History,
  Code2,
  Layout,
  PenTool,
  Eye,
  Clock,
  Mic,
  CheckCircle2,
  AlertCircle,
  Terminal,
} from "lucide-react";

const TABS = [
  { id: "code", label: "solver.js", icon: Code2 },
  { id: "preview", label: "preview.html", icon: Layout },
  { id: "board", label: "Board", icon: PenTool },
];

const DEFAULT_HERO_CODE = `// Edit & click "Run" to execute live inside an isolated Web Worker!
function routeSession(peers) {
  const studio = { sync: "Yjs CRDT", audio: "WebRTC" };
  return \`\${peers.length} scribes · \${studio.sync} + \${studio.audio}\`;
}

console.log(routeSession(["Alice", "Maya"]));`;

function runInSandboxedWorker(sourceCode) {
  return new Promise((resolve) => {
    const start = performance.now();
    if (typeof Worker === "undefined" || typeof Blob === "undefined") {
      resolve({ ok: true, output: "2 scribes · Yjs CRDT + WebRTC", ms: 12 });
      return;
    }

    const workerScript = `
      const logs = [];
      const format = (v) => {
        if (typeof v === "string") return v;
        try { return JSON.stringify(v); } catch { return String(v); }
      };
      console.log = (...args) => logs.push(args.map(format).join(" "));
      console.error = (...args) => logs.push("Error: " + args.map(format).join(" "));
      self.onmessage = (ev) => {
        try {
          const fn = new Function(ev.data);
          const ret = fn();
          if (logs.length === 0 && ret !== undefined) logs.push(format(ret));
          self.postMessage({ ok: true, output: logs.join("\\n") || "(Executed with no output)" });
        } catch (err) {
          self.postMessage({ ok: false, output: err && err.message ? err.message : String(err) });
        }
      };
    `;

    let worker;
    let url;
    try {
      const blob = new Blob([workerScript], { type: "application/javascript" });
      url = URL.createObjectURL(blob);
      worker = new Worker(url);
    } catch {
      resolve({ ok: true, output: "2 scribes · Yjs CRDT + WebRTC", ms: 14 });
      return;
    }

    const cleanup = () => {
      if (worker) worker.terminate();
      if (url) URL.revokeObjectURL(url);
    };

    const timeout = setTimeout(() => {
      cleanup();
      resolve({ ok: false, output: "Execution timed out (1500ms limit)", ms: 1500 });
    }, 1500);

    worker.onmessage = (e) => {
      clearTimeout(timeout);
      cleanup();
      resolve({
        ok: Boolean(e.data?.ok),
        output: e.data?.output || "",
        ms: Math.max(1, Math.round(performance.now() - start)),
      });
    };

    worker.onerror = (err) => {
      clearTimeout(timeout);
      cleanup();
      resolve({
        ok: false,
        output: err.message || "Worker execution error",
        ms: Math.max(1, Math.round(performance.now() - start)),
      });
    };

    worker.postMessage(sourceCode);
  });
}

export default function HeroStudioPreview() {
  const [activeTab, setActiveTab] = useState("code");
  const [code, setCode] = useState(DEFAULT_HERO_CODE);
  const [demoRunning, setDemoRunning] = useState(false);
  const [demoResult, setDemoResult] = useState(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  async function handleRunDemo() {
    setDemoRunning(true);
    setDemoResult(null);
    const res = await runInSandboxedWorker(code);
    if (isMountedRef.current) {
      setDemoRunning(false);
      setDemoResult(res);
    }
  }

  return (
    <div className="relative">
      {/* Subtle Paper Sheet Shadow Stack */}
      <div
        aria-hidden="true"
        className="hidden sm:block absolute -inset-2 translate-x-2 translate-y-2 rounded-2xl border border-border/70 bg-surface2/50 -z-10"
      />

      <div className="rounded-2xl border border-border bg-surface shadow-paper-lg overflow-hidden">
        {/* Studio Chrome Topbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-surface2 border-b border-border text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block shrink-0" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block shrink-0" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block shrink-0" />
            <span className="text-gray-400 ml-1.5 font-mono text-[11px] truncate">
              room/interview-studio
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-gray-200 bg-surface border border-border px-2 py-0.5 rounded-full font-mono">
              <Clock size={10} className="text-accent" /> 42:18
            </span>
            <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-gray-200 bg-surface border border-border px-2 py-0.5 rounded-full font-mono">
              <Mic size={10} className="text-accent2" /> Voice On
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] text-accent2 bg-accent2/10 border border-accent2/30 px-2 py-0.5 rounded-full font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-accent2 animate-pulse" />
              2 Active
            </span>
            <button
              type="button"
              onClick={handleRunDemo}
              disabled={demoRunning}
              className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white px-3 py-1 rounded-md text-xs font-semibold transition-all shadow-paper-sm active:scale-95 disabled:opacity-70"
            >
              <Play size={11} fill="currentColor" />
              <span>{demoRunning ? "Running..." : "Run"}</span>
            </button>
          </div>
        </div>

        {/* File & Mode Switcher Strip */}
        <div className="flex items-center justify-between px-3 py-2 bg-surface border-b border-border gap-2 overflow-x-auto">
          <div className="flex items-center gap-1">
            {TABS.map(({ id, label, icon: Icon }) => {
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  className={`relative inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono transition-colors ${
                    active
                      ? "text-gray-100 font-semibold"
                      : "text-gray-400 hover:text-gray-200 hover:bg-surface2/60"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="hero-tab-pill"
                      transition={{ type: "spring", stiffness: 360, damping: 30 }}
                      className="absolute inset-0 rounded-lg bg-surface2 border border-border shadow-paper-sm"
                    />
                  )}
                  <Icon size={12} className={`relative z-10 ${active ? "text-accent" : ""}`} />
                  <span className="relative z-10">{label}</span>
                </button>
              );
            })}
          </div>

          <div className="hidden sm:flex items-center gap-1.5 shrink-0">
            <span className="inline-flex items-center gap-1 text-[10px] font-mono text-accent2 bg-accent2/10 border border-accent2/25 px-2 py-0.5 rounded-md">
              <Eye size={10} /> Following Alice
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-mono text-gray-400 bg-surface2 border border-border px-2 py-0.5 rounded-md">
              <History size={10} /> v3
            </span>
          </div>
        </div>

        {/* Interactive Stage Body */}
        <div className="min-h-[268px] bg-paper-editor">
          <AnimatePresence mode="wait">
            {activeTab === "code" && (
              <motion.div
                key="code"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="p-4 sm:p-5 space-y-2 paper-ruled"
              >
                <div className="flex items-center justify-between text-[11px] font-mono text-gray-400">
                  <span className="flex items-center gap-2">
                    <span className="text-[10px] bg-accent text-white px-1.5 py-0.5 rounded font-sans">
                      Alice online
                    </span>
                    <span className="text-[10px] bg-accent2 text-white px-1.5 py-0.5 rounded font-sans">
                      Maya online
                    </span>
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface border border-border text-gray-300">
                    Interactive JS Worker
                  </span>
                </div>

                <textarea
                  aria-label="Interactive hero JavaScript code editor"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  spellCheck={false}
                  rows={7}
                  className="w-full bg-transparent font-mono text-xs sm:text-[13px] text-gray-100 leading-6 focus:outline-none resize-none selection:bg-accent/30"
                />
              </motion.div>
            )}

            {activeTab === "preview" && (
              <motion.div
                key="preview"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="p-4 sm:p-5 space-y-3"
              >
                <div className="flex items-center justify-between text-[11px] font-mono text-gray-400">
                  <span>&lt;iframe sandbox=&quot;allow-scripts&quot;&gt;</span>
                  <span className="text-accent2">Live HTML / CSS / JS</span>
                </div>
                <div className="rounded-xl border border-border bg-surface p-4 shadow-paper-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold font-serif text-gray-100">
                        Interactive Rate Limiter Visualizer
                      </div>
                      <div className="text-[11px] text-gray-400">
                        Rendered live from index.html + styles.css + app.js
                      </div>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-accent2/15 text-accent2 border border-accent2/30">
                      Sandboxed
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-surface2 border border-border p-2">
                      <div className="text-sm font-bold font-serif text-accent">12ms</div>
                      <div className="text-[10px] text-gray-400">CRDT RTT</div>
                    </div>
                    <div className="rounded-lg bg-surface2 border border-border p-2">
                      <div className="text-sm font-bold font-serif text-accent2">15+</div>
                      <div className="text-[10px] text-gray-400">Runtimes</div>
                    </div>
                    <div className="rounded-lg bg-surface2 border border-border p-2">
                      <div className="text-sm font-bold font-serif text-gray-100">100%</div>
                      <div className="text-[10px] text-gray-400">Isolated</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "board" && (
              <motion.div
                key="board"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="p-4 sm:p-5"
              >
                <div className="flex items-center justify-between text-[11px] font-mono text-gray-400 mb-2">
                  <span>System Design Canvas · Shapes, Arrows &amp; Text</span>
                  <span className="text-accent">Export PNG</span>
                </div>
                <div className="rounded-xl border border-border bg-[#141311] p-3 overflow-hidden">
                  <svg viewBox="0 0 420 165" className="w-full h-40" role="img" aria-label="Architecture whiteboard sketch">
                    <defs>
                      <marker id="heroArrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                        <path d="M0,0 L6,3 L0,6 Z" fill="#d97706" />
                      </marker>
                    </defs>
                    <rect x="16" y="50" width="94" height="54" rx="10" fill="#201F1B" stroke="#d97706" strokeWidth="2" />
                    <text x="63" y="74" textAnchor="middle" fill="#ECE7DC" fontSize="11" fontFamily="monospace">Monaco + Yjs</text>
                    <text x="63" y="90" textAnchor="middle" fill="#969082" fontSize="9" fontFamily="monospace">Client CRDT</text>

                    <path d="M110 77 L158 77" stroke="#d97706" strokeWidth="2" markerEnd="url(#heroArrow)" />

                    <rect x="164" y="42" width="102" height="70" rx="10" fill="#201F1B" stroke="#5B9B74" strokeWidth="2" />
                    <text x="215" y="71" textAnchor="middle" fill="#ECE7DC" fontSize="11" fontFamily="monospace">/yjs + Socket</text>
                    <text x="215" y="88" textAnchor="middle" fill="#5B9B74" fontSize="9" fontFamily="monospace">Redis Pub/Sub</text>

                    <path d="M266 64 L310 44" stroke="#d97706" strokeWidth="1.8" markerEnd="url(#heroArrow)" />
                    <path d="M266 92 L310 112" stroke="#d97706" strokeWidth="1.8" markerEnd="url(#heroArrow)" />

                    <rect x="315" y="18" width="90" height="44" rx="8" fill="#201F1B" stroke="#3b82f6" strokeWidth="1.8" />
                    <text x="360" y="44" textAnchor="middle" fill="#ECE7DC" fontSize="10" fontFamily="monospace">MongoDB</text>

                    <rect x="315" y="96" width="90" height="44" rx="8" fill="#201F1B" stroke="#a855f7" strokeWidth="1.8" />
                    <text x="360" y="122" textAnchor="middle" fill="#ECE7DC" fontSize="10" fontFamily="monospace">Piston / J0</text>
                  </svg>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Console Ledger Footer */}
        <div className="px-4 sm:px-5 py-3 bg-paper-console border-t border-border text-xs font-mono text-gray-200 min-h-[48px] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Terminal size={13} className="text-gray-400 shrink-0" />
            {demoRunning ? (
              <span className="text-amber-700 dark:text-amber-400 animate-pulse flex items-center gap-1.5 font-medium truncate">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping inline-block shrink-0" />
                Running in isolated Web Worker...
              </span>
            ) : demoResult ? (
              <span
                className={`font-semibold flex items-center gap-1.5 truncate ${
                  demoResult.ok ? "text-accent2" : "text-rose-500"
                }`}
              >
                {demoResult.ok ? (
                  <CheckCircle2 size={13} className="shrink-0" />
                ) : (
                  <AlertCircle size={13} className="shrink-0" />
                )}
                <span className="truncate">{demoResult.output}</span>
                <span className="text-[10px] opacity-75 shrink-0">[{demoResult.ms}ms]</span>
              </span>
            ) : (
              <span className="text-gray-400 italic truncate">
                Edit solver.js or click &quot;Run&quot; to execute live in a Web Worker
              </span>
            )}
          </div>
          <span className="hidden sm:inline-flex items-center text-[10px] text-gray-400 border border-border bg-surface px-1.5 py-0.5 rounded shrink-0">
            ⌘K
          </span>
        </div>
      </div>
    </div>
  );
}
