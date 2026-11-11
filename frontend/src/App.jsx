import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./context/useAuth";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import CustomersPage from "./pages/CustomersPage";
import DashboardPage from "./pages/DashboardPage";
import LeadsPage from "./pages/LeadsPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import FollowUpsPage from "./pages/FollowUpsPage";
import TravelPackagesPage from "./pages/TravelPackagesPage";
import BookingsPage from "./pages/BookingsPage";
import PaymentsPage from "./pages/PaymentsPage";
import ReportsPage from "./pages/ReportsPage";

function App() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const homePath = user?.role?.toLowerCase() === "admin"
    ? "/admin/dashboard"
    : "/dashboard";

  if (isLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f2f7f6]">
        <p className="text-sm font-semibold tracking-wide text-[#176b68]">Loading Travel CRM...</p>
      </main>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to={homePath} replace /> : <LoginPage />}
      />
      <Route
        path="/register"
        element={isAuthenticated ? <Navigate to={homePath} replace /> : <RegisterPage />}
      />
      <Route element={<ProtectedRoute allowedRole="Staff" />}>
        <Route path="/dashboard" element={<DashboardPage />} />
      </Route>
      <Route element={<ProtectedRoute allowedRoles={["Admin", "Staff"]} />}>
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/leads" element={<LeadsPage />} />
        <Route path="/follow-ups" element={<FollowUpsPage />} />
        <Route path="/travel-packages" element={<TravelPackagesPage />} />
        <Route path="/bookings" element={<BookingsPage />} />
        <Route path="/payments" element={<PaymentsPage />} />
        <Route path="/reports" element={<ReportsPage />} />
      </Route>
      <Route element={<ProtectedRoute allowedRole="Admin" />}>
        <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
      </Route>
      <Route path="*" element={<Navigate to={isAuthenticated ? homePath : "/login"} replace />} />
    </Routes>
  );
}

export default App