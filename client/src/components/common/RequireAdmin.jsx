import { Navigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import toast from "react-hot-toast";
import { useAuthStore } from "../../store/authStore.js";

export default function RequireAdmin({ children }) {
  const { user, token, isInitialized } = useAuthStore();
  const location = useLocation();

  const isAdmin = user?.role === "ADMIN";

  useEffect(() => {
    if (isInitialized && token && !isAdmin) {
      toast.error("Admin access required");
    }
  }, [isInitialized, token, isAdmin]);

  if (!isInitialized) return null;

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
