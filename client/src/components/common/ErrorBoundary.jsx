import React from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-bg text-gray-100 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-surface border border-border rounded-2xl p-8 text-center space-y-5 shadow-paper-lg">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto border border-rose-500/20 shadow-paper-sm">
              <AlertTriangle size={26} />
            </div>
            <div className="space-y-1">
              <h1 className="text-xl font-bold font-serif text-gray-100">Something went wrong</h1>
              <p className="text-sm text-gray-400">
                An unexpected error occurred. You can reload the page or return home.
              </p>
            </div>
            {this.state.error?.message && (
              <div className="bg-surface2 border border-border rounded-lg p-3 text-xs text-rose-700 dark:text-rose-300 font-mono text-left overflow-x-auto max-h-32">
                {this.state.error.message}
              </div>
            )}
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex items-center gap-2 bg-accent hover:opacity-90 px-4 py-2.5 rounded-lg text-sm font-medium text-white shadow-paper-sm transition-all focus:outline-none focus:ring-2 focus:ring-accent active:scale-95"
              >
                <RefreshCw size={15} />
                Reload Page
              </button>
              <button
                type="button"
                onClick={this.handleHome}
                className="flex items-center gap-2 border border-border bg-surface2 hover:bg-border/60 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors text-gray-200 hover:text-gray-100 focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <Home size={15} />
                Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
