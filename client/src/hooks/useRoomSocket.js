import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { getSocket } from "../services/socket.js";
import { useAuthStore } from "../store/authStore.js";

export function useRoomSocket({
  roomId,
  token,
  guestToken,
  resolvedUsername,
  onParticipantsUpdate,
  onChatMessage,
  onExecutionStarted,
  onExecutionCompleted,
  onPermissionChange,
  onFileCreated,
  onFileDeleted,
  onFileRenamed,
  onFileLanguageChanged,
  onRoomLocked,
  onRoomEnded,
  onErrorEvent,
  onTimerSynced,
  onUserJoinedVoice,
  onVoiceSignal,
  onUserVoiceMute,
  onUserLeftVoice,
}) {
  const [socket, setSocket] = useState(null);
  const callbacksRef = useRef({});

  // Keep latest callbacks in ref so handlers don't need re-attaching on callback identity changes
  callbacksRef.current = {
    onParticipantsUpdate,
    onChatMessage,
    onExecutionStarted,
    onExecutionCompleted,
    onPermissionChange,
    onFileCreated,
    onFileDeleted,
    onFileRenamed,
    onFileLanguageChanged,
    onRoomLocked,
    onRoomEnded,
    onErrorEvent,
    onTimerSynced,
    onUserJoinedVoice,
    onVoiceSignal,
    onUserVoiceMute,
    onUserLeftVoice,
  };

  useEffect(() => {
    const authUser = useAuthStore.getState().user;
    const effectiveToken = (authUser && token) ? token : (guestToken || token);
    if (!effectiveToken || !resolvedUsername || !roomId) return;

    const s = getSocket(effectiveToken);
    setSocket(s);

    // Join room helper
    const emitJoin = () => {
      s.emit("join-room", { roomId });
    };

    // If socket is already connected, join immediately; otherwise wait for connect
    if (s.connected) {
      emitJoin();
    }
    s.on("connect", emitJoin);

    // Handler references for clean removal
    const handlePresence = ({ participants }) => {
      callbacksRef.current.onParticipantsUpdate?.(participants);
    };

    const handleChatMessage = (msg) => {
      callbacksRef.current.onChatMessage?.(msg);
    };

    const handleExecutionStarted = () => {
      callbacksRef.current.onExecutionStarted?.();
      toast("Code execution started...", { icon: "⚙️" });
    };

    const handleExecutionCompleted = ({ result }) => {
      callbacksRef.current.onExecutionCompleted?.(result);
      if (result?.status === "Accepted") {
        toast.success("Execution completed successfully");
      } else {
        toast.error(`Execution: ${result?.status || "Finished with error"}`);
      }
    };

    const handlePermissionChange = ({ targetUsername, role }) => {
      callbacksRef.current.onPermissionChange?.({ targetUsername, role });
      if (targetUsername === resolvedUsername) {
        toast(`Your role was updated to ${role}`, { icon: "🛡️" });
      } else {
        toast(`${targetUsername}'s role changed to ${role}`, { icon: "🛡️" });
      }
    };

    const handleFileCreated = ({ file }) => {
      callbacksRef.current.onFileCreated?.(file);
      toast.success(`File created: ${file.name}`);
    };

    const handleFileDeleted = ({ fileName }) => {
      callbacksRef.current.onFileDeleted?.(fileName);
      toast(`File deleted: ${fileName}`, { icon: "🗑️" });
    };

    const handleFileRenamed = ({ oldName, newName }) => {
      callbacksRef.current.onFileRenamed?.({ oldName, newName });
      toast(`File renamed: ${oldName} → ${newName}`, { icon: "✏️" });
    };

    const handleFileLanguageChanged = ({ fileName, language }) => {
      callbacksRef.current.onFileLanguageChanged?.({ fileName, language });
      toast(`Language for ${fileName} updated to ${language}`, { icon: "🔤" });
    };

    const handleRoomLocked = ({ locked }) => {
      callbacksRef.current.onRoomLocked?.(locked);
      toast(locked ? "Room has been locked" : "Room has been unlocked", { icon: "🔒" });
    };

    const handleRoomEnded = (data) => {
      const msg = data?.message || "The room has been ended by the host";
      callbacksRef.current.onRoomEnded?.(msg);
      toast(msg, { icon: "🛑" });
    };

    const handleErrorEvent = (err) => {
      callbacksRef.current.onErrorEvent?.(err);
      toast.error(err?.error || "Socket error");
    };

    // Register all event listeners
    s.on("presence-update", handlePresence);
    const handleTimerSynced = (data) => callbacksRef.current.onTimerSynced?.(data);
    const handleUserJoinedVoice = (data) => callbacksRef.current.onUserJoinedVoice?.(data);
    const handleVoiceSignal = (data) => callbacksRef.current.onVoiceSignal?.(data);
    const handleUserVoiceMute = (data) => callbacksRef.current.onUserVoiceMute?.(data);
    const handleUserLeftVoice = (data) => callbacksRef.current.onUserLeftVoice?.(data);

    s.on("timer-synced", handleTimerSynced);
    s.on("user-joined-voice", handleUserJoinedVoice);
    s.on("voice-signal", handleVoiceSignal);
    s.on("user-voice-mute", handleUserVoiceMute);
    s.on("user-left-voice", handleUserLeftVoice);

    s.on("chat-message", handleChatMessage);
    s.on("execution-started", handleExecutionStarted);
    s.on("execution-completed", handleExecutionCompleted);
    s.on("permission-change", handlePermissionChange);
    s.on("file-created", handleFileCreated);
    s.on("file-deleted", handleFileDeleted);
    s.on("file-renamed", handleFileRenamed);
    s.on("file-language-changed", handleFileLanguageChanged);
    s.on("room-locked", handleRoomLocked);
    s.on("room-ended", handleRoomEnded);
    s.on("error-event", handleErrorEvent);

    // Heartbeat every 20s
    const heartbeatInterval = setInterval(() => {
      if (s.connected) {
        s.emit("heartbeat", { roomId });
      }
    }, 20_000);

    // Idle presence tracking (AWAY after 2 min of inactivity)
    let idleTimer = null;
    let isAway = false;

    function resetIdle() {
      if (isAway) {
        isAway = false;
        if (s.connected) {
          s.emit("presence-idle", { roomId, status: "ONLINE" });
        }
      }
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        isAway = true;
        if (s.connected) {
          s.emit("presence-idle", { roomId, status: "AWAY" });
        }
      }, 2 * 60 * 1000);
    }

    resetIdle();
    window.addEventListener("keydown", resetIdle);
    window.addEventListener("mousemove", resetIdle);
    window.addEventListener("touchstart", resetIdle);

    return () => {
      clearInterval(heartbeatInterval);
      if (idleTimer) clearTimeout(idleTimer);
      window.removeEventListener("keydown", resetIdle);
      window.removeEventListener("mousemove", resetIdle);
      window.removeEventListener("touchstart", resetIdle);

      s.off("connect", emitJoin);
      s.off("presence-update", handlePresence);
      s.off("chat-message", handleChatMessage);
      s.off("execution-started", handleExecutionStarted);
      s.off("execution-completed", handleExecutionCompleted);
      s.off("permission-change", handlePermissionChange);
      s.off("file-created", handleFileCreated);
      s.off("file-deleted", handleFileDeleted);
      s.off("file-renamed", handleFileRenamed);
      s.off("file-language-changed", handleFileLanguageChanged);
      s.off("room-locked", handleRoomLocked);
      s.off("room-ended", handleRoomEnded);
      s.off("error-event", handleErrorEvent);
      s.off("timer-synced", handleTimerSynced);
      s.off("user-joined-voice", handleUserJoinedVoice);
      s.off("voice-signal", handleVoiceSignal);
      s.off("user-voice-mute", handleUserVoiceMute);
      s.off("user-left-voice", handleUserLeftVoice);

      s.emit("leave-room");
    };
  }, [roomId, token, guestToken, resolvedUsername]);

  return socket;
}
