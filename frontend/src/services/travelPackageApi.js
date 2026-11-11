import api from "./api";

export async function getTravelPackages(params = {}, signal) {
    const response = await api.get("/TravelPackages", { params, signal });
    return response.data;
}

export async function getTravelPackage(packageId, signal) {
    const response = await api.get(`/TravelPackages/${packageId}`, { signal });
    return response.data;
}

export async function createTravelPackage(packageData) {
    const response = await api.post("/TravelPackages", packageData);
    return response.data;
}

export async function updateTravelPackage(packageId, packageData) {
    const response = await api.put(`/TravelPackages/${packageId}`, packageData);
    return response.data;
}

export async function setTravelPackageActive(packageId, active) {
    return api.patch(`/TravelPackages/${packageId}/activation`, null, { params: { active } });
}

export async function addPackageItinerary(packageId, item) {
    const response = await api.post(`/TravelPackages/${packageId}/itinerary`, item);
    return response.data;
}

export async function updatePackageItinerary(packageId, itineraryId, item) {
    return api.put(`/TravelPackages/${packageId}/itinerary/${itineraryId}`, item);
}

export async function deletePackageItinerary(packageId, itineraryId) {
    return api.delete(`/TravelPackages/${packageId}/itinerary/${itineraryId}`);
}

export async function addPackageContent(packageId, type, description) {
    const response = await api.post(`/TravelPackages/${packageId}/${type}`, { description });
    return response.data;
}

export async function updatePackageContent(packageId, type, itemId, description) {
    return api.put(`/TravelPackages/${packageId}/${type}/${itemId}`, { description });
}

export async function deletePackageContent(packageId, type, itemId) {
    return api.delete(`/TravelPackages/${packageId}/${type}/${itemId}`);
}

export async function uploadPackageImages(packageId, files) {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    const response = await api.post(`/TravelPackages/${packageId}/images`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
    });
    return response.data;
}

export async function setPrimaryPackageImage(packageId, imageId) {
    const response = await api.patch(`/TravelPackages/${packageId}/images/${imageId}/primary`);
    return response.data;
}

export async function updatePackageImageOrder(packageId, images) {
    return api.put(`/TravelPackages/${packageId}/images/order`, { images });
}

export async function replacePackageImage(packageId, imageId, file) {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.put(`/TravelPackages/${packageId}/images/${imageId}/replace`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
    });
    return response.data;
}

export async function deletePackageImage(packageId, imageId) {
    return api.delete(`/TravelPackages/${packageId}/images/${imageId}`);
}
