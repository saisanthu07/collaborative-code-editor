import { useEffect, useRef, useState, useCallback, memo } from "react";
import {
  Eraser,
  Trash2,
  Download,
  PenTool,
  Square,
  Circle,
  Minus,
  ArrowUpRight,
  Type,
  Undo2,
  Redo2,
  Sun,
  Moon,
} from "lucide-react";
import { useThemeStore } from "../../store/themeStore.js";

const COLORS = ["#d97706", "#10b981", "#3b82f6", "#f43f5e", "#f4f1ea", "#221C16", "#a855f7"];

const TOOLS = [
  { id: "pen", label: "Pen", icon: PenTool },
  { id: "line", label: "Line", icon: Minus },
  { id: "rect", label: "Rect", icon: Square },
  { id: "circle", label: "Circle", icon: Circle },
  { id: "arrow", label: "Arrow", icon: ArrowUpRight },
  { id: "text", label: "Text", icon: Type },
  { id: "eraser", label: "Eraser", icon: Eraser },
];

function drawStroke(ctx, stroke, width, height) {
  if (!stroke?.points || stroke.points.length === 0) return;
  const type = stroke.type || "pen";
  ctx.strokeStyle = stroke.color || "#d97706";
  ctx.fillStyle = stroke.color || "#d97706";
  ctx.lineWidth = stroke.width || 3;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const first = stroke.points[0];
  const last = stroke.points[stroke.points.length - 1];
  const x1 = first.x * width;
  const y1 = first.y * height;
  const x2 = last.x * width;
  const y2 = last.y * height;

  if (type === "text") {
    const fontSize = Math.max(14, (stroke.width || 3) * 5);
    ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    ctx.textBaseline = "top";
    ctx.fillText(stroke.text || "", x1, y1);
    return;
  }

  if (type === "rect") {
    ctx.beginPath();
    ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
    return;
  }

  if (type === "circle") {
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2;
    const rx = Math.abs(x2 - x1) / 2;
    const ry = Math.abs(y2 - y1) / 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, Math.max(1, rx), Math.max(1, ry), 0, 0, Math.PI * 2);
    ctx.stroke();
    return;
  }

  if (type === "line") {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    return;
  }

  if (type === "arrow") {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    const angle = Math.atan2(y2 - y1, x2 - x1);
    const headLen = Math.max(10, (stroke.width || 3) * 3.5);
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(
      x2 - headLen * Math.cos(angle - Math.PI / 6),
      y2 - headLen * Math.sin(angle - Math.PI / 6)
    );
    ctx.moveTo(x2, y2);
    ctx.lineTo(
      x2 - headLen * Math.cos(angle + Math.PI / 6),
      y2 - headLen * Math.sin(angle + Math.PI / 6)
    );
    ctx.stroke();
    return;
  }

  ctx.beginPath();
  ctx.moveTo(x1, y1);
  for (let i = 1; i < stroke.points.length; i++) {
    ctx.lineTo(stroke.points[i].x * width, stroke.points[i].y * height);
  }
  if (stroke.points.length === 1) {
    ctx.lineTo(x1 + 0.5, y1 + 0.5);
  }
  ctx.stroke();
}

