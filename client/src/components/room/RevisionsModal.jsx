import { useEffect, useState, useRef } from "react";
import { X, History, RotateCcw, Plus } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../../services/api.js";

export default function RevisionsModal({
  roomId,
  fileName,
  currentContent = "",
  canEdit = false,
  onRestored,
  onClose,
}) {
  const [revisions, setRevisions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [restoringId, setRestoringId] = useState(null);
  const closeBtnRef = useRef(null);

  async function loadRevisions() {
    setLoading(true);
    try {
      const { data } = await api.get(
        `/rooms/${roomId}/files/${encodeURIComponent(fileName)}/revisions`
      );
      const list = data.revisions || [];
      setRevisions(list);
      if (list.length > 0 && !selected) {
        setSelected(list[0]);
      }
    } catch {
      toast.error("Could not load version history");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRevisions();
    closeBtnRef.current?.focus();
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fileName, roomId]);

  async function handleSaveCheckpoint(e) {
    e.preventDefault();
    if (!canEdit) return;
    setSaving(true);
    try {
      const { data } = await api.post(
        `/rooms/${roomId}/files/${encodeURIComponent(fileName)}/revisions`,
        {
          label: label.trim() || "Manual Checkpoint",
          content: currentContent,
        }
      );
      setLabel("");
      toast.success("Checkpoint saved");
      setRevisions((prev) => [data.revision, ...prev]);
      setSelected(data.revision);
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not save checkpoint");
    } finally {
      setSaving(false);
    }
  }

  async function handleRestore(revision) {
    if (!canEdit) return;
    if (!window.confirm(`Restore "${fileName}" to checkpoint "${revision.label}"?`)) return;
    setRestoringId(revision._id);
    try {
      await api.post(
        `/rooms/${roomId}/files/${encodeURIComponent(fileName)}/revisions/${revision._id}/restore`
      );
      toast.success(`Restored "${revision.label}"`);
      onRestored?.(revision.content);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not restore checkpoint");
    } finally {
      setRestoringId(null);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-stone-900/50 dark:bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="revisions-title"
        onClick={(e) => e.stopPropagation()}
        className="bg-surface border border-border rounded-2xl w-full max-w-3xl h-[75vh] flex flex-col shadow-paper-lg overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-surface2/40">
          <div className="flex items-center gap-2">
            <History size={17} className="text-accent" />
            <h2 id="revisions-title" className="font-semibold font-serif text-base text-gray-100">
              Version History — <span className="font-mono text-xs text-accent">{fileName}</span>
            </h2>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Close version history"
            className="p-1.5 text-gray-400 hover:text-gray-100 hover:bg-surface2 rounded-lg"
          >
            <X size={18} />
          </button>
        </div>

        {canEdit && (
          <form onSubmit={handleSaveCheckpoint} className="flex items-center gap-2 px-5 py-3 border-b border-border bg-surface">
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Checkpoint label (e.g. Working solution before refactor)"
              maxLength={100}
              className="flex-1 bg-surface2 border border-border rounded-lg px-3 py-1.5 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 bg-accent hover:opacity-90 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-60"
            >
              <Plus size={13} />
              <span>{saving ? "Saving..." : "Save Checkpoint"}</span>
            </button>
          </form>
        )}

        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[260px_1fr]">
          <div className="border-r border-border overflow-y-auto divide-y divide-border bg-surface/60">
            {loading ? (
              <div className="p-4 text-xs text-gray-400">Loading checkpoints...</div>
            ) : revisions.length === 0 ? (
              <div className="p-5 text-xs text-gray-400 text-center">
                No checkpoints saved for this file yet.
              </div>
            ) : (
              revisions.map((rev) => {
                const isSelected = selected?._id === rev._id;
                return (
                  <button
                    key={rev._id}
                    type="button"
                    onClick={() => setSelected(rev)}
                    className={`w-full text-left px-4 py-3 transition-colors ${
                      isSelected ? "bg-accent/15 border-l-2 border-l-accent" : "hover:bg-surface2"
                    }`}
                  >
                    <div className="text-xs font-semibold text-gray-100 truncate">{rev.label}</div>
                    <div className="text-[10px] font-mono text-gray-400 mt-1">
                      by {rev.createdBy} • {new Date(rev.createdAt).toLocaleString()}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="flex flex-col min-h-0 bg-paper-console">
            {selected ? (
              <>
                <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-surface/60 text-xs">
                  <span className="font-mono text-gray-300 truncate">{selected.label}</span>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => handleRestore(selected)}
                      disabled={restoringId === selected._id}
                      className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded-lg text-xs font-semibold disabled:opacity-50"
                    >
                      <RotateCcw size={12} />
                      <span>{restoringId === selected._id ? "Restoring..." : "Restore Version"}</span>
                    </button>
                  )}
                </div>
                <pre className="flex-1 overflow-auto p-4 text-xs font-mono text-gray-200 whitespace-pre">
                  {selected.content || "(Empty file)"}
                </pre>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-xs text-gray-400">
                Select a checkpoint to inspect its contents.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
