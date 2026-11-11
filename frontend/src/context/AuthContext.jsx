import {
    useEffect,
    useState
} from "react";

import api from "../services/api";
import { AuthContext } from "./AuthContextValue";

function readSavedUser() {
    try {
        const savedUser = localStorage.getItem("user");
        return savedUser ? JSON.parse(savedUser) : null;
    } catch {
        localStorage.removeItem("user");
        return null;
    }
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(readSavedUser);

    const [token, setToken] = useState(() => {
        return localStorage.getItem("token");
    });
    const [isLoading, setIsLoading] = useState(Boolean(localStorage.getItem("token")));

    const clearSession = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setToken(null);
        setUser(null);
    };

    useEffect(() => {
        const handleUnauthorized = () => clearSession();
        window.addEventListener("auth:unauthorized", handleUnauthorized);

        const verifySavedSession = async () => {
            const savedToken = localStorage.getItem("token");
            if (!savedToken) {
                setIsLoading(false);
                return;
            }

            try {
                const response = await api.get("/Profile/me");
                const profile = response.data;
                const currentUser = {
                    userId: profile.userId,
                    fullName: profile.fullName,
                    email: profile.email,
                    role: profile.role
                };
                localStorage.setItem("user", JSON.stringify(currentUser));
                setUser(currentUser);
            } catch {
                clearSession();
            } finally {
                setIsLoading(false);
            }
        };

        verifySavedSession();
        return () => window.removeEventListener("auth:unauthorized", handleUnauthorized);
    }, []);

    const login = async (email, password) => {
        const response = await api.post("/Auth/login", {
            email,
            password
        });

        const { token: newToken, user: userData } = response.data;
        if (!newToken || !userData) {
            throw new Error(response.data?.message || "The login response was incomplete.");
        }

        localStorage.setItem("token", newToken);

        try {
            const profileResponse = await api.get("/Profile/me");
            const profile = profileResponse.data;
            const verifiedUser = {
                userId: profile.userId,
                fullName: profile.fullName,
                email: profile.email,
                role: profile.role
            };
            localStorage.setItem("user", JSON.stringify(verifiedUser));
            setToken(newToken);
            setUser(verifiedUser);
            return verifiedUser;
        } catch (error) {
            clearSession();
            throw error;
        }

    };

    const register = async (registrationData) => {
        const response = await api.post(
            "/Auth/register",
            registrationData
        );

        return response.data;
    };

    const logout = () => {
        clearSession();
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                isAuthenticated: Boolean(token),
                isLoading,
                login,
                register,
                logout
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

