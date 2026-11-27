import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MotionConfig, motion, useScroll, useTransform } from "framer-motion";
import {
  ArrowRight,
  Sparkles,
  Feather,
  Globe2,
  LayoutDashboard,
  Terminal,
  ShieldCheck,
  Check,
  ChevronRight,
  Lock,
  Layers,
  Activity,
} from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../services/api.js";
import { useAuthStore } from "../store/authStore.js";
import { LANGUAGES, getFileBadge } from "../constants/languages.js";
import { getCompilyTemplate } from "../constants/compilyTemplates.js";
import ThemeToggle from "../components/common/ThemeToggle.jsx";
import BrandMark from "../components/common/BrandMark.jsx";
import {
  ScrollProgressRule,
  PaperReveal,
  StaggerGroup,
  StaggerItem,
} from "../components/landing/MotionPrimitives.jsx";
import HeroStudioPreview from "../components/landing/HeroStudioPreview.jsx";
import ScrollWalkthrough from "../components/landing/ScrollWalkthrough.jsx";
import {
  NAV_LINKS,
  HERO_METRICS,
  ROOM_TEMPLATES_SHOWCASE,
  USE_CASES,
  CAPABILITIES,
  ARCHITECTURE_LAYERS,
  RBAC_ROLES,
  SECURITY_PILLARS,
  WORKFLOW,
} from "../components/landing/LandingData.js";

