import { useState, useEffect, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Check, X, Share2 } from "lucide-react";
import toast from "react-hot-toast";
import { copyToClipboard } from "../../utils/clipboard.js";

export default function ShareModal({ url = "", onClose }) {
  const [copied, setCopied] = useState(false);
  const modalRef = useRef(null);
  const closeBtnRef = useRef(null);
  const shareUrl = url || (typeof window !== "undefined" ? window.location.href : "");

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
    const ok = await copyToClipboard(shareUrl);
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
      className="fixed inset-0 bg-stone-900/40 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-modal-title"
        className="bg-surface border border-border rounded-2xl p-6 sm:p-7 w-full max-w-sm text-center shadow-paper-lg animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent/15 border border-accent/25 flex items-center justify-center text-accent">
              <Share2 size={16} />
            </div>
            <h2 id="share-modal-title" className="font-semibold font-serif text-gray-100 text-base">
              Share Session
            </h2>
          </div>
          <button
            ref={closeBtnRef}
            onClick={onClose}
            aria-label="Close share dialog"
            className="text-gray-400 hover:text-gray-100 hover:bg-surface2 p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent transition-colors"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="bg-white p-3.5 rounded-2xl inline-block mb-4 shadow-paper border border-stone-200 dark:border-stone-700">
          <QRCodeSVG value={shareUrl} size={180} fgColor="#191816" bgColor="#ffffff" />
        </div>

        <p className="text-xs text-gray-400 mb-3.5 leading-relaxed font-sans">
          Anyone with this link can join the collaborative session
        </p>

        <div className="flex items-center gap-2 bg-surface2 border border-border rounded-lg px-3 py-2 text-xs text-gray-300 break-all shadow-paper-sm">
          <span className="flex-1 text-left truncate font-mono text-[11px]">{shareUrl}</span>
          <button
            onClick={handleCopy}
            aria-label="Copy room URL"
            className="text-accent hover:opacity-80 shrink-0 p-1 rounded-md focus:outline-none focus:ring-2 focus:ring-accent flex items-center gap-1 font-semibold text-xs active:scale-95"
          >
            {copied ? <Check size={14} className="text-emerald-600 dark:text-emerald-400" /> : <Copy size={14} />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
