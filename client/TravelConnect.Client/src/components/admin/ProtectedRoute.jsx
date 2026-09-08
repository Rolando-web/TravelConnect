import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ADMIN_ROLES, ADMIN_ACCESS } from "../../pages/admin/adminConfig";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B132B] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[#06D6A0] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (!ADMIN_ROLES.includes(user.role)) {
    return <Navigate to="/bookings" replace />;
  }

  const pathParts = location.pathname.split("/").filter(Boolean);
  const pageKey = pathParts[1] || "dashboard";
  const access = ADMIN_ACCESS[user.role] || {};
  if (!(pageKey in access)) {
    return <Navigate to="/admin" replace />;
  }

  return children;
}
