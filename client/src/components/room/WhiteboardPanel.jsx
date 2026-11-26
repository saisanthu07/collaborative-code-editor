import { useEffect, useRef, useState, useCallback, memo } from "react";
import { Eraser, Trash2, Download, PenTool } from "lucide-react";

const COLORS = ["#d97706", "#10b981", "#3b82f6", "#f43f5e", "#f4f1ea", "#a855f7"];

function WhiteboardPanel({
  socket,
  roomId,
  initialStrokes = [],
  canEdit = false,
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const strokesRef = useRef(initialStrokes || []);
  const currentStrokeRef = useRef(null);
  const isDrawingRef = useRef(false);

  const [color, setColor] = useState("#d97706");
  const [lineWidth, setLineWidth] = useState(3);
  const [eraser, setEraser] = useState(false);

  const redrawAll = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#141311";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (const stroke of strokesRef.current) {
      if (!stroke?.points || stroke.points.length === 0) continue;
      ctx.strokeStyle = stroke.color || "#d97706";
      ctx.lineWidth = stroke.width || 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      const first = stroke.points[0];
      ctx.moveTo(first.x * canvas.width, first.y * canvas.height);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x * canvas.width, stroke.points[i].y * canvas.height);
      }
      if (stroke.points.length === 1) {
        ctx.lineTo(first.x * canvas.width + 0.5, first.y * canvas.height + 0.5);
      }
      ctx.stroke();
    }
  }, []);

  useEffect(() => {
    strokesRef.current = initialStrokes || [];
    redrawAll();
  }, [initialStrokes, redrawAll]);

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
      strokesRef.current = [...strokesRef.current, stroke];
      redrawAll();
    };
    const handleClear = () => {
      strokesRef.current = [];
      redrawAll();
    };
    socket.on("whiteboard-stroke", handleStroke);
    socket.on("whiteboard-cleared", handleClear);
    return () => {
      socket.off("whiteboard-stroke", handleStroke);
      socket.off("whiteboard-cleared", handleClear);
    };
  }, [socket, redrawAll]);

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
    isDrawingRef.current = true;
    const pt = getPoint(e);
    currentStrokeRef.current = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      color: eraser ? "#141311" : color,
      width: eraser ? Math.max(14, lineWidth * 4) : lineWidth,
      points: [pt],
    };
    strokesRef.current = [...strokesRef.current, currentStrokeRef.current];
    redrawAll();
  }

  function handlePointerMove(e) {
    if (!isDrawingRef.current || !currentStrokeRef.current) return;
    const pt = getPoint(e);
    currentStrokeRef.current.points.push(pt);
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

  function handleClearBoard() {
    if (!canEdit) return;
    strokesRef.current = [];
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
              <div className="flex items-center gap-1">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      setEraser(false);
                      setColor(c);
                    }}
                    aria-label={`Color ${c}`}
                    className={`w-4 h-4 rounded-full border ${
                      !eraser && color === c ? "ring-2 ring-accent border-white" : "border-border"
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

              <button
                type="button"
                onClick={() => setEraser((p) => !p)}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-mono ${
                  eraser
                    ? "bg-accent text-white border-accent"
                    : "bg-surface2 text-gray-300 border-border hover:text-gray-100"
                }`}
              >
                <Eraser size={12} /> Eraser
              </button>

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
          className={`w-full h-full block touch-none ${canEdit ? "cursor-crosshair" : "cursor-default"}`}
        />
      </div>
    </div>
  );
}

export default memo(WhiteboardPanel);
