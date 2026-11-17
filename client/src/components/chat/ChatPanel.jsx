import { useEffect, useRef, useState, memo } from "react";
import { Send } from "lucide-react";

function ChatPanel({ socket, roomId, messages, setMessages }) {
  const [text, setText] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function send(e) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || !socket) return;
    socket.emit("chat-message", { roomId, text: trimmed });
    setText("");
  }

  return (
    <div className="flex flex-col h-full bg-surface">
      <div
        className="flex-1 overflow-y-auto px-3 py-2 space-y-2"
        role="log"
        aria-label="Room chat messages"
      >
        {messages.length === 0 && (
          <div className="text-xs text-gray-500 text-center py-6">
            No messages yet. Say hello!
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={m._id || i}
            className={`text-sm break-words ${m.system ? "text-xs text-gray-500 italic py-0.5" : "py-1"}`}
          >
            {!m.system && (
              <span className="font-semibold text-accent mr-1.5">{m.username}:</span>
            )}
            <span className={m.system ? "text-gray-400" : "text-gray-200"}>{m.text}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={send} className="p-2 border-t border-border flex gap-2 bg-surface">
        <label htmlFor="chat-input" className="sr-only">
          Chat Message
        </label>
        <input
          id="chat-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Send a message..."
          autoComplete="off"
          className="flex-1 bg-surface2 border border-border rounded-md px-3 py-1.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
        />
        <button
          type="submit"
          aria-label="Send message"
          disabled={!text.trim()}
          className="text-accent hover:text-blue-400 disabled:opacity-40 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
        >
          <Send size={18} aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}

export default memo(ChatPanel);
