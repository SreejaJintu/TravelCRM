import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/useAuth";

export default function ProtectedRoute({ allowedRole, allowedRoles }) {
    const { isAuthenticated, user } = useAuth();
    const permittedRoles = allowedRoles || [allowedRole];

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (!permittedRoles.some((role) => role?.toLowerCase() === user?.role?.toLowerCase())) {
        const destination = user?.role?.toLowerCase() === "admin"
            ? "/admin/dashboard"
            : "/dashboard";
        return <Navigate to={destination} replace />;
    }

    return <Outlet />;
}