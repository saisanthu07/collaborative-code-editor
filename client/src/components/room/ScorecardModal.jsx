import { useEffect, useState, useRef } from "react";
import { X, ClipboardCheck, Download } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../../services/api.js";

const RECOMMENDATIONS = [
  { value: "STRONG_HIRE", label: "Strong Hire" },
  { value: "HIRE", label: "Hire" },
  { value: "UNDECIDED", label: "Undecided" },
  { value: "NO_HIRE", label: "No Hire" },
];

export default function ScorecardModal({ roomId, roomName = "Interview", onClose }) {
  const [form, setForm] = useState({
    problemSolving: 3,
    codeQuality: 3,
    communication: 3,
    recommendation: "UNDECIDED",
    notes: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const closeBtnRef = useRef(null);

  useEffect(() => {
    closeBtnRef.current?.focus();
    api
      .get(`/rooms/${roomId}/scorecard`)
      .then(({ data }) => {
        if (data?.scorecard) {
          setForm({
            problemSolving: data.scorecard.problemSolving || 3,
            codeQuality: data.scorecard.codeQuality || 3,
            communication: data.scorecard.communication || 3,
            recommendation: data.scorecard.recommendation || "UNDECIDED",
            notes: data.scorecard.notes || "",
          });
        }
      })
      .catch(() => toast.error("Could not load scorecard"))
      .finally(() => setLoading(false));

    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [roomId, onClose]);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/rooms/${roomId}/scorecard`, form);
      toast.success("Private scorecard saved");
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not save scorecard");
    } finally {
      setSaving(false);
    }
  }

  function handleExportMarkdown() {
    const md = `# Interview Scorecard — ${roomName}\n\n- **Recommendation:** ${form.recommendation}\n- **Problem Solving:** ${form.problemSolving}/5\n- **Code Quality:** ${form.codeQuality}/5\n- **Communication:** ${form.communication}/5\n\n## Notes\n${form.notes || "_No notes recorded_"}\n`;
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `scorecard-${roomId}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div
      className="fixed inset-0 bg-stone-900/50 dark:bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="presentation"
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="scorecard-title"
        onSubmit={handleSave}
        onClick={(e) => e.stopPropagation()}
        className="bg-surface border border-border rounded-2xl p-6 w-full max-w-md space-y-4 shadow-paper-lg"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent/15 border border-accent/25 flex items-center justify-center text-accent">
              <ClipboardCheck size={16} />
            </div>
            <div>
              <h2 id="scorecard-title" className="font-semibold font-serif text-gray-100 text-base">
                Host Interview Scorecard
              </h2>
              <p className="text-[11px] text-gray-400">Private — visible only to the room host</p>
            </div>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Close scorecard"
            className="p-1.5 text-gray-400 hover:text-gray-100 hover:bg-surface2 rounded-lg"
          >
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-gray-400">Loading scorecard...</div>
        ) : (
          <>
            <div className="space-y-3">
              {[
                { key: "problemSolving", label: "Problem Solving" },
                { key: "codeQuality", label: "Code Quality" },
                { key: "communication", label: "Communication" },
              ].map((metric) => (
                <div key={metric.key} className="flex items-center justify-between bg-surface2 border border-border rounded-xl px-3.5 py-2">
                  <span className="text-xs font-medium text-gray-200">{metric.label}</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((score) => (
                      <button
                        key={score}
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, [metric.key]: score }))}
                        className={`w-6 h-6 rounded-md text-xs font-mono font-bold transition-colors ${
                          form[metric.key] >= score
                            ? "bg-accent text-white"
                            : "bg-surface text-gray-400 border border-border"
                        }`}
                      >
                        {score}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div>
              <label className="block text-[11px] font-mono font-semibold uppercase tracking-wider text-gray-400 mb-1">
                Hiring Recommendation
              </label>
              <select
                value={form.recommendation}
                onChange={(e) => setForm((p) => ({ ...p, recommendation: e.target.value }))}
                className="w-full bg-surface2 border border-border rounded-lg px-3 py-2 text-xs text-gray-100 focus:outline-none focus:ring-2 focus:ring-accent"
              >
                {RECOMMENDATIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-mono font-semibold uppercase tracking-wider text-gray-400 mb-1">
                Private Evaluation Notes
              </label>
              <textarea
                rows={4}
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Strengths, edge cases missed, complexity discussion..."
                className="w-full bg-surface2 border border-border rounded-lg px-3 py-2 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <button
                type="button"
                onClick={handleExportMarkdown}
                className="flex items-center gap-1.5 text-xs text-gray-300 hover:text-gray-100 bg-surface2 border border-border px-3 py-2 rounded-lg"
              >
                <Download size={13} /> Export .md
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-2 text-xs text-gray-400 hover:text-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs bg-accent text-white font-semibold rounded-lg hover:opacity-90 disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save Scorecard"}
                </button>
              </div>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
