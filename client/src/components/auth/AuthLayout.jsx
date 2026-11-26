import { Link } from "react-router-dom";
import { ArrowLeft, Feather, ShieldCheck, Users, Zap } from "lucide-react";
import BrandMark from "../common/BrandMark.jsx";
import ThemeToggle from "../common/ThemeToggle.jsx";

const HIGHLIGHTS = [
  { icon: Users, value: "CRDT", label: "Real-time sync" },
  { icon: Zap, value: "15+", label: "Runtimes ready" },
  { icon: ShieldCheck, value: "Host", label: "Private scorecards" },
];

export default function AuthLayout({
  eyebrow,
  title,
  highlight,
  subtitle,
  previewBadge = "Yjs CRDT · Synced",
  previewFile = "studio/session.js",
  alternateText,
  alternateLinkLabel,
  alternateTo,
  alternateState,
  children,
}) {
  return (
    <div className="min-h-screen flex flex-col bg-bg text-gray-100 relative overflow-x-hidden selection:bg-accent/25">
      {/* Subtle editorial radial paper glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -top-32 -left-24 w-96 h-96 rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-24 w-96 h-96 rounded-full bg-accent2/10 blur-3xl" />
      </div>

      {/* Top Navigation */}
      <header className="relative z-10 w-full border-b border-border/80 bg-surface/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2.5 font-bold text-gray-100 hover:opacity-90 transition-opacity"
          >
            <BrandMark size={30} className="text-accent" />
            <span className="font-serif tracking-tight text-lg">CodeTogether</span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/"
              aria-label="Back to home"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-gray-100 px-2.5 py-1.5 rounded-lg border border-transparent hover:border-border hover:bg-surface2 transition-all"
            >
              <ArrowLeft size={14} />
              <span className="hidden sm:inline">Back to Home</span>
              <span className="sm:hidden">Home</span>
            </Link>
            <ThemeToggle compact />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12">
        <div className="w-full max-w-5xl grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Editorial Showcase (Desktop) */}
          <aside className="hidden lg:flex lg:col-span-6 flex-col justify-between space-y-7 pr-2">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-surface text-accent text-xs font-medium shadow-paper-sm">
                <Feather size={13} aria-hidden="true" />
                <span>{eyebrow}</span>
              </div>

              <h1 className="text-4xl xl:text-[42px] font-extrabold font-serif leading-[1.12] tracking-tight text-gray-100">
                {title}{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent via-[#B8741A] to-accent2">
                  {highlight}
                </span>
              </h1>

              <p className="text-sm xl:text-base text-gray-400 leading-relaxed max-w-md">
                {subtitle}
              </p>
            </div>

            {/* Tactile Paper-Ruled Studio Preview Card */}
            <div className="bg-surface border border-border rounded-2xl shadow-paper-md overflow-hidden">
              <div className="px-4 py-2.5 bg-surface2 border-b border-border flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-accent/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#B8741A]/75" />
                  <span className="w-2.5 h-2.5 rounded-full bg-accent2/80" />
                  <span className="ml-1.5 font-mono text-[11px] text-gray-400">
                    {previewFile}
                  </span>
                </div>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-accent2/15 text-accent2 font-mono text-[11px] font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent2 animate-pulse" />
                  {previewBadge}
                </span>
              </div>

              <div className="bg-paper-editor paper-ruled px-5 py-4 font-mono text-xs leading-7 text-gray-300 space-y-0.5">
                <div className="flex items-center gap-3">
                  <span className="text-gray-500 select-none w-4 text-right">1</span>
                  <span>
                    <span className="text-accent font-semibold">const</span>{" "}
                    <span className="text-gray-100">room</span> ={" "}
                    <span className="text-accent2">await</span>{" "}
                    connectWorkspace(&quot;interview-studio&quot;);
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-gray-500 select-none w-4 text-right">2</span>
                  <span className="flex items-center flex-wrap gap-1.5">
                    <span>room.sync(yDoc);</span>
                    <span className="inline-flex items-center px-1.5 py-0 rounded text-[10px] font-sans font-semibold bg-accent text-white shadow-paper-sm">
                      Maya · Editor
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-gray-500 select-none w-4 text-right">3</span>
                  <span className="flex items-center flex-wrap gap-1.5">
                    <span>room.evaluateTests({`{`} privateScorecard: true {`}`});</span>
                    <span className="inline-flex items-center px-1.5 py-0 rounded text-[10px] font-sans font-semibold bg-accent2 text-white shadow-paper-sm">
                      Host
                    </span>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 divide-x divide-border border-t border-border bg-surface">
                {HIGHLIGHTS.map(({ icon: Icon, value, label }) => (
                  <div key={label} className="px-3 py-3 text-center">
                    <div className="inline-flex items-center gap-1.5 text-sm font-bold font-serif text-gray-100">
                      <Icon size={13} className="text-accent" aria-hidden="true" />
                      <span>{value}</span>
                    </div>
                    <div className="text-[11px] text-gray-400 mt-0.5">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          {/* Right Form Card */}
          <section className="lg:col-span-6 w-full max-w-md mx-auto">
            <div className="bg-surface border border-border rounded-2xl shadow-paper-lg overflow-hidden">
              <div className="p-6 sm:p-8">
                {children}

                <div className="mt-6 pt-5 border-t border-border text-center text-xs text-gray-400">
                  {alternateText}{" "}
                  <Link
                    to={alternateTo}
                    state={alternateState}
                    className="text-accent hover:underline font-semibold focus:outline-none focus:ring-1 focus:ring-accent rounded"
                  >
                    {alternateLinkLabel}
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Footer Note */}
      <footer className="relative z-10 py-4 px-4 text-center text-[11px] text-gray-500 font-serif">
        <span>CodeTogether · Editorial Parchment & Midnight Kraft</span>
      </footer>
    </div>
  );
}
