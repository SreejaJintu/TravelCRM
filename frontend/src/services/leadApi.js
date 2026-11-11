import api from "./api";

export async function getLeads({ search, page, pageSize, signal }) {
    const response = await api.get("/Leads", {
        params: { search: search || undefined, page, pageSize },
        signal
    });
    return response.data;
}

export async function getLead(leadId, signal) {
    const response = await api.get(`/Leads/${leadId}`, { signal });
    return response.data;
}

export async function getAssignableStaff(signal) {
    const response = await api.get("/Leads/assignable-staff", { signal });
    return response.data;
}

export async function createLead(lead) {
    const response = await api.post("/Leads", lead);
    return response.data;
}

export async function updateLead(leadId, lead) {
    const response = await api.put(`/Leads/${leadId}`, lead);
    return response.data;
}

export async function changeLeadStatus(leadId, status) {
    const response = await api.patch(`/Leads/${leadId}/status`, { status });
    return response.data;
}

export async function assignLead(leadId, assignedToUserId) {
    const response = await api.patch(`/Leads/${leadId}/assignment`, { assignedToUserId });
    return response.data;
}

export async function deactivateLead(leadId) {
    await api.delete(`/Leads/${leadId}`);
}

export async function activateLead(leadId) {
    const response = await api.patch(`/Leads/${leadId}/activate`);
    return response.data;
}

export async function convertLead(leadId) {
    const response = await api.post(`/Leads/${leadId}/convert`);
    return response.data;
}