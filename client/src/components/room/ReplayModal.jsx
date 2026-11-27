import { useEffect, useState, useRef } from "react";
import { X, History, Play, MessageSquare, Clock, Code2 } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../../services/api.js";

export default function ReplayModal({ roomId, onClose }) {
  const [events, setEvents] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const closeBtnRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    closeBtnRef.current?.focus();
    api
      .get(`/rooms/${roomId}/timeline`)
      .then(({ data }) => {
        const list = data.events || [];
        setEvents(list);
        if (list.length > 0) setSelectedIdx(list.length - 1);
      })
      .catch(() => toast.error("Could not load session timeline"))
      .finally(() => setLoading(false));

    function onKey(e) {
      if (e.key === "Escape") onCloseRef.current?.();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [roomId]);

  const current = events[selectedIdx] || null;

  return (
    <div
      className="fixed inset-0 bg-stone-900/50 dark:bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="replay-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="bg-surface border border-border rounded-2xl w-full max-w-4xl h-[78vh] flex flex-col shadow-paper-lg overflow-hidden"
      >
        <div className="px-5 py-3.5 border-b border-border bg-surface2/60 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-accent/15 border border-accent/25 text-accent flex items-center justify-center">
              <Clock size={16} />
            </div>
            <div>
              <h2 id="replay-modal-title" className="font-serif font-bold text-base text-gray-100">
                Session Timeline &amp; Replay
              </h2>
              <p className="text-[11px] font-mono text-gray-400">
                Scrub through saved checkpoints, code executions, and discussion notes
              </p>
            </div>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Close replay modal"
            className="text-gray-400 hover:text-gray-100 p-1.5 rounded-lg hover:bg-surface2"
          >
            <X size={16} />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-xs font-mono text-gray-400">
            Loading chronological session events...
          </div>
        ) : events.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-xs text-gray-400 p-8 text-center">
            No checkpoints, executions, or notes recorded in this session yet.
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col">
            {/* Scrubber Bar */}
            <div className="px-5 py-3 border-b border-border bg-surface2/35 flex items-center gap-3">
              <span className="text-[11px] font-mono text-gray-400 shrink-0">
                Event {selectedIdx + 1} / {events.length}
              </span>
              <input
                type="range"
                min={0}
                max={Math.max(0, events.length - 1)}
                value={selectedIdx}
                onChange={(e) => setSelectedIdx(Number(e.target.value))}
                aria-label="Scrub session timeline"
                className="flex-1 accent-[rgb(var(--color-accent))]"
              />
              <span className="text-[11px] font-mono text-gray-400 shrink-0">
                {current ? new Date(current.createdAt).toLocaleTimeString() : ""}
              </span>
            </div>

            <div className="flex-1 min-h-0 grid md:grid-cols-12">
              {/* Event List */}
              <div className="md:col-span-5 border-b md:border-b-0 md:border-r border-border overflow-y-auto divide-y divide-border/60 max-h-48 md:max-h-none">
                {events.map((ev, idx) => {
                  const selected = idx === selectedIdx;
                  const Icon =
                    ev.kind === "revision"
                      ? History
                      : ev.kind === "execution"
                      ? Play
                      : MessageSquare;
                  return (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() => setSelectedIdx(idx)}
                      className={`w-full text-left px-4 py-3 flex items-start gap-2.5 transition-colors ${
                        selected ? "bg-accent/10 border-l-2 border-l-accent" : "hover:bg-surface2/60"
                      }`}
                    >
                      <Icon
                        size={14}
                        className={`mt-0.5 shrink-0 ${
                          ev.kind === "revision"
                            ? "text-accent"
                            : ev.kind === "execution"
                            ? "text-accent2"
                            : "text-gray-400"
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium text-gray-100 truncate">{ev.title}</div>
                        <div className="text-[10px] font-mono text-gray-400 mt-0.5">
                          {ev.actor} · {new Date(ev.createdAt).toLocaleTimeString()}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Event Snapshot Inspector */}
              <div className="md:col-span-7 overflow-y-auto p-5 bg-paper-editor space-y-4">
                {current && (
                  <>
                    <div className="flex items-center justify-between gap-2 pb-2 border-b border-border">
                      <div>
                        <div className="text-sm font-serif font-bold text-gray-100">
                          {current.title}
                        </div>
                        <div className="text-[11px] font-mono text-gray-400">
                          {current.actor} · {new Date(current.createdAt).toLocaleString()}
                        </div>
                      </div>
                      {current.executionTime && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface2 border border-border text-gray-300">
                          {current.executionTime}
                        </span>
                      )}
                    </div>

                    {current.sourceCode && (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-gray-400">
                          <Code2 size={12} />
                          <span>Submitted Code Snapshot</span>
                        </div>
                        <pre className="rounded-xl bg-surface border border-border p-3.5 text-xs font-mono text-gray-100 overflow-x-auto whitespace-pre-wrap">
                          {current.sourceCode}
                        </pre>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <div className="text-[10px] font-mono uppercase tracking-wider text-gray-400">
                        {current.kind === "revision"
                          ? `File Snapshot (${current.fileName})`
                          : current.kind === "execution"
                          ? "Console Output"
                          : "Message"}
                      </div>
                      <pre className="rounded-xl bg-paper-console border border-border p-3.5 text-xs font-mono text-gray-200 overflow-x-auto whitespace-pre-wrap">
                        {current.detail || "(Empty)"}
                      </pre>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
