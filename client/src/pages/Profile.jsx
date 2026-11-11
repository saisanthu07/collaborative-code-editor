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
    <div className="min-h-screen bg-bg">
      <Navbar />
      <main className="max-w-lg mx-auto px-6 py-8 space-y-8">
        <div>
          <h1 className="text-lg font-medium mb-4">Profile</h1>
          <form onSubmit={saveProfile} className="space-y-4 bg-surface border border-border rounded-lg p-5">
            <div>
              <label className="text-sm text-gray-400">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full bg-surface2 border border-border rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400">Avatar URL</label>
              <input
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                className="mt-1 w-full bg-surface2 border border-border rounded-md px-3 py-2 text-sm"
                placeholder="https://..."
              />
            </div>
            <button
              type="submit"
              disabled={savingProfile}
              className="bg-accent px-4 py-2 rounded-md text-sm hover:bg-blue-600 disabled:opacity-60"
            >
              {savingProfile ? "Saving..." : "Save Profile"}
            </button>
          </form>
        </div>

        <div>
          <h2 className="text-lg font-medium mb-4">Change Password</h2>
          <form onSubmit={savePassword} className="space-y-4 bg-surface border border-border rounded-lg p-5">
            <div>
              <label className="text-sm text-gray-400">Current Password</label>
              <input
                type="password"
                required
                value={passwords.currentPassword}
                onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                className="mt-1 w-full bg-surface2 border border-border rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400">New Password</label>
              <input
                type="password"
                required
                value={passwords.newPassword}
                onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                className="mt-1 w-full bg-surface2 border border-border rounded-md px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={savingPassword}
              className="bg-accent px-4 py-2 rounded-md text-sm hover:bg-blue-600 disabled:opacity-60"
            >
              {savingPassword ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
