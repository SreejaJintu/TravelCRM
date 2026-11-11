import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { useAuth } from "../context/useAuth";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateRegistration({ fullName, email, password, confirmPassword }) {
    const errors = {};

    if (!fullName.trim()) {
        errors.fullName = "Enter your full name.";
    }
    if (!email.trim()) {
        errors.email = "Enter your email address.";
    } else if (!emailPattern.test(email.trim())) {
        errors.email = "Enter a valid email address.";
    }
    if (!password) {
        errors.password = "Create a password.";
    } else if (password.length < 8) {
        errors.password = "Use at least 8 characters.";
    }
    if (!confirmPassword) {
        errors.confirmPassword = "Confirm your password.";
    } else if (password !== confirmPassword) {
        errors.confirmPassword = "The passwords do not match.";
    }

    return errors;
}

export default function RegisterPage() {
    const { register } = useAuth();
    const navigate = useNavigate();
    const submissionInProgress = useRef(false);
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [fieldErrors, setFieldErrors] = useState({});
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPasswords, setShowPasswords] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");

        if (submissionInProgress.current) {
            return;
        }

        const validationErrors = validateRegistration({ fullName, email, password, confirmPassword });
        setFieldErrors(validationErrors);
        if (Object.keys(validationErrors).length > 0) return;

        submissionInProgress.current = true;
        setLoading(true);
        try {
            await register({ fullName: fullName.trim(), email: email.trim(), password, roleId: 2 });
            navigate("/login", {
                replace: true,
                state: { success: "Account created. You can now sign in." }
            });
        } catch (requestError) {
            setError(
                requestError.response?.data?.message ||
                requestError.response?.data?.title ||
                (requestError.response
                    ? "We couldn't create your account. Check your details and try again."
                    : "Unable to reach Travel CRM. Check your connection and try again.")
            );
        } finally {
            submissionInProgress.current = false;
            setLoading(false);
        }
    };

    const updateField = (field, value, setter) => {
        setter(value);
        setFieldErrors((currentErrors) => ({
            ...currentErrors,
            [field]: undefined,
            ...(field === "password" || field === "confirmPassword"
                ? { confirmPassword: undefined }
                : {})
        }));
        setError("");
    };

    const inputClass = (field) => `w-full rounded-md border bg-white px-4 py-3 text-[#20332f] outline-none transition placeholder:text-[#899792] focus:ring-4 ${
        fieldErrors[field]
            ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/10"
            : "border-[#d6e0dc] focus:border-[#176b68] focus:ring-[#176b68]/10"
    }`;

    return (
        <AuthLayout
            title="Start your journey"
            description="Create your Travel CRM staff account and bring every trip detail into view."
            footer={<>Already part of the team? <Link to="/login" className="font-semibold text-[#176b68] underline-offset-4 hover:text-[#104f4d] hover:underline">Sign in</Link></>}
        >
            {error && (
                <div role="alert" className="mb-5 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-5 text-rose-800">
                    {error}
                </div>
            )}
            <form onSubmit={handleSubmit} noValidate className="space-y-4 sm:space-y-5">
                <div>
                    <label htmlFor="fullName" className="mb-2 block text-sm font-semibold text-[#243936]">Full name</label>
                    <input
                        id="fullName"
                        type="text"
                        autoComplete="name"
                        value={fullName}
                        onChange={(event) => updateField("fullName", event.target.value, setFullName)}
                        required
                        aria-invalid={Boolean(fieldErrors.fullName)}
                        aria-describedby={fieldErrors.fullName ? "fullName-error" : undefined}
                        className={inputClass("fullName")}
                        placeholder="e.g. Jordan Lee"
                    />
                    {fieldErrors.fullName && <p id="fullName-error" className="mt-1.5 text-xs font-medium text-rose-700">{fieldErrors.fullName}</p>}
                </div>
                <div>
                    <label htmlFor="registerEmail" className="mb-2 block text-sm font-semibold text-[#243936]">Email address</label>
                    <input
                        id="registerEmail"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(event) => updateField("email", event.target.value, setEmail)}
                        required
                        aria-invalid={Boolean(fieldErrors.email)}
                        aria-describedby={fieldErrors.email ? "registerEmail-error" : undefined}
                        className={inputClass("email")}
                        placeholder="you@travelagency.com"
                    />
                    {fieldErrors.email && <p id="registerEmail-error" className="mt-1.5 text-xs font-medium text-rose-700">{fieldErrors.email}</p>}
                </div>
                <div>
                    <div className="mb-2 flex items-center justify-between gap-3">
                        <label htmlFor="registerPassword" className="text-sm font-semibold text-[#243936]">Password</label>
                        <button
                            type="button"
                            onClick={() => setShowPasswords((visible) => !visible)}
                            className="text-xs font-semibold text-[#176b68] hover:text-[#104f4d] focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176b68]"
                            aria-label={showPasswords ? "Hide passwords" : "Show passwords"}
                        >
                            {showPasswords ? "Hide" : "Show"}
                        </button>
                    </div>
                    <input
                        id="registerPassword"
                        type={showPasswords ? "text" : "password"}
                        autoComplete="new-password"
                        value={password}
                        onChange={(event) => updateField("password", event.target.value, setPassword)}
                        required
                        minLength={8}
                        aria-invalid={Boolean(fieldErrors.password)}
                        aria-describedby={fieldErrors.password ? "registerPassword-error" : "password-hint"}
                        className={inputClass("password")}
                        placeholder="At least 8 characters"
                    />
                    {fieldErrors.password
                        ? <p id="registerPassword-error" className="mt-1.5 text-xs font-medium text-rose-700">{fieldErrors.password}</p>
                        : <p id="password-hint" className="mt-1.5 text-xs text-[#657772]">Use 8 or more characters.</p>}
                </div>
                <div>
                    <label htmlFor="confirmPassword" className="mb-2 block text-sm font-semibold text-[#243936]">Confirm password</label>
                    <input
                        id="confirmPassword"
                        type={showPasswords ? "text" : "password"}
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(event) => updateField("confirmPassword", event.target.value, setConfirmPassword)}
                        required
                        aria-invalid={Boolean(fieldErrors.confirmPassword)}
                        aria-describedby={fieldErrors.confirmPassword ? "confirmPassword-error" : undefined}
                        className={inputClass("confirmPassword")}
                        placeholder="Enter your password again"
                    />
                    {fieldErrors.confirmPassword && <p id="confirmPassword-error" className="mt-1.5 text-xs font-medium text-rose-700">{fieldErrors.confirmPassword}</p>}
                </div>
                <button type="submit" disabled={loading} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-[#176b68] px-5 py-3 font-semibold text-white transition hover:bg-[#125956] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176b68] disabled:cursor-wait disabled:opacity-70">
                    {loading && <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
                    {loading ? "Creating your account..." : "Create staff account"}
                </button>
            </form>
        </AuthLayout>
    );
}