export default function Landing() {
  const navigate = useNavigate();
  const { user, token } = useAuthStore();
  const isAuthenticated = Boolean(user && token);

  const [creatingInstant, setCreatingInstant] = useState(false);
  const [selectedLang, setSelectedLang] = useState("typescript");

  const heroRef = useRef(null);
  const { scrollYProgress: heroScroll } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroPreviewY = useTransform(heroScroll, [0, 1], [0, -32]);
  const heroCopyY = useTransform(heroScroll, [0, 1], [0, -14]);

  async function handleLaunchInstant(language = "javascript") {
    setCreatingInstant(true);
    try {
      const { data } = await api.post("/rooms/instant", { language });
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

  const activeTemplate = getCompilyTemplate(selectedLang);
  const activeBadge = getFileBadge(activeTemplate.fileName);

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-dvh flex flex-col bg-bg text-gray-100 selection:bg-accent/25 overflow-x-clip">
        {/* Sticky Editorial Header + Scroll Progress Rule */}
        <header className="border-b border-border bg-surface/90 backdrop-blur-md sticky top-0 z-40 shadow-paper-sm w-full">
          <div className="flex items-center justify-between px-4 sm:px-6 lg:px-10 py-3 w-full max-w-[1600px] mx-auto gap-4">
            <Link
              to={isAuthenticated ? "/dashboard" : "/"}
              className="flex items-center gap-2.5 font-bold text-lg text-gray-100 shrink-0"
            >
              <BrandMark size={32} className="text-accent" />
              <span className="font-serif tracking-tight text-lg">CodeTogether</span>
            </Link>

            <nav
              aria-label="Landing Sections"
              className="hidden lg:flex items-center gap-1 text-xs font-medium text-gray-300"
            >
              {NAV_LINKS.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="px-3 py-1.5 rounded-lg hover:text-gray-100 hover:bg-surface2 transition-colors"
                >
                  {item.label}
                </a>
              ))}
            </nav>

            <div className="flex items-center gap-2 sm:gap-2.5 text-sm shrink-0">
              <ThemeToggle />
              <button
                type="button"
                onClick={() => handleLaunchInstant("javascript")}
                disabled={creatingInstant}
                className="hidden sm:inline-flex items-center gap-1.5 text-xs bg-accent2/15 text-accent2 border border-accent2/30 hover:bg-accent2/25 px-3 py-1.5 rounded-lg font-medium transition-colors shadow-paper-sm disabled:opacity-60"
              >
                <Sparkles size={13} />
                <span>Instant Playground</span>
              </button>
              {isAuthenticated ? (
                <>
                  <Link
                    to="/compily"
                    className="hidden md:inline-flex items-center gap-1.5 border border-border bg-surface hover:bg-surface2 px-3 py-1.5 rounded-lg text-gray-200 font-medium transition-colors text-xs"
                  >
                    <Terminal size={13} className="text-accent" />
                    <span>Compily</span>
                  </Link>
                  <Link
                    to="/dashboard"
                    className="inline-flex items-center gap-1.5 bg-accent hover:bg-accent-hover px-4 py-1.5 rounded-lg text-white font-medium transition-all shadow-paper-sm text-xs sm:text-sm active:scale-95"
                  >
                    <LayoutDashboard size={14} />
                    <span>Dashboard</span>
                  </Link>
                </>
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
                    className="bg-accent hover:bg-accent-hover px-4 py-1.5 rounded-lg text-white font-medium transition-all shadow-paper-sm text-xs sm:text-sm active:scale-95"
                  >
                    Sign Up Free
                  </Link>
                </>
              )}
            </div>
          </div>
          <ScrollProgressRule />
        </header>

        <main className="flex-1">
          {/* Hero + Interactive Studio Preview */}
          <section
            ref={heroRef}
            className="relative w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 py-10 sm:py-14 lg:py-12 lg:min-h-[calc(100dvh-68px)] flex items-center"
          >
            <div className="w-full grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              {/* Left Hero Copy & CTAs */}
              <motion.div
                style={{ y: heroCopyY }}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                className="lg:col-span-6 space-y-6 text-center lg:text-left"
              >
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-border bg-surface text-accent text-xs font-medium shadow-paper-sm">
                  <Feather size={13} className="text-accent shrink-0" />
                  <span>Collaborative IDE · Technical Interviews · System Design · Compily</span>
                </div>

                <h1 className="text-4xl sm:text-5xl xl:text-6xl font-extrabold font-serif leading-[1.08] tracking-tight text-gray-100">
                  Your team&apos;s best work, <br className="hidden sm:inline" />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent via-[#B8741A] to-accent2">
                    built side by side.
                  </span>
                </h1>

                <p className="text-gray-400 max-w-2xl mx-auto lg:mx-0 text-base sm:text-lg leading-relaxed font-sans">
                  CodeTogether unifies conflict-free Yjs Monaco editing, multi-file sandboxed execution across 15+ languages, live HTML/CSS/JS previews, shared system-design whiteboards, WebRTC voice, and private host scorecards — plus Compily for solo practice.
                </p>

                {/* Primary & Secondary CTAs */}
                <div className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => handleLaunchInstant("javascript")}
                    disabled={creatingInstant}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-paper hover:shadow-paper-md focus:ring-2 focus:ring-accent active:scale-95 disabled:opacity-70"
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
                    to={isAuthenticated ? "/dashboard" : "/register"}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-border bg-surface hover:bg-surface2 px-6 py-3 rounded-xl font-medium text-gray-200 transition-colors shadow-paper-sm"
                  >
                    <span>{isAuthenticated ? "Open Your Dashboard" : "Create Permanent Room"}</span>
                  </Link>

                  <a
                    href="#walkthrough"
                    className="inline-flex items-center justify-center gap-1 px-3 py-3 text-xs font-mono text-gray-400 hover:text-accent transition-colors"
                  >
                    <span>Studio Tour</span>
                    <ChevronRight size={14} />
                  </a>
                </div>

                {/* Grounded Feature Counters */}
                <div className="grid grid-cols-2 sm:grid-cols-4 max-w-xl mx-auto lg:mx-0 text-center divide-y sm:divide-y-0 sm:divide-x divide-border bg-surface border border-border rounded-xl p-3 shadow-paper-sm">
                  {HERO_METRICS.map((m) => (
                    <div key={m.label} className="py-1.5 sm:py-0 px-2">
                      <div className={`text-lg sm:text-xl font-bold font-serif ${m.tone}`}>
                        {m.value}
                      </div>
                      <div className="text-[11px] text-gray-400 mt-0.5">{m.label}</div>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Right Interactive Hero Studio Preview with subtle scroll parallax */}
              <motion.div
                style={{ y: heroPreviewY }}
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                className="lg:col-span-6 w-full"
              >
                <HeroStudioPreview />
              </motion.div>
            </div>
          </section>

          {/* Scenarios & 4 Starter Templates Strip */}
          <section className="max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-10 py-12 border-t border-border">
            <PaperReveal className="space-y-8">
              <div className="flex flex-wrap items-center justify-center gap-2">
                <span className="text-[11px] uppercase tracking-widest font-mono text-gray-400 mr-2">
                  Built for:
                </span>
                {USE_CASES.map((u) => (
                  <span
                    key={u}
                    className="border border-border bg-surface rounded-full px-3.5 py-1 text-xs text-gray-200 shadow-paper-sm font-medium"
                  >
                    {u}
                  </span>
                ))}
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {ROOM_TEMPLATES_SHOWCASE.map(({ key, title, tag, desc, icon: Icon }) => (
                  <div
                    key={key}
                    className="bg-surface border border-border rounded-2xl p-4 shadow-paper-sm hover:border-accent/40 transition-colors flex items-start gap-3.5"
                  >
                    <div className="w-9 h-9 rounded-xl bg-accent/12 border border-accent/25 text-accent flex items-center justify-center shrink-0">
                      <Icon size={17} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-gray-100 truncate">{title}</h3>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface2 border border-border text-gray-400 shrink-0">
                          {tag}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1 leading-relaxed">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </PaperReveal>
          </section>

          {/* Centerpiece Scroll-Through Animation Walkthrough */}
          <ScrollWalkthrough />

          {/* Complete Capabilities Bento */}
          <section
            id="capabilities"
            className="scroll-mt-20 max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-10 py-16 border-t border-border"
          >
            <PaperReveal className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
              <div className="space-y-2 max-w-2xl">
                <div className="inline-flex items-center gap-2 text-accent text-xs font-semibold uppercase tracking-widest font-mono">
                  <Layers size={13} />
                  Full Platform Surface
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold font-serif text-gray-100">
                  Engineered for Peak Developer &amp; Interview Flow
                </h2>
                <p className="text-sm text-gray-400">
                  Every tool in a collaborative room, personal compiler, and administrative console works together without context switching.
                </p>
              </div>
              <Link
                to={isAuthenticated ? "/compily" : "/register"}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:text-accent-hover transition-colors shrink-0"
              >
                <span>{isAuthenticated ? "Open Compily IDE" : "Start Building Free"}</span>
                <ArrowRight size={14} />
              </Link>
            </PaperReveal>

            <StaggerGroup className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              {CAPABILITIES.map(({ icon: Icon, tag, title, desc }) => (
                <StaggerItem key={title}>
                  <div className="h-full bg-surface border border-border rounded-2xl p-5 hover:border-accent/50 shadow-paper hover:shadow-paper-md transition-all flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/25 text-accent flex items-center justify-center shadow-paper-sm">
                        <Icon size={19} />
                      </div>
                      <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-surface2 border border-border text-gray-400">
                        {tag}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-100 mb-1.5 text-base font-serif">
                      {title}
                    </h3>
                    <p className="text-xs text-gray-400 leading-relaxed font-sans flex-1">{desc}</p>
                  </div>
                </StaggerItem>
              ))}
            </StaggerGroup>
          </section>

          {/* 15+ Languages & Compily Personal IDE Interactive Showcase */}
          <section
            id="languages"
            className="scroll-mt-20 max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-10 py-16 border-t border-border"
          >
            <PaperReveal className="grid lg:grid-cols-12 gap-8 lg:gap-10 items-center">
              <div className="lg:col-span-6 space-y-5">
                <div className="inline-flex items-center gap-2 text-accent2 text-xs font-semibold uppercase tracking-widest font-mono">
                  <Terminal size={13} />
                  15+ Languages · Room Bundles &amp; Compily
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold font-serif text-gray-100">
                  Write in your stack. Run in isolated sandboxes.
                </h2>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Select any supported language to inspect its Compily starter template or spin up an Instant Playground preconfigured for that runtime. Multi-file rooms bundle relative imports via Piston alongside Judge0 CE support.
                </p>

                <div className="flex flex-wrap gap-2">
                  {LANGUAGES.map((lang) => {
                    const active = selectedLang === lang.key;
                    return (
                      <button
                        key={lang.key}
                        type="button"
                        onClick={() => setSelectedLang(lang.key)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                          active
                            ? "bg-accent text-white border-accent shadow-paper-sm"
                            : "bg-surface text-gray-200 border-border hover:bg-surface2"
                        }`}
                      >
                        <span className="font-mono text-[10px] opacity-80">{lang.ext}</span>
                        <span>{lang.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => handleLaunchInstant(selectedLang)}
                    disabled={creatingInstant}
                    className="inline-flex items-center gap-2 bg-accent hover:bg-accent-hover text-white px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-paper-sm active:scale-95 disabled:opacity-70"
                  >
                    <Sparkles size={14} />
                    <span>
                      Launch {LANGUAGES.find((l) => l.key === selectedLang)?.label} Playground
                    </span>
                  </button>
                  <Link
                    to={isAuthenticated ? "/compily" : "/login"}
                    className="inline-flex items-center gap-1.5 border border-border bg-surface hover:bg-surface2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium text-gray-200 transition-colors"
                  >
                    <Terminal size={14} className="text-accent" />
                    <span>{isAuthenticated ? "Open in Compily" : "Sign in for Compily"}</span>
                  </Link>
                </div>
              </div>

              <div className="lg:col-span-6">
                <div className="rounded-2xl border border-border bg-surface shadow-paper-lg overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-surface2 border-b border-border text-xs">
                    <div className="flex items-center gap-2 font-mono">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${activeBadge.color}`}
                      >
                        {activeBadge.text}
                      </span>
                      <span className="text-gray-100 font-semibold">{activeTemplate.fileName}</span>
                    </div>
                    <span className="text-[11px] font-mono text-gray-400">
                      Compily Starter · Piston / Judge0
                    </span>
                  </div>
                  <pre className="p-5 font-mono text-xs sm:text-[13px] text-gray-100 bg-paper-editor paper-ruled leading-7 overflow-x-auto min-h-[210px]">
                    <code>{activeTemplate.code}</code>
                  </pre>
                  <div className="px-4 py-2.5 bg-paper-console border-t border-border flex items-center justify-between text-[11px] font-mono text-gray-400">
                    <span>Supports custom stdin &amp; 15-case batch grading</span>
                    <span className="text-accent2">Saved Snippets + Run History</span>
                  </div>
                </div>
              </div>
            </PaperReveal>
          </section>

          {/* System Architecture */}
          <section
            id="architecture"
            className="scroll-mt-20 max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-10 py-16 border-t border-border"
          >
            <PaperReveal className="space-y-3 max-w-2xl mb-10">
              <div className="inline-flex items-center gap-2 text-accent text-xs font-semibold uppercase tracking-widest font-mono">
                <Globe2 size={13} />
                Production Architecture
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold font-serif text-gray-100">
                Built for low-latency sync and horizontal scale.
              </h2>
              <p className="text-sm text-gray-400 leading-relaxed">
                Dedicated /yjs CRDT WebSockets, Socket.IO room signaling, MongoDB snapshot persistence, optional Redis Pub/Sub clustering, and isolated execution sandboxes.
              </p>
            </PaperReveal>

            <StaggerGroup className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              {ARCHITECTURE_LAYERS.map(({ layer, title, icon: Icon, items }) => (
                <StaggerItem key={layer}>
                  <div className="h-full bg-surface border border-border rounded-2xl p-5 shadow-paper-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-mono text-[11px] font-semibold text-accent">
                          {layer}
                        </span>
                        <Icon size={16} className="text-gray-400" />
                      </div>
                      <h3 className="font-serif font-bold text-base text-gray-100 mb-3">{title}</h3>
                      <ul className="space-y-2">
                        {items.map((item) => (
                          <li key={item} className="flex items-start gap-2 text-xs text-gray-300">
                            <Check size={13} className="text-accent2 shrink-0 mt-0.5" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </StaggerGroup>
          </section>

          {/* Security, RBAC & Administration Console */}
          <section
            id="security"
            className="scroll-mt-20 max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-10 py-16 border-t border-border"
          >
            <PaperReveal className="space-y-10">
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
                <div className="space-y-2 max-w-2xl">
                  <div className="inline-flex items-center gap-2 text-accent2 text-xs font-semibold uppercase tracking-widest font-mono">
                    <ShieldCheck size={13} />
                    Security, RBAC &amp; Governance
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold font-serif text-gray-100">
                    Hardened access control from room sockets to admin audit logs.
                  </h2>
                  <p className="text-sm text-gray-400">
                    Four distinct room roles, timing-safe private invite secrets, rotating SHA-256 refresh sessions, and a dedicated /admin/* console.
                  </p>
                </div>
              </div>

              {/* 4 RBAC Role Cards */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {RBAC_ROLES.map((r) => (
                  <div
                    key={r.role}
                    className="bg-surface border border-border rounded-2xl p-5 shadow-paper-sm space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`font-mono text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${r.tone}`}
                      >
                        {r.role}
                      </span>
                      <span className="text-[11px] text-gray-400 font-medium">{r.summary}</span>
                    </div>
                    <p className="text-xs text-gray-300 leading-relaxed">{r.perms}</p>
                  </div>
                ))}
              </div>

              {/* 3 Security Pillars + Admin Console Banner */}
              <div className="grid md:grid-cols-3 gap-4">
                {SECURITY_PILLARS.map(({ icon: Icon, title, desc }) => (
                  <div
                    key={title}
                    className="bg-surface border border-border rounded-2xl p-5 shadow-paper-sm flex items-start gap-3.5"
                  >
                    <div className="w-9 h-9 rounded-xl bg-accent2/15 border border-accent2/30 text-accent2 flex items-center justify-center shrink-0">
                      <Icon size={17} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold font-serif text-gray-100">{title}</h3>
                      <p className="text-xs text-gray-400 mt-1 leading-relaxed">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-surface border border-border rounded-2xl p-6 sm:p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-paper">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/25 text-accent flex items-center justify-center shrink-0">
                    <Activity size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-100 font-serif text-base">
                      Archival Administration Console (/admin/*) &amp; Runtime Telemetry
                    </h3>
                    <p className="text-xs text-gray-400 mt-1 leading-relaxed max-w-3xl">
                      Inspect live socket counts, active Yjs docs, and heap telemetry (/api/metrics); suspend or ban users with immediate WebSocket disconnection; lock or delete rooms; and review searchable audit logs.
                    </p>
                  </div>
                </div>
                <Link
                  to={isAuthenticated ? "/dashboard" : "/register"}
                  className="shrink-0 bg-surface2 hover:bg-border border border-border px-4 py-2 rounded-xl text-xs font-semibold text-gray-100 transition-colors"
                >
                  {isAuthenticated ? "Go to Workspace" : "Create Account"}
                </Link>
              </div>
            </PaperReveal>
          </section>

          {/* 3-Step Workflow + Final Conversion CTA */}
          <section className="max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-10 py-16 border-t border-border">
            <PaperReveal className="grid lg:grid-cols-[1fr_2fr] gap-10 items-start">
              <div>
                <div className="inline-flex items-center gap-2 text-accent text-xs font-semibold uppercase tracking-widest font-mono">
                  <Lock size={13} />
                  Made for momentum
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold font-serif text-gray-100 mt-3">
                  From blank page to breakthrough.
                </h2>
                <p className="text-sm text-gray-400 leading-relaxed mt-3">
                  No setup maze. No context switching. Open a room or launch an instant playground and invite your team in seconds.
                </p>
              </div>
              <div className="grid sm:grid-cols-3 gap-4">
                {WORKFLOW.map(({ step, icon: Icon, title, desc }) => (
                  <div
                    key={step}
                    className="bg-surface border border-border rounded-2xl p-5 shadow-paper-sm"
                  >
                    <div className="flex items-center justify-between text-accent mb-5">
                      <Icon size={20} />
                      <span className="font-mono text-[10px] text-gray-400">{step}</span>
                    </div>
                    <h3 className="font-semibold text-gray-100 text-sm">{title}</h3>
                    <p className="text-xs text-gray-400 leading-relaxed mt-2">{desc}</p>
                  </div>
                ))}
              </div>
            </PaperReveal>

            {/* Bottom Call to Action Sheet */}
            <PaperReveal delay={0.08} className="mt-12">
              <div className="rounded-2xl border border-border bg-surface2/60 p-8 sm:p-10 shadow-paper-md flex flex-col lg:flex-row items-center justify-between gap-6 text-center lg:text-left">
                <div className="space-y-2 max-w-2xl">
                  <h2 className="text-2xl sm:text-3xl font-bold font-serif text-gray-100">
                    Ready to code side by side?
                  </h2>
                  <p className="text-sm text-gray-400">
                    Launch an expiring guest playground with one click, or sign up free to unlock permanent multi-file rooms, version checkpoints, Compily snippets, and private interview scorecards.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 w-full lg:w-auto justify-center">
                  <button
                    type="button"
                    onClick={() => handleLaunchInstant("javascript")}
                    disabled={creatingInstant}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover text-white px-6 py-3 rounded-xl text-sm font-semibold transition-all shadow-paper active:scale-95 disabled:opacity-70"
                  >
                    <Sparkles size={15} />
                    <span>Launch Instant Playground</span>
                  </button>
                  <Link
                    to={isAuthenticated ? "/dashboard" : "/register"}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-border bg-surface hover:bg-surface2 px-6 py-3 rounded-xl text-sm font-semibold text-gray-100 transition-colors shadow-paper-sm"
                  >
                    <span>{isAuthenticated ? "Open Dashboard" : "Sign Up Free"}</span>
                    <ArrowRight size={15} />
                  </Link>
                </div>
              </div>
            </PaperReveal>
          </section>
        </main>

        {/* Editorial Footer */}
        <footer className="mt-auto border-t border-border bg-surface/60 py-10 px-4 sm:px-6 lg:px-10 text-xs text-gray-400">
          <div className="max-w-[1600px] mx-auto grid sm:grid-cols-2 lg:grid-cols-4 gap-8 pb-8 border-b border-border">
            <div className="space-y-2.5 sm:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-2 text-gray-100 font-serif font-bold text-base">
                <BrandMark size={24} className="text-accent" />
                <span>CodeTogether</span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Real-time collaborative IDE, system-design studio, and technical interview platform styled in Editorial Parchment &amp; Midnight Kraft.
              </p>
            </div>

            <div className="space-y-2">
              <div className="font-mono text-[11px] uppercase tracking-wider text-gray-200 font-semibold">
                Workspaces
              </div>
              <ul className="space-y-1.5">
                <li>
                  <button
                    type="button"
                    onClick={() => handleLaunchInstant("javascript")}
                    className="hover:text-accent transition-colors"
                  >
                    Instant Guest Playground
                  </button>
                </li>
                <li>
                  <Link to="/dashboard" className="hover:text-accent transition-colors">
                    Rooms Dashboard
                  </Link>
                </li>
                <li>
                  <Link to="/compily" className="hover:text-accent transition-colors">
                    Compily Personal IDE
                  </Link>
                </li>
              </ul>
            </div>

            <div className="space-y-2">
              <div className="font-mono text-[11px] uppercase tracking-wider text-gray-200 font-semibold">
                Platform
              </div>
              <ul className="space-y-1.5">
                {NAV_LINKS.map((item) => (
                  <li key={item.href}>
                    <a href={item.href} className="hover:text-accent transition-colors">
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-2">
              <div className="font-mono text-[11px] uppercase tracking-wider text-gray-200 font-semibold">
                Account
              </div>
              <ul className="space-y-1.5">
                {isAuthenticated ? (
                  <>
                    <li>
                      <Link to="/profile" className="hover:text-accent transition-colors">
                        Profile &amp; Sessions
                      </Link>
                    </li>
                    {user?.role === "ADMIN" && (
                      <li>
                        <Link to="/admin" className="hover:text-accent transition-colors">
                          Admin Console
                        </Link>
                      </li>
                    )}
                  </>
                ) : (
                  <>
                    <li>
                      <Link to="/login" className="hover:text-accent transition-colors">
                        Log In
                      </Link>
                    </li>
                    <li>
                      <Link to="/register" className="hover:text-accent transition-colors">
                        Sign Up Free
                      </Link>
                    </li>
                    <li>
                      <Link to="/forgot-password" className="hover:text-accent transition-colors">
                        Reset Password
                      </Link>
                    </li>
                  </>
                )}
              </ul>
            </div>
          </div>

          <div className="max-w-[1600px] mx-auto pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-gray-500">
            <p>© 2026 CodeTogether. A shared space for building better software.</p>
            <p className="font-mono">Editorial Parchment · Midnight Kraft</p>
          </div>
        </footer>
      </div>
    </MotionConfig>
  );
}
