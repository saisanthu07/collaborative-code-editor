import { useState, useEffect, useRef, useCallback, memo } from "react";
import { Mic, MicOff, PhoneCall, PhoneOff, Radio } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../../services/api.js";

const DEFAULT_ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

function VoiceRoom({ socket, roomId }) {
  const [inVoice, setInVoice] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [voiceUsers, setVoiceUsers] = useState(new Set());
  const [mutedUsers, setMutedUsers] = useState(new Set());

  const inVoiceRef = useRef(false);
  inVoiceRef.current = inVoice;

  const iceConfigRef = useRef(DEFAULT_ICE_SERVERS);
  const localStreamRef = useRef(null);
  const peersRef = useRef(new Map()); // socketId -> RTCPeerConnection
  const audioElsRef = useRef(new Map()); // socketId -> HTMLAudioElement

  // Fetch ICE/TURN configuration from backend once
  useEffect(() => {
    let active = true;
    api
      .get("/rooms/ice-servers")
      .then(({ data }) => {
        if (active && Array.isArray(data?.iceServers) && data.iceServers.length > 0) {
          iceConfigRef.current = { iceServers: data.iceServers };
        }
      })
      .catch(() => {
        // Keep STUN defaults
      });
    return () => {
      active = false;
    };
  }, []);

  const cleanupPeer = useCallback((targetSocketId) => {
    const peer = peersRef.current.get(targetSocketId);
    if (peer) {
      try {
        peer.close();
      } catch {
        // ignore
      }
      peersRef.current.delete(targetSocketId);
    }
    const audioEl = audioElsRef.current.get(targetSocketId);
    if (audioEl) {
      audioEl.pause();
      audioEl.srcObject = null;
      audioElsRef.current.delete(targetSocketId);
    }
  }, []);

  const cleanupVoice = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    Array.from(peersRef.current.keys()).forEach((id) => cleanupPeer(id));
    setVoiceUsers(new Set());
    setMutedUsers(new Set());
    setInVoice(false);
    setIsMuted(false);
  }, [cleanupPeer]);

  const createPeer = useCallback(
    (targetSocketId, isInitiator) => {
      const existing = peersRef.current.get(targetSocketId);
      if (existing) return existing;

      const peer = new RTCPeerConnection(iceConfigRef.current);
      peersRef.current.set(targetSocketId, peer);

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          peer.addTrack(track, localStreamRef.current);
        });
      }

      peer.onicecandidate = (event) => {
        if (event.candidate && socket?.connected) {
          socket.emit("voice-signal", {
            roomId,
            targetSocketId,
            signal: { candidate: event.candidate },
          });
        }
      };

      peer.ontrack = (event) => {
        let audio = audioElsRef.current.get(targetSocketId);
        if (!audio) {
          audio = new Audio();
          audio.autoplay = true;
          audioElsRef.current.set(targetSocketId, audio);
        }
        audio.srcObject = event.streams[0];
        audio.play().catch(() => {});
      };

      if (isInitiator) {
        peer.onnegotiationneeded = async () => {
          try {
            const offer = await peer.createOffer();
            await peer.setLocalDescription(offer);
            socket?.emit("voice-signal", {
              roomId,
              targetSocketId,
              signal: { description: peer.localDescription },
            });
          } catch (err) {
            console.error("Peer negotiation error:", err);
          }
        };
      }

      return peer;
    },
    [roomId, socket]
  );

  const handleJoinVoice = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error("Audio is not supported in this browser");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
      localStreamRef.current = stream;
      inVoiceRef.current = true;
      setInVoice(true);
      toast.success("Joined voice call", { icon: "🎙️" });

      if (socket?.connected) {
        socket.emit("voice-join", { roomId });
      }
    } catch {
      toast.error("Microphone permission denied or not available");
    }
  };

  const handleLeaveVoice = () => {
    if (socket?.connected) {
      socket.emit("voice-leave", { roomId });
    }
    cleanupVoice();
    toast("Left voice call", { icon: "📞" });
  };

  const handleToggleMute = () => {
    if (!localStreamRef.current) return;
    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      const nextMuted = !isMuted;
      audioTrack.enabled = !nextMuted;
      setIsMuted(nextMuted);
      if (socket?.connected) {
        socket.emit("voice-mute", { roomId, isMuted: nextMuted });
      }
    }
  };

  useEffect(() => {
    if (!socket) return;

    const handleUserJoined = ({ socketId, username: uName }) => {
      setVoiceUsers((prev) => new Set([...prev, socketId]));
      if (inVoiceRef.current && socketId !== socket.id) {
        toast(`${uName || "A participant"} joined voice`, { icon: "🎙️" });
        createPeer(socketId, true);
      }
    };

    const handleSignal = async ({ senderSocketId, signal }) => {
      let peer = peersRef.current.get(senderSocketId);
      if (!peer && inVoiceRef.current) {
        peer = createPeer(senderSocketId, false);
      }
      if (!peer) return;

      try {
        if (signal.description) {
          const isOfferCollision =
            signal.description.type === "offer" &&
            (peer.signalingState !== "stable");
          const polite = socket.id < senderSocketId;
          if (isOfferCollision && !polite) {
            return;
          }
          await peer.setRemoteDescription(new RTCSessionDescription(signal.description));
          if (signal.description.type === "offer") {
            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);
            socket.emit("voice-signal", {
              roomId,
              targetSocketId: senderSocketId,
              signal: { description: peer.localDescription },
            });
          }
        } else if (signal.candidate) {
          await peer.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
      } catch (err) {
        console.error("Error processing voice signal:", err);
      }
    };

    const handleUserMute = ({ socketId, isMuted: peerMuted }) => {
      setMutedUsers((prev) => {
        const next = new Set(prev);
        if (peerMuted) next.add(socketId);
        else next.delete(socketId);
        return next;
      });
    };

    const handleUserLeft = ({ socketId }) => {
      setVoiceUsers((prev) => {
        const next = new Set(prev);
        next.delete(socketId);
        return next;
      });
      setMutedUsers((prev) => {
        const next = new Set(prev);
        next.delete(socketId);
        return next;
      });
      cleanupPeer(socketId);
    };

    socket.on("user-joined-voice", handleUserJoined);
    socket.on("voice-signal", handleSignal);
    socket.on("user-voice-mute", handleUserMute);
    socket.on("user-left-voice", handleUserLeft);

    return () => {
      socket.off("user-joined-voice", handleUserJoined);
      socket.off("voice-signal", handleSignal);
      socket.off("user-voice-mute", handleUserMute);
      socket.off("user-left-voice", handleUserLeft);
    };
  }, [socket, roomId, createPeer, cleanupPeer]);

  useEffect(() => {
    return () => cleanupVoice();
  }, [cleanupVoice]);

  if (!inVoice) {
    return (
      <button
        type="button"
        onClick={handleJoinVoice}
        title="Join Voice Chat"
        aria-label="Join Voice Chat"
        className="flex items-center gap-1.5 text-xs text-gray-300 hover:text-gray-100 bg-surface2 border border-border rounded-lg px-2.5 py-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-accent shadow-paper-sm"
      >
        <PhoneCall size={13} className="text-emerald-600 dark:text-emerald-400" />
        <span className="hidden sm:inline">Voice Call</span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-2 py-1 text-xs shadow-paper-sm">
      <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-medium mr-1">
        <Radio size={13} className="animate-pulse" />
        <span className="hidden sm:inline">In Call</span>
        <span
          className="text-[10px] bg-emerald-500/20 px-1.5 rounded-full font-bold"
          title={mutedUsers.size > 0 ? `${mutedUsers.size} peer(s) muted` : "All unmuted"}
        >
          {voiceUsers.size + 1}
        </span>
      </div>

      <button
        type="button"
        onClick={handleToggleMute}
        title={isMuted ? "Unmute Mic" : "Mute Mic"}
        className={`p-1 rounded-md transition-colors ${
          isMuted
            ? "bg-rose-500/20 text-rose-600 dark:text-rose-400 hover:bg-rose-500/30"
            : "bg-surface2 text-gray-200 hover:bg-surface2/80"
        }`}
        aria-label={isMuted ? "Unmute Microphone" : "Mute Microphone"}
      >
        {isMuted ? <MicOff size={13} /> : <Mic size={13} />}
      </button>

      <button
        type="button"
        onClick={handleLeaveVoice}
        title="Disconnect from Voice"
        className="p-1 rounded-md bg-rose-600 hover:bg-rose-500 text-white transition-colors ml-0.5 shadow-paper-sm"
        aria-label="Leave Voice Call"
      >
        <PhoneOff size={13} />
      </button>
    </div>
  );
}

export default memo(VoiceRoom);
