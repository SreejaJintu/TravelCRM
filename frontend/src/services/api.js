
import axios from "axios";

const API_BASE_URL = import.meta.env.DEV
    ? "http://localhost:5030/api"
    : "https://travelcrmhost.runasp.net/api";

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        "Content-Type": "application/json"
    }
});

// Attach JWT token to every request
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("token");

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    },
    (error) => Promise.reject(error)
);

// Handle unauthorized responses
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            window.dispatchEvent(new Event("auth:unauthorized"));
        }

        return Promise.reject(error);
    }
);

export default api;
