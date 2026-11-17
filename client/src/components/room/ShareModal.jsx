import { useEffect, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { X, Copy, Check } from "lucide-react";
import toast from "react-hot-toast";
import { copyToClipboard } from "../../utils/clipboard.js";
import { useState } from "react";

export default function ShareModal({ url, onClose }) {
  const [copied, setCopied] = useState(false);
  const modalRef = useRef(null);
  const closeBtnRef = useRef(null);

  useEffect(() => {
    closeBtnRef.current?.focus();

    function handleKeyDown(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "Tab") {
        const focusable = modalRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable || focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  async function handleCopy() {
    const ok = await copyToClipboard(url);
    if (ok) {
      setCopied(true);
      toast.success("Room link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error("Failed to copy link");
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-modal-title"
        className="bg-surface border border-border rounded-xl p-6 w-full max-w-sm text-center shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 id="share-modal-title" className="font-semibold text-gray-100 text-base">
            Share Room
          </h2>
          <button
            ref={closeBtnRef}
            onClick={onClose}
            aria-label="Close share dialog"
            className="text-gray-400 hover:text-white p-1 rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="bg-white p-3 rounded-lg inline-block mb-4 shadow-inner">
          <QRCodeSVG value={url} size={180} />
        </div>
        <p className="text-xs text-gray-400 mb-3">
          Anyone with this link can join the collaborative session
        </p>
        <div className="flex items-center gap-2 bg-surface2 border border-border rounded-md px-3 py-2 text-xs text-gray-300 break-all">
          <span className="flex-1 text-left truncate">{url}</span>
          <button
            onClick={handleCopy}
            aria-label="Copy room URL"
            className="text-accent hover:text-blue-400 shrink-0 p-1 rounded focus:outline-none focus:ring-2 focus:ring-accent flex items-center gap-1 font-medium"
          >
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
