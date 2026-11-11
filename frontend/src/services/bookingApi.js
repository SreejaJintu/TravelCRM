import api from "./api";

export async function getBookings(params = {}, signal) {
    const response = await api.get("/Bookings", { params, signal });
    return response.data;
}

export async function getBooking(bookingId, signal) {
    const response = await api.get(`/Bookings/${bookingId}`, { signal });
    return response.data;
}

export async function createBooking(booking) {
    const response = await api.post("/Bookings", booking);
    return response.data;
}

export async function createBookingFromLead(leadId, booking) {
    const response = await api.post(`/Bookings/from-lead/${leadId}`, booking);
    return response.data;
}

export async function updateBooking(bookingId, booking) {
    const response = await api.put(`/Bookings/${bookingId}`, booking);
    return response.data;
}

export async function changeBookingStatus(bookingId, status) {
    const response = await api.patch(`/Bookings/${bookingId}/status`, { status });
    return response.data;
}

export async function cancelBooking(bookingId) {
    const response = await api.patch(`/Bookings/${bookingId}/cancel`);
    return response.data;
}

export async function assignBooking(bookingId, assignedToUserId) {
    const response = await api.patch(`/Bookings/${bookingId}/assignment`, { assignedToUserId });
    return response.data;
}

export async function getAssignableBookingStaff(signal) {
    const response = await api.get("/Bookings/assignable-staff", { signal });
    return response.data;
}
