import { useRef, useState } from "react";
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
  useMotionValueEvent,
} from "framer-motion";
import {
  Check,
  Eye,
  FolderTree,
  History,
  Download,
  PenTool,
  MessageSquare,
  Clock,
  ClipboardCheck,
  Mic,
  Terminal,
  Play,
  Command,
} from "lucide-react";
import { WALKTHROUGH_CHAPTERS } from "./LandingData.js";

function ChapterStageVisual({ chapterId }) {
  switch (chapterId) {
    case "crdt":
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-semibold text-gray-100">src/crdtEngine.ts</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent2/15 text-accent2 border border-accent2/30 font-medium">
                Yjs Synced
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 text-[10px] font-mono bg-accent/15 text-accent border border-accent/30 px-2 py-0.5 rounded-md">
                <Eye size={11} /> Follow: Alice
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-mono bg-surface2 text-gray-300 border border-border px-2 py-0.5 rounded-md">
                <Command size={10} /> K
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-paper-editor p-4 font-mono text-xs leading-7 paper-ruled space-y-1">
            <div className="text-gray-400 italic">// Multiple cursors converge with zero merge conflicts</div>
            <div>
              <span className="text-accent font-semibold">const</span> doc ={" "}
              <span className="text-accent font-semibold">new</span> Y.Doc();
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span>
                <span className="text-accent font-semibold">const</span> binding ={" "}
                <span className="text-accent2">MonacoBinding</span>(doc.getText(&quot;monaco&quot;));
              </span>
              <span className="inline-block w-0.5 h-4 bg-accent animate-pulse" />
              <span className="text-[10px] bg-accent text-white px-1.5 py-0.5 rounded font-sans">Alice</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-gray-300">awareness.setLocalStateField(&quot;activeFile&quot;, file);</span>
              <span className="inline-block w-0.5 h-4 bg-accent2 animate-pulse" />
              <span className="text-[10px] bg-accent2 text-white px-1.5 py-0.5 rounded font-sans">Sam</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-[11px]">
            {[
              { name: "Alice", role: "HOST", file: "crdtEngine.ts", tone: "bg-accent" },
              { name: "Sam", role: "EDITOR", file: "crdtEngine.ts", tone: "bg-accent2" },
              { name: "Guest-41", role: "VIEWER", file: "readOnly", tone: "bg-amber-500" },
            ].map((p) => (
              <div key={p.name} className="rounded-lg border border-border bg-surface2/70 p-2.5">
                <div className="flex items-center gap-1.5 font-semibold text-gray-100">
                  <span className={`w-2 h-2 rounded-full ${p.tone}`} />
                  <span className="truncate">{p.name}</span>
                </div>
                <div className="text-[10px] font-mono text-gray-400 mt-0.5">
                  {p.role} · {p.file}
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    case "files-exec":
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2 text-xs font-mono text-gray-100">
              <FolderTree size={14} className="text-accent" />
              <span>Multi-File Project &amp; Checkpoints</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 text-[10px] font-mono bg-surface2 border border-border px-2 py-0.5 rounded-md text-gray-200">
                <History size={10} className="text-accent" /> Checkpoints
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-mono bg-surface2 border border-border px-2 py-0.5 rounded-md text-gray-200">
                <Download size={10} className="text-accent2" /> ZIP
              </span>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-5 rounded-xl border border-border bg-surface2/60 p-3 space-y-1.5 font-mono text-[11px]">
              <div className="text-gray-400 text-[10px] uppercase tracking-wider mb-1">Explorer</div>
              <div className="text-gray-200">▾ src/</div>
              <div className="pl-3 text-accent font-semibold bg-accent/10 rounded px-1.5 py-0.5">
                index.js
              </div>
              <div className="pl-3 text-gray-300">utils/hash.js</div>
              <div className="text-gray-300">preview.html</div>
              <div className="pt-2 border-t border-border/70 text-[10px] text-accent2">
                + Drag &amp; drop upload
              </div>
            </div>

            <div className="col-span-7 space-y-2.5">
              <div className="rounded-xl border border-border bg-paper-console p-3 font-mono text-[11px] space-y-1">
                <div className="flex items-center justify-between text-gray-400">
                  <span>Piston Bundle Output</span>
                  <span className="text-accent2">Exit 0 · 34ms</span>
                </div>
                <div className="text-emerald-700 dark:text-emerald-400">
                  ✓ Imported ./utils/hash.js cleanly
                </div>
                <div className="text-gray-200">digest(&quot;codetogether&quot;) → 9f8a4c2e</div>
              </div>

              <div className="rounded-xl border border-border bg-surface2/70 p-3 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-gray-100">DocRevision Snapshots</span>
                  <span className="text-[10px] font-mono text-accent">Live Restore</span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono bg-surface border border-border rounded-lg px-2.5 py-1.5">
                  <span className="text-gray-200">v4 · Before Hash Refactor</span>
                  <span className="text-accent2">Restore →</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      );

    case "board-comments":
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2 text-xs font-mono text-gray-100">
              <PenTool size={14} className="text-accent" />
              <span>Whiteboard &amp; Line Comments</span>
            </div>
            <div className="inline-flex rounded-lg border border-border bg-surface2 p-0.5 text-[10px] font-mono">
              <span className="px-2 py-0.5 text-gray-400">Code</span>
              <span className="px-2 py-0.5 rounded bg-accent text-white font-semibold">Board</span>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-[#141311] p-3">
            <svg viewBox="0 0 380 120" className="w-full h-28" role="img" aria-label="Whiteboard system design flow">
              <rect x="14" y="34" width="84" height="48" rx="8" fill="#201F1B" stroke="#d97706" strokeWidth="1.8" />
              <text x="56" y="62" textAnchor="middle" fill="#ECE7DC" fontSize="10" fontFamily="monospace">API Gateway</text>
              <line x1="98" y1="58" x2="144" y2="58" stroke="#10b981" strokeWidth="2" />
              <rect x="144" y="28" width="92" height="60" rx="8" fill="#201F1B" stroke="#10b981" strokeWidth="1.8" />
              <text x="190" y="56" textAnchor="middle" fill="#ECE7DC" fontSize="10" fontFamily="monospace">Yjs + Redis</text>
              <text x="190" y="72" textAnchor="middle" fill="#5B9B74" fontSize="8.5" fontFamily="monospace">Pub/Sub</text>
              <line x1="236" y1="58" x2="282" y2="58" stroke="#3b82f6" strokeWidth="2" />
              <rect x="282" y="34" width="84" height="48" rx="8" fill="#201F1B" stroke="#3b82f6" strokeWidth="1.8" />
              <text x="324" y="62" textAnchor="middle" fill="#ECE7DC" fontSize="10" fontFamily="monospace">MongoDB</text>
            </svg>
          </div>

          <div className="rounded-xl border border-border bg-surface2/70 p-3 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="inline-flex items-center gap-1.5 font-mono text-accent font-semibold">
                <MessageSquare size={12} /> solver.ts · Line 42
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                Open Thread
              </span>
            </div>
            <p className="text-xs text-gray-200 leading-relaxed">
              &ldquo;Let&apos;s memoize the sliding window hash here so batch case #12 stays under 40ms.&rdquo;
            </p>
          </div>
        </div>
      );

    case "interview-suite":
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2 text-xs font-mono text-gray-100">
              <Clock size={14} className="text-accent" />
              <span>Authoritative Timer · 45:00</span>
            </div>
            <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-lg bg-accent/15 text-accent border border-accent/30">
              31:44 remaining
            </span>
          </div>

          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-6 rounded-xl border border-border bg-surface2/60 p-3 space-y-2">
              <div className="text-[11px] font-semibold text-gray-100 flex items-center justify-between">
                <span>Batch Test Runner</span>
                <span className="text-accent2 font-mono">3 / 3</span>
              </div>
              {[1, 2, 3].map((tc) => (
                <div
                  key={tc}
                  className="flex items-center justify-between text-[11px] font-mono bg-surface border border-border rounded-lg px-2.5 py-1.5"
                >
                  <span className="text-gray-300">Case #{tc}</span>
                  <span className="text-accent2 font-semibold">PASS</span>
                </div>
              ))}
            </div>

            <div className="col-span-6 rounded-xl border border-accent/30 bg-accent/5 p-3 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="inline-flex items-center gap-1 font-semibold text-gray-100">
                  <ClipboardCheck size={12} className="text-accent" /> Private Scorecard
                </span>
                <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-accent text-white">
                  Host Only
                </span>
              </div>
              <div className="space-y-1 text-[11px] text-gray-300">
                <div className="flex justify-between">
                  <span>Problem Solving</span>
                  <span className="font-mono font-semibold text-gray-100">5 / 5</span>
                </div>
                <div className="flex justify-between">
                  <span>Code Quality</span>
                  <span className="font-mono font-semibold text-gray-100">5 / 5</span>
                </div>
                <div className="flex justify-between">
                  <span>Communication</span>
                  <span className="font-mono font-semibold text-gray-100">4 / 5</span>
                </div>
              </div>
              <div className="pt-1 border-t border-border flex items-center justify-between text-[10px] font-mono">
                <span className="text-accent2 font-bold">STRONG HIRE</span>
                <span className="text-gray-400">Export .md</span>
              </div>
            </div>
          </div>
        </div>
      );

    case "voice-compily":
    default:
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2 text-xs font-mono text-gray-100">
              <Mic size={14} className="text-accent2" />
              <span>WebRTC Mesh Voice &amp; Compily IDE</span>
            </div>
            <span className="text-[10px] font-mono text-accent2 bg-accent2/10 border border-accent2/30 px-2 py-0.5 rounded-full">
              STUN / TURN Active
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-xl border border-border bg-surface2/60 p-3 space-y-2">
              <div className="text-[11px] font-semibold text-gray-100">Room Voice + Marginalia</div>
              <div className="flex items-center gap-2 text-[11px] bg-surface border border-border rounded-lg px-2.5 py-1.5">
                <span className="w-2 h-2 rounded-full bg-accent2 animate-pulse" />
                <span className="text-gray-200 font-medium">Alice (Speaking)</span>
              </div>
              <div className="text-[11px] text-gray-400 bg-surface border border-border rounded-lg p-2">
                <span className="font-semibold text-accent">Maya:</span> Pushed the edge-case fix — ready to run!
              </div>
            </div>

            <div className="rounded-xl border border-border bg-paper-editor p-3 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="inline-flex items-center gap-1 font-semibold text-gray-100">
                  <Terminal size={12} className="text-accent" /> /compily
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] bg-accent text-white px-1.5 py-0.5 rounded">
                  <Play size={9} fill="currentColor" /> Rust
                </span>
              </div>
              <div className="font-mono text-[10px] text-gray-300 leading-5">
                fn main() &#123;
                <br />
                &nbsp;&nbsp;println!(&quot;Compily ready&quot;);
                <br />
                &#125;
              </div>
              <div className="text-[10px] font-mono text-accent2">Saved snippets · Run history</div>
            </div>
          </div>
        </div>
      );
  }
}

