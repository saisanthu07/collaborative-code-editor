import axios from "axios";
import { useAuthStore } from "../store/authStore.js";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshPromise = null;

// On a 401 (expired access token), attempt exactly one silent refresh
// using the stored refresh token, then retry the original request. If the
// refresh itself fails (revoked/expired/reused token), log the user out.
// Concurrent 401s share a single in-flight refresh call.
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    const requestUrl = original?.url || "";
    const isAuthEndpoint = /\/auth\/(login|register|refresh|logout)(?:$|\?)/.test(requestUrl);
    if (err.response?.status !== 401 || original?._retried || isAuthEndpoint) {
      return Promise.reject(err);
    }
    original._retried = true;

    const { refreshToken, setAuth, user, logout } = useAuthStore.getState();
    if (!refreshToken) {
      logout();
      return Promise.reject(err);
    }

    try {
      if (!refreshPromise) {
        refreshPromise = axios
          .post(
            `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/auth/refresh`,
            { refreshToken },
            { withCredentials: true }
          )
          .finally(() => {
            refreshPromise = null;
          });
      }
      const { data } = await refreshPromise;
      setAuth(user, data.token, data.refreshToken);
      original.headers.Authorization = `Bearer ${data.token}`;
      return api(original);
    } catch (refreshErr) {
      logout();
      return Promise.reject(refreshErr);
    }
  }
);
