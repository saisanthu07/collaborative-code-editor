import { Link } from "react-router-dom";
import { Code2, ArrowLeft } from "lucide-react";
import { useAuthStore } from "../store/authStore.js";

export default function NotFound() {
  const { token } = useAuthStore();
  const backTarget = token ? "/dashboard" : "/";
  const backLabel = token ? "Back to Dashboard" : "Back to Home";

  return (
    <div className="min-h-screen bg-bg text-gray-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex items-center justify-center gap-2">
          <Code2 className="text-accent" size={36} />
          <span className="text-2xl font-bold tracking-tight">CodeTogether</span>
        </div>
        <div className="space-y-2">
          <div className="text-7xl font-extrabold text-accent">404</div>
          <h1 className="text-2xl font-semibold">Page not found</h1>
          <p className="text-gray-400 text-sm">
            Sorry, we couldn't find the page you're looking for. It might have been moved or removed.
          </p>
        </div>
        <div>
          <Link
            to={backTarget}
            className="inline-flex items-center gap-2 bg-accent hover:bg-blue-600 px-5 py-2.5 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <ArrowLeft size={16} />
            {backLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
