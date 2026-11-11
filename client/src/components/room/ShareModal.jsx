import { QRCodeSVG } from "qrcode.react";
import { X, Copy } from "lucide-react";
import toast from "react-hot-toast";

export default function ShareModal({ url, onClose }) {
  function copy() {
    navigator.clipboard.writeText(url);
    toast.success("Room link copied");
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div
        className="bg-surface border border-border rounded-xl p-6 w-full max-w-sm text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-medium">Share Room</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={18} />
          </button>
        </div>
        <div className="bg-white p-3 rounded-lg inline-block mb-4">
          <QRCodeSVG value={url} size={180} />
        </div>
        <div className="flex items-center gap-2 bg-surface2 border border-border rounded-md px-3 py-2 text-xs text-gray-300 break-all">
          <span className="flex-1 text-left">{url}</span>
          <button onClick={copy} className="text-accent shrink-0">
            <Copy size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
