import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Users, FolderKanban, Activity, RefreshCw, ArrowRight } from "lucide-react";
import { api } from "../../services/api.js";

export default function AdminOverview() {
  const [stats, setStats] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [statsRes, metricsRes] = await Promise.all([
        api.get("/admin/stats"),
        api.get("/metrics").catch(() => ({ data: null })),
      ]);
      setStats(statsRes.data);
      setMetrics(metricsRes.data);
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not load platform overview");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xs uppercase tracking-wider font-semibold text-gray-400 font-mono">
          Platform Overview
        </h2>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs font-mono text-gray-300 hover:text-gray-100 bg-surface border border-border rounded-lg px-3 py-1.5"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          <span>Refresh</span>
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3.5">
          {Object.entries(stats).map(([key, value]) => (
            <div key={key} className="bg-surface border border-border rounded-2xl p-4 shadow-paper">
              <div className="text-xs font-semibold text-gray-400 capitalize font-mono">
                {key.replace(/([A-Z])/g, " $1")}
              </div>
              <div className="text-2xl font-bold font-serif mt-1 text-gray-100">{value}</div>
            </div>
          ))}
        </div>
      )}

      {metrics && (
        <div className="bg-surface border border-border rounded-2xl p-5 shadow-paper space-y-3">
          <h3 className="text-xs uppercase tracking-wider font-semibold text-gray-400 font-mono">
            Live Runtime Telemetry
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="bg-surface2 border border-border rounded-xl p-3">
              <div className="text-gray-400">Active Sockets</div>
              <div className="text-lg font-bold text-gray-100 mt-0.5">
                {metrics.sockets?.connectedClients ?? 0}
              </div>
            </div>
            <div className="bg-surface2 border border-border rounded-xl p-3">
              <div className="text-gray-400">Active Yjs Docs</div>
              <div className="text-lg font-bold text-gray-100 mt-0.5">
                {metrics.yjs?.activeDocs ?? 0}
              </div>
            </div>
            <div className="bg-surface2 border border-border rounded-xl p-3">
              <div className="text-gray-400">Yjs Connections</div>
              <div className="text-lg font-bold text-gray-100 mt-0.5">
                {metrics.yjs?.activeConnections ?? 0}
              </div>
            </div>
            <div className="bg-surface2 border border-border rounded-xl p-3">
              <div className="text-gray-400">Heap Used</div>
              <div className="text-lg font-bold text-gray-100 mt-0.5">
                {metrics.memoryMb?.heapUsed ?? 0} MB
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-3 gap-3.5">
        <Link
          to="/admin/users"
          className="bg-surface border border-border hover:border-accent rounded-2xl p-5 shadow-paper transition-colors group flex items-center justify-between"
        >
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold font-serif text-gray-100 group-hover:text-accent">
              <Users size={16} />
              <span>Manage Users</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">Suspend, ban, or delete user accounts</p>
          </div>
          <ArrowRight size={16} className="text-gray-400 group-hover:text-accent" />
        </Link>

        <Link
          to="/admin/rooms"
          className="bg-surface border border-border hover:border-accent rounded-2xl p-5 shadow-paper transition-colors group flex items-center justify-between"
        >
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold font-serif text-gray-100 group-hover:text-accent">
              <FolderKanban size={16} />
              <span>Manage Rooms</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">Inspect, lock, unlock, or remove rooms</p>
          </div>
          <ArrowRight size={16} className="text-gray-400 group-hover:text-accent" />
        </Link>

        <Link
          to="/admin/logs"
          className="bg-surface border border-border hover:border-accent rounded-2xl p-5 shadow-paper transition-colors group flex items-center justify-between"
        >
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold font-serif text-gray-100 group-hover:text-accent">
              <Activity size={16} />
              <span>Activity Logs</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">Audit events and prune old log entries</p>
          </div>
          <ArrowRight size={16} className="text-gray-400 group-hover:text-accent" />
        </Link>
      </div>
    </div>
  );
}
