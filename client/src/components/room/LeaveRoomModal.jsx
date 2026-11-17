import { useEffect, useRef } from "react";
import { LogOut, X } from "lucide-react";

export default function LeaveRoomModal({ onConfirm, onClose, loading = false }) {
  const modalRef = useRef(null);
  const cancelBtnRef = useRef(null);

  useEffect(() => {
    cancelBtnRef.current?.focus();

    function handleKeyDown(e) {
      if (e.key === "Escape" && !loading) {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "Tab") {
        const focusable = modalRef.current?.querySelectorAll(
          'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable || focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, loading]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="leave-room-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="w-full max-w-md bg-surface border border-border rounded-xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
              <LogOut size={20} />
            </div>
            <div>
              <h2 id="leave-room-title" className="text-lg font-semibold text-gray-100">
                Leave Room?
              </h2>
              <p className="text-xs text-gray-400">You can rejoin later if you have the link.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            aria-label="Close dialog"
            className="text-gray-400 hover:text-gray-200 p-1 rounded-md transition-colors disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-sm text-gray-300 leading-relaxed">
          Are you sure you want to leave this session? Your current editor cursor and participation will be disconnected.
        </p>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
          <button
            ref={cancelBtnRef}
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-md border border-border hover:bg-surface2 text-sm text-gray-300 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 rounded-md bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium transition-colors inline-flex items-center gap-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-60"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Leaving...
              </>
            ) : (
              "Leave Room"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
