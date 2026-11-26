import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  User,
  KeyRound,
  Laptop,
  LogOut,
  Trash2,
  AtSign,
  Copy,
  Check,
  ArrowLeft,
  Feather,
  Mail,
  Shield,
  Eye,
  EyeOff,
  Link2,
  AlertTriangle,
  Clock,
  Monitor,
  Smartphone,
  BadgeCheck,
  Send,
} from "lucide-react";
import { api } from "../services/api.js";
import { useAuthStore } from "../store/authStore.js";
import Navbar from "../components/common/Navbar.jsx";
import { copyToClipboard } from "../utils/clipboard.js";
import { colorForUser } from "../utils/color.js";

function parseSessionLabel(ua = "") {
  if (!ua) return { label: "Web Browser Session", isMobile: false };
  const isMobile = /mobile|android|iphone|ipad/i.test(ua);
  const browser = /edg/i.test(ua)
    ? "Edge"
    : /chrome|crios/i.test(ua)
    ? "Chrome"
    : /firefox|fxios/i.test(ua)
    ? "Firefox"
    : /safari/i.test(ua)
    ? "Safari"
    : "Browser";
  const os = /mac os x|macintosh/i.test(ua)
    ? "macOS"
    : /windows/i.test(ua)
    ? "Windows"
    : /iphone|ipad/i.test(ua)
    ? "iOS"
    : /android/i.test(ua)
    ? "Android"
    : /linux/i.test(ua)
    ? "Linux"
    : "Device";
  return { label: `${browser} on ${os}`, isMobile };
}

