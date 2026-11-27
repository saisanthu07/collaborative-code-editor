import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Editor from "@monaco-editor/react";
import toast from "react-hot-toast";
import {
  Copy,
  Check,
  GitFork,
  Terminal,
  ArrowLeft,
  Sparkles,
  FileCode,
} from "lucide-react";
import "../config/monaco.js";
import { api } from "../services/api.js";
import { useAuthStore } from "../store/authStore.js";
import { useThemeStore } from "../store/themeStore.js";
import { LANGUAGES, monacoLangFor } from "../constants/languages.js";
import { copyToClipboard } from "../utils/clipboard.js";
import BrandMark from "../components/common/BrandMark.jsx";
import ThemeToggle from "../components/common/ThemeToggle.jsx";
import UserAvatar from "../components/common/UserAvatar.jsx";
import PageLoading from "../components/common/PageLoading.jsx";

export default function SharedSnippet() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuthStore();
  const theme = useThemeStore((s) => s.theme);
  const monacoTheme = theme === "dark" ? "paper-midnight-kraft" : "paper-parchment";

  const [snippet, setSnippet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [forking, setForking] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError("");
    api
      .get(`/compily/public/${slug}`)
      .then(({ data }) => {
        if (mounted) setSnippet(data.snippet);
      })
      .catch((err) => {
        if (mounted) setError(err.response?.data?.error || "Shared snippet not found");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [slug]);

  async function handleCopy() {
    if (!snippet?.code) return;
    const ok = await copyToClipboard(snippet.code);
    if (ok) {
      setCopied(true);
      toast.success("Snippet code copied");
      setTimeout(() => setCopied(false), 1800);
    }
  }

  async function handleFork() {
    if (!user || !token) {
      toast("Sign in to fork this snippet into Compily", { icon: "🔐" });
      navigate("/login", { state: { from: { pathname: `/s/${slug}` } } });
      return;
    }
    setForking(true);
    try {
      const { data } = await api.post(`/compily/public/${slug}/fork`);
      toast.success("Forked to your Compily library!");
      navigate("/compily", { state: { loadSnippetId: data.snippet?._id } });
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not fork snippet");
    } finally {
      setForking(false);
    }
  }

  if (loading) {
    return <PageLoading message="Opening shared Compily snippet..." />;
  }

  const langLabel =
    LANGUAGES.find((l) => l.key === snippet?.language)?.label || snippet?.language || "Code";

  return (
    <div className="min-h-dvh flex flex-col bg-bg text-gray-100">
      <header className="border-b border-border bg-surface/90 backdrop-blur-md sticky top-0 z-30 shadow-paper-sm">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 py-3 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2.5 font-serif font-bold text-lg text-gray-100">
            <BrandMark size={30} className="text-accent" />
            <span>CodeTogether</span>
            <span className="text-[11px] font-mono font-normal px-2 py-0.5 rounded-full bg-accent/10 border border-accent/25 text-accent">
              Compily Share
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            {user && token ? (
              <Link
                to="/compily"
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-surface2 text-gray-200"
              >
                <Terminal size={13} className="text-accent" />
                <span>Open Compily</span>
              </Link>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-lg bg-accent hover:bg-accent-hover text-white"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-10 py-8">
        {error || !snippet ? (
          <div className="max-w-md mx-auto bg-surface border border-border rounded-2xl p-8 text-center shadow-paper space-y-4 mt-10">
            <FileCode size={28} className="mx-auto text-accent" />
            <h1 className="font-serif font-bold text-xl text-gray-100">Snippet Unavailable</h1>
            <p className="text-xs text-gray-400">{error || "This snippet is private or no longer exists."}</p>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold bg-accent text-white px-4 py-2 rounded-xl"
            >
              <ArrowLeft size={13} />
              <span>Return Home</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-surface border border-border rounded-2xl p-5 shadow-paper flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <UserAvatar
                  username={snippet.author?.username || "Developer"}
                  avatar={snippet.author?.avatar || ""}
                  size="md"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="font-serif font-bold text-xl text-gray-100 truncate">
                      {snippet.title}
                    </h1>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-accent2/15 text-accent2 border border-accent2/30">
                      {langLabel}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">
                    Shared by @{snippet.author?.username || "Developer"} · Updated{" "}
                    {new Date(snippet.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-surface2 hover:bg-border text-xs font-medium text-gray-200 transition-colors"
                >
                  {copied ? <Check size={13} className="text-accent2" /> : <Copy size={13} />}
                  <span>{copied ? "Copied" : "Copy Code"}</span>
                </button>
                <button
                  type="button"
                  onClick={handleFork}
                  disabled={forking}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold shadow-paper-sm transition-all active:scale-95 disabled:opacity-60"
                >
                  <GitFork size={14} />
                  <span>{forking ? "Forking..." : "Fork to Compily"}</span>
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-surface shadow-paper-lg overflow-hidden">
              <div className="px-4 py-2.5 bg-surface2 border-b border-border flex items-center justify-between text-xs font-mono text-gray-400">
                <span className="flex items-center gap-1.5">
                  <Sparkles size={12} className="text-accent" />
                  Read-Only Preview
                </span>
                <span>{snippet.code?.split("\n").length || 1} lines</span>
              </div>
              <div className="h-[460px] bg-paper-editor">
                <Editor
                  height="100%"
                  theme={monacoTheme}
                  language={monacoLangFor(snippet.language)}
                  value={snippet.code || ""}
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    fontSize: 13.5,
                    scrollBeyondLastLine: false,
                    padding: { top: 14, bottom: 14 },
                  }}
                />
              </div>
            </div>

            {snippet.stdin && (
              <div className="rounded-2xl border border-border bg-surface p-4 shadow-paper-sm space-y-1.5">
                <div className="text-[11px] font-mono uppercase tracking-wider text-gray-400 font-semibold">
                  Sample Stdin
                </div>
                <pre className="text-xs font-mono text-gray-200 bg-paper-console border border-border rounded-xl p-3 overflow-x-auto">
                  {snippet.stdin}
                </pre>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
