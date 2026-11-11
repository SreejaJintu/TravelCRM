import api from "./api";

export async function getBookingReport(params = {}, signal) {
    const response = await api.get("/Reports/bookings", { params, signal });
    return response.data;
}

export async function getPaymentReport(params = {}, signal) {
    const response = await api.get("/Reports/payments", { params, signal });
    return response.data;
}

export async function getRevenueReport(params = {}, signal) {
    const response = await api.get("/Reports/revenue", { params, signal });
    return response.data;
}

export async function getCustomerReport(signal) {
    const response = await api.get("/Reports/customers", { signal });
    return response.data;
}

export async function getLeadConversionReport(signal) {
    const response = await api.get("/Reports/lead-conversion", { signal });
    return response.data;
}
