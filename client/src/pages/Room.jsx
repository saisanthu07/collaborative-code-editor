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
  Layers,
  XCircle,
  Download,
} from "lucide-react";
import { downloadFilesAsZip } from "../utils/zip.js";
import { api } from "../services/api.js";
import { disconnectSocket } from "../services/socket.js";
import { useAuthStore } from "../store/authStore.js";
import { useRoomSocket } from "../hooks/useRoomSocket.js";
import CollabEditor from "../components/editor/CollabEditor.jsx";
import OutputConsole from "../components/editor/OutputConsole.jsx";
import ChatPanel from "../components/chat/ChatPanel.jsx";
import ParticipantsPanel from "../components/room/ParticipantsPanel.jsx";
import ShareModal from "../components/room/ShareModal.jsx";
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

export default function Room() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, token } = useAuthStore();

  // Load flow states: "loading" | "ready" | "forbidden" | "notFound" | "locked" | "error"
  const [loadState, setLoadState] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");

  const [room, setRoom] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [messages, setMessages] = useState([]);
  const [activeFileName, setActiveFileName] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [stdin, setStdin] = useState("");

  // Phase 4: Interview Test Cases
  const [testCases, setTestCases] = useState([
    { id: 1, input: "5\n1 2 3 4 5", expected: "15", actual: "", status: "idle" },
    { id: 2, input: "3\n10 20 30", expected: "60", actual: "", status: "idle" },
  ]);
  const [runningTestCases, setRunningTestCases] = useState(false);

  // Multi-file tabs & File Explorer state
  const [fileExplorerOpen, setFileExplorerOpen] = useState(false);
  const [showNewFileModal, setShowNewFileModal] = useState(false);
  const [renameTargetFile, setRenameTargetFile] = useState(null);
  const [deleteTargetFile, setDeleteTargetFile] = useState(null);
  const [creatingFile, setCreatingFile] = useState(false);
  const [renamingFile, setRenamingFile] = useState(false);
  const [deletingFile, setDeletingFile] = useState(false);

  // Desktop side panel: "participants" | "chat"
  const [rightTab, setRightTab] = useState("participants");
  // Mobile active view: "editor" | "output" | "participants" | "chat"
  const [mobileTab, setMobileTab] = useState("editor");
  const [mobileTopBarExpanded, setMobileTopBarExpanded] = useState(false);

  const [showShare, setShowShare] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [endingRoom, setEndingRoom] = useState(false);
  const [leavingRoom, setLeavingRoom] = useState(false);
  const editorRef = useRef(null);

  const [resolvedUsername, setResolvedUsername] = useState(user?.username || null);
  const [guestToken, setGuestToken] = useState(() => {
    try {
      const raw = sessionStorage.getItem(`collab_guest_${roomId}`);
      return raw ? JSON.parse(raw)?.guestToken : null;
    } catch {
      return null;
    }
  });

  // Load room + join session
  const initRoom = useCallback(async () => {
    setLoadState("loading");
    setErrorMessage("");

    try {
      // 1. Join room (handles authenticated user or creates stable guest)
      const joinRes = await api.post(`/rooms/${roomId}/join`);
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
          // ignore storage quota errors
        }
      }

      // 2. Fetch full room details
      const { data } = await api.get(`/rooms/${roomId}`);
      setRoom(data.room);

      const files = data.room.files || [];
      if (files.length > 0) {
        setActiveFileName(files[0].name);
      }

      // 3. Fetch recent messages
      try {
        const { data: msgData } = await api.get(`/rooms/${roomId}/messages?limit=50`);
        setMessages(msgData.messages || []);
      } catch {
        // chat messages load error shouldn't block editor
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
  }, [roomId, user?.username]);

  useEffect(() => {
    initRoom();
  }, [initRoom]);

  // Clean up global socket when leaving room
  useEffect(() => {
    return () => {
      disconnectSocket();
    };
  }, []);

  // Active file & language derivation
  const activeFile = room?.files?.find((f) => f.name === activeFileName) || room?.files?.[0];
  const activeLanguage = activeFile?.language || room?.language || "javascript";
  const memberRecord = room?.members?.find(
    (m) =>
      (user?._id && m.userId?.toString() === user._id.toString()) ||
      m.username === resolvedUsername
  );
  const isHost = Boolean(
    (user &&
      room &&
      (room.ownerId?.toString() === user._id?.toString() || room.ownerId === user._id)) ||
      memberRecord?.role === "HOST"
  );
  const userRole = isHost
    ? "HOST"
    : memberRecord?.role || (user ? room?.settings?.defaultRole : "GUEST");
  const canManageFiles = Boolean(
    isHost || userRole === "EDITOR" || (userRole === "GUEST" && room?.settings?.allowGuestEdit)
  );

  // Socket event callbacks
  const handleParticipantsUpdate = useCallback((parts) => {
    setParticipants(parts);
  }, []);

  const handleChatMessage = useCallback((msg) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

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
      return { ...prev, files: remaining };
    });
    setActiveFileName((curr) => (curr === fileName ? room?.files?.[0]?.name || "" : curr));
  }, [room?.files]);

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

  // Hook wires up all socket event listeners and handles reconnects
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
    onRoomEnded: handleRoomEnded,
    onErrorEvent: handleErrorEvent,
  });

  const handleEndRoom = useCallback(async () => {
    setEndingRoom(true);
    try {
      await api.delete(`/rooms/${roomId}`);
      socket?.emit("leave-room");
      disconnectSocket();
      toast.success("Room ended");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not end room");
    } finally {
      setEndingRoom(false);
      setShowEndModal(false);
    }
  }, [roomId, socket, navigate]);

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

  // Format Document (Monaco / Prettier format)
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

  // File Operations: Select, Create, Rename, Delete
  const handleSelectFile = useCallback((fileName) => {
    setActiveFileName(fileName);
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
        const createdFile = data.file || { name, language, content: "" };
        setRoom((prev) => {
          if (!prev) return prev;
          if (prev.files?.some((f) => f.name === name)) return prev;
          return { ...prev, files: [...(prev.files || []), createdFile] };
        });
        setActiveFileName(name);
        socket?.emit("file-created", { roomId, file: createdFile });
        setShowNewFileModal(false);
        toast.success(`Created ${name}`);
      } catch (err) {
        toast.error(err.response?.data?.error || "Could not create file");
      } finally {
        setCreatingFile(false);
      }
    },
    [roomId, socket]
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
        socket?.emit("file-renamed", { roomId, oldName, newName });
        setRenameTargetFile(null);
        toast.success(`Renamed to ${newName}`);
      } catch (err) {
        toast.error(err.response?.data?.error || "Could not rename file");
      } finally {
        setRenamingFile(false);
      }
    },
    [roomId, socket]
  );

  const handleDeleteFile = useCallback(async () => {
    if (!deleteTargetFile) return;
    setDeletingFile(true);
    try {
      await api.delete(`/rooms/${roomId}/files/${encodeURIComponent(deleteTargetFile)}`);
      setRoom((prev) => {
        if (!prev) return prev;
        const remaining = (prev.files || []).filter((f) => f.name !== deleteTargetFile);
        return { ...prev, files: remaining };
      });
      setActiveFileName((curr) => {
        if (curr !== deleteTargetFile) return curr;
        const remaining = (room?.files || []).filter((f) => f.name !== deleteTargetFile);
        return remaining[0]?.name || "";
      });
      socket?.emit("file-deleted", { roomId, fileName: deleteTargetFile });
      setDeleteTargetFile(null);
      toast.success(`Deleted ${deleteTargetFile}`);
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not delete file");
    } finally {
      setDeletingFile(false);
    }
  }, [roomId, deleteTargetFile, room?.files, socket]);

  // Execute code
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
  }, [roomId, activeLanguage, stdin, socket]);

  // Phase 4: Run all test cases sequentially
  const handleRunTestCases = useCallback(async () => {
    const currentCode = editorRef.current?.getValue() || "";
    if (!currentCode.trim()) {
      toast.error("Add some code before running test cases");
      return;
    }

    setRunningTestCases(true);
    toast("Running test cases...", { icon: "⏳" });

    try {
      const updated = [...testCases];
      for (let i = 0; i < updated.length; i++) {
        const tc = updated[i];
        try {
          const { data } = await api.post(`/rooms/${roomId}/execute`, {
            language: activeLanguage,
            sourceCode: currentCode,
            stdin: tc.input || "",
          });
          const actualOutput = (data.result?.stdout || "").trim();
          const expectedTrimmed = (tc.expected || "").trim();
          const passed = actualOutput === expectedTrimmed;
          updated[i] = {
            ...tc,
            actual: actualOutput,
            status: passed ? "passed" : "failed",
          };
        } catch (err) {
          updated[i] = {
            ...tc,
            actual: err.response?.data?.error || "Execution error",
            status: "failed",
          };
        }
      }
      setTestCases(updated);
      const allPassed = updated.every((c) => c.status === "passed");
      if (allPassed) {
        toast.success("All test cases passed! 🎉");
      } else {
        const passedNum = updated.filter((c) => c.status === "passed").length;
        toast(`${passedNum}/${updated.length} test cases passed`, { icon: "⚠️" });
      }
    } finally {
      setRunningTestCases(false);
    }
  }, [roomId, activeLanguage, testCases]);

  // Phase 5: Download project as ZIP
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

  // Update file language (Host and Editors only)
  const handleLanguageChange = useCallback(
    async (newLang) => {
      if (!activeFile) return;

      // Optimistically update local room files
      setRoom((prev) => ({
        ...prev,
        files: prev.files.map((f) =>
          f.name === activeFile.name ? { ...f, language: newLang } : f
        ),
      }));

      // Broadcast via socket
      socket?.emit("file-language-change", {
        roomId,
        fileName: activeFile.name,
        language: newLang,
      });

      // Persist to server API
      try {
        await api.put(`/rooms/${roomId}/files/${encodeURIComponent(activeFile.name)}`, {
          language: newLang,
        });
      } catch {
        // Handled or caught by socket
      }
    },
    [activeFile, roomId, socket]
  );

  // --- RENDER LOAD FLOW STATES ---

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
            This room is private. You must be an authorized scribe or log in to access it.
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

  // --- READY STATE: FULL COLLABORATIVE ROOM ---

  return (
    <div className="h-dvh flex flex-col bg-bg text-gray-100 overflow-hidden">
      {/* Top Navbar */}
      <header className="px-3 sm:px-4 py-2 border-b border-border bg-surface/90 backdrop-blur-md shrink-0 shadow-paper-sm z-30">
        <div className="flex items-center justify-between gap-2">
          {/* Left: Dashboard link & Room title */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Link
              to="/dashboard"
              aria-label="Return to Dashboard"
              className="p-1.5 text-gray-400 hover:text-gray-100 rounded-lg hover:bg-surface2 transition-colors focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <ArrowLeft size={18} />
            </Link>
            <div className="min-w-0">
              <h1 className="font-bold text-sm sm:text-base font-serif text-gray-100 truncate">
                {room.name}
              </h1>
            </div>
            {room.settings?.locked && (
              <span className="flex items-center gap-1 text-[11px] bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-full shrink-0 font-medium font-mono">
                <Lock size={11} /> Locked
              </span>
            )}
          </div>

          {/* Desktop & Tablet Controls */}
          <div className="hidden sm:flex items-center gap-2.5">
            {/* File & Language Selector */}
            <div className="flex items-center gap-1.5 bg-surface2 border border-border rounded-lg px-2.5 py-1 text-xs shadow-paper-sm">
              <FileCode size={14} className="text-accent" />
              <span className="font-semibold text-gray-200 font-mono text-[11px]">{activeFileName || "main"}</span>
              <span className="text-gray-400">•</span>
              <label htmlFor="language-select" className="sr-only">
                Programming Language
              </label>
              <select
                id="language-select"
                value={activeLanguage}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="bg-transparent text-gray-300 hover:text-gray-100 text-xs focus:outline-none cursor-pointer font-sans"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.key} value={l.key} className="bg-surface text-gray-100">
                    {l.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Run Button */}
            <button
              onClick={handleRun}
              disabled={running}
              aria-label="Run Code"
              className="flex items-center gap-1.5 bg-accent hover:opacity-90 text-white rounded-lg px-3 py-1.5 text-xs font-semibold shadow-paper-sm disabled:opacity-50 transition-all focus:outline-none focus:ring-2 focus:ring-accent active:scale-95"
            >
              <Play size={13} fill="currentColor" />
              <span>{running ? "Running..." : "Run"}</span>
            </button>

            {/* Phase 4: Interview Timer & Voice Call */}
            <InterviewTimer socket={socket} roomId={roomId} isHost={isHost} />
            <VoiceRoom socket={socket} roomId={roomId} username={resolvedUsername} />

            {/* Share Button */}
            <button
              onClick={() => setShowShare(true)}
              aria-label="Share Room"
              className="flex items-center gap-1 text-xs text-gray-300 hover:text-gray-100 bg-surface2 border border-border rounded-lg px-2.5 py-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-accent shadow-paper-sm"
            >
              <Share2 size={13} />
              <span>Share</span>
            </button>

            {/* Phase 5: Export / Download ZIP Button */}
            <button
              onClick={handleDownloadZip}
              title="Download project as ZIP"
              aria-label="Download project as ZIP"
              className="flex items-center gap-1 text-xs text-gray-300 hover:text-gray-100 bg-surface2 border border-border rounded-lg px-2.5 py-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-accent shadow-paper-sm"
            >
              <Download size={13} />
              <span className="hidden lg:inline">Export ZIP</span>
            </button>

            {/* Paper Theme Switcher */}
            <ThemeToggle compact />

            {/* End Room (Host) or Leave Room (User/Guest) */}
            {isHost ? (
              <button
                onClick={() => setShowEndModal(true)}
                aria-label="End Room Session"
                className="flex items-center gap-1.5 text-xs text-rose-700 dark:text-rose-400 hover:opacity-90 bg-rose-500/15 border border-rose-500/30 rounded-lg px-2.5 py-1.5 font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-rose-500 shadow-paper-sm"
              >
                <XCircle size={13} />
                <span>End Room</span>
              </button>
            ) : (
              <button
                onClick={() => setShowLeaveModal(true)}
                aria-label="Leave Room"
                className="flex items-center gap-1.5 text-xs text-gray-300 hover:text-rose-600 dark:hover:text-rose-400 bg-surface2 hover:bg-surface2/80 border border-border rounded-lg px-2.5 py-1.5 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500 shadow-paper-sm"
              >
                <LogOut size={13} />
                <span>Leave</span>
              </button>
            )}

            {/* Panels Toggle */}
            <div className="flex items-center border border-border rounded-lg overflow-hidden bg-surface2 shadow-paper-sm p-0.5">
              <button
                onClick={() => setRightTab("participants")}
                aria-label={`View Participants (${participants.length})`}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
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
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                  rightTab === "chat"
                    ? "bg-accent text-white shadow-paper-sm font-semibold"
                    : "text-gray-400 hover:text-gray-100"
                }`}
              >
                <MessageSquare size={13} />
                <span>Chat</span>
              </button>
            </div>
          </div>

          {/* Mobile Quick Action Buttons */}
          <div className="flex sm:hidden items-center gap-1.5">
            <button
              onClick={handleRun}
              disabled={running}
              aria-label="Run Code"
              className="flex items-center gap-1 bg-accent text-white rounded-lg px-2.5 py-1 text-xs font-semibold shadow-paper-sm"
            >
              <Play size={12} fill="currentColor" />
              <span>Run</span>
            </button>
            <button
              onClick={() => setShowShare(true)}
              aria-label="Share Room"
              className="p-1.5 text-gray-400 hover:text-gray-100 rounded-lg hover:bg-surface2"
            >
              <Share2 size={16} />
            </button>
            {isHost ? (
              <button
                onClick={() => setShowEndModal(true)}
                aria-label="End Room Session"
                className="p-1.5 text-rose-700 dark:text-rose-400 hover:opacity-90 rounded-lg hover:bg-rose-500/10"
              >
                <XCircle size={16} />
              </button>
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

        {/* Mobile Collapsible Sub-Bar */}
        {mobileTopBarExpanded && (
          <div className="sm:hidden pt-2.5 pb-1 border-t border-border mt-2 flex items-center justify-between text-xs animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="flex items-center gap-2">
              <span className="text-gray-400">Language:</span>
              <select
                value={activeLanguage}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="bg-surface2 border border-border rounded-lg px-2 py-1 text-gray-200 text-xs"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.key} value={l.key}>
                    {l.label}
                  </option>
                ))}
              </select>
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

      {/* Main Content Workspace */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Desktop Collapsible File Explorer */}
        {fileExplorerOpen && (
          <div className="hidden md:block h-full">
            <FileExplorer
              files={room?.files || []}
              activeFileName={activeFileName}
              onSelectFile={handleSelectFile}
              onNewFile={() => setShowNewFileModal(true)}
              onRenameFile={(name) => setRenameTargetFile(name)}
              onDeleteFile={(name) => setDeleteTargetFile(name)}
              canManageFiles={canManageFiles}
            />
          </div>
        )}

        {/* Editor and Output Area */}
        <div
          className={`flex-1 flex flex-col min-w-0 ${
            mobileTab !== "editor" && mobileTab !== "output" ? "hidden md:flex" : "flex"
          }`}
        >
          {/* Horizontal File Tabs Bar */}
          <FileTabs
            files={room?.files || []}
            activeFileName={activeFileName}
            onSelectFile={handleSelectFile}
            onNewFile={() => setShowNewFileModal(true)}
            onCloseFile={(name) => setDeleteTargetFile(name)}
            canManageFiles={canManageFiles}
            onFormatDocument={handleFormatDocument}
            fileExplorerOpen={fileExplorerOpen}
            onToggleFileExplorer={() => setFileExplorerOpen((prev) => !prev)}
          />

          {/* Editor Container */}
          <div
            className={`flex-1 min-h-0 ${
              mobileTab === "output" ? "hidden md:block" : "block"
            }`}
          >
            {activeFileName && (
              <CollabEditor
                key={`${roomId}:${activeFileName}`}
                roomId={roomId}
                fileName={activeFileName}
                language={monacoLangFor(activeLanguage)}
                username={resolvedUsername || "Guest"}
                guestToken={guestToken}
                onEditorReady={handleEditorReady}
              />
            )}
          </div>

          {/* Output Console with STDIN (Desktop lower panel / Mobile Output tab) */}
          <div
            className={`border-t border-border bg-paper-console ${
              mobileTab === "output"
                ? "flex-1 min-h-0"
                : "hidden md:block h-48 shrink-0"
            }`}
          >
            <OutputConsole
              running={running}
              result={result}
              stdin={stdin}
              setStdin={setStdin}
              onClearOutput={() => setResult(null)}
              testCases={testCases}
              setTestCases={setTestCases}
              onRunTestCases={handleRunTestCases}
              runningTestCases={runningTestCases}
            />
          </div>
        </div>

        {/* Right Sidebar (Desktop) */}
        <aside className="hidden md:block w-80 border-l border-border bg-surface shrink-0 h-full">
          {rightTab === "participants" ? (
            <ParticipantsPanel participants={participants} />
          ) : (
            <ChatPanel
              socket={socket}
              roomId={roomId}
              messages={messages}
              setMessages={setMessages}
            />
          )}
        </aside>

        {/* Mobile View Panels for Participants and Chat */}
        {mobileTab === "participants" && (
          <div className="md:hidden flex-1 min-h-0 bg-surface">
            <ParticipantsPanel participants={participants} />
          </div>
        )}
        {mobileTab === "chat" && (
          <div className="md:hidden flex-1 min-h-0 bg-surface">
            <ChatPanel
              socket={socket}
              roomId={roomId}
              messages={messages}
              setMessages={setMessages}
            />
          </div>
        )}
      </div>

      {/* Mobile Bottom Tab Bar */}
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
          onClick={() => setMobileTab("chat")}
          className={`flex flex-col items-center gap-1 text-[11px] font-medium transition-colors ${
            mobileTab === "chat" ? "text-accent font-semibold" : "text-gray-400"
          }`}
        >
          <MessageSquare size={18} />
          <span>Chat</span>
        </button>
      </nav>

      {/* Share Modal Dialog */}
      {showShare && (
        <ShareModal
          url={typeof window !== "undefined" ? window.location.href : ""}
          onClose={() => setShowShare(false)}
        />
      )}

      {/* Host End Room Confirmation Modal */}
      {showEndModal && (
        <EndRoomModal
          onConfirm={handleEndRoom}
          onClose={() => setShowEndModal(false)}
          loading={endingRoom}
        />
      )}

      {/* Participant Leave Room Confirmation Modal */}
      {showLeaveModal && (
        <LeaveRoomModal
          onConfirm={handleLeaveRoom}
          onClose={() => setShowLeaveModal(false)}
          loading={leavingRoom}
        />
      )}

      {/* Create New File Modal */}
      {showNewFileModal && (
        <NewFileModal
          existingFiles={room?.files || []}
          onCreate={handleCreateFile}
          onClose={() => setShowNewFileModal(false)}
          loading={creatingFile}
        />
      )}

      {/* Rename File Modal */}
      {renameTargetFile && (
        <RenameFileModal
          currentName={renameTargetFile}
          existingFiles={room?.files || []}
          onRename={handleRenameFile}
          onClose={() => setRenameTargetFile(null)}
          loading={renamingFile}
        />
      )}

      {/* Delete File Confirmation Modal */}
      {deleteTargetFile && (
        <DeleteFileModal
          fileName={deleteTargetFile}
          onDelete={handleDeleteFile}
          onClose={() => setDeleteTargetFile(null)}
          loading={deletingFile}
        />
      )}
    </div>
  );
}
