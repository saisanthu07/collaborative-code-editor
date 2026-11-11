import { useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { MonacoBinding } from "y-monaco";
import { colorForUser } from "../../utils/color.js";

// Wires Monaco Editor to a Yjs document over the y-websocket relay.
// This is the CRDT-based sync described in the spec: NOT plain Socket.IO
// text broadcasting. Each room's Y.Doc is isolated by roomId (used as the
// y-websocket "docName"), and concurrent edits merge via Yjs automatically.
export default function CollabEditor({
  roomId,
  fileName,
  language,
  username,
  onConnectionChange,
  onSourceCodeChange,
  onEditorReady,
}) {
  const editorRef = useRef(null);
  const [status, setStatus] = useState("connecting"); // connecting | connected | disconnected
  const bindingRef = useRef(null);
  const providerRef = useRef(null);
  const ydocRef = useRef(null);

  useEffect(() => {
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    const wsUrl = (import.meta.env.VITE_YJS_URL || "ws://localhost:5000/yjs");
    // Distinct doc per room+file so switching files doesn't cross-contaminate content.
    const provider = new WebsocketProvider(wsUrl, `${roomId}:${fileName}`, ydoc);
    providerRef.current = provider;

    provider.awareness.setLocalStateField("user", {
      name: username,
      color: colorForUser(username),
    });

    provider.on("status", ({ status: s }) => {
      setStatus(s === "connected" ? "connected" : "reconnecting");
      onConnectionChange?.(s === "connected" ? "connected" : "reconnecting");
    });

    provider.on("connection-close", () => setStatus("disconnected"));
    provider.on("connection-error", () => setStatus("disconnected"));

    return () => {
      bindingRef.current?.destroy();
      provider.destroy();
      ydoc.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, fileName]);

  function handleMount(editor) {
    editorRef.current = editor;
    onEditorReady?.(editor);
    const ydoc = ydocRef.current;
    const provider = providerRef.current;
    const yText = ydoc.getText("monaco");

    bindingRef.current = new MonacoBinding(
      yText,
      editor.getModel(),
      new Set([editor]),
      provider.awareness
    );
  }

  return (
    <div className="relative h-full">
      <div
        className={`absolute top-2 right-3 z-10 text-xs px-2 py-1 rounded-full border ${
          status === "connected"
            ? "border-accent2/40 text-accent2 bg-accent2/10"
            : status === "connecting"
            ? "border-yellow-500/40 text-yellow-400 bg-yellow-500/10"
            : "border-red-500/40 text-red-400 bg-red-500/10"
        }`}
      >
        ● {status === "connected" ? "Connected" : status === "connecting" ? "Connecting..." : "Reconnecting..."}
      </div>
      <Editor
        height="100%"
        theme="vs-dark"
        language={language}
        onMount={handleMount}
        onChange={(value) => onSourceCodeChange?.(value ?? "")}
        options={{
          fontSize: 14,
          minimap: { enabled: true },
          automaticLayout: true,
          wordWrap: "on",
          scrollBeyondLastLine: false,
        }}
      />
    </div>
  );
}
