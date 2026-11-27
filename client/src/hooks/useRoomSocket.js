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
  onRoomSettingsUpdated,
  onTestCasesUpdated,
  onCommentAdded,
  onCommentUpdated,
  onCommentDeleted,
  onRevisionRestored,
  onParticipantFileChanged,
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
    onRoomSettingsUpdated,
    onTestCasesUpdated,
    onCommentAdded,
    onCommentUpdated,
    onCommentDeleted,
    onRevisionRestored,
    onParticipantFileChanged,
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
    const effectiveToken = authUser && token ? token : (guestToken || token);
    if (!effectiveToken || !resolvedUsername || !roomId) return;

    const s = getSocket(effectiveToken);
    setSocket(s);

    const emitJoin = () => {
      s.emit("join-room", { roomId });
    };

    if (s.connected) {
      emitJoin();
    }
    s.on("connect", emitJoin);

    const handlePresence = ({ participants }) => callbacksRef.current.onParticipantsUpdate?.(participants);
    const handleChatMessage = (msg) => callbacksRef.current.onChatMessage?.(msg);
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
    const handleFileCreated = ({ file }) => callbacksRef.current.onFileCreated?.(file);
    const handleFileDeleted = ({ fileName }) => callbacksRef.current.onFileDeleted?.(fileName);
    const handleFileRenamed = ({ oldName, newName }) => callbacksRef.current.onFileRenamed?.({ oldName, newName });
    const handleFileLanguageChanged = ({ fileName, language }) => callbacksRef.current.onFileLanguageChanged?.({ fileName, language });
    const handleRoomLocked = ({ locked }) => {
      callbacksRef.current.onRoomLocked?.(locked);
      toast(locked ? "Room has been locked" : "Room has been unlocked", { icon: "🔒" });
    };
    const handleRoomSettingsUpdated = (data) => callbacksRef.current.onRoomSettingsUpdated?.(data);
    const handleTestCasesUpdated = ({ testCases }) => callbacksRef.current.onTestCasesUpdated?.(testCases);
    const handleCommentAdded = ({ comment }) => callbacksRef.current.onCommentAdded?.(comment);
    const handleCommentUpdated = ({ comment }) => callbacksRef.current.onCommentUpdated?.(comment);
    const handleCommentDeleted = ({ commentId }) => callbacksRef.current.onCommentDeleted?.(commentId);
    const handleRevisionRestored = (data) => {
      callbacksRef.current.onRevisionRestored?.(data);
      toast(`${data.restoredBy || "Editor"} restored "${data.fileName}" to "${data.label}"`, { icon: "🕒" });
    };
    const handleParticipantFileChanged = (data) => callbacksRef.current.onParticipantFileChanged?.(data);
    const handleRoomEnded = (data) => {
      const msg = data?.message || "The room has been ended by the host";
      callbacksRef.current.onRoomEnded?.(msg);
      toast(msg, { icon: "🛑" });
    };
    const handleErrorEvent = (err) => {
      callbacksRef.current.onErrorEvent?.(err);
      toast.error(err?.error || "Socket error");
    };
    const handleAccountModerated = (moderation) => {
      if (moderation) {
        useAuthStore.getState().setModerationNotice(moderation);
        useAuthStore.getState().logout();
      }
      s.disconnect();
    };

    const handleTimerSynced = (data) => callbacksRef.current.onTimerSynced?.(data);
    const handleUserJoinedVoice = (data) => callbacksRef.current.onUserJoinedVoice?.(data);
    const handleVoiceSignal = (data) => callbacksRef.current.onVoiceSignal?.(data);
    const handleUserVoiceMute = (data) => callbacksRef.current.onUserVoiceMute?.(data);
    const handleUserLeftVoice = (data) => callbacksRef.current.onUserLeftVoice?.(data);

    s.on("presence-update", handlePresence);
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
    s.on("room-settings-updated", handleRoomSettingsUpdated);
    s.on("test-cases-updated", handleTestCasesUpdated);
    s.on("comment-added", handleCommentAdded);
    s.on("comment-updated", handleCommentUpdated);
    s.on("comment-deleted", handleCommentDeleted);
    s.on("revision-restored", handleRevisionRestored);
    s.on("participant-file-changed", handleParticipantFileChanged);
    s.on("room-ended", handleRoomEnded);
    s.on("error-event", handleErrorEvent);
    s.on("account-moderated", handleAccountModerated);

    const heartbeatInterval = setInterval(() => {
      if (s.connected) {
        s.emit("heartbeat", { roomId });
      }
    }, 20_000);

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
      s.off("room-settings-updated", handleRoomSettingsUpdated);
      s.off("test-cases-updated", handleTestCasesUpdated);
      s.off("comment-added", handleCommentAdded);
      s.off("comment-updated", handleCommentUpdated);
      s.off("comment-deleted", handleCommentDeleted);
      s.off("revision-restored", handleRevisionRestored);
      s.off("participant-file-changed", handleParticipantFileChanged);
      s.off("room-ended", handleRoomEnded);
      s.off("error-event", handleErrorEvent);
      s.off("account-moderated", handleAccountModerated);
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
