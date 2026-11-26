import { useEffect, useRef } from "react";
import { AlertTriangle, X } from "lucide-react";

export default function DeleteRoomModal({
  room,
  deleting,
  onClose,
  onConfirm,
}) {
  const cancelRef = useRef(null);

  useEffect(() => {
    if (!room) return;
    cancelRef.current?.focus();

    function handleKeyDown(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [room, onClose]);

  if (!room) return null;

  return (
    <div
      className="fixed inset-0 bg-stone-900/45 dark:bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 px-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-room-title"
        onClick={(e) => e.stopPropagation()}
        className="bg-surface border border-border rounded-2xl w-full max-w-sm shadow-paper-lg overflow-hidden"
      >
        <div className="p-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-500 flex items-center justify-center shrink-0">
              <AlertTriangle size={20} />
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close confirmation"
              className="text-gray-400 hover:text-gray-100 hover:bg-surface2 p-1.5 rounded-lg transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <div>
            <h2 id="delete-room-title" className="font-bold text-lg font-serif text-gray-100">
              Delete &ldquo;{room.name}&rdquo;?
            </h2>
            <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
              This permanently removes the room, all code files, version checkpoints, comments, and chat history. Collaborators currently inside will be disconnected.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border">
            <button
              ref={cancelRef}
              type="button"
              onClick={onClose}
              disabled={deleting}
              className="px-4 py-2 text-xs font-medium text-gray-300 hover:text-gray-100 hover:bg-surface2 rounded-xl border border-border transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onConfirm(room)}
              disabled={deleting}
              className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-paper-sm disabled:opacity-60 transition-all active:scale-95"
            >
              {deleting ? "Deleting..." : "Delete Room"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
