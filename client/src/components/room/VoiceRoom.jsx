import { useState, useEffect, useRef, useCallback, memo } from "react";
import { Mic, MicOff, PhoneCall, PhoneOff, Radio } from "lucide-react";
import toast from "react-hot-toast";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

function VoiceRoom({ socket, roomId, username }) {
  const [inVoice, setInVoice] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [voiceUsers, setVoiceUsers] = useState(new Set()); // socketIds in voice

  const localStreamRef = useRef(null);
  const peersRef = useRef(new Map()); // socketId -> RTCPeerConnection

  // Teardown all peers and audio tracks
  const cleanupVoice = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    peersRef.current.forEach((peer) => {
      try {
        peer.close();
      } catch {
        // ignore
      }
    });
    peersRef.current.clear();
    setVoiceUsers(new Set());
    setInVoice(false);
    setIsMuted(false);
  }, []);

  // Helper to create peer connection
  const createPeer = useCallback(
    (targetSocketId, isInitiator) => {
      const peer = new RTCPeerConnection(ICE_SERVERS);
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
        const audio = new Audio();
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

  // Join Voice Call
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
      setInVoice(true);
      toast.success("Joined voice call", { icon: "🎙️" });

      if (socket?.connected) {
        socket.emit("voice-join", { roomId });
      }
    } catch (err) {
      toast.error("Microphone permission denied or not available");
    }
  };

  // Leave Voice Call
  const handleLeaveVoice = () => {
    if (socket?.connected) {
      socket.emit("voice-leave", { roomId });
    }
    cleanupVoice();
    toast("Left voice call", { icon: "📞" });
  };

  // Toggle Mute
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

  // Socket event listeners for signaling
  useEffect(() => {
    if (!socket) return;

    // Another user joined voice
    const handleUserJoined = ({ socketId, username: uName }) => {
      setVoiceUsers((prev) => new Set([...prev, socketId]));
      if (inVoice && socketId !== socket.id) {
        toast(`${uName || "A participant"} joined voice`, { icon: "🎙️" });
        createPeer(socketId, true);
      }
    };

    // Received signal from peer
    const handleSignal = async ({ senderSocketId, signal }) => {
      let peer = peersRef.current.get(senderSocketId);
      if (!peer && inVoice) {
        peer = createPeer(senderSocketId, false);
      }
      if (!peer) return;

      try {
        if (signal.description) {
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

    // User left voice
    const handleUserLeft = ({ socketId }) => {
      setVoiceUsers((prev) => {
        const next = new Set(prev);
        next.delete(socketId);
        return next;
      });
      const peer = peersRef.current.get(socketId);
      if (peer) {
        peer.close();
        peersRef.current.delete(socketId);
      }
    };

    socket.on("user-joined-voice", handleUserJoined);
    socket.on("voice-signal", handleSignal);
    socket.on("user-left-voice", handleUserLeft);

    return () => {
      socket.off("user-joined-voice", handleUserJoined);
      socket.off("voice-signal", handleSignal);
      socket.off("user-left-voice", handleUserLeft);
    };
  }, [socket, roomId, inVoice, createPeer]);

  // Teardown on unmount
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
        <span className="text-[10px] bg-emerald-500/20 px-1.5 rounded-full font-bold">
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