export default function Profile() {
  const { user, updateUser, logout } = useAuthStore();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name || "");
  const [avatar, setAvatar] = useState(user?.avatar || "");
  const [avatarError, setAvatarError] = useState(false);
  const [copiedUsername, setCopiedUsername] = useState(false);

  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "" });
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  const [deletePassword, setDeletePassword] = useState("");
  const [showDeletePw, setShowDeletePw] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [resendingVerify, setResendingVerify] = useState(false);
  const [devVerifyToken, setDevVerifyToken] = useState("");

  useEffect(() => {
    setAvatarError(false);
  }, [avatar]);

  async function loadSessions() {
    setSessionsLoading(true);
    try {
      const { data } = await api.get("/auth/sessions");
      setSessions(data.sessions || []);
    } catch {
      // non-fatal
    } finally {
      setSessionsLoading(false);
    }
  }

  useEffect(() => {
    loadSessions();
  }, []);

  const profileDirty =
    name.trim() !== (user?.name || "") || avatar.trim() !== (user?.avatar || "");

  const passwordChecks = useMemo(
    () => [
      { label: "8+ chars", met: passwords.newPassword.length >= 8 },
      { label: "Uppercase", met: /[A-Z]/.test(passwords.newPassword) },
      { label: "Lowercase", met: /[a-z]/.test(passwords.newPassword) },
      { label: "Number", met: /[0-9]/.test(passwords.newPassword) },
    ],
    [passwords.newPassword]
  );

  async function saveProfile(e) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const { data } = await api.patch("/auth/me", { name, avatar });
      updateUser(data.user);
      toast.success("Profile updated");
    } catch (err) {
      const details = err.response?.data?.details;
      toast.error(details?.[0]?.message || err.response?.data?.error || "Could not update profile");
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePassword(e) {
    e.preventDefault();
    setSavingPassword(true);
    try {
      await api.patch("/auth/me/password", passwords);
      toast.success("Password changed. Please sign in again.");
      logout();
      navigate("/login");
    } catch (err) {
      const details = err.response?.data?.details;
      toast.error(details?.[0]?.message || err.response?.data?.error || "Could not change password");
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleRevokeSession(sessionId) {
    try {
      await api.delete(`/auth/sessions/${sessionId}`);
      toast.success("Session revoked");
      loadSessions();
    } catch {
      toast.error("Could not revoke session");
    }
  }

  async function handleLogoutAll() {
    try {
      await api.post("/auth/logout-all");
      toast.success("Signed out of all devices");
      logout();
      navigate("/login");
    } catch {
      toast.error("Could not sign out of all sessions");
    }
  }

  async function handleDeleteAccount(e) {
    e.preventDefault();
    if (!deletePassword) return;
    setDeletingAccount(true);
    try {
      await api.delete("/auth/me", { data: { password: deletePassword } });
      toast.success("Account deleted");
      logout();
      navigate("/");
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not delete account");
    } finally {
      setDeletingAccount(false);
    }
  }

  async function handleCopyUsername() {
    if (!user?.username) return;
    const ok = await copyToClipboard(user.username);
    if (ok) {
      setCopiedUsername(true);
      toast.success("Username copied");
      setTimeout(() => setCopiedUsername(false), 1800);
    }
  }

  async function handleResendVerification() {
    setResendingVerify(true);
    try {
      const { data } = await api.post("/auth/resend-verification");
      if (data.alreadyVerified) {
        updateUser({ ...user, emailVerified: true });
        toast.success("Your email is already verified");
      } else {
        setDevVerifyToken(data.devVerifyToken || "");
        toast.success("Verification instructions sent");
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not send verification email");
    } finally {
      setResendingVerify(false);
    }
  }

  const displayName = name.trim() || user?.name || user?.username || "Developer";
  const previewAvatar = avatar.trim();
  const showAvatarImage = Boolean(previewAvatar) && !avatarError;
  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, {
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <div className="min-h-dvh bg-bg text-gray-100 flex flex-col relative overflow-x-hidden selection:bg-accent/25">
      {/* Subtle editorial radial paper glow */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-24 w-96 h-96 rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-24 w-96 h-96 rounded-full bg-accent2/10 blur-3xl" />
      </div>

      <Navbar />

      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10 flex-1 w-full space-y-7">
        {/* Top Breadcrumb & Title */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-surface text-accent text-xs font-medium shadow-paper-sm">
              <Feather size={12} aria-hidden="true" />
              <span>Account &amp; Security</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold font-serif tracking-tight text-gray-100">
              Developer Profile
            </h1>
            <p className="text-sm text-gray-400">
              Manage your public collaborative identity, password credentials, and active device sessions.
            </p>
          </div>

          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-300 hover:text-gray-100 px-3.5 py-2 rounded-xl border border-border bg-surface hover:bg-surface2 transition-colors shadow-paper-sm w-fit shrink-0"
          >
            <ArrowLeft size={14} />
            <span>Back to Dashboard</span>
          </Link>
        </div>

        {/* Identity Summary Banner */}
        <section className="bg-surface border border-border rounded-2xl p-5 sm:p-6 shadow-paper flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-center gap-4 min-w-0">
            {showAvatarImage ? (
              <img
                src={previewAvatar}
                alt={user?.username || "Avatar"}
                onError={() => setAvatarError(true)}
                className="w-16 h-16 rounded-2xl object-cover border border-border shadow-paper-sm shrink-0 bg-surface2"
              />
            ) : (
              <div
                style={{ backgroundColor: colorForUser(user?.username || "User") }}
                className="w-16 h-16 rounded-2xl text-white font-serif font-bold text-2xl flex items-center justify-center uppercase shrink-0 shadow-paper-sm"
              >
                {(user?.username || "U").slice(0, 1)}
              </div>
            )}

            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-bold font-serif text-xl text-gray-100 truncate">
                  {displayName}
                </h2>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono border ${
                    user?.role === "ADMIN"
                      ? "bg-accent/15 text-accent border-accent/30 font-semibold"
                      : "bg-accent2/15 text-accent2 border-accent2/30 font-medium"
                  }`}
                >
                  <Shield size={10} />
                  <span>{user?.role === "ADMIN" ? "Admin" : "Member"}</span>
                </span>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap text-xs text-gray-400">
                <button
                  type="button"
                  onClick={handleCopyUsername}
                  title="Copy username for room invites"
                  className="inline-flex items-center gap-1.5 font-mono text-accent bg-accent/10 hover:bg-accent/15 border border-accent/25 px-2.5 py-0.5 rounded-full transition-colors"
                >
                  <span>@{user?.username}</span>
                  {copiedUsername ? (
                    <Check size={11} className="text-accent2" />
                  ) : (
                    <Copy size={11} />
                  )}
                </button>
                {user?.email && (
                  <span className="inline-flex items-center gap-1.5 font-mono text-gray-400 truncate">
                    <Mail size={12} className="text-gray-500 shrink-0" />
                    <span className="truncate">{user.email}</span>
                    {user.emailVerified ? (
                      <span
                        title="Email verified"
                        className="inline-flex items-center gap-0.5 text-[10px] text-accent2 bg-accent2/10 border border-accent2/25 px-1.5 py-0 rounded-full font-sans font-semibold"
                      >
                        <BadgeCheck size={10} /> Verified
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendVerification}
                        disabled={resendingVerify}
                        className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-2 py-0 rounded-full font-sans font-semibold transition-colors"
                      >
                        <Send size={9} />
                        <span>{resendingVerify ? "Sending..." : "Verify email"}</span>
                      </button>
                    )}
                  </span>
                )}
              </div>
              {devVerifyToken && !user?.emailVerified && (
                <div className="pt-1.5 text-[11px] font-mono text-amber-600 dark:text-amber-400 flex items-center gap-2 flex-wrap">
                  <span>Dev verify token:</span>
                  <Link
                    to={`/verify-email?token=${encodeURIComponent(devVerifyToken)}`}
                    className="underline font-semibold hover:text-accent"
                  >
                    Click to verify email
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Account Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 divide-x divide-border bg-surface2/60 border border-border rounded-xl shrink-0">
            <div className="px-4 py-2.5 text-center">
              <div className="text-base font-bold font-serif text-gray-100">
                {sessionsLoading ? "—" : sessions.length}
              </div>
              <div className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">
                Sessions
              </div>
            </div>
            <div className="px-4 py-2.5 text-center">
              <div className="text-base font-bold font-serif text-accent2">Active</div>
              <div className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">
                Status
              </div>
            </div>
            <div className="col-span-2 sm:col-span-1 border-t sm:border-t-0 border-border px-4 py-2.5 text-center">
              <div className="text-base font-bold font-serif text-gray-100">
                {memberSince || "Member"}
              </div>
              <div className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">
                Joined
              </div>
            </div>
          </div>
        </section>

        {/* Two-Column Settings Grid */}
        <div className="grid lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Public Profile & Password */}
          <div className="lg:col-span-7 space-y-6">
            {/* Public Profile Card */}
            <section className="bg-surface border border-border rounded-2xl shadow-paper overflow-hidden">
              <div className="px-6 py-4 bg-surface2/50 border-b border-border flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-accent/15 border border-accent/25 flex items-center justify-center text-accent shrink-0">
                  <User size={16} />
                </div>
                <div>
                  <h2 className="font-bold font-serif text-base text-gray-100">
                    Public Identity
                  </h2>
                  <p className="text-xs text-gray-400">
                    How collaborators see you in rooms, chat, and invites
                  </p>
                </div>
              </div>

              <form onSubmit={saveProfile} className="p-6 space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="profile-username"
                      className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5 font-mono"
                    >
                      Username <span className="text-gray-500 font-sans lowercase font-normal">(handle)</span>
                    </label>
                    <div className="relative">
                      <AtSign
                        size={14}
                        aria-hidden="true"
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                      />
                      <input
                        id="profile-username"
                        type="text"
                        readOnly
                        value={user?.username || ""}
                        className="w-full bg-surface2/60 border border-border rounded-xl pl-8 pr-3 py-2.5 text-sm text-gray-400 font-mono cursor-default focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="profile-email"
                      className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5 font-mono"
                    >
                      Email <span className="text-gray-500 font-sans lowercase font-normal">(private)</span>
                    </label>
                    <div className="relative">
                      <Mail
                        size={14}
                        aria-hidden="true"
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                      />
                      <input
                        id="profile-email"
                        type="email"
                        readOnly
                        value={user?.email || ""}
                        className="w-full bg-surface2/60 border border-border rounded-xl pl-8 pr-3 py-2.5 text-sm text-gray-400 font-mono cursor-default focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-gray-500 -mt-1">
                  Your <span className="font-mono text-gray-400">@{user?.username}</span> handle is used for room invites, live editor cursors, chat, and sign-in.
                </p>

                <div>
                  <label
                    htmlFor="profile-name"
                    className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5 font-mono"
                  >
                    Full Name
                  </label>
                  <input
                    id="profile-name"
                    type="text"
                    autoComplete="name"
                    required
                    maxLength={100}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-surface2/75 hover:bg-surface2 focus:bg-surface border border-border rounded-xl px-3.5 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent/35 focus:border-accent transition-all shadow-paper-sm"
                    placeholder="Your display name"
                  />
                </div>

                <div>
                  <label
                    htmlFor="profile-avatar"
                    className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5 font-mono"
                  >
                    Avatar URL{" "}
                    <span className="text-gray-500 font-sans lowercase font-normal">(https://...)</span>
                  </label>
                  <div className="relative">
                    <Link2
                      size={15}
                      aria-hidden="true"
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
                    />
                    <input
                      id="profile-avatar"
                      type="url"
                      value={avatar}
                      onChange={(e) => setAvatar(e.target.value)}
                      className="w-full bg-surface2/75 hover:bg-surface2 focus:bg-surface border border-border rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent/35 focus:border-accent transition-all shadow-paper-sm"
                      placeholder="https://example.com/avatar.png"
                    />
                  </div>
                  {avatarError && previewAvatar && (
                    <p className="text-[11px] text-amber-500 mt-1">
                      Could not load image preview from that URL — fallback initial badge is shown above.
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-border/70 flex items-center justify-between gap-3">
                  <span className="text-[11px] text-gray-500">
                    {profileDirty ? "Unsaved changes" : "All changes saved"}
                  </span>
                  <button
                    type="submit"
                    disabled={savingProfile || !profileDirty}
                    className="bg-accent hover:bg-accent-hover px-5 py-2 rounded-xl text-xs font-semibold text-white shadow-paper-sm disabled:opacity-50 transition-all focus:outline-none focus:ring-2 focus:ring-accent active:scale-95"
                  >
                    {savingProfile ? "Saving..." : "Save Profile"}
                  </button>
                </div>
              </form>
            </section>

            {/* Password Card */}
            <section className="bg-surface border border-border rounded-2xl shadow-paper overflow-hidden">
              <div className="px-6 py-4 bg-surface2/50 border-b border-border flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-accent2/15 border border-accent2/25 flex items-center justify-center text-accent2 shrink-0">
                  <KeyRound size={16} />
                </div>
                <div>
                  <h2 className="font-bold font-serif text-base text-gray-100">
                    Password &amp; Authentication
                  </h2>
                  <p className="text-xs text-gray-400">
                    Updating your password signs out all other active devices
                  </p>
                </div>
              </div>

              <form onSubmit={savePassword} className="p-6 space-y-4">
                <div>
                  <label
                    htmlFor="profile-current-password"
                    className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5 font-mono"
                  >
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      id="profile-current-password"
                      type={showCurrentPw ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      value={passwords.currentPassword}
                      onChange={(e) =>
                        setPasswords({ ...passwords, currentPassword: e.target.value })
                      }
                      className="w-full bg-surface2/75 hover:bg-surface2 focus:bg-surface border border-border rounded-xl pl-3.5 pr-10 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent/35 focus:border-accent transition-all shadow-paper-sm"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPw((v) => !v)}
                      aria-label={showCurrentPw ? "Hide current password" : "Show current password"}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-100 rounded-lg hover:bg-surface2 transition-colors"
                    >
                      {showCurrentPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="profile-new-password"
                    className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5 font-mono"
                  >
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      id="profile-new-password"
                      type={showNewPw ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      value={passwords.newPassword}
                      onChange={(e) =>
                        setPasswords({ ...passwords, newPassword: e.target.value })
                      }
                      className="w-full bg-surface2/75 hover:bg-surface2 focus:bg-surface border border-border rounded-xl pl-3.5 pr-10 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent/35 focus:border-accent transition-all shadow-paper-sm"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPw((v) => !v)}
                      aria-label={showNewPw ? "Hide new password" : "Show new password"}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-100 rounded-lg hover:bg-surface2 transition-colors"
                    >
                      {showNewPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {passwordChecks.map(({ label, met }) => (
                      <span
                        key={label}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono border transition-colors ${
                          met
                            ? "bg-accent2/15 text-accent2 border-accent2/30 font-semibold"
                            : "bg-surface2/70 text-gray-500 border-border"
                        }`}
                      >
                        {met ? (
                          <Check size={10} aria-hidden="true" />
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-500/60" />
                        )}
                        <span>{label}</span>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-border/70 flex justify-end">
                  <button
                    type="submit"
                    disabled={savingPassword}
                    className="bg-accent hover:bg-accent-hover px-5 py-2 rounded-xl text-xs font-semibold text-white shadow-paper-sm disabled:opacity-60 transition-all focus:outline-none focus:ring-2 focus:ring-accent active:scale-95"
                  >
                    {savingPassword ? "Updating..." : "Update Password"}
                  </button>
                </div>
              </form>
            </section>
          </div>

          {/* Right Column: Active Sessions & Danger Zone */}
          <div className="lg:col-span-5 space-y-6">
            {/* Active Sessions Card */}
            <section className="bg-surface border border-border rounded-2xl shadow-paper overflow-hidden">
              <div className="px-5 py-4 bg-surface2/50 border-b border-border flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-accent/15 border border-accent/25 flex items-center justify-center text-accent shrink-0">
                    <Laptop size={16} />
                  </div>
                  <div>
                    <h2 className="font-bold font-serif text-base text-gray-100">
                      Active Sessions
                    </h2>
                    <p className="text-[11px] text-gray-400">
                      Signed-in browsers &amp; refresh tokens
                    </p>
                  </div>
                </div>

                {sessions.length > 0 && (
                  <button
                    type="button"
                    onClick={handleLogoutAll}
                    className="inline-flex items-center gap-1 text-[11px] text-rose-500 hover:bg-rose-500/10 border border-rose-500/30 px-2.5 py-1.5 rounded-lg font-semibold transition-colors shrink-0"
                  >
                    <LogOut size={12} />
                    <span>Sign Out All</span>
                  </button>
                )}
              </div>

              <div className="divide-y divide-border">
                {sessionsLoading ? (
                  <div className="p-4 space-y-3 animate-pulse">
                    <div className="h-10 bg-surface2 rounded-xl" />
                    <div className="h-10 bg-surface2 rounded-xl" />
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="p-5 text-center text-xs text-gray-400">
                    No active refresh sessions recorded.
                  </div>
                ) : (
                  sessions.map((s) => {
                    const { label, isMobile } = parseSessionLabel(s.userAgent);
                    const Icon = isMobile ? Smartphone : Monitor;
                    return (
                      <div
                        key={s._id}
                        className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-surface2/35 transition-colors"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-surface2 border border-border flex items-center justify-center text-gray-400 shrink-0 mt-0.5">
                            <Icon size={14} />
                          </div>
                          <div className="min-w-0">
                            <div
                              className="text-xs font-semibold text-gray-200 truncate"
                              title={s.userAgent || "Web Browser Session"}
                            >
                              {label}
                            </div>
                            <div className="flex items-center gap-1 text-gray-500 font-mono text-[10px] mt-0.5">
                              <Clock size={10} />
                              <span>{new Date(s.createdAt).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRevokeSession(s._id)}
                          className="text-[11px] text-rose-500 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/25 px-2.5 py-1 rounded-lg font-semibold shrink-0 transition-colors"
                        >
                          Revoke
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            {/* Danger Zone Card */}
            <section className="bg-surface border border-rose-500/30 rounded-2xl shadow-paper overflow-hidden">
              <div className="px-5 py-4 bg-rose-500/5 border-b border-rose-500/20 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-500/15 border border-rose-500/25 flex items-center justify-center text-rose-500 shrink-0">
                  <Trash2 size={16} />
                </div>
                <div>
                  <h2 className="font-bold font-serif text-base text-rose-500 dark:text-rose-400">
                    Danger Zone
                  </h2>
                  <p className="text-[11px] text-gray-400">
                    Irreversible account &amp; data removal
                  </p>
                </div>
              </div>

              <form onSubmit={handleDeleteAccount} className="p-5 space-y-4">
                <div className="flex items-start gap-2.5 text-xs text-gray-400 leading-relaxed bg-surface2/60 border border-border rounded-xl p-3">
                  <AlertTriangle size={15} className="text-rose-500 shrink-0 mt-0.5" />
                  <span>
                    Deleting your account permanently erases your owned rooms, code files, checkpoints, and active sessions.
                  </span>
                </div>

                {!confirmDeleteOpen ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteOpen(true)}
                    className="w-full py-2 px-4 rounded-xl text-xs font-semibold text-rose-500 border border-rose-500/35 hover:bg-rose-500/10 transition-colors"
                  >
                    I want to delete my account...
                  </button>
                ) : (
                  <div className="space-y-3 pt-1">
                    <div>
                      <label
                        htmlFor="delete-account-password"
                        className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5 font-mono"
                      >
                        Confirm Password
                      </label>
                      <div className="relative">
                        <input
                          id="delete-account-password"
                          type={showDeletePw ? "text" : "password"}
                          required
                          value={deletePassword}
                          onChange={(e) => setDeletePassword(e.target.value)}
                          placeholder="Enter password to confirm"
                          className="w-full bg-surface2/75 border border-border rounded-xl pl-3.5 pr-10 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowDeletePw((v) => !v)}
                          aria-label={showDeletePw ? "Hide password" : "Show password"}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-100 rounded-lg"
                        >
                          {showDeletePw ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmDeleteOpen(false);
                          setDeletePassword("");
                        }}
                        className="flex-1 py-2 px-3 rounded-xl text-xs font-medium text-gray-300 hover:text-gray-100 bg-surface2 hover:bg-border border border-border transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={deletingAccount || !deletePassword}
                        className="flex-1 bg-rose-600 hover:bg-rose-500 py-2 px-3 rounded-xl text-xs font-semibold text-white disabled:opacity-50 transition-all active:scale-95"
                      >
                        {deletingAccount ? "Deleting..." : "Delete Account"}
                      </button>
                    </div>
                  </div>
                )}
              </form>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
