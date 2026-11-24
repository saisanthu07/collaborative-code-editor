import { useState } from "react";
import toast from "react-hot-toast";
import { User, KeyRound } from "lucide-react";
import { api } from "../services/api.js";
import { useAuthStore } from "../store/authStore.js";
import Navbar from "../components/common/Navbar.jsx";

export default function Profile() {
  const { user, updateUser } = useAuthStore();
  const [name, setName] = useState(user?.name || "");
  const [avatar, setAvatar] = useState(user?.avatar || "");
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

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
      toast.success("Password changed");
      setPasswords({ currentPassword: "", newPassword: "" });
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not change password");
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="min-h-dvh bg-bg text-gray-100 flex flex-col">
      <Navbar />
      <main className="max-w-lg mx-auto px-4 sm:px-6 py-8 space-y-8 flex-1 w-full">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-accent/15 border border-accent/25 flex items-center justify-center text-accent">
              <User size={18} />
            </div>
            <h1 className="text-xl font-bold font-serif text-gray-100">User Profile</h1>
          </div>
          <form onSubmit={saveProfile} className="space-y-4 bg-surface border border-border rounded-2xl p-6 shadow-paper">
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
      </main>
    </div>
  );
}
