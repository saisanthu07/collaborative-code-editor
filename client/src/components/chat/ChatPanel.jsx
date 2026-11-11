import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";

export default function ChatPanel({ socket, roomId, messages, setMessages }) {
  const [text, setText] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function send(e) {
    e.preventDefault();
    if (!text.trim() || !socket) return;
    socket.emit("chat-message", { roomId, text: text.trim() });
    setText("");
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {messages.map((m, i) => (
          <div key={m._id || i} className={m.system ? "text-xs text-gray-500 italic" : "text-sm"}>
            {!m.system && <span className="font-medium text-accent">{m.username}: </span>}
            <span className={m.system ? "" : "text-gray-200"}>{m.text}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={send} className="p-2 border-t border-border flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Message..."
          className="flex-1 bg-surface2 border border-border rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <button type="submit" className="text-accent hover:text-blue-400">
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
