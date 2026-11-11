import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { useAuth } from "../context/useAuth";

export default function LoginPage() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();

        setError("");
        setLoading(true);

        try {
            const user = await login(email, password);

            navigate(user.role?.toLowerCase() === "admin"
                ? "/admin/dashboard"
                : "/dashboard", { replace: true });
        } catch (error) {
            setError(
                error.response?.data?.message || error.message ||
                "Unable to login. Please try again."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout
            title="Welcome back"
            description="Sign in to keep every itinerary, guest, and booking moving."
            footer={<>New to Travel CRM? <Link to="/register" className="font-semibold text-[#176b68] hover:text-[#104f4d]">Create an account</Link></>}
        >
            {location.state?.success && (
                <div role="status" className="mb-5 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    {location.state.success}
                </div>
            )}
            {error && (
                <div role="alert" className="mb-5 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                    <label htmlFor="email" className="mb-2 block text-sm font-semibold text-[#243936]">Work email</label>
                    <input
                        id="email"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        required
                        className="w-full rounded-md border border-[#d6e0dc] bg-white px-4 py-3 text-[#20332f] outline-none transition focus:border-[#176b68] focus:ring-4 focus:ring-[#176b68]/10"
                        placeholder="name@company.com"
                    />
                </div>
                <div>
                    <div className="mb-2 flex items-center justify-between gap-3">
                        <label htmlFor="password" className="text-sm font-semibold text-[#243936]">Password</label>
                        <button
                            type="button"
                            onClick={() => setShowPassword((visible) => !visible)}
                            className="text-xs font-semibold text-[#176b68] hover:text-[#104f4d]"
                            aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                            {showPassword ? "Hide" : "Show"}
                        </button>
                    </div>
                    <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        required
                        className="w-full rounded-md border border-[#d6e0dc] bg-white px-4 py-3 text-[#20332f] outline-none transition focus:border-[#176b68] focus:ring-4 focus:ring-[#176b68]/10"
                        placeholder="Enter your password"
                    />
                </div>
                <button
                    type="submit"
                    disabled={loading}
                    className="flex min-h-12 w-full items-center justify-center rounded-md bg-[#176b68] px-5 py-3 font-semibold text-white transition hover:bg-[#125956] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176b68] disabled:cursor-wait disabled:opacity-70"
                >
                    {loading ? "Signing in..." : "Sign in"}
                </button>
            </form>
        </AuthLayout>
    );
}
