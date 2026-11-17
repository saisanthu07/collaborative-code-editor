import { useState, useEffect, useRef, memo } from "react";
import { Play, Pause, RotateCcw, Clock, ChevronDown } from "lucide-react";

function formatSeconds(totalSeconds) {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hrs > 0) {
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

function InterviewTimer({ socket, roomId, isHost = false }) {
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const timerRef = useRef(null);

  // Sync listener from socket
  useEffect(() => {
    if (!socket) return;

    function handleTimerSync({ seconds: s, isRunning: r }) {
      setSeconds(s);
      setIsRunning(r);
    }

    socket.on("timer-synced", handleTimerSync);
    return () => socket.off("timer-synced", handleTimerSync);
  }, [socket]);

  // Interval ticker
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning]);

  function broadcast(newSecs, newRunning) {
    if (socket?.connected) {
      socket.emit("timer-sync", {
        roomId,
        seconds: newSecs,
        isRunning: newRunning,
      });
    }
  }

  function handleTogglePlay() {
    const nextRunning = !isRunning;
    setIsRunning(nextRunning);
    broadcast(seconds, nextRunning);
  }

  function handleReset() {
    setIsRunning(false);
    setSeconds(0);
    broadcast(0, false);
  }

  function handleSetPreset(targetSecs) {
    setSeconds(targetSecs);
    setIsRunning(false);
    broadcast(targetSecs, false);
    setShowPresets(false);
  }

  return (
    <div className="relative flex items-center bg-surface2/70 border border-border rounded-md px-2 py-1 text-xs select-none">
      <div className="flex items-center gap-1.5 font-mono text-gray-200">
        <Clock
          size={13}
          className={`${isRunning ? "text-emerald-400 animate-pulse" : "text-gray-400"}`}
        />
        <span className="font-semibold tracking-wider text-[12px]">
          {formatSeconds(seconds)}
        </span>
      </div>

      {/* Timer Controls */}
      <div className="flex items-center gap-1 ml-2 pl-2 border-l border-border/80">
        <button
          type="button"
          onClick={handleTogglePlay}
          title={isRunning ? "Pause Timer" : "Start Timer"}
          className={`p-1 rounded transition-colors ${
            isRunning
              ? "text-amber-400 hover:bg-amber-500/20"
              : "text-emerald-400 hover:bg-emerald-500/20"
          }`}
          aria-label={isRunning ? "Pause Interview Timer" : "Start Interview Timer"}
        >
          {isRunning ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
        </button>

        <button
          type="button"
          onClick={handleReset}
          title="Reset Timer"
          className="p-1 text-gray-400 hover:text-white hover:bg-surface2 rounded transition-colors"
          aria-label="Reset Interview Timer"
        >
          <RotateCcw size={12} />
        </button>

        {isHost && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowPresets((p) => !p)}
              title="Set Target Time"
              className="p-1 text-gray-400 hover:text-white rounded transition-colors"
              aria-label="Timer presets"
            >
              <ChevronDown size={12} />
            </button>

            {showPresets && (
              <div className="absolute right-0 top-full mt-1.5 w-32 bg-surface border border-border rounded-md shadow-xl p-1 z-30 space-y-0.5">
                <button
                  type="button"
                  onClick={() => handleSetPreset(0)}
                  className="w-full text-left px-2 py-1 text-[11px] text-gray-300 hover:bg-surface2 hover:text-white rounded"
                >
                  Stopwatch (0:00)
                </button>
                <button
                  type="button"
                  onClick={() => handleSetPreset(30 * 60)}
                  className="w-full text-left px-2 py-1 text-[11px] text-gray-300 hover:bg-surface2 hover:text-white rounded"
                >
                  30 Minutes
                </button>
                <button
                  type="button"
                  onClick={() => handleSetPreset(45 * 60)}
                  className="w-full text-left px-2 py-1 text-[11px] text-gray-300 hover:bg-surface2 hover:text-white rounded"
                >
                  45 Minutes
                </button>
                <button
                  type="button"
                  onClick={() => handleSetPreset(60 * 60)}
                  className="w-full text-left px-2 py-1 text-[11px] text-gray-300 hover:bg-surface2 hover:text-white rounded"
                >
                  60 Minutes
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(InterviewTimer);
