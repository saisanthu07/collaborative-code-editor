import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAuthStore } from "../store/authStore.js";
import ThemeToggle from "../components/common/ThemeToggle.jsx";
import BrandMark from "../components/common/BrandMark.jsx";

export default function NotFound() {
  const { token } = useAuthStore();
  const backTarget = token ? "/dashboard" : "/";
  const backLabel = token ? "Back to Dashboard" : "Back to Home";

  return (
    <div className="min-h-screen bg-bg text-gray-100 flex flex-col justify-between p-6 relative overflow-x-hidden">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-24 w-96 h-96 rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-24 w-96 h-96 rounded-full bg-accent2/10 blur-3xl" />
      </div>

      <div className="relative z-10 flex justify-end max-w-md w-full mx-auto">
        <ThemeToggle compact />
      </div>

      <div className="relative z-10 max-w-md w-full mx-auto bg-surface border border-border rounded-2xl p-8 sm:p-10 text-center space-y-6 shadow-paper-lg my-auto">
        <div className="flex items-center justify-center gap-2.5">
          <BrandMark size={34} className="text-accent" />
          <span className="text-xl font-bold font-serif tracking-tight">CodeTogether</span>
        </div>
        <div className="space-y-2">
          <div className="text-6xl font-extrabold font-serif text-accent tracking-tighter">404</div>
          <h1 className="text-xl font-bold font-serif text-gray-100">Document Not Found</h1>
          <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">
            The manuscript or room page you are looking for does not exist, or has been archived.
          </p>
        </div>
        <div className="pt-2">
          <Link
            to={backTarget}
            className="inline-flex items-center gap-2 bg-accent hover:bg-accent-hover px-5 py-2.5 rounded-xl text-xs font-semibold text-white shadow-paper hover:shadow-paper-md transition-all focus:outline-none focus:ring-2 focus:ring-accent active:scale-95"
          >
            <ArrowLeft size={15} />
            <span>{backLabel}</span>
          </Link>
        </div>
      </div>

      <div className="relative z-10 text-center text-[11px] text-gray-500 font-serif">
        <span>CodeTogether · Editorial Parchment &amp; Midnight Kraft</span>
      </div>
    </div>
  );
}
