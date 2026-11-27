import { useCallback, useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Shield,
  LayoutDashboard,
  Users,
  FolderKanban,
  Activity,
  Scale,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import AppShell from "../../components/common/AppShell.jsx";
import { api } from "../../services/api.js";

const TABS = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/appeals", label: "Appeals", icon: Scale },
  { to: "/admin/rooms", label: "Rooms", icon: FolderKanban },
  { to: "/admin/logs", label: "Activity Logs", icon: Activity },
];

export default function AdminLayout() {
  const [pendingAppeals, setPendingAppeals] = useState(0);
  const location = useLocation();

  const refreshPendingAppeals = useCallback(async () => {
    try {
      const { data } = await api.get("/admin/appeals");
      setPendingAppeals(data.pendingCount || 0);
    } catch {
      // non-fatal
    }
  }, []);

  useEffect(() => {
    refreshPendingAppeals();
  }, [refreshPendingAppeals, location.pathname]);

  return (
    <AppShell
      eyebrowIcon={Shield}
      eyebrow="Platform Governance"
      title="Archival Administration"
      subtitle="Monitor live runtime telemetry, manage user accounts, review unban appeals, moderate rooms, and inspect audit logs."
      headerRight={
        <div className="flex flex-wrap items-center gap-2">
          <nav
            aria-label="Admin sections"
            className="flex items-center gap-1 bg-surface border border-border rounded-xl p-1 overflow-x-auto no-scrollbar shadow-paper-sm"
          >
            {TABS.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-colors shrink-0 ${
                    isActive
                      ? "bg-accent text-white font-semibold shadow-paper-sm"
                      : "text-gray-400 hover:text-gray-100 hover:bg-surface2"
                  }`
                }
              >
                <Icon size={13} />
                <span>{label}</span>
                {to === "/admin/appeals" && pendingAppeals > 0 && (
                  <span className="ml-0.5 px-1.5 py-0 rounded-full text-[10px] font-bold bg-amber-500 text-stone-950">
                    {pendingAppeals}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-300 hover:text-gray-100 px-3 py-2 rounded-xl border border-border bg-surface hover:bg-surface2 transition-colors shadow-paper-sm shrink-0"
          >
            <ArrowLeft size={13} />
            <span>Dashboard</span>
          </Link>
        </div>
      }
    >
      {pendingAppeals > 0 && location.pathname !== "/admin/appeals" && (
        <div className="mb-5 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 sm:px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-paper-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/35 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Scale size={17} />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-semibold text-gray-100">
                {pendingAppeals} {pendingAppeals === 1 ? "appeal" : "appeals"} awaiting review
              </div>
              <p className="text-[11px] text-gray-400">
                Suspended or banned users have requested account reactivation.
              </p>
            </div>
          </div>
          <Link
            to="/admin/appeals"
            className="inline-flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-paper-sm transition-colors w-fit shrink-0"
          >
            <span>Review Appeals</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      )}

      <Outlet context={{ refreshPendingAppeals }} />
    </AppShell>
  );
}
