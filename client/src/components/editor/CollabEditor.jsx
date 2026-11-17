import { useEffect, useRef, useState, memo } from "react";
import Editor from "@monaco-editor/react";
import "../../config/monaco.js";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { MonacoBinding } from "y-monaco";
import { colorForUser } from "../../utils/color.js";
import { useAuthStore } from "../../store/authStore.js";

// Monaco instance and workers are configured in config/monaco.js

function CollabEditor({
  roomId,
  fileName,
  language,
  username,
  guestToken,
  onConnectionChange,
  onEditorReady,
}) {
  const [editorInstance, setEditorInstance] = useState(null);
  const [status, setStatus] = useState("connecting"); // connecting | connected | disconnected | reconnecting
  const [isMdScreen, setIsMdScreen] = useState(
    typeof window !== "undefined" ? window.innerWidth >= 768 : true
  );

  const bindingRef = useRef(null);
  const providerRef = useRef(null);
  const ydocRef = useRef(null);
  const styleElRef = useRef(null);

  const onConnectionChangeRef = useRef(onConnectionChange);
  onConnectionChangeRef.current = onConnectionChange;
  const onEditorReadyRef = useRef(onEditorReady);
  onEditorReadyRef.current = onEditorReady;

  // Responsive breakpoint listener for editor minimap
  useEffect(() => {
    function handleResize() {
      setIsMdScreen(window.innerWidth >= 768);
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Update dynamic awareness cursor styles
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
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    const wsUrl = import.meta.env.VITE_YJS_URL || "ws://localhost:5000/yjs";
    const currentToken = useAuthStore.getState().token || guestToken;
    const provider = new WebsocketProvider(wsUrl, `${roomId}:${fileName}`, ydoc, {
      params: currentToken ? { token: currentToken } : {},
    });
    providerRef.current = provider;

    const unsubAuth = useAuthStore.subscribe((state) => {
      if (providerRef.current) {
        const effective = state.token || guestToken;
        providerRef.current.params = effective ? { token: effective } : {};
      }
    });

    const userColor = colorForUser(username);
    provider.awareness.setLocalStateField("user", {
      name: username,
      color: userColor,
    });

    const handleAwarenessChange = () => {
      updateAwarenessStyles(provider.awareness);
    };
    provider.awareness.on("change", handleAwarenessChange);
    handleAwarenessChange();

    provider.on("status", ({ status: s }) => {
      const mapped = s === "connected" ? "connected" : "reconnecting";
      setStatus(mapped);
      onConnectionChangeRef.current?.(mapped);
    });

    provider.on("connection-close", () => {
      setStatus("disconnected");
      onConnectionChangeRef.current?.("disconnected");
    });
    provider.on("connection-error", () => {
      setStatus("disconnected");
      onConnectionChangeRef.current?.("disconnected");
    });

    // Wire binding if editor is already mounted
    if (editorInstance) {
      const yText = ydoc.getText("monaco");
      bindingRef.current = new MonacoBinding(
        yText,
        editorInstance.getModel(),
        new Set([editorInstance]),
        provider.awareness
      );
    }

    return () => {
      unsubAuth();
      provider.awareness.off("change", handleAwarenessChange);
      if (bindingRef.current) {
        bindingRef.current.destroy();
        bindingRef.current = null;
      }
      provider.destroy();
      ydoc.destroy();

      if (styleElRef.current) {
        styleElRef.current.remove();
        styleElRef.current = null;
      }
    };
    // Re-run ONLY when roomId, fileName, or editorInstance changes
  }, [roomId, fileName, editorInstance, guestToken, username]);

  function handleMount(editor) {
    setEditorInstance(editor);
    onEditorReadyRef.current?.(editor);
  }

  return (
    <div className="relative h-full w-full">
      <div
        className={`absolute top-2 right-3 z-10 text-xs px-2.5 py-1 rounded-full border shadow-sm transition-colors ${
          status === "connected"
            ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10"
            : status === "connecting"
            ? "border-amber-500/40 text-amber-400 bg-amber-500/10"
            : "border-rose-500/40 text-rose-400 bg-rose-500/10"
        }`}
      >
        ● {status === "connected" ? "Connected" : status === "connecting" ? "Connecting..." : "Reconnecting..."}
      </div>
      <Editor
        height="100%"
        theme="vs-dark"
        language={language}
        onMount={handleMount}
        options={{
          fontSize: 14,
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
