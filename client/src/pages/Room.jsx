import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Play,
  Share2,
  Users,
  MessageSquare,
  Lock,
  ShieldAlert,
  ArrowLeft,
  FileCode,
  Terminal,
  RefreshCw,
  LogOut,
  ChevronDown,
  XCircle,
  Download,
  Settings,
  Star,
  PenTool,
  Code2,
  ClipboardCheck,
  Command,
  WifiOff,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";
import { downloadFilesAsZip } from "../utils/zip.js";
import { copyToClipboard } from "../utils/clipboard.js";
import { api } from "../services/api.js";
import { disconnectSocket } from "../services/socket.js";
import { useAuthStore } from "../store/authStore.js";
import { useRoomSocket } from "../hooks/useRoomSocket.js";
import CollabEditor from "../components/editor/CollabEditor.jsx";
import OutputConsole from "../components/editor/OutputConsole.jsx";
import ChatPanel from "../components/chat/ChatPanel.jsx";
import CommentsPanel from "../components/room/CommentsPanel.jsx";
import WhiteboardPanel from "../components/room/WhiteboardPanel.jsx";
import RevisionsModal from "../components/room/RevisionsModal.jsx";
import ScorecardModal from "../components/room/ScorecardModal.jsx";
import CommandPalette from "../components/room/CommandPalette.jsx";
import ParticipantsPanel from "../components/room/ParticipantsPanel.jsx";
import ShareModal from "../components/room/ShareModal.jsx";
import HostSettingsModal from "../components/room/HostSettingsModal.jsx";
import EndRoomModal from "../components/room/EndRoomModal.jsx";
import LeaveRoomModal from "../components/room/LeaveRoomModal.jsx";
import NewFileModal from "../components/room/NewFileModal.jsx";
import RenameFileModal from "../components/room/RenameFileModal.jsx";
import DeleteFileModal from "../components/room/DeleteFileModal.jsx";
import FileTabs from "../components/editor/FileTabs.jsx";
import FileExplorer from "../components/editor/FileExplorer.jsx";
import InterviewTimer from "../components/room/InterviewTimer.jsx";
import VoiceRoom from "../components/room/VoiceRoom.jsx";
import PageLoading from "../components/common/PageLoading.jsx";
import ThemeToggle from "../components/common/ThemeToggle.jsx";
import { LANGUAGES, monacoLangFor } from "../constants/languages.js";

const DEFAULT_TEST_CASES = [
  { id: 1, input: "5\n1 2 3 4 5", expected: "15", actual: "", status: "idle" },
  { id: 2, input: "3\n10 20 30", expected: "60", actual: "", status: "idle" },
];

