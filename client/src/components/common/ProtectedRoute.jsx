import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/authStore.js";

export default function ProtectedRoute({ children }) {
  const { token, isInitialized } = useAuthStore();
  const location = useLocation();

  if (!isInitialized) return null;

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
