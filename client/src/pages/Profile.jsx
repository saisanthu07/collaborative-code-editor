import { useState } from "react";
import toast from "react-hot-toast";
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
          <h1 className="text-xl font-bold mb-4 text-gray-100">User Profile</h1>
          <form onSubmit={saveProfile} className="space-y-4 bg-surface border border-border rounded-xl p-6 shadow-md">
            <div>
              <label htmlFor="profile-name" className="block text-sm font-medium text-gray-300 mb-1">
                Name
              </label>
              <input
                id="profile-name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-surface2 border border-border rounded-md px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
              />
            </div>
            <div>
              <label htmlFor="profile-avatar" className="block text-sm font-medium text-gray-300 mb-1">
                Avatar URL <span className="text-gray-500 text-xs">(https://...)</span>
              </label>
              <input
                id="profile-avatar"
                type="url"
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                className="w-full bg-surface2 border border-border rounded-md px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
                placeholder="https://example.com/avatar.png"
              />
            </div>
            <button
              type="submit"
              disabled={savingProfile}
              className="bg-accent px-5 py-2 rounded-md text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-60 transition-colors focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {savingProfile ? "Saving..." : "Save Profile"}
            </button>
          </form>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-4 text-gray-100">Change Password</h2>
          <form onSubmit={savePassword} className="space-y-4 bg-surface border border-border rounded-xl p-6 shadow-md">
            <div>
              <label htmlFor="profile-current-password" className="block text-sm font-medium text-gray-300 mb-1">
                Current Password
              </label>
              <input
                id="profile-current-password"
                type="password"
                autoComplete="current-password"
                required
                value={passwords.currentPassword}
                onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                className="w-full bg-surface2 border border-border rounded-md px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
              />
            </div>
            <div>
              <label htmlFor="profile-new-password" className="block text-sm font-medium text-gray-300 mb-1">
                New Password
              </label>
              <input
                id="profile-new-password"
                type="password"
                autoComplete="new-password"
                required
                value={passwords.newPassword}
                onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                className="w-full bg-surface2 border border-border rounded-md px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
              />
              <p className="text-xs text-gray-500 mt-1">
                At least 8 characters, with uppercase, lowercase, and a number.
              </p>
            </div>
            <button
              type="submit"
              disabled={savingPassword}
              className="bg-accent px-5 py-2 rounded-md text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-60 transition-colors focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {savingPassword ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
