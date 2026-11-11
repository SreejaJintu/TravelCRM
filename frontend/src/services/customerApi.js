import api from "./api";

export async function getCustomers({ search, page, pageSize, signal }) {
    const response = await api.get("/Customers", {
        params: { search: search || undefined, page, pageSize },
        signal
    });
    return response.data;
}

export async function getCustomer(customerId, signal) {
    const response = await api.get(`/Customers/${customerId}`, { signal });
    return response.data;
}

export async function createCustomer(customer) {
    const response = await api.post("/Customers", customer);
    return response.data;
}

export async function updateCustomer(customerId, customer) {
    const response = await api.put(`/Customers/${customerId}`, customer);
    return response.data;
}

export async function deactivateCustomer(customerId) {
    await api.delete(`/Customers/${customerId}`);
}

export async function activateCustomer(customerId) {
    const response = await api.patch(`/Customers/${customerId}/activate`);
    return response.data;
}