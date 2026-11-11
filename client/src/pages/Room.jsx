import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Play, Share2, Users, MessageSquare, Menu } from "lucide-react";
import { api } from "../services/api.js";
import { getSocket, disconnectSocket } from "../services/socket.js";
import { useAuthStore } from "../store/authStore.js";
import CollabEditor from "../components/editor/CollabEditor.jsx";
import OutputConsole from "../components/editor/OutputConsole.jsx";
import ChatPanel from "../components/chat/ChatPanel.jsx";
import ParticipantsPanel from "../components/room/ParticipantsPanel.jsx";
import ShareModal from "../components/room/ShareModal.jsx";
import { LANGUAGES, monacoLangFor } from "../constants/languages.js";

export default function Room() {
  const { roomId } = useParams();
  const { user, token } = useAuthStore();
  const [room, setRoom] = useState(null);
  const [socket, setSocket] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [messages, setMessages] = useState([]);
  const [activeFile, setActiveFile] = useState(null);
  const [language, setLanguage] = useState("javascript");
  const [sourceCode, setSourceCode] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [rightTab, setRightTab] = useState("participants");
  const [mobilePanel, setMobilePanel] = useState(null);
  const [showShare, setShowShare] = useState(false);
  const editorRef = useRef(null);
  const username = user?.username;

  // Load room + join, fetch chat history
  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        await api.post(`/rooms/${roomId}/join`);
        const { data } = await api.get(`/rooms/${roomId}`);
        if (!mounted) return;
        setRoom(data.room);
        setActiveFile(data.room.files[0]?.name);
        setLanguage(data.room.language);

        const { data: msgData } = await api.get(`/rooms/${roomId}/messages`);
        setMessages(msgData.messages);
      } catch (err) {
        toast.error(err.response?.data?.error || "Could not load room");
      }
    }
    init();
    return () => {
      mounted = false;
    };
  }, [roomId]);

  // Socket.IO: presence, chat, room events
  useEffect(() => {
    const s = getSocket(token, username || `Guest-${Math.floor(1000 + Math.random() * 9000)}`);
    setSocket(s);

    s.emit("join-room", { roomId });

    s.on("presence-update", ({ participants }) => setParticipants(participants));
    s.on("chat-message", (msg) => setMessages((prev) => [...prev, msg]));

    return () => {
      s.emit("leave-room");
      s.off("presence-update");
      s.off("chat-message");
    };
  }, [roomId, token, username]);

  useEffect(() => {
    return () => disconnectSocket();
  }, []);

  const handleRun = useCallback(async () => {
    const currentSourceCode = editorRef.current?.getValue() ?? sourceCode;
    if (!currentSourceCode.trim()) {
      toast.error("Add some code before running");
      return;
    }

    setRunning(true);
    setResult(null);
    socket?.emit("execution-started", { roomId });
    try {
      const { data } = await api.post(`/rooms/${roomId}/execute`, {
        language,
        sourceCode: currentSourceCode,
        stdin: "",
      });
      setResult(data.result);
      socket?.emit("execution-completed", { roomId, result: data.result });
    } catch (err) {
      const message = err.response?.data?.error || "Execution failed";
      setResult({ status: "Error", stdout: "", stderr: message });
      toast.error(message);
    } finally {
      setRunning(false);
    }
  }, [roomId, language, sourceCode, socket]);

  function copyShareLink() {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Room link copied");
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center text-gray-400">
        Loading room...
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-bg">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-surface">
        <span className="font-medium truncate">{room.name}</span>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="bg-surface2 border border-border rounded-md text-xs px-2 py-1"
        >
          {LANGUAGES.map((l) => (
            <option key={l.key} value={l.key}>
              {l.label}
            </option>
          ))}
        </select>
        <button
          onClick={handleRun}
          disabled={running}
          className="flex items-center gap-1 bg-accent2/20 text-accent2 border border-accent2/40 rounded-md px-3 py-1 text-xs font-medium hover:bg-accent2/30 disabled:opacity-50"
        >
          <Play size={14} /> {running ? "Running..." : "Run"}
        </button>
        <button
          onClick={() => setShowShare(true)}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-white ml-auto"
        >
          <Share2 size={14} /> Share
        </button>
        <div className="hidden md:flex items-center gap-3 text-xs text-gray-400">
          <button
            onClick={() => setRightTab("participants")}
            className={`flex items-center gap-1 ${rightTab === "participants" ? "text-accent" : ""}`}
          >
            <Users size={14} /> {participants.length}
          </button>
          <button
            onClick={() => setRightTab("chat")}
            className={`flex items-center gap-1 ${rightTab === "chat" ? "text-accent" : ""}`}
          >
            <MessageSquare size={14} /> Chat
          </button>
        </div>
        <button
          className="md:hidden text-gray-400"
          onClick={() => setMobilePanel(mobilePanel ? null : "participants")}
        >
          <Menu size={18} />
        </button>
      </div>

      {/* Main layout */}
      <div className="flex flex-1 min-h-0">
        {/* Editor + output */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 min-h-0">
            {activeFile && (
              <CollabEditor
                roomId={roomId}
                fileName={activeFile}
                language={monacoLangFor(language)}
                username={username || "Guest"}
                onConnectionChange={() => {}}
                onSourceCodeChange={setSourceCode}
                onEditorReady={(editor) => {
                  editorRef.current = editor;
                  setSourceCode(editor.getValue());
                }}
              />
            )}
          </div>
          <div className="h-40 border-t border-border">
            <OutputConsole running={running} result={result} />
          </div>
        </div>

        {/* Right sidebar (desktop) */}
        <div className="hidden md:block w-72 border-l border-border bg-surface">
          {rightTab === "participants" ? (
            <ParticipantsPanel participants={participants} />
          ) : (
            <ChatPanel socket={socket} roomId={roomId} messages={messages} setMessages={setMessages} />
          )}
        </div>
      </div>

      {/* Mobile bottom sheet */}
      {mobilePanel && (
        <div className="md:hidden fixed inset-0 bg-black/60 flex items-end z-50" onClick={() => setMobilePanel(null)}>
          <div
            className="bg-surface border-t border-border rounded-t-xl w-full h-[60vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex border-b border-border text-sm">
              <button
                className={`flex-1 py-2 ${mobilePanel === "participants" ? "text-accent" : "text-gray-400"}`}
                onClick={() => setMobilePanel("participants")}
              >
                Participants
              </button>
              <button
                className={`flex-1 py-2 ${mobilePanel === "chat" ? "text-accent" : "text-gray-400"}`}
                onClick={() => setMobilePanel("chat")}
              >
                Chat
              </button>
            </div>
            <div className="flex-1 min-h-0">
              {mobilePanel === "participants" ? (
                <ParticipantsPanel participants={participants} />
              ) : (
                <ChatPanel socket={socket} roomId={roomId} messages={messages} setMessages={setMessages} />
              )}
            </div>
          </div>
        </div>
      )}
      {showShare && <ShareModal url={window.location.href} onClose={() => setShowShare(false)} />}
    </div>
  );
}
