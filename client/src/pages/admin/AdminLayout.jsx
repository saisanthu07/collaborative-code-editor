import { NavLink, Outlet } from "react-router-dom";
import { Shield, LayoutDashboard, Users, FolderKanban, Activity } from "lucide-react";
import Navbar from "../../components/common/Navbar.jsx";

const TABS = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/rooms", label: "Rooms", icon: FolderKanban },
  { to: "/admin/logs", label: "Activity Logs", icon: Activity },
];

export default function AdminLayout() {
  return (
    <div className="min-h-dvh bg-bg text-gray-100 flex flex-col">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6 flex-1 w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-accent/15 border border-accent/25 flex items-center justify-center text-accent shadow-paper-sm">
              <Shield size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold font-serif text-gray-100">Archival Administration</h1>
              <p className="text-xs text-gray-400">Platform registry, moderation, and audit governance</p>
            </div>
          </div>

          <nav aria-label="Admin sections" className="flex items-center gap-1 bg-surface border border-border rounded-xl p-1 overflow-x-auto no-scrollbar">
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
        </div>

        <Outlet />
      </main>
    </div>
  );
}
