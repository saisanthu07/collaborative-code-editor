import Navbar from "./Navbar.jsx";

export default function AppShell({
  eyebrowIcon: EyebrowIcon,
  eyebrow,
  title,
  subtitle,
  headerRight,
  topBanner,
  children,
}) {
  return (
    <div className="min-h-dvh bg-bg text-gray-100 flex flex-col relative overflow-x-clip selection:bg-accent/25">
      {/* Subtle editorial radial paper glow */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-24 w-96 h-96 rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-24 w-96 h-96 rounded-full bg-accent2/10 blur-3xl" />
      </div>

      <Navbar />

      <main className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-8 flex-1 w-full space-y-7">
        {topBanner}

        {(eyebrow || title) && (
          <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-border pb-6">
            <div className="space-y-2.5">
              {eyebrow && (
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-surface text-accent text-xs font-medium shadow-paper-sm">
                  {EyebrowIcon && <EyebrowIcon size={12} aria-hidden="true" />}
                  <span>{eyebrow}</span>
                </div>
              )}
              {title && (
                <h1 className="text-3xl sm:text-4xl font-extrabold font-serif tracking-tight text-gray-100">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="text-sm text-gray-400 max-w-2xl leading-relaxed">
                  {subtitle}
                </p>
              )}
            </div>

            {headerRight && <div className="shrink-0">{headerRight}</div>}
          </section>
        )}

        {children}
      </main>

      <footer className="relative z-10 border-t border-border/70 py-4 px-4 text-center text-[11px] text-gray-500 font-serif bg-surface/30">
        <span>CodeTogether · Editorial Parchment &amp; Midnight Kraft</span>
      </footer>
    </div>
  );
}
