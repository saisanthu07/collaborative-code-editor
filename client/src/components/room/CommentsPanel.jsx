import { useState, memo } from "react";
import { MessageSquarePlus, CheckCircle2, Circle, Trash2, Code2 } from "lucide-react";

function CommentsPanel({
  comments = [],
  activeFileName,
  currentLine = 1,
  canEdit = false,
  isHost = false,
  currentUsername = "",
  onAddComment,
  onToggleResolve,
  onDeleteComment,
  onJumpToLine,
}) {
  const [lineInput, setLineInput] = useState("");
  const [text, setText] = useState("");
  const [showResolved, setShowResolved] = useState(false);

  const fileComments = comments.filter(
    (c) => c.fileName === activeFileName && (showResolved || !c.resolved)
  );

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canEdit || !text.trim()) return;
    const parsedLine = Math.max(1, Number(lineInput) || currentLine || 1);
    await onAddComment({
      fileName: activeFileName,
      line: parsedLine,
      text: text.trim(),
    });
    setText("");
    setLineInput("");
  }

  return (
    <div className="flex flex-col h-full bg-surface shadow-paper-sm">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-surface2/40 text-gray-400">
        <div className="flex items-center gap-1.5">
          <Code2 size={14} className="text-accent" />
          <span className="text-xs font-semibold uppercase tracking-wider font-mono">
            Line Comments ({fileComments.length})
          </span>
        </div>
        <label className="flex items-center gap-1 text-[10px] font-mono cursor-pointer text-gray-400">
          <input
            type="checkbox"
            checked={showResolved}
            onChange={(e) => setShowResolved(e.target.checked)}
            className="accent-accent"
          />
          <span>Resolved</span>
        </label>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {fileComments.length === 0 ? (
          <div className="text-xs text-gray-400 text-center py-8 italic font-sans">
            No {showResolved ? "" : "open "}comments on <span className="font-mono">{activeFileName}</span>.
          </div>
        ) : (
          fileComments.map((c) => {
            const canDelete = isHost || c.username === currentUsername;
            return (
              <div
                key={c._id}
                className={`rounded-xl border p-2.5 text-xs space-y-1.5 transition-colors ${
                  c.resolved
                    ? "bg-surface2/30 border-border/50 opacity-70"
                    : "bg-surface2 border-border"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onJumpToLine?.(c.line)}
                    className="text-[11px] font-mono font-semibold text-accent hover:underline"
                    title="Jump to line in editor"
                  >
                    Line {c.line}
                  </button>
                  <div className="flex items-center gap-1">
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => onToggleResolve?.(c._id)}
                        title={c.resolved ? "Reopen comment" : "Mark resolved"}
                        className="p-1 text-gray-400 hover:text-emerald-500 rounded"
                      >
                        {c.resolved ? <CheckCircle2 size={13} className="text-emerald-500" /> : <Circle size={13} />}
                      </button>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => onDeleteComment?.(c._id)}
                        title="Delete comment"
                        className="p-1 text-gray-400 hover:text-rose-500 rounded"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-gray-200 leading-relaxed break-words">{c.text}</p>
                <div className="text-[10px] font-mono text-gray-500">
                  {c.username} • {new Date(c.createdAt).toLocaleTimeString()}
                </div>
              </div>
            );
          })
        )}
      </div>

      {canEdit && (
        <form onSubmit={handleSubmit} className="p-2.5 border-t border-border space-y-2 bg-surface">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              value={lineInput}
              onChange={(e) => setLineInput(e.target.value)}
              placeholder={`L${currentLine || 1}`}
              aria-label="Line number"
              className="w-16 bg-surface2 border border-border rounded-lg px-2 py-1.5 text-xs font-mono text-gray-100 focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Add review comment..."
              maxLength={1000}
              className="flex-1 bg-surface2 border border-border rounded-lg px-3 py-1.5 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <button
              type="submit"
              disabled={!text.trim()}
              aria-label="Post comment"
              className="bg-accent hover:opacity-90 disabled:opacity-40 text-white p-2 rounded-lg"
            >
              <MessageSquarePlus size={14} />
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default memo(CommentsPanel);
