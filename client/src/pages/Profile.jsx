import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { User, KeyRound, Laptop, LogOut, Trash2, AtSign, Copy, Check, ArrowLeft } from "lucide-react";
import { api } from "../services/api.js";
import { useAuthStore } from "../store/authStore.js";
import Navbar from "../components/common/Navbar.jsx";
import { copyToClipboard } from "../utils/clipboard.js";
import { colorForUser } from "../utils/color.js";

export default function Profile() {
  const { user, updateUser, logout } = useAuthStore();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name || "");
  const [avatar, setAvatar] = useState(user?.avatar || "");
  const [copiedUsername, setCopiedUsername] = useState(false);
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "" });
  const [sessions, setSessions] = useState([]);
  const [deletePassword, setDeletePassword] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  async function loadSessions() {
    try {
      const { data } = await api.get("/auth/sessions");
      setSessions(data.sessions || []);
    } catch {
      // non-fatal
    }
  }

  useEffect(() => {
    loadSessions();
  }, []);

  async function saveProfile(e) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const { data } = await api.patch("/auth/me", { name, avatar });
      updateUser(data.user);
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not update profile");
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
      toast.error(err.response?.data?.error || "Could not change password");
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

  return (
    <div className="min-h-dvh bg-bg text-gray-100 flex flex-col">
      <Navbar />
      <main className="max-w-lg mx-auto px-4 sm:px-6 py-8 space-y-8 flex-1 w-full">
        <div>
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-accent/15 border border-accent/25 flex items-center justify-center text-accent">
                <User size={18} />
              </div>
              <h1 className="text-xl font-bold font-serif text-gray-100">User Profile</h1>
            </div>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-gray-100 px-2.5 py-1.5 rounded-lg border border-border bg-surface hover:bg-surface2 transition-colors shadow-paper-sm"
            >
              <ArrowLeft size={13} />
              <span>Dashboard</span>
            </Link>
          </div>

          <div className="mb-4 bg-surface border border-border rounded-2xl p-4 sm:p-5 shadow-paper flex items-center justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.username}
                  className="w-11 h-11 rounded-xl object-cover border border-border shrink-0"
                />
              ) : (
                <div
                  style={{ backgroundColor: colorForUser(user?.username || "User") }}
                  className="w-11 h-11 rounded-xl text-white font-serif font-bold text-lg flex items-center justify-center uppercase shrink-0 shadow-paper-sm"
                >
                  {(user?.username || "U").slice(0, 1)}
                </div>
              )}
              <div className="min-w-0">
                <div className="font-semibold font-serif text-base text-gray-100 truncate">
                  {user?.name || user?.username}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400 font-mono truncate">
                  <span className="text-accent">@{user?.username}</span>
                  {user?.email && <span className="text-gray-500 truncate">· {user.email}</span>}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCopyUsername}
              aria-label="Copy username"
              title="Copy username for room invites"
              className="inline-flex items-center gap-1.5 text-xs font-mono bg-surface2 hover:bg-border border border-border px-2.5 py-1.5 rounded-lg text-gray-200 transition-colors shrink-0"
            >
              {copiedUsername ? (
                <Check size={13} className="text-accent2" />
              ) : (
                <Copy size={13} />
              )}
              <span>{copiedUsername ? "Copied" : "Copy"}</span>
            </button>
          </div>

          <form onSubmit={saveProfile} className="space-y-4 bg-surface border border-border rounded-2xl p-6 shadow-paper">
            <div>
              <label htmlFor="profile-username" className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5 font-mono">
                Username <span className="text-gray-500 font-sans lowercase font-normal">(public handle)</span>
              </label>
              <div className="relative">
                <AtSign size={14} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  id="profile-username"
                  type="text"
                  readOnly
                  value={user?.username || ""}
                  className="w-full bg-surface2/60 border border-border rounded-lg pl-8 pr-3.5 py-2 text-sm text-gray-400 font-mono cursor-default focus:outline-none"
                />
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                Used for room invites, live editor cursors, chat, and login.
              </p>
            </div>
            <div>
              <label htmlFor="profile-name" className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5 font-mono">
                Full Name
              </label>
              <input
                id="profile-name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-surface2 border border-border rounded-lg px-3.5 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent shadow-paper-sm"
              />
            </div>
            <div>
              <label htmlFor="profile-avatar" className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5 font-mono">
                Avatar URL <span className="text-gray-500 font-sans lowercase font-normal">(https://...)</span>
              </label>
              <input
                id="profile-avatar"
                type="url"
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                className="w-full bg-surface2 border border-border rounded-lg px-3.5 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent shadow-paper-sm"
                placeholder="https://example.com/avatar.png"
              />
            </div>
            <div className="pt-1">
              <button
                type="submit"
                disabled={savingProfile}
                className="bg-accent px-5 py-2.5 rounded-lg text-xs font-semibold text-white shadow-paper-sm hover:opacity-90 disabled:opacity-60 transition-all focus:outline-none focus:ring-2 focus:ring-accent active:scale-95"
              >
                {savingProfile ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </form>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-accent/15 border border-accent/25 flex items-center justify-center text-accent">
              <KeyRound size={18} />
            </div>
            <h2 className="text-xl font-bold font-serif text-gray-100">Change Password</h2>
          </div>
          <form onSubmit={savePassword} className="space-y-4 bg-surface border border-border rounded-2xl p-6 shadow-paper">
            <div>
              <label htmlFor="profile-current-password" className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5 font-mono">
                Current Password
              </label>
              <input
                id="profile-current-password"
                type="password"
                autoComplete="current-password"
                required
                value={passwords.currentPassword}
                onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                className="w-full bg-surface2 border border-border rounded-lg px-3.5 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent shadow-paper-sm"
              />
            </div>
            <div>
              <label htmlFor="profile-new-password" className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5 font-mono">
                New Password
              </label>
              <input
                id="profile-new-password"
                type="password"
                autoComplete="new-password"
                required
                value={passwords.newPassword}
                onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                className="w-full bg-surface2 border border-border rounded-lg px-3.5 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent shadow-paper-sm"
              />
            </div>
            <div className="pt-1">
              <button
                type="submit"
                disabled={savingPassword}
                className="bg-accent px-5 py-2.5 rounded-lg text-xs font-semibold text-white shadow-paper-sm hover:opacity-90 disabled:opacity-60 transition-all focus:outline-none focus:ring-2 focus:ring-accent active:scale-95"
              >
                {savingPassword ? "Updating..." : "Update Password"}
              </button>
            </div>
          </form>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-accent/15 border border-accent/25 flex items-center justify-center text-accent">
                <Laptop size={18} />
              </div>
              <h2 className="text-xl font-bold font-serif text-gray-100">Active Sessions</h2>
            </div>
            <button
              type="button"
              onClick={handleLogoutAll}
              className="flex items-center gap-1.5 text-xs text-rose-500 hover:bg-rose-500/10 border border-rose-500/30 px-3 py-1.5 rounded-lg font-semibold"
            >
              <LogOut size={13} />
              <span>Sign Out All</span>
            </button>
          </div>
          <div className="bg-surface border border-border rounded-2xl divide-y divide-border overflow-hidden shadow-paper">
            {sessions.length === 0 ? (
              <div className="p-4 text-xs text-gray-400">No active refresh sessions recorded.</div>
            ) : (
              sessions.map((s) => (
                <div key={s._id} className="flex items-center justify-between px-4 py-3 text-xs">
                  <div className="min-w-0 pr-3">
                    <div className="text-gray-200 font-medium truncate">
                      {s.userAgent || "Web Browser Session"}
                    </div>
                    <div className="text-gray-500 font-mono text-[10px]">
                      Started {new Date(s.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRevokeSession(s._id)}
                    className="text-rose-500 hover:bg-rose-500/10 px-2.5 py-1 rounded-lg font-semibold shrink-0"
                  >
                    Revoke
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-rose-500/15 border border-rose-500/25 flex items-center justify-center text-rose-500">
              <Trash2 size={18} />
            </div>
            <h2 className="text-xl font-bold font-serif text-rose-400">Danger Zone</h2>
          </div>
          <form onSubmit={handleDeleteAccount} className="space-y-4 bg-surface border border-rose-500/30 rounded-2xl p-6 shadow-paper">
            <p className="text-xs text-gray-400 leading-relaxed">
              Permanently delete your account, owned rooms, and active sessions. Enter your password to confirm.
            </p>
            <input
              type="password"
              required
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="Confirm your password"
              className="w-full bg-surface2 border border-border rounded-lg px-3.5 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
            <button
              type="submit"
              disabled={deletingAccount || !deletePassword}
              className="bg-rose-600 hover:bg-rose-500 px-5 py-2.5 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
            >
              {deletingAccount ? "Deleting..." : "Delete My Account"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
