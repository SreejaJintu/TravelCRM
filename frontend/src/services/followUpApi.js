import api from "./api";

export async function getFollowUps({ search, leadId, assignedToUserId, status, from, to, window, page, pageSize, signal }) {
    const path = window ? `/FollowUps/${window}` : "/FollowUps";
    const response = await api.get(path, {
        params: {
            search: search || undefined,
            leadId: leadId || undefined,
            assignedToUserId: assignedToUserId || undefined,
            status: status || undefined,
            from: from || undefined,
            to: to || undefined,
            page,
            pageSize
        },
        signal
    });
    return response.data;
}

export async function getFollowUp(followUpId, signal) {
    const response = await api.get(`/FollowUps/${followUpId}`, { signal });
    return response.data;
}

export async function createFollowUp(followUp) {
    const response = await api.post("/FollowUps", followUp);
    return response.data;
}

export async function updateFollowUp(followUpId, followUp) {
    const response = await api.put(`/FollowUps/${followUpId}`, followUp);
    return response.data;
}

export async function assignFollowUp(followUpId, assignedToUserId) {
    const response = await api.patch(`/FollowUps/${followUpId}/assignment`, { assignedToUserId });
    return response.data;
}

export async function completeFollowUp(followUpId, outcome) {
    const response = await api.patch(`/FollowUps/${followUpId}/complete`, { outcome });
    return response.data;
}

export async function cancelFollowUp(followUpId) {
    const response = await api.patch(`/FollowUps/${followUpId}/cancel`);
    return response.data;
}

export async function getAssignableFollowUpStaff(signal) {
    const response = await api.get("/FollowUps/assignable-staff", { signal });
    return response.data;
}