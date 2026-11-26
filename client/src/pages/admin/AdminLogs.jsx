import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Trash2, RefreshCw, Search } from "lucide-react";
import { api } from "../../services/api.js";
import ConfirmModal from "../../components/common/ConfirmModal.jsx";

export default function AdminLogs() {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  async function loadLogs() {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/activity-logs");
      setLogs(data.logs || []);
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not load activity logs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLogs();
  }, []);

  async function handleDeleteLog(logId) {
    try {
      await api.delete(`/admin/activity-logs/${logId}`);
      setLogs((prev) => prev.filter((l) => l._id !== logId));
      toast.success("Log entry deleted");
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not delete log entry");
    }
  }

  async function handleClearAllLogs() {
    setClearing(true);
    try {
      const { data } = await api.delete("/admin/activity-logs");
      setLogs([]);
      setConfirmClearOpen(false);
      toast.success(`Cleared ${data.deletedCount ?? 0} log entries`);
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not clear activity logs");
    } finally {
      setClearing(false);
    }
  }

  const q = filter.trim().toLowerCase();
  const filtered = q
    ? logs.filter((l) =>
        `${l.type} ${l.roomId || ""} ${JSON.stringify(l.meta || {})}`.toLowerCase().includes(q)
      )
    : logs;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter logs by type, room, user..."
            className="w-full bg-surface border border-border rounded-xl pl-8 pr-3 py-1.5 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadLogs}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs font-mono text-gray-300 hover:text-gray-100 bg-surface border border-border rounded-xl px-3 py-1.5"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => setConfirmClearOpen(true)}
            disabled={clearing || logs.length === 0}
            className="flex items-center gap-1.5 text-xs font-mono text-rose-500 hover:bg-rose-500/10 bg-surface border border-rose-500/30 rounded-xl px-3 py-1.5 disabled:opacity-40"
          >
            <Trash2 size={12} />
            <span>{clearing ? "Clearing..." : "Clear All Logs"}</span>
          </button>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-2xl divide-y divide-border overflow-hidden shadow-paper">
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-xs text-gray-400">
            {loading ? "Loading activity logs..." : "No activity logs found."}
          </div>
        ) : (
          filtered.map((log) => (
            <div
              key={log._id}
              className="px-4 sm:px-5 py-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 font-mono hover:bg-surface2/50 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap sm:flex-nowrap">
                <span className="text-accent font-semibold shrink-0">{log.type}</span>
                {log.roomId && (
                  <span className="text-gray-400 bg-surface2 border border-border px-1.5 py-0.5 rounded shrink-0">
                    room:{log.roomId}
                  </span>
                )}
                {log.meta && Object.keys(log.meta).length > 0 && (
                  <span className="text-gray-500 truncate min-w-0 flex-1">{JSON.stringify(log.meta)}</span>
                )}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="text-gray-500 text-[10px]">
                  {new Date(log.createdAt).toLocaleString()}
                </span>
                <button
                  type="button"
                  onClick={() => handleDeleteLog(log._id)}
                  aria-label={`Delete log ${log.type}`}
                  title="Delete log entry"
                  className="p-1 text-gray-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <ConfirmModal
        open={confirmClearOpen}
        title="Clear all activity logs?"
        message="This permanently deletes all stored audit log entries. This action cannot be undone."
        confirmLabel="Clear All Logs"
        tone="danger"
        loading={clearing}
        onClose={() => !clearing && setConfirmClearOpen(false)}
        onConfirm={handleClearAllLogs}
      />
    </div>
  );
}
