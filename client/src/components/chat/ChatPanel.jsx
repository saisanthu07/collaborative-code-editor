import { useEffect, useRef, useState, memo } from "react";
import { Send, MessageSquare, History, MessageSquareOff } from "lucide-react";

function ChatPanel({
  socket,
  roomId,
  messages,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
  chatMuted = false,
  isHost = false,
}) {
  const [text, setText] = useState("");
  const bottomRef = useRef(null);
  const prevCountRef = useRef(messages.length);

  useEffect(() => {
    // Only auto-scroll when new messages append (not when older messages prepend)
    if (messages.length > prevCountRef.current && !loadingMore) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevCountRef.current = messages.length;
  }, [messages.length, loadingMore]);

  const inputDisabled = chatMuted && !isHost;

  function send(e) {
    e.preventDefault();
    if (inputDisabled) return;
    const trimmed = text.trim();
    if (!trimmed || !socket) return;
    socket.emit("chat-message", { roomId, text: trimmed });
    setText("");
  }

  return (
    <div className="flex flex-col h-full bg-surface shadow-paper-sm">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-surface2/40 text-gray-400">
        <div className="flex items-center gap-1.5">
          <MessageSquare size={14} className="text-accent" />
          <span className="text-xs font-semibold uppercase tracking-wider font-mono">
            Marginalia Chat
          </span>
        </div>
        {chatMuted && (
          <span className="flex items-center gap-1 text-[10px] font-mono text-amber-500">
            <MessageSquareOff size={11} />
            Muted
          </span>
        )}
      </div>

      <div
        className="flex-1 overflow-y-auto px-3.5 py-3 space-y-2 select-text"
        role="log"
        aria-label="Room chat messages"
      >
        {hasMore && (
          <div className="flex justify-center pb-2">
            <button
              type="button"
              onClick={onLoadMore}
              disabled={loadingMore}
              className="flex items-center gap-1.5 text-[11px] font-mono text-accent hover:opacity-80 bg-surface2 border border-border rounded-lg px-3 py-1 disabled:opacity-50"
            >
              <History size={12} />
              <span>{loadingMore ? "Loading..." : "Load older messages"}</span>
            </button>
          </div>
        )}

        {messages.length === 0 && (
          <div className="text-xs text-gray-400 text-center py-8 italic font-sans">
            No notes written yet. Leave a note for your team!
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={m._id || i}
            className={`text-xs break-words ${m.system ? "text-[11px] text-gray-400 italic py-1 border-b border-border/40 font-mono" : "py-1"}`}
          >
            {!m.system && (
              <span className="font-semibold text-accent mr-1.5 font-sans">{m.username}:</span>
            )}
            <span className={m.system ? "text-gray-400" : "text-gray-200"}>{m.text}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} className="p-2.5 border-t border-border flex gap-2 bg-surface">
        <label htmlFor="chat-input" className="sr-only">
          Chat Message
        </label>
        <input
          id="chat-input"
          value={text}
          disabled={inputDisabled}
          onChange={(e) => setText(e.target.value)}
          placeholder={inputDisabled ? "Chat muted by host" : "Write a note..."}
          autoComplete="off"
          className="flex-1 bg-surface2 border border-border rounded-lg px-3 py-2 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent shadow-paper-sm disabled:opacity-50"
        />
        <button
          type="submit"
          aria-label="Send message"
          disabled={inputDisabled || !text.trim()}
          className="bg-accent hover:opacity-90 disabled:opacity-40 text-white p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent shadow-paper-sm transition-all active:scale-95"
        >
          <Send size={15} aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}

export default memo(ChatPanel);
