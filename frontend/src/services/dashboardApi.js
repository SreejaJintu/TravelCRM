import api from "./api";

export async function getDashboardSummary(params = {}, signal) {
    const response = await api.get("/Dashboard/summary", { params, signal });
    return response.data;
}
