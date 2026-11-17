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
          <div className="max-w-md w-full bg-surface border border-border rounded-xl p-6 text-center space-y-4 shadow-xl">
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mx-auto border border-red-500/20">
              <AlertTriangle size={24} />
            </div>
            <h1 className="text-xl font-semibold text-gray-100">Something went wrong</h1>
            <p className="text-sm text-gray-400">
              An unexpected error occurred. You can reload the page or return home.
            </p>
            {this.state.error?.message && (
              <div className="bg-surface2 border border-border rounded-md p-3 text-xs text-red-300 font-mono text-left overflow-x-auto max-h-32">
                {this.state.error.message}
              </div>
            )}
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex items-center gap-2 bg-accent hover:bg-blue-600 px-4 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <RefreshCw size={15} />
                Reload Page
              </button>
              <button
                type="button"
                onClick={this.handleHome}
                className="flex items-center gap-2 border border-border hover:border-gray-500 px-4 py-2 rounded-md text-sm font-medium transition-colors text-gray-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-accent"
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
