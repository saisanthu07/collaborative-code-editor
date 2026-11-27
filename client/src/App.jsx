import { useEffect, lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import toast from "react-hot-toast";
import { api, refreshAccessToken } from "./services/api.js";
import { getSocket, disconnectSocket } from "./services/socket.js";
import { useAuthStore } from "./store/authStore.js";
import ErrorBoundary from "./components/common/ErrorBoundary.jsx";
import PageLoading from "./components/common/PageLoading.jsx";
import ProtectedRoute from "./components/common/ProtectedRoute.jsx";
import RequireAdmin from "./components/common/RequireAdmin.jsx";
import ModerationModal from "./components/common/ModerationModal.jsx";

const Landing = lazy(() => import("./pages/Landing.jsx"));
const Login = lazy(() => import("./pages/Login.jsx"));
const Register = lazy(() => import("./pages/Register.jsx"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword.jsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.jsx"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail.jsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.jsx"));
const Compily = lazy(() => import("./pages/Compily.jsx"));
const SharedSnippet = lazy(() => import("./pages/SharedSnippet.jsx"));
const Room = lazy(() => import("./pages/Room.jsx"));
const Profile = lazy(() => import("./pages/Profile.jsx"));
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout.jsx"));
const AdminOverview = lazy(() => import("./pages/admin/AdminOverview.jsx"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers.jsx"));
const AdminRooms = lazy(() => import("./pages/admin/AdminRooms.jsx"));
const AdminLogs = lazy(() => import("./pages/admin/AdminLogs.jsx"));
const AdminAppeals = lazy(() => import("./pages/admin/AdminAppeals.jsx"));
const NotFound = lazy(() => import("./pages/NotFound.jsx"));

export default function App() {
  const {
    user,
    token,
    isInitialized,
    setAuth,
    updateUser,
    setModerationNotice,
    logout,
  } = useAuthStore();

  useEffect(() => {
    let isMounted = true;
    async function hydrate() {
      try {
        const refreshedToken = await refreshAccessToken();
        const { data: meData } = await api.get("/auth/me", {
          headers: { Authorization: `Bearer ${refreshedToken}` },
        });
        if (isMounted) {
          setAuth(meData.user, refreshedToken);
        }
      } catch {
        if (isMounted) {
          logout();
        }
      }
    }
    hydrate();
    return () => {
      isMounted = false;
    };
  }, [setAuth, logout]);

  useEffect(() => {
    if (!user?._id || !token) return;
    const socket = getSocket(token);

    const handleRoleUpdated = ({ role }) => {
      const current = useAuthStore.getState().user;
      if (!current || !role || current.role === role) return;
      updateUser({ ...current, role });
      if (role === "ADMIN") {
        toast.success("You have been promoted to Administrator");
      } else {
        toast("Your administrator role was removed", { icon: "🛡️" });
      }
    };

    const handleModerated = (moderation) => {
      if (moderation) {
        setModerationNotice(moderation);
        logout();
      }
      disconnectSocket();
    };

    socket.on("account-role-updated", handleRoleUpdated);
    socket.on("account-moderated", handleModerated);
    return () => {
      socket.off("account-role-updated", handleRoleUpdated);
      socket.off("account-moderated", handleModerated);
    };
  }, [user?._id, token, updateUser, setModerationNotice, logout]);

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
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/compily"
            element={
              <ProtectedRoute>
                <Compily />
              </ProtectedRoute>
            }
          />
          <Route path="/s/:slug" element={<SharedSnippet />} />
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
                <AdminLayout />
              </RequireAdmin>
            }
          >
            <Route index element={<AdminOverview />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="rooms" element={<AdminRooms />} />
            <Route path="logs" element={<AdminLogs />} />
            <Route path="appeals" element={<AdminAppeals />} />
          </Route>
          {/* Catch-all 404 route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      <ModerationModal />
    </ErrorBoundary>
  );
}