function WhiteboardPanel({
  socket,
  roomId,
  initialStrokes = [],
  canEdit = false,
}) {
  const appTheme = useThemeStore((s) => s.theme);
  const [boardTheme, setBoardTheme] = useState(appTheme === "light" ? "light" : "dark");

  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const strokesRef = useRef(initialStrokes || []);
  const redoStackRef = useRef([]);
  const currentStrokeRef = useRef(null);
  const isDrawingRef = useRef(false);

  const [tool, setTool] = useState("pen");
  const [color, setColor] = useState("#d97706");
  const [lineWidth, setLineWidth] = useState(3);
  const [historyCounts, setHistoryCounts] = useState({
    undo: (initialStrokes || []).length,
    redo: 0,
  });
  const [pendingText, setPendingText] = useState(null); // { pt, text }

  const canvasBg = boardTheme === "light" ? "#FAF7F0" : "#141311";

  const syncCounts = useCallback(() => {
    setHistoryCounts({
      undo: strokesRef.current.length,
      redo: redoStackRef.current.length,
    });
  }, []);

  const redrawAll = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = canvasBg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (const stroke of strokesRef.current) {
      drawStroke(ctx, stroke, canvas.width, canvas.height);
    }
  }, [canvasBg]);

  useEffect(() => {
    strokesRef.current = initialStrokes || [];
    redoStackRef.current = [];
    syncCounts();
    redrawAll();
  }, [initialStrokes, redrawAll, syncCounts]);

  useEffect(() => {
    redrawAll();
  }, [boardTheme, redrawAll]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    function resize() {
      const rect = container.getBoundingClientRect();
      canvas.width = Math.max(300, Math.floor(rect.width));
      canvas.height = Math.max(200, Math.floor(rect.height));
      redrawAll();
    }

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    return () => observer.disconnect();
  }, [redrawAll]);

  useEffect(() => {
    if (!socket) return;
    const handleStroke = ({ stroke }) => {
      if (!stroke) return;
      if (strokesRef.current.some((s) => s.id === stroke.id)) return;
      strokesRef.current = [...strokesRef.current, stroke];
      syncCounts();
      redrawAll();
    };
    const handleUndone = ({ strokeId }) => {
      if (!strokeId) return;
      strokesRef.current = strokesRef.current.filter((s) => s.id !== strokeId);
      syncCounts();
      redrawAll();
    };
    const handleClear = () => {
      strokesRef.current = [];
      redoStackRef.current = [];
      syncCounts();
      redrawAll();
    };
    socket.on("whiteboard-stroke", handleStroke);
    socket.on("whiteboard-undone", handleUndone);
    socket.on("whiteboard-cleared", handleClear);
    return () => {
      socket.off("whiteboard-stroke", handleStroke);
      socket.off("whiteboard-undone", handleUndone);
      socket.off("whiteboard-cleared", handleClear);
    };
  }, [socket, redrawAll, syncCounts]);

  const handleUndo = useCallback(() => {
    if (!canEdit || strokesRef.current.length === 0) return;
    const removed = strokesRef.current[strokesRef.current.length - 1];
    strokesRef.current = strokesRef.current.slice(0, -1);
    redoStackRef.current = [...redoStackRef.current, removed];
    syncCounts();
    redrawAll();
    if (socket?.connected && removed?.id) {
      socket.emit("whiteboard-undo", { roomId, strokeId: removed.id });
    }
  }, [canEdit, redrawAll, roomId, socket, syncCounts]);

  const handleRedo = useCallback(() => {
    if (!canEdit || redoStackRef.current.length === 0) return;
    const restored = redoStackRef.current[redoStackRef.current.length - 1];
    redoStackRef.current = redoStackRef.current.slice(0, -1);
    strokesRef.current = [...strokesRef.current, restored];
    syncCounts();
    redrawAll();
    if (socket?.connected && restored) {
      socket.emit("whiteboard-stroke", { roomId, stroke: restored });
    }
  }, [canEdit, redrawAll, roomId, socket, syncCounts]);

  useEffect(() => {
    if (!canEdit) return;
    function onKeyDown(e) {
      if (pendingText) return;
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canEdit, handleRedo, handleUndo, pendingText]);

  function getPoint(e) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (clientY - rect.top) / rect.height)),
    };
  }

  function handlePointerDown(e) {
    if (!canEdit) return;
    const pt = getPoint(e);

    if (tool === "text") {
      setPendingText({ pt, text: "" });
      return;
    }

    isDrawingRef.current = true;
    redoStackRef.current = [];
    const isEraser = tool === "eraser";
    currentStrokeRef.current = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: isEraser ? "pen" : tool,
      color: isEraser ? canvasBg : color,
      width: isEraser ? Math.max(14, lineWidth * 4) : lineWidth,
      points: [pt],
    };
    strokesRef.current = [...strokesRef.current, currentStrokeRef.current];
    syncCounts();
    redrawAll();
  }

  function handlePointerMove(e) {
    if (!isDrawingRef.current || !currentStrokeRef.current) return;
    const pt = getPoint(e);
    const active = currentStrokeRef.current;
    if (active.type === "pen") {
      active.points.push(pt);
    } else {
      // Shape tools only need [startPoint, endPoint]
      active.points = [active.points[0], pt];
    }
    redrawAll();
  }

  function handlePointerUp() {
    if (!isDrawingRef.current || !currentStrokeRef.current) return;
    isDrawingRef.current = false;
    const finished = currentStrokeRef.current;
    currentStrokeRef.current = null;
    if (socket?.connected && finished.points.length > 0) {
      socket.emit("whiteboard-stroke", { roomId, stroke: finished });
    }
  }

  function commitPendingText() {
    if (!pendingText) return;
    const trimmed = pendingText.text.trim();
    if (trimmed) {
      const stroke = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type: "text",
        color,
        width: lineWidth,
        text: trimmed.slice(0, 200),
        points: [pendingText.pt],
      };
      redoStackRef.current = [];
      strokesRef.current = [...strokesRef.current, stroke];
      syncCounts();
      redrawAll();
      if (socket?.connected) {
        socket.emit("whiteboard-stroke", { roomId, stroke });
      }
    }
    setPendingText(null);
  }

  function handleClearBoard() {
    if (!canEdit) return;
    strokesRef.current = [];
    redoStackRef.current = [];
    syncCounts();
    redrawAll();
    socket?.emit("whiteboard-clear", { roomId });
  }

  function handleExportPng() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `whiteboard-${roomId}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  return (
    <div className="h-full flex flex-col bg-paper-console">
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-border bg-surface text-xs">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 font-mono text-gray-300 font-semibold">
            <PenTool size={13} className="text-accent" />
            <span>System Design Canvas</span>
          </span>
          {!canEdit && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
              View Only
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {canEdit && (
            <>
              {/* Tool Palette */}
              <div className="flex items-center bg-surface2 border border-border rounded-lg p-0.5 gap-0.5">
                {TOOLS.map(({ id, label, icon: Icon }) => {
                  const active = tool === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setTool(id)}
                      title={label}
                      aria-label={label}
                      className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-mono transition-colors ${
                        active
                          ? "bg-accent text-white font-semibold"
                          : "text-gray-300 hover:text-gray-100 hover:bg-surface"
                      }`}
                    >
                      <Icon size={12} />
                      <span className="hidden xl:inline">{label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-1">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      if (tool === "eraser") setTool("pen");
                      setColor(c);
                    }}
                    aria-label={`Color ${c}`}
                    className={`w-4 h-4 rounded-full border ${
                      tool !== "eraser" && color === c
                        ? "ring-2 ring-accent border-white"
                        : "border-border"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>

              <select
                value={lineWidth}
                onChange={(e) => setLineWidth(Number(e.target.value))}
                aria-label="Stroke width"
                className="bg-surface2 border border-border rounded px-1.5 py-0.5 text-[11px] font-mono text-gray-200"
              >
                <option value={2}>Thin</option>
                <option value={3}>Medium</option>
                <option value={6}>Thick</option>
              </select>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={historyCounts.undo === 0}
                  title="Undo (Ctrl/Cmd+Z)"
                  aria-label="Undo"
                  className="p-1 rounded-lg bg-surface2 border border-border text-gray-300 hover:text-gray-100 disabled:opacity-40"
                >
                  <Undo2 size={12} />
                </button>
                <button
                  type="button"
                  onClick={handleRedo}
                  disabled={historyCounts.redo === 0}
                  title="Redo (Ctrl/Cmd+Shift+Z)"
                  aria-label="Redo"
                  className="p-1 rounded-lg bg-surface2 border border-border text-gray-300 hover:text-gray-100 disabled:opacity-40"
                >
                  <Redo2 size={12} />
                </button>
              </div>

              <button
                type="button"
                onClick={handleClearBoard}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-500/15 text-rose-400 border border-rose-500/30 text-[11px] font-mono hover:opacity-90"
              >
                <Trash2 size={12} /> Clear
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setBoardTheme((t) => (t === "dark" ? "light" : "dark"))}
            title="Toggle board paper contrast"
            aria-label="Toggle board theme"
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-surface2 text-gray-300 border border-border text-[11px] font-mono hover:text-gray-100"
          >
            {boardTheme === "dark" ? <Sun size={12} /> : <Moon size={12} />}
          </button>

          <button
            type="button"
            onClick={handleExportPng}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-surface2 text-gray-300 border border-border text-[11px] font-mono hover:text-gray-100"
          >
            <Download size={12} /> Export PNG
          </button>
        </div>
      </div>

      <div ref={containerRef} className="flex-1 min-h-0 relative overflow-hidden">
        <canvas
          ref={canvasRef}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
          className={`w-full h-full block touch-none ${
            !canEdit ? "cursor-default" : tool === "text" ? "cursor-text" : "cursor-crosshair"
          }`}
        />

        {pendingText && (
          <input
            autoFocus
            type="text"
            maxLength={200}
            value={pendingText.text}
            onChange={(e) => setPendingText((prev) => ({ ...prev, text: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitPendingText();
              } else if (e.key === "Escape") {
                setPendingText(null);
              }
            }}
            onBlur={commitPendingText}
            placeholder="Type label & press Enter..."
            style={{
              left: `${Math.min(82, Math.max(2, pendingText.pt.x * 100))}%`,
              top: `${Math.min(88, Math.max(2, pendingText.pt.y * 100))}%`,
            }}
            className="absolute z-10 bg-surface border border-accent rounded-lg px-2.5 py-1 text-xs font-sans text-gray-100 shadow-paper-md focus:outline-none min-w-[160px]"
          />
        )}
      </div>
    </div>
  );
}

export default memo(WhiteboardPanel);
