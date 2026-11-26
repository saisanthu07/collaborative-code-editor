import { useEffect, useRef } from "react";
import { AlertTriangle, X } from "lucide-react";

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger", // "danger" | "warning" | "accent"
  loading = false,
  onClose,
  onConfirm,
}) {
  const cancelRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();

    function handleKeyDown(e) {
      if (e.key === "Escape" && !loading) {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, loading, onClose]);

  if (!open) return null;

  const toneClasses =
    tone === "warning"
      ? {
          iconWrap: "bg-amber-500/15 border-amber-500/30 text-amber-500",
          btn: "bg-amber-600 hover:bg-amber-500",
        }
      : tone === "accent"
      ? {
          iconWrap: "bg-accent/15 border-accent/30 text-accent",
          btn: "bg-accent hover:bg-accent-hover",
        }
      : {
          iconWrap: "bg-rose-500/15 border-rose-500/30 text-rose-500",
          btn: "bg-rose-600 hover:bg-rose-500",
        };

  return (
    <div
      className="fixed inset-0 bg-stone-900/45 dark:bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 px-4"
      onClick={() => !loading && onClose()}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="bg-surface border border-border rounded-2xl w-full max-w-sm shadow-paper-lg overflow-hidden"
      >
        <div className="p-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div
              className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${toneClasses.iconWrap}`}
            >
              <AlertTriangle size={20} />
            </div>
            <button
              type="button"
              onClick={() => !loading && onClose()}
              aria-label="Close confirmation dialog"
              className="text-gray-400 hover:text-gray-100 hover:bg-surface2 p-1.5 rounded-lg transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <div>
            <h2 id="confirm-modal-title" className="font-bold text-lg font-serif text-gray-100">
              {title}
            </h2>
            {message && (
              <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">{message}</p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border">
            <button
              ref={cancelRef}
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-medium text-gray-300 hover:text-gray-100 hover:bg-surface2 rounded-xl border border-border transition-colors"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className={`px-4 py-2 text-xs font-semibold text-white rounded-xl shadow-paper-sm disabled:opacity-60 transition-all active:scale-95 ${toneClasses.btn}`}
            >
              {loading ? "Processing..." : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
