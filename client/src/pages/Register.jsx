import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Code2 } from "lucide-react";
import { api } from "../services/api.js";
import { useAuthStore } from "../store/authStore.js";

export default function Register() {
  const [form, setForm] = useState({ name: "", username: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/register", form);
      setAuth(data.user, data.token, data.refreshToken);
      toast.success("Account created!");
      navigate("/dashboard");
    } catch (err) {
      const details = err.response?.data?.details;
      toast.error(details?.[0]?.message || err.response?.data?.error || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm bg-surface border border-border rounded-xl p-8">
        <div className="flex items-center gap-2 justify-center mb-6">
          <Code2 className="text-accent" size={28} />
          <span className="text-xl font-semibold">CodeTogether</span>
        </div>
        <h1 className="text-lg font-medium mb-6 text-center text-gray-200">Create your account</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          {["name", "username", "email"].map((field) => (
            <div key={field}>
              <label className="text-sm text-gray-400 capitalize">{field}</label>
              <input
                type={field === "email" ? "email" : "text"}
                required
                value={form[field]}
                onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                className="mt-1 w-full bg-surface2 border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          ))}
          <div>
            <label className="text-sm text-gray-400">Password</label>
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="mt-1 w-full bg-surface2 border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <p className="text-xs text-gray-500 mt-1">
              At least 8 characters, with uppercase, lowercase, and a number.
            </p>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent hover:bg-blue-600 transition-colors rounded-md py-2 text-sm font-medium disabled:opacity-60"
          >
            {loading ? "Creating account..." : "Register"}
          </button>
        </form>
        <p className="text-sm text-gray-400 mt-5 text-center">
          Already have an account?{" "}
          <Link to="/login" className="text-accent hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