export default function Room() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, token } = useAuthStore();

  const [loadState, setLoadState] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");

  const [room, setRoom] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [messages, setMessages] = useState([]);
  const [comments, setComments] = useState([]);
  const [chatHasMore, setChatHasMore] = useState(false);
  const [chatNextCursor, setChatNextCursor] = useState(null);
  const [loadingMoreChat, setLoadingMoreChat] = useState(false);

  const [activeFileName, setActiveFileName] = useState("");
  const [currentLine, setCurrentLine] = useState(1);
  const [followingUsername, setFollowingUsername] = useState(null);
  const [workspaceView, setWorkspaceView] = useState("code"); // "code" | "whiteboard"

  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [stdin, setStdin] = useState("");
  const [isStarred, setIsStarred] = useState(false);

  const [testCases, setTestCases] = useState(DEFAULT_TEST_CASES);
  const [runningTestCases, setRunningTestCases] = useState(false);

  const [fileExplorerOpen, setFileExplorerOpen] = useState(false);
  const [showNewFileModal, setShowNewFileModal] = useState(false);
  const [renameTargetFile, setRenameTargetFile] = useState(null);
  const [deleteTargetFile, setDeleteTargetFile] = useState(null);
  const [creatingFile, setCreatingFile] = useState(false);
  const [renamingFile, setRenamingFile] = useState(false);
  const [deletingFile, setDeletingFile] = useState(false);

  const [rightTab, setRightTab] = useState("participants"); // "participants" | "chat" | "comments"
  const [mobileTab, setMobileTab] = useState("editor"); // "editor" | "output" | "participants" | "chat" | "comments"
  const [mobileTopBarExpanded, setMobileTopBarExpanded] = useState(false);

  const [showShare, setShowShare] = useState(false);
  const [showHostSettings, setShowHostSettings] = useState(false);
  const [showRevisions, setShowRevisions] = useState(false);
  const [showScorecard, setShowScorecard] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [yjsStatus, setYjsStatus] = useState("connecting");
  const [savingSettings, setSavingSettings] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [endingRoom, setEndingRoom] = useState(false);
  const [leavingRoom, setLeavingRoom] = useState(false);
  const editorRef = useRef(null);
  const testCaseSyncTimerRef = useRef(null);

  const [resolvedUsername, setResolvedUsername] = useState(user?.username || null);
  const [guestToken, setGuestToken] = useState(() => {
    try {
      const raw = sessionStorage.getItem(`collab_guest_${roomId}`);
      return raw ? JSON.parse(raw)?.guestToken : null;
    } catch {
      return null;
    }
  });

  const inviteCodeParam = new URLSearchParams(location.search).get("invite");

  const initRoom = useCallback(async () => {
    setLoadState("loading");
    setErrorMessage("");

    try {
      const joinRes = await api.post(
        `/rooms/${roomId}/join`,
        inviteCodeParam ? { inviteCode: inviteCodeParam } : {}
      );
      const effectiveName = user?.username || joinRes.data.username;
      setResolvedUsername(effectiveName);

      if (joinRes.data.guestToken) {
        setGuestToken(joinRes.data.guestToken);
        try {
          sessionStorage.setItem(
            `collab_guest_${roomId}`,
            JSON.stringify({
              guestToken: joinRes.data.guestToken,
              username: joinRes.data.username,
              guestId: joinRes.data.guestId,
            })
          );
        } catch {
          // ignore
        }
      }

      const { data } = await api.get(`/rooms/${roomId}`);
      setRoom(data.room);
      if (user?._id && Array.isArray(data.room?.starredBy)) {
        setIsStarred(data.room.starredBy.some((id) => id.toString() === user._id.toString()));
      }

      if (Array.isArray(data.room?.testCases) && data.room.testCases.length > 0) {
        setTestCases(data.room.testCases.map((tc) => ({ ...tc, actual: "", status: "idle" })));
      }

      const files = data.room.files || [];
      if (files.length > 0) {
        setActiveFileName(files[0].name);
      }

      try {
        const [msgRes, commentsRes] = await Promise.all([
          api.get(`/rooms/${roomId}/messages?limit=50`),
          api.get(`/rooms/${roomId}/comments`),
        ]);
        setMessages(msgRes.data.messages || []);
        setChatHasMore(Boolean(msgRes.data.hasMore));
        setChatNextCursor(msgRes.data.nextCursor || null);
        setComments(commentsRes.data.comments || []);
      } catch {
        // non-fatal
      }

      setLoadState("ready");
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.error || "Could not load room";

      if (status === 404) {
        setLoadState("notFound");
      } else if (status === 403) {
        if (/locked/i.test(msg)) {
          setLoadState("locked");
        } else {
          setLoadState("forbidden");
        }
      } else {
        setLoadState("error");
        setErrorMessage(msg);
      }
    }
  }, [roomId, user?.username, user?._id, inviteCodeParam]);

  useEffect(() => {
    initRoom();
  }, [initRoom]);

  useEffect(() => {
    return () => {
      if (testCaseSyncTimerRef.current) clearTimeout(testCaseSyncTimerRef.current);
      disconnectSocket();
    };
  }, []);

  useEffect(() => {
    function handleCommandShortcut(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setShowCommandPalette((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleCommandShortcut);
    return () => window.removeEventListener("keydown", handleCommandShortcut);
  }, []);

  const activeFile = room?.files?.find((f) => f.name === activeFileName) || room?.files?.[0];
  const activeLanguage = activeFile?.language || room?.language || "javascript";
  const memberRecord = room?.members?.find(
    (m) =>
      (user?._id && m.userId?.toString() === user._id.toString()) ||
      m.username === resolvedUsername
  );
  const isRoomOwner = Boolean(
    user?._id &&
      room?.ownerId &&
      (room.ownerId?.toString() === user._id?.toString() || room.ownerId === user._id)
  );
  const isHost = Boolean(isRoomOwner || memberRecord?.role === "HOST");
  const isCompleted = room?.status === "COMPLETED";
  const userRole = isHost
    ? "HOST"
    : memberRecord?.role || (user ? room?.settings?.defaultRole : "GUEST");
  const canManageFiles = Boolean(
    !isCompleted &&
      (isHost || userRole === "EDITOR" || (userRole === "GUEST" && room?.settings?.allowGuestEdit))
  );

  const handleParticipantsUpdate = useCallback((parts) => {
    setParticipants(parts);
  }, []);

  const handleChatMessage = useCallback((msg) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const handleLoadOlderMessages = useCallback(async () => {
    if (!chatNextCursor || loadingMoreChat) return;
    setLoadingMoreChat(true);
    try {
      const { data } = await api.get(
        `/rooms/${roomId}/messages?limit=50&before=${encodeURIComponent(chatNextCursor)}`
      );
      setMessages((prev) => [...(data.messages || []), ...prev]);
      setChatHasMore(Boolean(data.hasMore));
      setChatNextCursor(data.nextCursor || null);
    } catch {
      toast.error("Could not load older messages");
    } finally {
      setLoadingMoreChat(false);
    }
  }, [roomId, chatNextCursor, loadingMoreChat]);

  const handleEditorReady = useCallback((editor) => {
    editorRef.current = editor;
  }, []);

  const handleExecutionStarted = useCallback(() => {
    setRunning(true);
    setResult(null);
  }, []);

  const handleExecutionCompleted = useCallback((res) => {
    setRunning(false);
    setResult(res);
  }, []);

  const handlePermissionChange = useCallback(({ targetUsername, role }) => {
    setRoom((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        members: prev.members.map((m) =>
          m.username === targetUsername ? { ...m, role } : m
        ),
      };
    });
  }, []);

  const handleFileCreated = useCallback((file) => {
    setRoom((prev) => {
      if (!prev) return prev;
      if (prev.files.some((f) => f.name === file.name)) return prev;
      return { ...prev, files: [...prev.files, file] };
    });
  }, []);

  const handleFileDeleted = useCallback((fileName) => {
    setRoom((prev) => {
      if (!prev) return prev;
      const remaining = prev.files.filter((f) => f.name !== fileName);
      setActiveFileName((curr) => (curr === fileName ? remaining[0]?.name || "" : curr));
      return { ...prev, files: remaining };
    });
  }, []);

  const handleFileRenamed = useCallback(({ oldName, newName }) => {
    setRoom((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        files: prev.files.map((f) => (f.name === oldName ? { ...f, name: newName } : f)),
      };
    });
    setActiveFileName((curr) => (curr === oldName ? newName : curr));
  }, []);

  const handleFileLanguageChanged = useCallback(({ fileName, language }) => {
    setRoom((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        files: prev.files.map((f) => (f.name === fileName ? { ...f, language } : f)),
      };
    });
  }, []);

  const handleRoomLocked = useCallback((locked) => {
    setRoom((prev) => {
      if (!prev) return prev;
      return { ...prev, settings: { ...prev.settings, locked } };
    });
  }, []);

  const handleRoomSettingsUpdated = useCallback(({ visibility, settings }) => {
    setRoom((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        ...(visibility ? { visibility } : {}),
        ...(settings ? { settings: { ...prev.settings, ...settings } } : {}),
      };
    });
  }, []);

  const handleTestCasesUpdated = useCallback((serverCases) => {
    if (!Array.isArray(serverCases)) return;
    setTestCases((prev) => {
      const prevMap = new Map(prev.map((c) => [c.id, c]));
      return serverCases.map((tc) => {
        const existing = prevMap.get(tc.id);
        return {
          ...tc,
          actual: existing?.input === tc.input && existing?.expected === tc.expected ? existing.actual : "",
          status: existing?.input === tc.input && existing?.expected === tc.expected ? existing.status : "idle",
        };
      });
    });
  }, []);

  const handleCommentAdded = useCallback((comment) => {
    setComments((prev) => (prev.some((c) => c._id === comment._id) ? prev : [...prev, comment]));
  }, []);

  const handleCommentUpdated = useCallback((comment) => {
    setComments((prev) => prev.map((c) => (c._id === comment._id ? comment : c)));
  }, []);

  const handleCommentDeleted = useCallback((commentId) => {
    setComments((prev) => prev.filter((c) => c._id !== commentId));
  }, []);

  const handleParticipantFileChanged = useCallback(
    ({ username, fileName }) => {
      if (followingUsername && username === followingUsername && fileName) {
        setActiveFileName(fileName);
        setWorkspaceView("code");
      }
    },
    [followingUsername]
  );

  const handleRoomEnded = useCallback((msg) => {
    setLoadState("ended");
    setErrorMessage(msg || "The host has ended this collaborative session.");
    try {
      sessionStorage.removeItem(`collab_guest_${roomId}`);
    } catch {
      // ignore
    }
  }, [roomId]);

  const handleErrorEvent = useCallback((err) => {
    if (err?.error?.includes("banned") || err?.error?.includes("kicked")) {
      setLoadState("error");
      setErrorMessage(err.error);
    }
  }, []);

  const socket = useRoomSocket({
    roomId,
    token,
    guestToken,
    resolvedUsername,
    onParticipantsUpdate: handleParticipantsUpdate,
    onChatMessage: handleChatMessage,
    onExecutionStarted: handleExecutionStarted,
    onExecutionCompleted: handleExecutionCompleted,
    onPermissionChange: handlePermissionChange,
    onFileCreated: handleFileCreated,
    onFileDeleted: handleFileDeleted,
    onFileRenamed: handleFileRenamed,
    onFileLanguageChanged: handleFileLanguageChanged,
    onRoomLocked: handleRoomLocked,
    onRoomSettingsUpdated: handleRoomSettingsUpdated,
    onTestCasesUpdated: handleTestCasesUpdated,
    onCommentAdded: handleCommentAdded,
    onCommentUpdated: handleCommentUpdated,
    onCommentDeleted: handleCommentDeleted,
    onParticipantFileChanged: handleParticipantFileChanged,
    onRoomEnded: handleRoomEnded,
    onErrorEvent: handleErrorEvent,
  });

  // Broadcast active file for Follow Mode
  useEffect(() => {
    if (socket?.connected && activeFileName && roomId) {
      socket.emit("active-file-sync", { roomId, fileName: activeFileName });
    }
  }, [socket, roomId, activeFileName]);

  const handleToggleFollow = useCallback(
    (targetUsername) => {
      setFollowingUsername((curr) => {
        if (curr === targetUsername) {
          toast("Stopped following", { icon: "👁️" });
          return null;
        }
        const target = participants.find((p) => p.username === targetUsername);
        if (target?.activeFile) {
          setActiveFileName(target.activeFile);
          setWorkspaceView("code");
        }
        toast(`Following ${targetUsername}`, { icon: "👁️" });
        return targetUsername;
      });
    },
    [participants]
  );

  const handleToggleStar = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await api.post(`/rooms/${roomId}/star`);
      setIsStarred(Boolean(data.starred));
      toast.success(data.starred ? "Room starred" : "Removed star");
    } catch {
      toast.error("Could not update star");
    }
  }, [roomId, user]);

  const handleSaveHostSettings = useCallback(
    async (payload) => {
      setSavingSettings(true);
      try {
        const { data } = await api.patch(`/rooms/${roomId}`, payload);
        setRoom(data.room);
        setShowHostSettings(false);
        toast.success("Room controls updated");
      } catch (err) {
        toast.error(err.response?.data?.error || "Could not update room settings");
      } finally {
        setSavingSettings(false);
      }
    },
    [roomId]
  );

  const handleRotateInvite = useCallback(async () => {
    try {
      const { data } = await api.post(`/rooms/${roomId}/invite/rotate`);
      setRoom((prev) => (prev ? { ...prev, inviteCode: data.inviteCode } : prev));
      toast.success("Invite link rotated");
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not rotate invite");
    }
  }, [roomId]);

  const handleInviteUser = useCallback(
    async (identifier, role) => {
      try {
        const { data } = await api.post(`/rooms/${roomId}/members/invite`, { identifier, role });
        setRoom(data.room);
        toast.success(`Invited ${data.invitedUser} as ${role}`);
        return true;
      } catch (err) {
        toast.error(err.response?.data?.error || "Could not invite user");
        return false;
      }
    },
    [roomId]
  );

  const handleChangeMemberRole = useCallback(
    async (targetUsername, role) => {
      try {
        const { data } = await api.patch(`/rooms/${roomId}/members/permission`, {
          targetUsername,
          role,
        });
        setRoom(data.room);
        toast.success(`Updated ${targetUsername} to ${role}`);
      } catch (err) {
        toast.error(err.response?.data?.error || "Could not update member role");
      }
    },
    [roomId]
  );

  const handleKickMember = useCallback(
    async (username) => {
      try {
        const { data } = await api.delete(`/rooms/${roomId}/members/${encodeURIComponent(username)}`);
        setRoom(data.room);
        toast.success(`Removed ${username} from room`);
      } catch (err) {
        toast.error(err.response?.data?.error || "Could not remove member");
      }
    },
    [roomId]
  );

  const handleTestCasesChange = useCallback(
    (updater) => {
      setTestCases((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        if (canManageFiles) {
          if (testCaseSyncTimerRef.current) clearTimeout(testCaseSyncTimerRef.current);
          testCaseSyncTimerRef.current = setTimeout(() => {
            const payload = next.map((c, idx) => ({
              id: c.id || idx + 1,
              input: c.input || "",
              expected: c.expected || "",
            }));
            api.put(`/rooms/${roomId}/test-cases`, { testCases: payload }).catch(() => {});
          }, 500);
        }
        return next;
      });
    },
    [roomId, canManageFiles]
  );

  const handleAddComment = useCallback(
    async ({ fileName, line, text }) => {
      try {
        const { data } = await api.post(`/rooms/${roomId}/comments`, { fileName, line, text });
        setComments((prev) =>
          prev.some((c) => c._id === data.comment._id) ? prev : [...prev, data.comment]
        );
      } catch (err) {
        toast.error(err.response?.data?.error || "Could not add comment");
      }
    },
    [roomId]
  );

  const handleToggleResolveComment = useCallback(
    async (commentId) => {
      try {
        const { data } = await api.patch(`/rooms/${roomId}/comments/${commentId}/resolve`);
        setComments((prev) => prev.map((c) => (c._id === commentId ? data.comment : c)));
      } catch {
        toast.error("Could not update comment");
      }
    },
    [roomId]
  );

  const handleDeleteComment = useCallback(
    async (commentId) => {
      try {
        await api.delete(`/rooms/${roomId}/comments/${commentId}`);
        setComments((prev) => prev.filter((c) => c._id !== commentId));
      } catch {
        toast.error("Could not delete comment");
      }
    },
    [roomId]
  );

  const handleJumpToLine = useCallback((line) => {
    setWorkspaceView("code");
    if (editorRef.current) {
      editorRef.current.revealLineInCenter(line);
      editorRef.current.setPosition({ lineNumber: line, column: 1 });
      editorRef.current.focus();
    }
  }, []);

  const handleEndRoom = useCallback(async () => {
    setEndingRoom(true);
    try {
      await api.post(`/rooms/${roomId}/end`);
      socket?.emit("leave-room");
      disconnectSocket();
      toast.success("Session completed and saved to recents");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not end room");
    } finally {
      setEndingRoom(false);
      setShowEndModal(false);
    }
  }, [roomId, socket, navigate]);

  const handleReopenRoom = useCallback(async () => {
    try {
      const { data } = await api.patch(`/rooms/${roomId}`, { status: "ACTIVE" });
      setRoom((prev) => (prev ? { ...prev, status: data.room?.status || "ACTIVE", endedAt: null } : prev));
      toast.success("Session reopened");
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not reopen session");
    }
  }, [roomId]);

  const handleLeaveRoom = useCallback(async () => {
    setLeavingRoom(true);
    try {
      await api.post(`/rooms/${roomId}/leave`, { username: resolvedUsername });
    } catch {
      // non-fatal
    } finally {
      try {
        sessionStorage.removeItem(`collab_guest_${roomId}`);
      } catch {
        // ignore
      }
      socket?.emit("leave-room");
      disconnectSocket();
      toast("You left the room", { icon: "👋" });
      setLeavingRoom(false);
      setShowLeaveModal(false);
      navigate(user ? "/dashboard" : "/");
    }
  }, [roomId, resolvedUsername, socket, user, navigate]);

  const handleFormatDocument = useCallback(() => {
    if (!editorRef.current) return;
    try {
      const action = editorRef.current.getAction("editor.action.formatDocument");
      if (action) {
        action.run();
        toast.success("Document formatted", { id: "format-doc" });
      } else {
        toast("Formatting not available for this language", { icon: "ℹ️" });
      }
    } catch {
      toast.error("Could not format document");
    }
  }, []);

  const handleSelectFile = useCallback((fileName) => {
    setActiveFileName(fileName);
    setWorkspaceView("code");
  }, []);

  const handleCreateFile = useCallback(
    async ({ name, language }) => {
      setCreatingFile(true);
      try {
        const { data } = await api.post(`/rooms/${roomId}/files`, {
          name,
          language,
          content: "",
        });
        const createdFile =
          data.file ||
          data.files?.find((f) => f.name === name) || { name, language, content: "" };
        setRoom((prev) => {
          if (!prev) return prev;
          if (prev.files?.some((f) => f.name === name)) return prev;
          return { ...prev, files: [...(prev.files || []), createdFile] };
        });
        setActiveFileName(name);
        setShowNewFileModal(false);
        toast.success(`Created ${name}`);
      } catch (err) {
        toast.error(err.response?.data?.error || "Could not create file");
      } finally {
        setCreatingFile(false);
      }
    },
    [roomId]
  );

  const handleUploadFiles = useCallback(
    async (uploadedList) => {
      let createdCount = 0;
      for (const item of uploadedList) {
        try {
          const { data } = await api.post(`/rooms/${roomId}/files`, {
            name: item.name,
            content: item.content,
            language: activeLanguage,
          });
          const created = data.file || { name: item.name, content: item.content, language: activeLanguage };
          setRoom((prev) => {
            if (!prev || prev.files?.some((f) => f.name === item.name)) return prev;
            return { ...prev, files: [...(prev.files || []), created] };
          });
          createdCount += 1;
        } catch {
          // skip duplicates/invalid names
        }
      }
      if (createdCount > 0) {
        toast.success(`Uploaded ${createdCount} file(s)`);
      }
    },
    [roomId, activeLanguage]
  );

  const handleRenameFile = useCallback(
    async ({ oldName, newName }) => {
      setRenamingFile(true);
      try {
        await api.patch(`/rooms/${roomId}/files/${encodeURIComponent(oldName)}`, {
          newName,
        });
        setRoom((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            files: (prev.files || []).map((f) =>
              f.name === oldName ? { ...f, name: newName } : f
            ),
          };
        });
        setActiveFileName((curr) => (curr === oldName ? newName : curr));
        setRenameTargetFile(null);
        toast.success(`Renamed to ${newName}`);
      } catch (err) {
        toast.error(err.response?.data?.error || "Could not rename file");
      } finally {
        setRenamingFile(false);
      }
    },
    [roomId]
  );

  const handleDeleteFile = useCallback(async () => {
    if (!deleteTargetFile) return;
    setDeletingFile(true);
    try {
      await api.delete(`/rooms/${roomId}/files/${encodeURIComponent(deleteTargetFile)}`);
      setRoom((prev) => {
        if (!prev) return prev;
        const remaining = (prev.files || []).filter((f) => f.name !== deleteTargetFile);
        setActiveFileName((curr) => (curr === deleteTargetFile ? remaining[0]?.name || "" : curr));
        return { ...prev, files: remaining };
      });
      setDeleteTargetFile(null);
      toast.success(`Deleted ${deleteTargetFile}`);
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not delete file");
    } finally {
      setDeletingFile(false);
    }
  }, [roomId, deleteTargetFile]);

  const buildExecutionBundle = useCallback(
    (currentCode) =>
      (room?.files || []).map((f) => ({
        name: f.name,
        content: f.name === activeFileName ? currentCode : f.content || "",
      })),
    [room?.files, activeFileName]
  );

  const handleRun = useCallback(async () => {
    const currentCode = editorRef.current?.getValue() || "";
    if (!currentCode.trim()) {
      toast.error("Add some code before running");
      return;
    }

    setRunning(true);
    setResult(null);
    socket?.emit("execution-started", { roomId });

    try {
      const { data } = await api.post(`/rooms/${roomId}/execute`, {
        language: activeLanguage,
        sourceCode: currentCode,
        stdin: stdin || "",
        activeFileName,
        files: buildExecutionBundle(currentCode),
      });
      setResult(data.result);
      if (window.innerWidth < 768) {
        setMobileTab("output");
      }
    } catch (err) {
      const message = err.response?.data?.error || "Execution failed";
      setResult({ status: "Error", stdout: "", stderr: message });
      toast.error(message);
    } finally {
      setRunning(false);
    }
  }, [roomId, activeLanguage, stdin, socket, activeFileName, buildExecutionBundle]);

  const handleRunTestCases = useCallback(async () => {
    const currentCode = editorRef.current?.getValue() || "";
    if (!currentCode.trim()) {
      toast.error("Add some code before running test cases");
      return;
    }

    setRunningTestCases(true);
    toast("Running test cases...", { icon: "⏳" });

    try {
      const { data } = await api.post(`/rooms/${roomId}/execute-batch`, {
        language: activeLanguage,
        sourceCode: currentCode,
        activeFileName,
        files: buildExecutionBundle(currentCode),
        cases: testCases.map((tc, idx) => ({
          id: tc.id || idx + 1,
          input: tc.input || "",
          expected: tc.expected || "",
        })),
      });
      const updated = data.results || [];
      setTestCases(updated);
      const passedNum = updated.filter((c) => c.status === "passed").length;
      if (updated.length > 0 && passedNum === updated.length) {
        toast.success("All test cases passed!");
      } else {
        toast(`${passedNum}/${updated.length} test cases passed`, { icon: "⚠️" });
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Batch test execution failed");
    } finally {
      setRunningTestCases(false);
    }
  }, [roomId, activeLanguage, testCases, activeFileName, buildExecutionBundle]);

  const handleDownloadZip = useCallback(() => {
    if (!room?.files || room.files.length === 0) return;
    const currentCode = editorRef.current?.getValue();
    const updatedFiles = room.files.map((f) =>
      f.name === activeFileName && currentCode !== undefined
        ? { ...f, content: currentCode }
        : f
    );
    downloadFilesAsZip(updatedFiles, room.name || "project");
    toast.success("Downloaded project ZIP", { icon: "📦" });
  }, [room, activeFileName]);

  const handleLanguageChange = useCallback(
    async (newLang) => {
      if (!activeFile || !canManageFiles) return;

      setRoom((prev) => ({
        ...prev,
        files: prev.files.map((f) =>
          f.name === activeFile.name ? { ...f, language: newLang } : f
        ),
      }));

      try {
        await api.put(`/rooms/${roomId}/files/${encodeURIComponent(activeFile.name)}`, {
          language: newLang,
        });
      } catch (err) {
        toast.error(err.response?.data?.error || "Could not change language");
      }
    },
    [activeFile, roomId, canManageFiles]
  );

  if (loadState === "loading") {
    return <PageLoading message="Joining collaborative room..." />;
  }

  if (loadState === "notFound") {
    return (
      <div className="min-h-dvh bg-bg text-gray-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-surface border border-border rounded-2xl p-8 text-center space-y-4 shadow-paper-lg">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto border border-amber-500/25 shadow-paper-sm">
            <FileCode size={28} />
          </div>
          <h1 className="text-xl font-bold font-serif text-gray-100">Room Not Found</h1>
          <p className="text-sm text-gray-400 leading-relaxed font-sans">
            The room with ID <code className="text-accent bg-surface2 px-1.5 py-0.5 rounded font-mono">{roomId}</code> does not exist or may have been archived by its host.
          </p>
          <div className="pt-2">
            <button
              onClick={() => navigate("/dashboard")}
              className="inline-flex items-center gap-2 bg-accent hover:opacity-90 px-5 py-2.5 rounded-xl text-xs font-semibold text-white transition-all shadow-paper focus:outline-none focus:ring-2 focus:ring-accent active:scale-95"
            >
              <ArrowLeft size={16} />
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loadState === "forbidden") {
    return (
      <div className="min-h-dvh bg-bg text-gray-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-surface border border-border rounded-2xl p-8 text-center space-y-4 shadow-paper-lg">
          <div className="w-14 h-14 rounded-2xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto border border-blue-500/25 shadow-paper-sm">
            <Lock size={28} />
          </div>
          <h1 className="text-xl font-bold font-serif text-gray-100">Private Room</h1>
          <p className="text-sm text-gray-400 leading-relaxed font-sans">
            This room is private. Ask the host for an invite link or sign in with an authorized account.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
            {!user ? (
              <Link
                to="/login"
                state={{ from: location }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-accent hover:opacity-90 px-5 py-2.5 rounded-xl text-xs font-semibold text-white transition-all shadow-paper focus:outline-none focus:ring-2 focus:ring-accent active:scale-95"
              >
                Log In to Join
              </Link>
            ) : null}
            <button
              onClick={() => navigate("/dashboard")}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-border bg-surface2 hover:bg-border/60 px-5 py-2.5 rounded-xl text-xs font-medium text-gray-200 hover:text-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-accent"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loadState === "locked") {
    return (
      <div className="min-h-dvh bg-bg text-gray-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-surface border border-border rounded-2xl p-8 text-center space-y-4 shadow-paper-lg">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto border border-rose-500/25 shadow-paper-sm">
            <Lock size={28} />
          </div>
          <h1 className="text-xl font-bold font-serif text-gray-100">Room is Locked</h1>
          <p className="text-sm text-gray-400 leading-relaxed font-sans">
            This room has been temporarily locked by its host. New members or guests cannot enter until the room is unlocked.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={initRoom}
              className="inline-flex items-center gap-2 bg-surface2 hover:bg-border border border-border px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors shadow-paper-sm"
            >
              <RefreshCw size={15} />
              Check Again
            </button>
            <button
              onClick={() => navigate("/dashboard")}
              className="inline-flex items-center gap-2 bg-accent hover:opacity-90 px-4 py-2.5 rounded-xl text-xs font-semibold text-white transition-all shadow-paper-sm active:scale-95"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loadState === "error") {
    return (
      <div className="min-h-dvh bg-bg text-gray-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-surface border border-border rounded-2xl p-8 text-center space-y-4 shadow-paper-lg">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto border border-rose-500/25 shadow-paper-sm">
            <ShieldAlert size={28} />
          </div>
          <h1 className="text-xl font-bold font-serif text-gray-100">Access Denied</h1>
          <p className="text-sm text-gray-400 leading-relaxed font-sans">
            {errorMessage || "You do not have permission to enter this room or were disconnected."}
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={initRoom}
              className="inline-flex items-center gap-2 bg-surface2 hover:bg-border border border-border px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors shadow-paper-sm"
            >
              <RefreshCw size={15} />
              Retry
            </button>
            <button
              onClick={() => navigate("/dashboard")}
              className="inline-flex items-center gap-2 bg-accent hover:opacity-90 px-4 py-2.5 rounded-xl text-xs font-semibold text-white transition-all shadow-paper-sm active:scale-95"
            >
              Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loadState === "ended") {
    return (
      <div className="min-h-dvh bg-bg text-gray-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-surface border border-border rounded-2xl p-8 text-center space-y-4 shadow-paper-lg">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto border border-rose-500/25 shadow-paper-sm">
            <XCircle size={28} />
          </div>
          <h1 className="text-xl font-bold font-serif text-gray-100">Session Ended</h1>
          <p className="text-sm text-gray-400 leading-relaxed font-sans">
            {errorMessage || "The host has ended this collaborative room session."}
          </p>
          <div className="pt-2">
            <button
              onClick={() => navigate(user ? "/dashboard" : "/")}
              className="inline-flex items-center gap-2 bg-accent hover:opacity-90 px-5 py-2.5 rounded-xl text-xs font-semibold text-white transition-all shadow-paper focus:outline-none focus:ring-2 focus:ring-accent active:scale-95"
            >
              <ArrowLeft size={16} />
              {user ? "Back to Dashboard" : "Back to Home"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-dvh flex flex-col bg-bg text-gray-100 overflow-hidden">
      <header className="px-3 sm:px-4 py-2 border-b border-border bg-surface/90 backdrop-blur-md shrink-0 shadow-paper-sm z-30">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <Link
              to={user ? "/dashboard" : "/"}
              aria-label={user ? "Return to Dashboard" : "Return to Home"}
              className="p-1.5 text-gray-400 hover:text-gray-100 rounded-lg hover:bg-surface2 transition-colors focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <ArrowLeft size={18} />
            </Link>
            <div className="min-w-0">
              <h1 className="font-bold text-sm sm:text-base font-serif text-gray-100 truncate">
                {room.name}
              </h1>
            </div>
            {user && (
              <button
                type="button"
                onClick={handleToggleStar}
                aria-label={isStarred ? "Unstar room" : "Star room"}
                className="p-1 rounded-lg hover:bg-surface2 transition-colors"
              >
                <Star
                  size={15}
                  className={isStarred ? "text-amber-500 fill-amber-500" : "text-gray-400"}
                />
              </button>
            )}
            {room.settings?.locked && (
              <span className="flex items-center gap-1 text-[11px] bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-full shrink-0 font-medium font-mono">
                <Lock size={11} /> Locked
              </span>
            )}
            {isCompleted && (
              <span className="flex items-center gap-1 text-[11px] bg-accent2/15 text-accent2 border border-accent2/30 px-2 py-0.5 rounded-full shrink-0 font-medium font-mono">
                <CheckCircle2 size={11} /> Completed
              </span>
            )}
            {yjsStatus === "reconnecting" && (
              <span
                title="Live editor sync reconnecting"
                className="flex items-center gap-1 text-[11px] bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full shrink-0 font-mono"
              >
                <WifiOff size={11} /> Reconnecting
              </span>
            )}
          </div>

          <div className="hidden sm:flex items-center gap-1.5 lg:gap-2">
            <button
              type="button"
              onClick={() => setShowCommandPalette(true)}
              title="Command Palette (Cmd/Ctrl + K)"
              aria-label="Open Command Palette"
              className="hidden lg:inline-flex items-center gap-1 text-[11px] font-mono text-gray-400 hover:text-gray-100 bg-surface2 border border-border rounded-lg px-2 py-1.5 transition-colors shadow-paper-sm"
            >
              <Command size={12} />
              <span>K</span>
            </button>
            <div className="flex items-center border border-border rounded-lg bg-surface2 p-0.5 shadow-paper-sm">
              <button
                type="button"
                onClick={() => setWorkspaceView("code")}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-mono transition-colors ${
                  workspaceView === "code" ? "bg-accent text-white font-semibold" : "text-gray-400 hover:text-gray-100"
                }`}
              >
                <Code2 size={12} /> Code
              </button>
              <button
                type="button"
                onClick={() => setWorkspaceView("whiteboard")}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-mono transition-colors ${
                  workspaceView === "whiteboard" ? "bg-accent text-white font-semibold" : "text-gray-400 hover:text-gray-100"
                }`}
              >
                <PenTool size={12} /> Board
              </button>
            </div>

            <div className="flex items-center gap-1.5 bg-surface2 border border-border rounded-lg px-2 py-1 text-xs shadow-paper-sm">
              <FileCode size={13} className="text-accent" />
              <select
                id="language-select"
                aria-label="Programming Language"
                value={activeLanguage}
                disabled={!canManageFiles}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="bg-transparent text-gray-300 hover:text-gray-100 text-xs focus:outline-none cursor-pointer font-sans disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.key} value={l.key} className="bg-surface text-gray-100">
                    {l.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleRun}
              disabled={running || !canManageFiles}
              aria-label="Run Code"
              className="flex items-center gap-1.5 bg-accent hover:opacity-90 text-white rounded-lg px-3 py-1.5 text-xs font-semibold shadow-paper-sm disabled:opacity-50 transition-all focus:outline-none focus:ring-2 focus:ring-accent active:scale-95"
            >
              <Play size={13} fill="currentColor" />
              <span>{running ? "Running..." : "Run"}</span>
            </button>

            <InterviewTimer
              socket={socket}
              roomId={roomId}
              isHost={isHost}
              initialState={room?.timerState}
            />
            <VoiceRoom socket={socket} roomId={roomId} />

            {isRoomOwner && (
              <button
                type="button"
                onClick={() => setShowScorecard(true)}
                aria-label="Host Interview Scorecard"
                title="Private Host Scorecard"
                className="flex items-center gap-1 text-xs text-gray-300 hover:text-gray-100 bg-surface2 border border-border rounded-lg px-2 py-1.5 transition-colors shadow-paper-sm"
              >
                <ClipboardCheck size={13} className="text-emerald-500" />
                <span className="hidden xl:inline">Scorecard</span>
              </button>
            )}
            {isHost && (
              <button
                type="button"
                onClick={() => setShowHostSettings(true)}
                aria-label="Room Host Controls"
                title="Room Host Controls"
                className="flex items-center gap-1 text-xs text-gray-300 hover:text-gray-100 bg-surface2 border border-border rounded-lg px-2 py-1.5 transition-colors shadow-paper-sm"
              >
                <Settings size={13} />
                <span className="hidden xl:inline">Controls</span>
              </button>
            )}

            <button
              onClick={() => setShowShare(true)}
              aria-label="Share Room"
              className="flex items-center gap-1 text-xs text-gray-300 hover:text-gray-100 bg-surface2 border border-border rounded-lg px-2 py-1.5 transition-colors shadow-paper-sm"
            >
              <Share2 size={13} />
              <span className="hidden lg:inline">Share</span>
            </button>

            <button
              onClick={handleDownloadZip}
              title="Download project as ZIP"
              aria-label="Download project as ZIP"
              className="flex items-center gap-1 text-xs text-gray-300 hover:text-gray-100 bg-surface2 border border-border rounded-lg px-2 py-1.5 transition-colors shadow-paper-sm"
            >
              <Download size={13} />
            </button>

            <ThemeToggle compact />

            {isHost ? (
              isCompleted ? (
                <button
                  type="button"
                  onClick={handleReopenRoom}
                  aria-label="Reopen Session"
                  className="flex items-center gap-1 text-xs text-accent2 hover:opacity-90 bg-accent2/15 border border-accent2/30 rounded-lg px-2.5 py-1.5 font-semibold transition-all shadow-paper-sm"
                >
                  <RotateCcw size={13} />
                  <span className="hidden lg:inline">Reopen</span>
                </button>
              ) : (
                <button
                  onClick={() => setShowEndModal(true)}
                  aria-label="End Room Session"
                  className="flex items-center gap-1 text-xs text-rose-700 dark:text-rose-400 hover:opacity-90 bg-rose-500/15 border border-rose-500/30 rounded-lg px-2.5 py-1.5 font-semibold transition-all shadow-paper-sm"
                >
                  <XCircle size={13} />
                  <span className="hidden lg:inline">End</span>
                </button>
              )
            ) : (
              <button
                onClick={() => setShowLeaveModal(true)}
                aria-label="Leave Room"
                className="flex items-center gap-1 text-xs text-gray-300 hover:text-rose-600 dark:hover:text-rose-400 bg-surface2 border border-border rounded-lg px-2.5 py-1.5 font-medium transition-colors shadow-paper-sm"
              >
                <LogOut size={13} />
                <span className="hidden lg:inline">Leave</span>
              </button>
            )}

            <div className="flex items-center border border-border rounded-lg overflow-hidden bg-surface2 shadow-paper-sm p-0.5">
              <button
                onClick={() => setRightTab("participants")}
                aria-label={`View Participants (${participants.length})`}
                className={`flex items-center gap-1 px-2 py-1 text-xs rounded-md font-medium transition-all ${
                  rightTab === "participants"
                    ? "bg-accent text-white shadow-paper-sm font-semibold"
                    : "text-gray-400 hover:text-gray-100"
                }`}
              >
                <Users size={13} />
                <span>{participants.length}</span>
              </button>
              <button
                onClick={() => setRightTab("chat")}
                aria-label={`View Chat (${messages.length} messages)`}
                className={`flex items-center gap-1 px-2 py-1 text-xs rounded-md font-medium transition-all ${
                  rightTab === "chat"
                    ? "bg-accent text-white shadow-paper-sm font-semibold"
                    : "text-gray-400 hover:text-gray-100"
                }`}
              >
                <MessageSquare size={13} />
              </button>
              <button
                onClick={() => setRightTab("comments")}
                aria-label={`View Line Comments (${comments.length})`}
                title="Line Comments"
                className={`flex items-center gap-1 px-2 py-1 text-xs rounded-md font-medium transition-all ${
                  rightTab === "comments"
                    ? "bg-accent text-white shadow-paper-sm font-semibold"
                    : "text-gray-400 hover:text-gray-100"
                }`}
              >
                <Code2 size={13} />
              </button>
            </div>
          </div>

          <div className="flex sm:hidden items-center gap-1.5">
            <button
              onClick={handleRun}
              disabled={running || !canManageFiles}
              aria-label="Run Code"
              className="flex items-center gap-1 bg-accent text-white rounded-lg px-2.5 py-1 text-xs font-semibold shadow-paper-sm disabled:opacity-50"
            >
              <Play size={12} fill="currentColor" />
              <span>Run</span>
            </button>
            {isHost && (
              <button
                type="button"
                onClick={() => setShowHostSettings(true)}
                aria-label="Room Host Controls"
                className="p-1.5 text-gray-400 hover:text-gray-100 rounded-lg hover:bg-surface2"
              >
                <Settings size={16} />
              </button>
            )}
            <button
              onClick={() => setShowShare(true)}
              aria-label="Share Room"
              className="p-1.5 text-gray-400 hover:text-gray-100 rounded-lg hover:bg-surface2"
            >
              <Share2 size={16} />
            </button>
            {isHost ? (
              isCompleted ? (
                <button
                  type="button"
                  onClick={handleReopenRoom}
                  aria-label="Reopen Session"
                  className="p-1.5 text-accent2 hover:opacity-90 rounded-lg hover:bg-accent2/10"
                >
                  <RotateCcw size={16} />
                </button>
              ) : (
                <button
                  onClick={() => setShowEndModal(true)}
                  aria-label="End Room Session"
                  className="p-1.5 text-rose-700 dark:text-rose-400 hover:opacity-90 rounded-lg hover:bg-rose-500/10"
                >
                  <XCircle size={16} />
                </button>
              )
            ) : (
              <button
                onClick={() => setShowLeaveModal(true)}
                aria-label="Leave Room"
                className="p-1.5 text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-surface2"
              >
                <LogOut size={16} />
              </button>
            )}
            <button
              onClick={() => setMobileTopBarExpanded((prev) => !prev)}
              aria-label="Toggle Room Options"
              className="p-1.5 text-gray-400 hover:text-gray-100 rounded-lg hover:bg-surface2"
            >
              <ChevronDown
                size={16}
                className={`transition-transform ${mobileTopBarExpanded ? "rotate-180" : ""}`}
              />
            </button>
          </div>
        </div>

        {mobileTopBarExpanded && (
          <div className="sm:hidden pt-2.5 pb-1 border-t border-border mt-2 flex items-center justify-between text-xs animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="flex items-center gap-2">
              <select
                value={activeLanguage}
                disabled={!canManageFiles}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="bg-surface2 border border-border rounded-lg px-2 py-1 text-gray-200 text-xs disabled:opacity-60"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.key} value={l.key}>
                    {l.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setWorkspaceView((v) => (v === "code" ? "whiteboard" : "code"))}
                className="px-2 py-1 bg-surface2 border border-border rounded-lg text-gray-200 font-mono"
              >
                {workspaceView === "code" ? "Board" : "Code"}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle compact />
              <div className="text-gray-400 text-[11px]">
                <span className="text-accent font-medium">{resolvedUsername}</span>
              </div>
            </div>
          </div>
        )}
      </header>

      <div className="flex-1 min-h-0 flex overflow-hidden">
        {fileExplorerOpen && (
          <div className="hidden md:block h-full">
            <FileExplorer
              files={room?.files || []}
              activeFileName={activeFileName}
              onSelectFile={handleSelectFile}
              onNewFile={() => setShowNewFileModal(true)}
              onRenameFile={(name) => setRenameTargetFile(name)}
              onDeleteFile={(name) => setDeleteTargetFile(name)}
              onUploadFiles={handleUploadFiles}
              canManageFiles={canManageFiles}
            />
          </div>
        )}

        <div
          className={`flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden ${
            mobileTab !== "editor" && mobileTab !== "output" ? "hidden md:flex" : "flex"
          }`}
        >
          <FileTabs
            files={room?.files || []}
            activeFileName={activeFileName}
            onSelectFile={handleSelectFile}
            onNewFile={() => setShowNewFileModal(true)}
            onCloseFile={(name) => setDeleteTargetFile(name)}
            canManageFiles={canManageFiles}
            onFormatDocument={handleFormatDocument}
            onOpenHistory={() => setShowRevisions(true)}
            fileExplorerOpen={fileExplorerOpen}
            onToggleFileExplorer={() => setFileExplorerOpen((prev) => !prev)}
          />

          <div
            className={`flex-1 min-h-0 overflow-hidden ${
              mobileTab === "output" ? "hidden md:block" : "block"
            }`}
          >
            {workspaceView === "whiteboard" ? (
              <WhiteboardPanel
                socket={socket}
                roomId={roomId}
                initialStrokes={room?.whiteboardStrokes || []}
                canEdit={canManageFiles}
              />
            ) : (
              activeFileName && (
                <CollabEditor
                  key={`${roomId}:${activeFileName}`}
                  roomId={roomId}
                  fileName={activeFileName}
                  language={monacoLangFor(activeLanguage)}
                  username={resolvedUsername || "Guest"}
                  guestToken={guestToken}
                  canEdit={canManageFiles}
                  onConnectionChange={setYjsStatus}
                  onEditorReady={handleEditorReady}
                  onCursorLineChange={setCurrentLine}
                />
              )
            )}
          </div>

          <div
            className={`border-t border-border bg-paper-console overflow-hidden ${
              mobileTab === "output"
                ? "flex-1 min-h-0"
                : "hidden md:block h-44 lg:h-52 xl:h-56 shrink-0"
            }`}
          >
            <OutputConsole
              running={running}
              result={result}
              stdin={stdin}
              setStdin={setStdin}
              onClearOutput={() => setResult(null)}
              testCases={testCases}
              setTestCases={handleTestCasesChange}
              onRunTestCases={handleRunTestCases}
              runningTestCases={runningTestCases}
              files={room?.files || []}
              activeFileName={activeFileName}
              getActiveCode={() => editorRef.current?.getValue()}
            />
          </div>
        </div>

        <aside className="hidden md:flex md:flex-col w-72 lg:w-80 xl:w-96 border-l border-border bg-surface shrink-0 h-full min-h-0 overflow-hidden">
          {rightTab === "participants" ? (
            <ParticipantsPanel
              participants={participants}
              members={room?.members || []}
              isHost={isHost}
              currentUsername={resolvedUsername}
              followingUsername={followingUsername}
              onToggleFollow={handleToggleFollow}
              onChangeRole={handleChangeMemberRole}
              onKickMember={handleKickMember}
            />
          ) : rightTab === "comments" ? (
            <CommentsPanel
              comments={comments}
              activeFileName={activeFileName}
              currentLine={currentLine}
              canEdit={canManageFiles}
              isHost={isHost}
              currentUsername={resolvedUsername}
              onAddComment={handleAddComment}
              onToggleResolve={handleToggleResolveComment}
              onDeleteComment={handleDeleteComment}
              onJumpToLine={handleJumpToLine}
            />
          ) : (
            <ChatPanel
              socket={socket}
              roomId={roomId}
              messages={messages}
              hasMore={chatHasMore}
              loadingMore={loadingMoreChat}
              onLoadMore={handleLoadOlderMessages}
              chatMuted={Boolean(room?.settings?.chatMuted)}
              isHost={isHost}
            />
          )}
        </aside>

        {mobileTab === "participants" && (
          <div className="md:hidden flex-1 min-h-0 overflow-hidden bg-surface">
            <ParticipantsPanel
              participants={participants}
              members={room?.members || []}
              isHost={isHost}
              currentUsername={resolvedUsername}
              followingUsername={followingUsername}
              onToggleFollow={handleToggleFollow}
              onChangeRole={handleChangeMemberRole}
              onKickMember={handleKickMember}
            />
          </div>
        )}
        {mobileTab === "comments" && (
          <div className="md:hidden flex-1 min-h-0 overflow-hidden bg-surface">
            <CommentsPanel
              comments={comments}
              activeFileName={activeFileName}
              currentLine={currentLine}
              canEdit={canManageFiles}
              isHost={isHost}
              currentUsername={resolvedUsername}
              onAddComment={handleAddComment}
              onToggleResolve={handleToggleResolveComment}
              onDeleteComment={handleDeleteComment}
              onJumpToLine={(line) => {
                setMobileTab("editor");
                handleJumpToLine(line);
              }}
            />
          </div>
        )}
        {mobileTab === "chat" && (
          <div className="md:hidden flex-1 min-h-0 overflow-hidden bg-surface">
            <ChatPanel
              socket={socket}
              roomId={roomId}
              messages={messages}
              hasMore={chatHasMore}
              loadingMore={loadingMoreChat}
              onLoadMore={handleLoadOlderMessages}
              chatMuted={Boolean(room?.settings?.chatMuted)}
              isHost={isHost}
            />
          </div>
        )}
      </div>

      <nav
        aria-label="Mobile View Navigation"
        className="md:hidden flex items-center justify-around border-t border-border bg-surface py-2 px-1 shrink-0 z-20"
      >
        <button
          onClick={() => setMobileTab("editor")}
          className={`flex flex-col items-center gap-1 text-[11px] font-medium transition-colors ${
            mobileTab === "editor" ? "text-accent font-semibold" : "text-gray-400"
          }`}
        >
          <FileCode size={18} />
          <span>Code</span>
        </button>
        <button
          onClick={() => setMobileTab("output")}
          className={`flex flex-col items-center gap-1 text-[11px] font-medium transition-colors ${
            mobileTab === "output" ? "text-accent font-semibold" : "text-gray-400"
          }`}
        >
          <Terminal size={18} />
          <span>Output</span>
        </button>
        <button
          onClick={() => setMobileTab("participants")}
          className={`flex flex-col items-center gap-1 text-[11px] font-medium transition-colors ${
            mobileTab === "participants" ? "text-accent font-semibold" : "text-gray-400"
          }`}
        >
          <div className="relative">
            <Users size={18} />
            <span className="absolute -top-1 -right-2 text-[9px] bg-surface2 border border-border rounded-full px-1">
              {participants.length}
            </span>
          </div>
          <span>Users</span>
        </button>
        <button
          onClick={() => setMobileTab("comments")}
          className={`flex flex-col items-center gap-1 text-[11px] font-medium transition-colors ${
            mobileTab === "comments" ? "text-accent font-semibold" : "text-gray-400"
          }`}
        >
          <Code2 size={18} />
          <span>Review</span>
        </button>
        <button
          onClick={() => setMobileTab("chat")}
          className={`flex flex-col items-center gap-1 text-[11px] font-medium transition-colors ${
            mobileTab === "chat" ? "text-accent font-semibold" : "text-gray-400"
          }`}
        >
          <MessageSquare size={18} />
          <span>Chat</span>
        </button>
      </nav>

      {showShare && (
        <ShareModal
          url={typeof window !== "undefined" ? window.location.href : ""}
          inviteCode={room?.inviteCode}
          visibility={room?.visibility}
          onClose={() => setShowShare(false)}
        />
      )}

      {showHostSettings && (
        <HostSettingsModal
          room={room}
          onSaveSettings={handleSaveHostSettings}
          onRotateInvite={handleRotateInvite}
          onInviteUser={handleInviteUser}
          onClose={() => setShowHostSettings(false)}
          saving={savingSettings}
        />
      )}

      {showRevisions && activeFileName && (
        <RevisionsModal
          roomId={roomId}
          fileName={activeFileName}
          currentContent={editorRef.current?.getValue() || activeFile?.content || ""}
          canEdit={canManageFiles}
          onClose={() => setShowRevisions(false)}
        />
      )}

      {showScorecard && isRoomOwner && (
        <ScorecardModal
          roomId={roomId}
          roomName={room?.name}
          onClose={() => setShowScorecard(false)}
        />
      )}

      {showEndModal && (
        <EndRoomModal
          roomName={room?.name}
          onConfirm={handleEndRoom}
          onClose={() => setShowEndModal(false)}
          loading={endingRoom}
        />
      )}

      {showLeaveModal && (
        <LeaveRoomModal
          onConfirm={handleLeaveRoom}
          onClose={() => setShowLeaveModal(false)}
          loading={leavingRoom}
        />
      )}

      {showNewFileModal && (
        <NewFileModal
          existingFiles={room?.files || []}
          onCreate={handleCreateFile}
          onClose={() => setShowNewFileModal(false)}
          loading={creatingFile}
        />
      )}

      {renameTargetFile && (
        <RenameFileModal
          currentName={renameTargetFile}
          existingFiles={room?.files || []}
          onRename={handleRenameFile}
          onClose={() => setRenameTargetFile(null)}
          loading={renamingFile}
        />
      )}

      {deleteTargetFile && (
        <DeleteFileModal
          fileName={deleteTargetFile}
          onDelete={handleDeleteFile}
          onClose={() => setDeleteTargetFile(null)}
          loading={deletingFile}
        />
      )}

      <CommandPalette
        open={showCommandPalette}
        files={room?.files || []}
        activeFileName={activeFileName}
        workspaceView={workspaceView}
        canManageFiles={canManageFiles}
        isHost={isHost}
        onClose={() => setShowCommandPalette(false)}
        onSelectFile={handleSelectFile}
        onSetWorkspaceView={setWorkspaceView}
        onRunCode={handleRun}
        onSetRightTab={setRightTab}
        onOpenShare={() => setShowShare(true)}
        onOpenRevisions={() => setShowRevisions(true)}
        onOpenSettings={() => setShowHostSettings(true)}
        onCopyRoomId={async () => {
          const ok = await copyToClipboard(roomId);
          if (ok) toast.success("Room ID copied");
        }}
      />
    </div>
  );
}
