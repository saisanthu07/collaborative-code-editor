import { Link, NavLink, Outlet } from "react-router-dom";
import { Shield, LayoutDashboard, Users, FolderKanban, Activity, ArrowLeft } from "lucide-react";
import AppShell from "../../components/common/AppShell.jsx";

const TABS = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/rooms", label: "Rooms", icon: FolderKanban },
  { to: "/admin/logs", label: "Activity Logs", icon: Activity },
];

export default function AdminLayout() {
  return (
    <AppShell
      eyebrowIcon={Shield}
      eyebrow="Platform Governance"
      title="Archival Administration"
      subtitle="Monitor live runtime telemetry, manage user accounts, moderate collaborative rooms, and inspect audit logs."
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
      <Outlet />
    </AppShell>
  );
}
