import { useEffect, lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { api } from "./services/api.js";
import { useAuthStore } from "./store/authStore.js";
import ErrorBoundary from "./components/common/ErrorBoundary.jsx";
import PageLoading from "./components/common/PageLoading.jsx";
import ProtectedRoute from "./components/common/ProtectedRoute.jsx";
import RequireAdmin from "./components/common/RequireAdmin.jsx";

const Landing = lazy(() => import("./pages/Landing.jsx"));
const Login = lazy(() => import("./pages/Login.jsx"));
const Register = lazy(() => import("./pages/Register.jsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.jsx"));
const Room = lazy(() => import("./pages/Room.jsx"));
const Profile = lazy(() => import("./pages/Profile.jsx"));
const Admin = lazy(() => import("./pages/Admin.jsx"));
const NotFound = lazy(() => import("./pages/NotFound.jsx"));

export default function App() {
  const { isInitialized, setAuth, setToken, setInitialized } = useAuthStore();

  useEffect(() => {
    let isMounted = true;
    async function hydrate() {
      try {
        const { data: refreshData } = await api.post("/auth/refresh");
        const token = refreshData.token;
        setToken(token);
        const { data: meData } = await api.get("/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (isMounted) {
          setAuth(meData.user, token);
        }
      } catch {
        if (isMounted) {
          setInitialized(true);
        }
      }
    }
    hydrate();
    return () => {
      isMounted = false;
    };
  }, [setAuth, setToken, setInitialized]);

  if (!isInitialized) {
    return <PageLoading message="Initializing CodeTogether..." />;
  }

  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoading />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          {/* Rooms are reachable by guests too — access control is enforced in Room.jsx & server-side */}
          <Route path="/room/:roomId" element={<Room />} />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <RequireAdmin>
                <Admin />
              </RequireAdmin>
            }
          />
          {/* Catch-all 404 route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
