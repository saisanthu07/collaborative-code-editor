import { useEffect, useRef, useState, memo } from "react";
import Editor from "@monaco-editor/react";
import "../../config/monaco.js";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { MonacoBinding } from "y-monaco";
import { colorForUser } from "../../utils/color.js";
import { useAuthStore } from "../../store/authStore.js";
import { useThemeStore } from "../../store/themeStore.js";

function CollabEditor({
  roomId,
  fileName,
  language,
  username,
  guestToken,
  canEdit = true,
  onConnectionChange,
  onEditorReady,
  onCursorLineChange,
}) {
  const [status, setStatus] = useState("connecting");
  const theme = useThemeStore((s) => s.theme);
  const monacoTheme = theme === "dark" ? "paper-midnight-kraft" : "paper-parchment";
  const [isMdScreen, setIsMdScreen] = useState(
    typeof window !== "undefined" ? window.innerWidth >= 768 : true
  );

  const editorRef = useRef(null);
  const bindingRef = useRef(null);
  const providerRef = useRef(null);
  const ydocRef = useRef(null);
  const styleElRef = useRef(null);

  const onConnectionChangeRef = useRef(onConnectionChange);
  onConnectionChangeRef.current = onConnectionChange;
  const onEditorReadyRef = useRef(onEditorReady);
  onEditorReadyRef.current = onEditorReady;
  const onCursorLineChangeRef = useRef(onCursorLineChange);
  onCursorLineChangeRef.current = onCursorLineChange;

  useEffect(() => {
    function handleResize() {
      setIsMdScreen(window.innerWidth >= 768);
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({ readOnly: !canEdit });
    }
  }, [canEdit]);

  const updateAwarenessStyles = (awareness) => {
    if (!styleElRef.current) {
      const el = document.createElement("style");
      el.setAttribute("type", "text/css");
      el.setAttribute("id", `yjs-cursors-${roomId}`);
      document.head.appendChild(el);
      styleElRef.current = el;
    }

    const states = awareness.getStates();
    let rules = "";
    states.forEach((state, clientID) => {
      if (state.user && state.user.color) {
        const color = state.user.color;
        const name = (state.user.name || "Anonymous").replace(/["\\]/g, "");
        rules += `
          .yRemoteSelection-${clientID} {
            background-color: ${color}33 !important;
          }
          .yRemoteSelectionHead-${clientID} {
            position: absolute;
            border-left: 2px solid ${color} !important;
            height: 100%;
            box-sizing: border-box;
          }
          .yRemoteSelectionHead-${clientID}::after {
            content: "${name}";
            position: absolute;
            top: -1.4em;
            left: -2px;
            font-size: 11px;
            padding: 1px 6px;
            border-radius: 4px;
            background: ${color} !important;
            color: #ffffff;
            white-space: nowrap;
            pointer-events: none;
            z-index: 10;
          }
        `;
      }
    });
    styleElRef.current.textContent = rules;
  };

  useEffect(() => {
    let cancelled = false;
    let localProvider = null;
    let localYdoc = null;
    let localBinding = null;
    let unsubAuth = null;
    let handleAwarenessChange = null;

    // Defer WebSocket creation by 1 tick so React StrictMode double-mount cleanup
    // cancels cleanly before opening a socket (prevents aborted-handshake warnings).
    const connectTimer = setTimeout(() => {
      if (cancelled) return;

      const ydoc = new Y.Doc();
      localYdoc = ydoc;
      ydocRef.current = ydoc;

      const wsUrl = import.meta.env.VITE_YJS_URL || "ws://localhost:5000/yjs";
      const authUser = useAuthStore.getState().user;
      const authToken = useAuthStore.getState().token;
      const currentToken = authUser && authToken ? authToken : (guestToken || authToken);

      const provider = new WebsocketProvider(wsUrl, `${roomId}:${fileName}`, ydoc, {
        params: currentToken ? { token: currentToken } : {},
      });
      localProvider = provider;
      providerRef.current = provider;

      unsubAuth = useAuthStore.subscribe((state) => {
        if (localProvider) {
          const effective = state.user && state.token ? state.token : (guestToken || state.token);
          localProvider.params = effective ? { token: effective } : {};
        }
      });

      const userColor = colorForUser(username);
      provider.awareness.setLocalStateField("user", {
        name: username,
        color: userColor,
      });

      handleAwarenessChange = () => {
        updateAwarenessStyles(provider.awareness);
      };
      provider.awareness.on("change", handleAwarenessChange);
      handleAwarenessChange();

      provider.on("status", ({ status: s }) => {
        if (cancelled) return;
        const mapped = s === "connected" ? "connected" : "reconnecting";
        setStatus(mapped);
        onConnectionChangeRef.current?.(mapped);
      });

      provider.on("connection-close", (event) => {
        if (cancelled) return;
        // Stop reconnecting on terminal room/auth close codes
        if (event && [4000, 4001, 4004].includes(event.code)) {
          provider.disconnect();
        }
        setStatus("disconnected");
        onConnectionChangeRef.current?.("disconnected");
      });

      provider.on("connection-error", () => {
        if (cancelled) return;
        setStatus("disconnected");
        onConnectionChangeRef.current?.("disconnected");
      });

      if (editorRef.current && !bindingRef.current) {
        const yText = ydoc.getText("monaco");
        localBinding = new MonacoBinding(
          yText,
          editorRef.current.getModel(),
          new Set([editorRef.current]),
          provider.awareness
        );
        bindingRef.current = localBinding;
      }
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(connectTimer);
      unsubAuth?.();
      if (localProvider && handleAwarenessChange) {
        localProvider.awareness.off("change", handleAwarenessChange);
      }
      if (localBinding || bindingRef.current) {
        (localBinding || bindingRef.current).destroy();
        bindingRef.current = null;
      }
      if (localProvider) {
        localProvider.destroy();
        if (providerRef.current === localProvider) providerRef.current = null;
      }
      if (localYdoc) {
        localYdoc.destroy();
        if (ydocRef.current === localYdoc) ydocRef.current = null;
      }

      if (styleElRef.current) {
        styleElRef.current.remove();
        styleElRef.current = null;
      }
    };
  }, [roomId, fileName, guestToken, username]);

  function handleMount(editor) {
    editorRef.current = editor;
    editor.updateOptions({ readOnly: !canEdit });
    onEditorReadyRef.current?.(editor);
    editor.onDidChangeCursorPosition((e) => {
      onCursorLineChangeRef.current?.(e.position.lineNumber);
    });

    if (!bindingRef.current && ydocRef.current && providerRef.current) {
      const yText = ydocRef.current.getText("monaco");
      bindingRef.current = new MonacoBinding(
        yText,
        editor.getModel(),
        new Set([editor]),
        providerRef.current.awareness
      );
    }
  }

  return (
    <div className="relative h-full w-full">
      <div className="absolute top-2 right-3 z-10 flex items-center gap-2">
        {!canEdit && (
          <span className="text-[11px] font-mono font-medium px-2.5 py-1 rounded-full border border-amber-500/30 text-amber-800 dark:text-amber-300 bg-amber-500/15 shadow-paper-sm">
            Read-Only
          </span>
        )}
        <div
          className={`text-[11px] font-mono font-medium px-2.5 py-1 rounded-full border shadow-paper-sm transition-colors ${
            status === "connected"
              ? "border-emerald-500/30 text-emerald-800 dark:text-emerald-400 bg-emerald-500/15"
              : status === "connecting"
              ? "border-amber-500/30 text-amber-800 dark:text-amber-400 bg-amber-500/15"
              : "border-rose-500/30 text-rose-800 dark:text-rose-400 bg-rose-500/15"
          }`}
        >
          ● {status === "connected" ? "Connected" : status === "connecting" ? "Connecting..." : "Reconnecting..."}
        </div>
      </div>
      <Editor
        height="100%"
        theme={monacoTheme}
        language={language}
        onMount={handleMount}
        options={{
          fontSize: 14,
          readOnly: !canEdit,
          minimap: { enabled: isMdScreen },
          automaticLayout: true,
          wordWrap: "on",
          scrollBeyondLastLine: false,
          tabSize: 2,
        }}
      />
    </div>
  );
}

export default memo(CollabEditor);