export default function ScrollWalkthrough() {
  const containerRef = useRef(null);
  const chapterRefs = useRef([]);
  const [activeIndex, setActiveIndex] = useState(0);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start center", "end center"],
  });

  const progressScaleY = useTransform(scrollYProgress, [0, 1], [0.06, 1]);

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    const count = WALKTHROUGH_CHAPTERS.length;
    const clamped = Math.max(0, Math.min(0.999, latest));
    const idx = Math.floor(clamped * count);
    setActiveIndex((prev) => (prev === idx ? prev : idx));
  });

  function jumpToChapter(idx) {
    setActiveIndex(idx);
    const el = chapterRefs.current[idx];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  const activeChapter = WALKTHROUGH_CHAPTERS[activeIndex] || WALKTHROUGH_CHAPTERS[0];

  return (
    <section
      id="walkthrough"
      ref={containerRef}
      className="max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-10 py-16 sm:py-24 border-t border-border"
    >
      {/* Section Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12 lg:mb-16">
        <div className="max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 text-accent text-xs font-semibold uppercase tracking-widest font-mono">
            <span className="w-6 h-[1px] bg-accent inline-block" />
            Scroll-Through Studio Tour
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold font-serif text-gray-100 tracking-tight">
            One calm workspace, five integrated engines.
          </h2>
          <p className="text-sm sm:text-base text-gray-400 leading-relaxed">
            Scroll through how CodeTogether unifies CRDT code editing, multi-file execution, system-design whiteboarding, structured interviews, and WebRTC voice.
          </p>
        </div>

        {/* Quick Chapter Pills */}
        <div className="flex flex-wrap gap-1.5">
          {WALKTHROUGH_CHAPTERS.map((chap, idx) => {
            const isActive = idx === activeIndex;
            return (
              <button
                key={chap.id}
                type="button"
                onClick={() => jumpToChapter(idx)}
                className={`px-3 py-1.5 rounded-full text-xs font-mono border transition-all ${
                  isActive
                    ? "bg-accent text-white border-accent shadow-paper-sm"
                    : "bg-surface text-gray-400 border-border hover:text-gray-100 hover:bg-surface2"
                }`}
              >
                {chap.step}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Two-Column Scrollytelling Layout */}
      <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Left Narrative Chapters + Vertical Scroll Ledger */}
        <div className="lg:col-span-5 relative pl-5 sm:pl-7 space-y-8 lg:space-y-20 lg:pb-12">
          {/* Vertical Scroll Track */}
          <div
            aria-hidden="true"
            className="absolute left-1.5 top-2 bottom-2 w-[2px] bg-border rounded-full overflow-hidden"
          >
            <motion.div
              className="w-full h-full origin-top bg-gradient-to-b from-accent via-[#B8741A] to-accent2"
              style={{ scaleY: progressScaleY }}
            />
          </div>

          {WALKTHROUGH_CHAPTERS.map((chapter, idx) => {
            const isActive = idx === activeIndex;
            return (
              <motion.article
                key={chapter.id}
                ref={(el) => {
                  chapterRefs.current[idx] = el;
                }}
                onClick={() => setActiveIndex(idx)}
                initial={{ opacity: 0.55, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false, amount: 0.45 }}
                transition={{ duration: 0.4 }}
                className={`relative cursor-pointer rounded-2xl border p-5 sm:p-6 transition-all ${
                  isActive
                    ? "bg-surface border-accent/50 shadow-paper-md"
                    : "bg-surface/60 border-border hover:border-border hover:bg-surface"
                }`}
              >
                {/* Ledger Node Dot */}
                <span
                  aria-hidden="true"
                  className={`absolute -left-[22px] sm:-left-[30px] top-7 w-3.5 h-3.5 rounded-full border-2 transition-colors ${
                    isActive
                      ? "bg-accent border-surface shadow-paper-sm"
                      : "bg-surface2 border-border"
                  }`}
                />

                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-accent">
                    {chapter.step} · {chapter.eyebrow}
                  </span>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-surface2 border border-border text-gray-300">
                    {chapter.badge}
                  </span>
                </div>

                <h3 className="text-lg sm:text-xl font-bold font-serif text-gray-100 leading-snug">
                  {chapter.title}
                </h3>

                <p className="text-xs sm:text-sm text-gray-400 leading-relaxed mt-2.5">
                  {chapter.desc}
                </p>

                <ul className="mt-4 space-y-1.5">
                  {chapter.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-xs text-gray-300">
                      <Check size={14} className="text-accent2 shrink-0 mt-0.5" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>

                {/* Inline Mobile/Tablet Visual */}
                <div className="mt-5 pt-4 border-t border-border lg:hidden">
                  <ChapterStageVisual chapterId={chapter.id} />
                </div>
              </motion.article>
            );
          })}
        </div>

        {/* Right Sticky Desktop Morphing Studio Frame */}
        <div className="hidden lg:block lg:col-span-7 lg:sticky lg:top-24">
          <div className="rounded-2xl border border-border bg-surface shadow-paper-lg overflow-hidden">
            {/* Stage Chrome Header */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-surface2 border-b border-border">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-accent/15 text-accent border border-accent/25">
                  {activeChapter.step} / 05
                </span>
                <span className="font-serif font-semibold text-sm text-gray-100">
                  {activeChapter.eyebrow}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {WALKTHROUGH_CHAPTERS.map((chap, idx) => (
                  <button
                    key={chap.id}
                    type="button"
                    aria-label={`Preview ${chap.eyebrow}`}
                    onClick={() => jumpToChapter(idx)}
                    className={`h-2 rounded-full transition-all ${
                      idx === activeIndex ? "w-6 bg-accent" : "w-2 bg-border hover:bg-gray-500"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Morphing Visual Body */}
            <div className="p-6 min-h-[370px] flex flex-col justify-between bg-surface">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeChapter.id}
                  initial={{ opacity: 0, y: 14, scale: 0.985 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -14, scale: 0.985 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                >
                  <ChapterStageVisual chapterId={activeChapter.id} />
                </motion.div>
              </AnimatePresence>

              {/* Stage Footer Hint */}
              <div className="mt-6 pt-3 border-t border-border flex items-center justify-between text-[11px] font-mono text-gray-400">
                <span>Scroll page or click chapters to inspect each engine</span>
                <span className="text-accent2">Editorial Paper · Midnight Kraft</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
