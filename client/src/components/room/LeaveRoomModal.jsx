import { useEffect, useRef } from "react";
import { LogOut, X } from "lucide-react";

export default function LeaveRoomModal({
  onClose,
  onConfirm,
  roomName,
  loading = false,
}) {
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
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
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
  }, [loading, onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="leave-room-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 dark:bg-black/70 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="w-full max-w-md bg-surface border border-border rounded-2xl p-6 sm:p-7 shadow-paper-lg space-y-4 animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/25 shadow-paper-sm">
              <LogOut size={20} />
            </div>
            <div>
              <h2 id="leave-room-title" className="text-lg font-bold font-serif text-gray-100">
                Leave Session
              </h2>
              <p className="text-xs text-gray-400">You can rejoin later if you have the link.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Close dialog"
            className="text-gray-400 hover:text-gray-100 hover:bg-surface2 p-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-xs text-gray-300 leading-relaxed font-sans">
          Are you sure you want to exit <span className="font-semibold text-gray-100 font-serif">{roomName}</span>?
          Your peer cursors will disconnect and audio streams will stop.
        </p>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
          <button
            ref={cancelBtnRef}
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-lg border border-border hover:bg-surface2 text-xs font-medium text-gray-300 hover:text-gray-100 transition-colors disabled:opacity-50"
          >
            Stay
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold transition-all inline-flex items-center gap-2 shadow-paper-sm focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-60 active:scale-95"
          >
            {loading ? "Leaving..." : "Leave Session"}
          </button>
        </div>
      </div>
    </div>
  );
}
