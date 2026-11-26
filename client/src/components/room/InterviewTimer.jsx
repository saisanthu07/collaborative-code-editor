import { useState, useEffect, useRef, memo } from "react";
import { Play, Pause, RotateCcw, Clock, ChevronDown } from "lucide-react";

function formatSeconds(totalSeconds) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;

  if (hrs > 0) {
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

function computeHydratedSeconds(state) {
  if (!state) return 0;
  const base = state.remainingSeconds ?? 0;
  if (!state.isRunning || !state.updatedAt) return base;
  const elapsed = Math.floor((Date.now() - new Date(state.updatedAt).getTime()) / 1000);
  if (state.mode === "countdown") {
    return Math.max(0, base - elapsed);
  }
  return base + elapsed;
}

function InterviewTimer({ socket, roomId, isHost = false, initialState = null }) {
  const [mode, setMode] = useState(initialState?.mode || "stopwatch");
  const [durationSeconds, setDurationSeconds] = useState(initialState?.durationSeconds || 0);
  const [seconds, setSeconds] = useState(() => computeHydratedSeconds(initialState));
  const [isRunning, setIsRunning] = useState(Boolean(initialState?.isRunning));
  const [showPresets, setShowPresets] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!initialState) return;
    setMode(initialState.mode || "stopwatch");
    setDurationSeconds(initialState.durationSeconds || 0);
    setSeconds(computeHydratedSeconds(initialState));
    setIsRunning(Boolean(initialState.isRunning));
  }, [initialState]);

  useEffect(() => {
    if (!socket) return;

    function handleTimerSync(data) {
      const nextMode = data.mode || "stopwatch";
      const nextRemaining = data.remainingSeconds ?? data.seconds ?? 0;
      setMode(nextMode);
      setDurationSeconds(data.durationSeconds ?? nextRemaining);
      setSeconds(nextRemaining);
      setIsRunning(Boolean(data.isRunning));
    }

    socket.on("timer-synced", handleTimerSync);
    return () => socket.off("timer-synced", handleTimerSync);
  }, [socket]);

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setSeconds((prev) => {
          if (mode === "countdown") {
            if (prev <= 1) {
              setIsRunning(false);
              return 0;
            }
            return prev - 1;
          }
          return prev + 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, mode]);

  function broadcast(nextMode, nextDuration, nextRemaining, nextRunning) {
    if (socket?.connected && isHost) {
      socket.emit("timer-sync", {
        roomId,
        mode: nextMode,
        durationSeconds: nextDuration,
        remainingSeconds: nextRemaining,
        seconds: nextRemaining,
        isRunning: nextRunning,
      });
    }
  }

  function handleTogglePlay() {
    if (!isHost) return;
    const nextRunning = !isRunning;
    setIsRunning(nextRunning);
    broadcast(mode, durationSeconds, seconds, nextRunning);
  }

  function handleReset() {
    if (!isHost) return;
    const resetTo = mode === "countdown" ? durationSeconds : 0;
    setIsRunning(false);
    setSeconds(resetTo);
    broadcast(mode, durationSeconds, resetTo, false);
  }

  function handleSetPreset(targetSecs) {
    if (!isHost) return;
    const nextMode = targetSecs > 0 ? "countdown" : "stopwatch";
    setMode(nextMode);
    setDurationSeconds(targetSecs);
    setSeconds(targetSecs);
    setIsRunning(false);
    broadcast(nextMode, targetSecs, targetSecs, false);
    setShowPresets(false);
  }

  const isExpired = mode === "countdown" && durationSeconds > 0 && seconds === 0;

  return (
    <div className="relative flex items-center bg-surface2 border border-border rounded-lg px-2.5 py-1 text-xs select-none shadow-paper-sm">
      <div className={`flex items-center gap-1.5 font-mono ${isExpired ? "text-rose-400" : "text-gray-200"}`}>
        <Clock
          size={13}
          className={`${isRunning ? "text-emerald-600 dark:text-emerald-400 animate-pulse" : "text-gray-400"}`}
        />
        <span className="font-semibold tracking-wider text-[12px]">
          {formatSeconds(seconds)}
        </span>
      </div>

      {isHost && (
        <div className="flex items-center gap-1 ml-2 pl-2 border-l border-border">
          <button
            type="button"
            onClick={handleTogglePlay}
            title={isRunning ? "Pause Timer" : "Start Timer"}
            className={`p-1 rounded-md transition-colors ${
              isRunning
                ? "text-amber-700 dark:text-amber-400 hover:bg-amber-500/20"
                : "text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20"
            }`}
            aria-label={isRunning ? "Pause Interview Timer" : "Start Interview Timer"}
          >
            {isRunning ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
          </button>

          <button
            type="button"
            onClick={handleReset}
            title="Reset Timer"
            className="p-1 text-gray-400 hover:text-gray-100 hover:bg-surface rounded-md transition-colors"
            aria-label="Reset Interview Timer"
          >
            <RotateCcw size={12} />
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowPresets((p) => !p)}
              title="Set Target Time"
              className="p-1 text-gray-400 hover:text-gray-100 hover:bg-surface rounded-md transition-colors"
              aria-label="Timer presets"
            >
              <ChevronDown size={12} />
            </button>

            {showPresets && (
              <div className="absolute right-0 top-full mt-1.5 w-36 bg-surface border border-border rounded-xl shadow-paper-md p-1.5 z-30 space-y-0.5">
                <button
                  type="button"
                  onClick={() => handleSetPreset(0)}
                  className="w-full text-left px-2 py-1 text-[11px] text-gray-300 hover:bg-surface2 hover:text-gray-100 rounded-md transition-colors font-mono"
                >
                  Stopwatch (0:00)
                </button>
                <button
                  type="button"
                  onClick={() => handleSetPreset(30 * 60)}
                  className="w-full text-left px-2 py-1 text-[11px] text-gray-300 hover:bg-surface2 hover:text-gray-100 rounded-md transition-colors font-mono"
                >
                  30m Countdown
                </button>
                <button
                  type="button"
                  onClick={() => handleSetPreset(45 * 60)}
                  className="w-full text-left px-2 py-1 text-[11px] text-gray-300 hover:bg-surface2 hover:text-gray-100 rounded-md transition-colors font-mono"
                >
                  45m Countdown
                </button>
                <button
                  type="button"
                  onClick={() => handleSetPreset(60 * 60)}
                  className="w-full text-left px-2 py-1 text-[11px] text-gray-300 hover:bg-surface2 hover:text-gray-100 rounded-md transition-colors font-mono"
                >
                  60m Countdown
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(InterviewTimer);
