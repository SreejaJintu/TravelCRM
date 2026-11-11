import api from "./api";

export async function getPayments(params = {}, signal) {
    const response = await api.get("/Payments", { params, signal });
    return response.data;
}

export async function getPayment(paymentId, signal) {
    const response = await api.get(`/Payments/${paymentId}`, { signal });
    return response.data;
}

export async function getBookingPayments(bookingId, signal) {
    const response = await api.get(`/Payments/booking/${bookingId}`, { signal });
    return response.data;
}

export async function getPaymentSummary(signal) {
    const response = await api.get("/Payments/summary", { signal });
    return response.data;
}

export async function createPayment(payment) {
    const response = await api.post("/Payments", payment);
    return response.data;
}

export async function updatePayment(paymentId, payment) {
    const response = await api.put(`/Payments/${paymentId}`, payment);
    return response.data;
}

export async function changePaymentStatus(paymentId, status) {
    const response = await api.patch(`/Payments/${paymentId}/status`, { status });
    return response.data;
}

export async function deletePayment(paymentId) {
    await api.delete(`/Payments/${paymentId}`);
}
